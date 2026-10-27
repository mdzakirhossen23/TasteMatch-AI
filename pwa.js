(() => {
  'use strict';

  const installButton = document.getElementById('installApp');
  const installNotice = document.getElementById('installNotice');
  let installPrompt = null;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', {scope: './'}).catch(() => {});
    });
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
  });

  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (!installPrompt) {
        if (installNotice) installNotice.textContent = 'Use your browser menu and choose Install app or Add to Home Screen.';
        return;
      }
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      installPrompt = null;
      installButton.hidden = true;
      if (installNotice) installNotice.textContent = choice.outcome === 'accepted' ? 'TasteMatch AI is being installed.' : 'Installation was cancelled.';
    });
  }

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    if (installButton) installButton.hidden = true;
    if (installNotice) installNotice.textContent = 'TasteMatch AI is installed.';
  });
})();

