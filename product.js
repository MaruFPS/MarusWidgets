document.querySelectorAll('[data-code-panel]').forEach(panel => {
  const tabs = [...panel.querySelectorAll('.code-tab')];
  const code = panel.querySelector('.code-window code');
  const copyButton = panel.querySelector('.copy-code');

  async function loadTab(tab) {
    tabs.forEach(item => item.classList.toggle('active', item === tab));
    code.textContent = 'Loading code…';
    try {
      const response = await fetch(tab.dataset.code, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load code');
      code.textContent = await response.text();
    } catch (error) {
      code.textContent = 'Unable to load this code section.';
    }
  }

  tabs.forEach(tab => tab.addEventListener('click', () => loadTab(tab)));

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent);
      const original = copyButton.textContent;
      copyButton.textContent = 'COPIED';
      setTimeout(() => copyButton.textContent = original, 1100);
    } catch (error) {
      copyButton.textContent = 'SELECT + COPY';
    }
  });

  if (tabs[0]) loadTab(tabs[0]);
});
