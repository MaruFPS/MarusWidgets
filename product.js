const VIEWER_IMPORT_URL = 'widgets/Viewer-Counter/Viewer-Counter.pogly.json';
const VIEWER_CODE_KEYS = new Set([
  'code/viewer/html.txt',
  'code/viewer/css.txt',
  'code/viewer/js.txt',
  'code/viewer/fields.txt',
  'code/viewer/pogly.txt',
]);

const CHAT_CODE_FILES = {
  'code/chat/html.txt': 'widgets/mChat/mChat.html',
  'code/chat/css.txt': 'widgets/mChat/mChat.css',
  'code/chat/js.txt': 'widgets/mChat/mChat.js',
  'code/chat/fields.txt': 'widgets/mChat/mChat.json'
};

document.querySelectorAll('[data-code-panel]').forEach(panel => {
  const tabs = [...panel.querySelectorAll('.code-tab')];
  const code = panel.querySelector('.code-window code');
  const copyButton = panel.querySelector('.copy-code');
  const chatCache = new Map();
  let viewerSectionsPromise = null;
  let requestId = 0;

  async function loadTab(tab) {
    const id = ++requestId;

    tabs.forEach(item =>
      item.classList.toggle('active', item === tab)
    );

    const key = tab.dataset.code;

    if (VIEWER_CODE_KEYS.has(key)) {
      code.textContent = 'Loading code?';
      copyButton.disabled = true;

      try {
        if (!viewerSectionsPromise) {
          viewerSectionsPromise = fetch(
            VIEWER_IMPORT_URL,
            { cache: 'no-cache' }
          )
          .then(response => {
            if (!response.ok) {
              throw new Error('HTTP ' + response.status);
            }
            return response.json();
          })
          .then(data => {
            if (
              typeof data.bodyTag !== 'string' ||
              typeof data.styleTag !== 'string' ||
              typeof data.scriptTag !== 'string' ||
              !Array.isArray(data.variables)
            ) {
              throw new Error('Invalid Pogly import data');
            }

            return {
              'code/viewer/html.txt': data.bodyTag,
              'code/viewer/css.txt': data.styleTag,
              'code/viewer/js.txt': data.scriptTag,
              'code/viewer/fields.txt':
                JSON.stringify(data.variables, null, 2) + '\n',
              'code/viewer/pogly.txt':
                JSON.stringify(data, null, 2) + '\n'
            };
          })
          .catch(error => {
            viewerSectionsPromise = null;
            throw error;
          });
        }

        const sections = await viewerSectionsPromise;

        if (id !== requestId) return;

        code.textContent = sections[key];
        copyButton.disabled = false;
      } catch (error) {
        if (id !== requestId) return;

        console.error(
          'Unable to load Viewer Counter source:',
          key,
          error
        );

        code.textContent = 'Unable to load this code section.';
      }

      return;
    }


    if (Object.prototype.hasOwnProperty.call(CHAT_CODE_FILES, key)) {
      code.textContent = 'Loading code?';
      copyButton.disabled = true;

      try {
        let text = chatCache.get(key);

        if (text === undefined) {
          const response = await fetch(
            CHAT_CODE_FILES[key],
            { cache: 'no-cache' }
          );

          if (!response.ok) {
            throw new Error('HTTP ' + response.status);
          }

          text = await response.text();
          chatCache.set(key, text);
        }

        // Prevent older requests from overwriting newer tabs.
        if (id !== requestId) return;

        code.textContent = text;
        copyButton.disabled = false;
      } catch (error) {
        if (id !== requestId) return;

        console.error('Unable to load mChat source:', key, error);
        code.textContent = 'Unable to load this code section.';
      }

      return;
    }

    code.textContent = 'Unable to load this code section.';
    copyButton.disabled = true;
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => loadTab(tab));
  });

  copyButton.addEventListener('click', async () => {
    if (copyButton.disabled) return;

    try {
      await navigator.clipboard.writeText(code.textContent);

      const original = copyButton.textContent;
      copyButton.textContent = 'COPIED';

      setTimeout(() => {
        copyButton.textContent = original;
      }, 1100);
    } catch (error) {
      copyButton.textContent = 'SELECT + COPY';
    }
  });

  if (tabs[0]) {
    loadTab(tabs[0]);
  }
});
