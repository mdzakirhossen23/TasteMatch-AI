# TasteMatch AI

TasteMatch AI is a multilingual cultural-discovery agent created for the Qloo Agentic Hackathon 2026. Enter a movie, book, artist, podcast, game, destination, or place you already enjoy, then explore live taste-affinity recommendations from Qloo or start an optional Groq AI conversation.

**Functional public demo:** https://tastematch.baharsoftbd.com/

**Public source repository:** https://github.com/mdzakirhossen23/TasteMatch-AI

## What the project does

TasteMatch turns one familiar cultural interest into a set of new discoveries. In Live Qloo Agent mode, the server resolves the user's input to a Qloo entity and sends that entity ID to Qloo's Insights API as a taste signal. The selected category controls whether the returned discoveries are movies, books, artists, TV shows, podcasts, video games, destinations, or places. Each result is labeled as live Qloo data and can be saved locally.

Groq AI is a separate, clearly labeled mode for generative suggestions and follow-up conversation. It does not impersonate Qloo data. Groq replies support headings, bold text, lists, tables, code blocks, and safe links through a sanitized Markdown preview.

## Core features

- Live Qloo entity resolution and taste-affinity recommendations
- Optional Groq AI discovery mode with follow-up chat
- Clear source labels separating Qloo results from AI-generated suggestions
- Safe Markdown rendering with Marked and DOMPurify
- Saved discoveries and preferences stored locally in the browser
- English, Bangla, Arabic, Dutch, and German interfaces
- Responsive desktop and mobile layouts
- Installable Progressive Web App with offline app-shell caching
- Server-side API credentials that are never exposed to the browser

## Why it is Qloo-powered

The core recommendation workflow uses two documented Qloo Taste AI endpoints:

1. `GET /search` resolves the user's favorite to a Qloo entity ID.
2. `GET /v2/insights` uses that entity through `signal.interests.entities` and returns ranked recommendations for the requested `filter.type`.

There is no fallback recommendation dataset in the public app. If Qloo is unavailable, the interface shows a clear error rather than presenting generated results as Qloo recommendations.

## Technology

- HTML, CSS, and vanilla JavaScript
- PHP 8.1+ with cURL and mbstring
- Qloo Taste AI API
- Groq Chat Completions API
- Marked and DOMPurify, vendored with their license notices

## Project layout

```text
.
├── api.php                 # Secure Qloo proxy
├── groq-chat.php           # Secure Groq proxy
├── app.js                  # Discovery and chat behavior
├── markdown-renderer.js    # Sanitized Markdown rendering
├── sidebar-pages.js        # Saved items, pages, and preferences
├── translations.js         # Five-language interface copy
├── pwa.js / sw.js          # PWA installation and offline shell
├── index.html / style.css  # Application UI
├── tests/                  # Browser-based renderer security test
└── vendor/                 # Local Marked and DOMPurify builds
```

## Run locally

Requirements: PHP 8.1 or newer with the cURL and mbstring extensions.

Set the API keys as private environment variables:

```powershell
$env:QLOO_API_KEY = 'your-qloo-key'
$env:GROQ_API_KEY = 'your-groq-key'
php -S 127.0.0.1:8000
```

Open http://127.0.0.1:8000/.

Groq is optional. Without `GROQ_API_KEY`, Qloo mode still works. The default Qloo event endpoint is `https://hackathon.api.qloo.com`; set `QLOO_API_BASE` only when Qloo instructs you to use another host.

### Shared hosting

If environment variables are unavailable, copy `tastematch-config.example.php` to `.tastematch-config.php` **one directory above the public web root**, add the keys, and never commit or publicly serve that private file.

## Test before publishing

1. Open `tests/markdown-renderer.test.html` through the local PHP server.
2. Confirm the page title begins with `PASS`.
3. Open `api.php?action=status` and confirm Qloo reports as configured.
4. Test Qloo discovery, Groq Markdown output, follow-up chat, Save, language switching, and PWA installation.

The Markdown test verifies headings, bold text, lists, tables, code blocks, safe links, and rejection of scripts, images, event handlers, and `javascript:` URLs.

## Security and privacy

- API keys stay in server environment variables or a private file above the web root.
- Both PHP endpoints allow same-origin browser requests, limit payload size, and apply session-based request limits.
- Groq output is parsed with Marked and sanitized with DOMPurify before insertion into the page.
- Saved recommendations and preferences remain in browser local storage.
- Qloo results and Groq suggestions are visibly labeled and are not presented as personal predictions.

Do not commit `.env`, `.tastematch-config.php`, hosting backups, recordings, or real credentials. If a credential is exposed, revoke it immediately.

## Publish externally

Upload the repository contents to a PHP-enabled HTTPS web root. Configure secrets outside the web root, confirm Qloo and Groq endpoints, and test the installed PWA after clearing any older service-worker cache. The live demo must remain publicly accessible to judges without private credentials.

## License

TasteMatch AI is released under the MIT License. The root `LICENSE` file should be selected as the repository license in the GitHub About section. Third-party libraries in `vendor/` retain their own license notices.

## Team

Team leader: Zakir


