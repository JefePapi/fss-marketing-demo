// Classic script in the head. Only allow known local assets at first paint.
(() => {
  if (globalThis.marketingDesign) return;
  const ids = ['a', 'a-light', 'b', 'c', 'current'];
  const aliases = new Map([['night','a'], ['night-light','a-light'], ['mission','b'], ['ribbon','c']]);
  const canonical = value => ids.includes(value) ? value : aliases.get(value);
  const fromURL = search => canonical(new URLSearchParams(search).get('theme'));
  const resolveTheme = (search, stored) => fromURL(search) || canonical(stored) || 'a';
  const sheets = id => id === 'a-light' ? ['a', 'a-light'] : [id];
  const key = 'mktdemo.theme';
  globalThis.marketingDesign = { resolveTheme, fromURL, sheets, key };
  if (typeof document === 'undefined') return;

  let stored;
  try { stored = localStorage.getItem(key); } catch {}
  const id = resolveTheme(location.search, stored);
  if (fromURL(location.search)) {
    try { localStorage.setItem(key, id); } catch {}
  }
  document.documentElement.dataset.theme = id;
  for (const name of sheets(id)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './css/theme-' + name + '.css';
    link.dataset.design = name;
    link.setAttribute('blocking', 'render');
    document.head.append(link);
  }
})();
