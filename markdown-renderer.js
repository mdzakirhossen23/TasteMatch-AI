(function () {
  'use strict';

  const allowedTags = [
    'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4',
    'h5', 'h6', 'hr', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody',
    'td', 'th', 'thead', 'tr', 'ul'
  ];

  function plainTextFallback(markdown) {
    return String(markdown || '').replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[character];
    }).replace(/\r?\n/g, '<br>');
  }

  function hardenLinks(html) {
    const template = document.createElement('template');
    template.innerHTML = html;

    template.content.querySelectorAll('a[href]').forEach(function (link) {
      const rawHref = link.getAttribute('href') || '';
      let parsed;

      try {
        parsed = new URL(rawHref, window.location.href);
      } catch (_) {
        link.removeAttribute('href');
        return;
      }

      if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        link.removeAttribute('href');
        return;
      }

      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    });

    return template.innerHTML;
  }

  function render(markdown) {
    if (!window.marked || !window.DOMPurify) {
      return plainTextFallback(markdown);
    }

    const parsed = window.marked.parse(String(markdown || ''), {
      async: false,
      breaks: true,
      gfm: true
    });
    const sanitized = window.DOMPurify.sanitize(parsed, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: ['class', 'href', 'title'],
      FORBID_TAGS: ['form', 'iframe', 'img', 'input', 'object', 'script', 'style', 'svg'],
      KEEP_CONTENT: true
    });

    return hardenLinks(sanitized);
  }

  window.TasteMatchMarkdown = Object.freeze({render: render});
}());

