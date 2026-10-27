<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sameOriginOnly(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = preg_replace('/:\\d+$/', '', $_SERVER['HTTP_HOST'] ?? '');
    if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== $host) {
        respond(403, ['error' => 'Origin not allowed']);
    }
}

function loadPrivateConfig(): array
{
    $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.tastematch-config.php';
    if (!is_file($path)) return [];
    $config = require $path;
    return is_array($config) ? $config : [];
}

function qlooRequest(string $base, string $path, array $query, string $apiKey): array
{
    $url = rtrim($base, '/') . $path . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'X-Api-Key: ' . $apiKey],
    ]);
    $body = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if (!is_string($body) || $status < 200 || $status >= 300) {
        throw new RuntimeException('Qloo ' . $path . ' failed (HTTP ' . ($status ?: 502) . ').', $status ?: 502);
    }
    $data = json_decode($body, true);
    if (!is_array($data)) throw new RuntimeException('Qloo returned invalid JSON.', 502);
    return $data;
}

function entityList(array $payload): array
{
    $candidates = [
        $payload['results']['entities'] ?? null,
        $payload['results'] ?? null,
        $payload['entities'] ?? null,
        $payload['data']['results']['entities'] ?? null,
        $payload['data']['results'] ?? null,
    ];
    foreach ($candidates as $candidate) {
        if (!is_array($candidate)) continue;
        $list = array_values(array_filter($candidate, 'is_array'));
        if ($list !== []) return $list;
    }
    return [];
}

function firstString(array $item, array $paths): string
{
    foreach ($paths as $path) {
        $value = $item;
        foreach (explode('.', $path) as $part) {
            if (!is_array($value) || !array_key_exists($part, $value)) {
                $value = null;
                break;
            }
            $value = $value[$part];
        }
        if (is_string($value) && trim($value) !== '') return trim($value);
    }
    return '';
}

function normalizeEntity(array $item): array
{
    $affinity = $item['query']['affinity'] ?? $item['affinity'] ?? $item['score'] ?? null;
    return [
        'id' => firstString($item, ['entity_id', 'id', 'entity.id']),
        'name' => firstString($item, ['name', 'title', 'properties.name', 'properties.title']),
        'description' => firstString($item, ['description', 'properties.description', 'properties.short_description']),
        'affinity' => is_numeric($affinity) ? (float) $affinity : null,
        'category' => firstString($item, ['type', 'category', 'subtype', 'entity.type']),
    ];
}

sameOriginOnly();
$config = loadPrivateConfig();
$apiKey = trim((string) (getenv('QLOO_API_KEY') ?: ($config['qloo_api_key'] ?? '')));
$apiBase = trim((string) (getenv('QLOO_API_BASE') ?: ($config['qloo_api_base'] ?? 'https://hackathon.api.qloo.com')));
$action = (string) ($_GET['action'] ?? 'status');

if ($action === 'status') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(405, ['error' => 'GET required']);
    respond(200, ['live' => $apiKey !== '', 'provider' => 'Qloo']);
}
if ($action !== 'discover') respond(404, ['error' => 'Unknown action']);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'POST required']);
if ($apiKey === '') respond(503, ['error' => 'Qloo API key is not configured.']);

session_start();
$now = time();
$requests = array_values(array_filter($_SESSION['qloo_requests'] ?? [], static fn($stamp): bool => is_int($stamp) && $stamp > $now - 60));
if (count($requests) >= 20) respond(429, ['error' => 'Please wait before requesting more recommendations.']);
$requests[] = $now;
$_SESSION['qloo_requests'] = $requests;

$raw = file_get_contents('php://input');
if (!is_string($raw) || strlen($raw) > 6000) respond(413, ['error' => 'Request is too large.']);
$input = json_decode($raw, true);
if (!is_array($input)) respond(400, ['error' => 'Invalid JSON.']);

$seed = mb_substr(trim((string) ($input['seed'] ?? '')), 0, 160);
$requestedType = (string) ($input['type'] ?? 'movie');
$types = [
    'movie' => 'urn:entity:movie',
    'book' => 'urn:entity:book',
    'artist' => 'urn:entity:artist',
    'tv_show' => 'urn:entity:tv_show',
    'podcast' => 'urn:entity:podcast',
    'videogame' => 'urn:entity:videogame',
    'destination' => 'urn:entity:destination',
    'place' => 'urn:entity:place',
];
if ($seed === '' || !isset($types[$requestedType])) respond(400, ['error' => 'A valid favorite and recommendation category are required.']);

try {
    $search = qlooRequest($apiBase, '/search', ['query' => $seed, 'take' => 5], $apiKey);
    $favorite = null;
    foreach (entityList($search) as $candidate) {
        $normalized = normalizeEntity($candidate);
        if ($normalized['id'] !== '' && $normalized['name'] !== '') {
            $favorite = $normalized;
            break;
        }
    }
    if ($favorite === null) respond(404, ['error' => 'No Qloo entity matched this favorite.']);

    $insights = qlooRequest($apiBase, '/v2/insights', [
        'filter.type' => $types[$requestedType],
        'signal.interests.entities' => $favorite['id'],
        'filter.exclude.entities' => $favorite['id'],
        'feature.explainability' => 'true',
        'take' => 8,
    ], $apiKey);

    $results = [];
    foreach (entityList($insights) as $candidate) {
        $item = normalizeEntity($candidate);
        if ($item['id'] === '' || $item['name'] === '' || $item['id'] === $favorite['id']) continue;
        $results[] = $item;
        if (count($results) === 8) break;
    }
    respond(200, ['source' => 'qloo-live', 'favorite' => $favorite, 'results' => $results]);
} catch (RuntimeException $error) {
    $status = $error->getCode();
    respond(in_array($status, [400, 404, 429], true) ? $status : 502, ['error' => $error->getMessage()]);
}


