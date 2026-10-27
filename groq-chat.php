<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST required']);
    exit;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\\d+$/', '', $host)) {
    http_response_code(403);
    echo json_encode(['error' => 'Origin not allowed']);
    exit;
}

session_start();
$now = time();
$requests = array_values(array_filter($_SESSION['ai_requests'] ?? [], static fn($stamp) => is_int($stamp) && $stamp > $now - 60));
if (count($requests) >= 20) {
    http_response_code(429);
    echo json_encode(['error' => 'Please wait before sending another question.']);
    exit;
}
$requests[] = $now;
$_SESSION['ai_requests'] = $requests;

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 18000) {
    http_response_code(413);
    echo json_encode(['error' => 'Request is too large.']);
    exit;
}
$input = json_decode($raw, true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON.']);
    exit;
}

$languageNames = ['en' => 'English', 'bn' => 'Bangla', 'ar' => 'Arabic', 'nl' => 'Dutch', 'de' => 'German'];
$language = isset($input['language'], $languageNames[$input['language']]) ? $input['language'] : 'en';
$message = trim((string)($input['message'] ?? ''));
$action = trim((string)($input['action'] ?? 'answer'));
$subject = mb_substr(trim((string)($input['subject'] ?? 'General study')), 0, 160);
$goal = mb_substr(trim((string)($input['goal'] ?? '')), 0, 500);
if ($message === '' || mb_strlen($message) > 1400) {
    http_response_code(400);
    echo json_encode(['error' => 'A question between 1 and 1400 characters is required.']);
    exit;
}

// Prefer a server environment variable. Shared hosting can use one private
// configuration file stored above the public web root.
$configFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.tastematch-config.php';
$config = [];
if (is_file($configFile)) {
    $loaded = require $configFile;
    if (is_array($loaded)) $config = $loaded;
}
$apiKey = getenv('GROQ_API_KEY') ?: ($config['groq_api_key'] ?? '');

// Backward-compatible fallback for the existing live deployment.
if (!is_string($apiKey) || $apiKey === '') {
    $legacyFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.chatsprint-groq-key.php';
    if (!is_file($legacyFile)) $legacyFile = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.chatsprint-groq-key.php';
    if (is_file($legacyFile)) $apiKey = require $legacyFile;
}
if (!is_string($apiKey) || !str_starts_with($apiKey, 'gsk_')) {
    http_response_code(503);
    echo json_encode(['error' => 'Groq API key is not configured.']);
    exit;
}

$system = 'You are TasteMatch AI, a cultural discovery assistant. Reply only in ' . $languageNames[$language] . '. '
    . 'Given a user favorite and selected cultural category, suggest up to 4 related titles or artists with short reasons. Clearly state these are generative suggestions, not verified Qloo taste-affinity data. Do not claim to have queried Qloo or to know factual preferences of the user. Keep response concise, friendly, and suitable for all audiences. Category: ' . $subject . '. Context: ' . $goal . '. Request: ' . $action . '.';

$messages = [['role' => 'system', 'content' => $system]];
$history = is_array($input['history'] ?? null) ? array_slice($input['history'], -8) : [];
foreach ($history as $item) {
    if (!is_array($item)) continue;
    $role = ($item['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
    $content = mb_substr(trim((string)($item['content'] ?? '')), 0, 700);
    if ($content !== '') $messages[] = ['role' => $role, 'content' => $content];
}
$messages[] = ['role' => 'user', 'content' => mb_substr($message, 0, 1400)];

$payload = json_encode([
    'model' => 'openai/gpt-oss-20b',
    'messages' => $messages,
    'temperature' => 0.35,
    'max_completion_tokens' => 360,
    'reasoning_effort' => 'low'
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$curl = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 28,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $apiKey],
    CURLOPT_POSTFIELDS => $payload
]);
$response = curl_exec($curl);
$status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
$curlError = curl_error($curl);
curl_close($curl);

if ($response === false || $status < 200 || $status >= 300) {
    http_response_code($status === 429 ? 429 : 502);
    echo json_encode(['error' => $status === 429 ? 'The free AI limit is temporarily busy. Please try again shortly.' : 'The AI assistant could not respond.', 'detail' => $curlError]);
    exit;
}
$data = json_decode($response, true);
$answer = trim((string)($data['choices'][0]['message']['content'] ?? ''));
if ($answer === '') {
    http_response_code(502);
    echo json_encode(['error' => 'The AI assistant returned an empty response.']);
    exit;
}

echo json_encode(['answer' => $answer, 'source' => 'groq-generative-not-qloo', 'model' => 'openai/gpt-oss-20b'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

