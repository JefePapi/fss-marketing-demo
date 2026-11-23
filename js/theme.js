// First paint and interactive switches share the same allowlist and resolver.
if (!globalThis.marketingDesign) await import('./theme-boot.js');
const { resolveTheme, sheets, key } = globalThis.marketingDesign;
export { resolveTheme };

export const THEMES = [
  ['a', 'Night Wall', 'Bold event posters.'],
  ['a-light', 'Night Wall Light', 'Posters on warm paper.'],
  ['b', 'Mission Control', 'Live stats and terrain.'],
  ['c', 'Ribbon Glass', 'Ribbons and frosted glass.'],
  ['current', 'Current (liquid glass)', 'Sky-blue glass panels.'],
].map(([id, label, description]) => ({id, label, description, thumbnail:'./img/themes/' + id + '.webp'}));

export const currentTheme = () => document.documentElement.dataset.theme;
let art;
let revision = 0;
const loadArt = id => import('./themes/' + (id === 'a-light' ? 'a' : id) + '.js');
export const themeHero = ctx => art?.hero(ctx);
export const themeHomeArt = () => art?.terrain?.() || art?.ribbon?.('arrival');
export const themeIcon = route => art?.shortcutIcon?.(route);
export const themeArrow = () => art?.shortcutArrow?.();
export const themeStepArt = step => art?.stepArt?.(step);
export const themeBrand = () => art?.brand?.();

function announce(type) {
  window.dispatchEvent(new Event(type));
}

export async function initTheme() {
  window.addEventListener('popstate', () => {
    const id = globalThis.marketingDesign.fromURL(location.search);
    if (id && id !== currentTheme()) setTheme(id);
  });
  const initial = revision;
  const initialTheme = currentTheme();
  try {
    const module = await loadArt(initialTheme);
    if (revision === initial || (!art && currentTheme() === initialTheme)) {
      art = module;
      announce('designchange');
    }
  } catch { announce('designerror'); }
}

// Keep existing styles active while the browser prepares a replacement.
function stageSheet(name, staged) {
  if (document.querySelector('link[data-design="' + name + '"]')) return;
  const link = document.createElement('link');
  staged.push(link);
  link.rel = 'stylesheet';
  link.href = './css/theme-' + name + '.css';
  link.media = 'print';
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(!!link.sheet), 4000);
    function finish(ok) {
      clearTimeout(timer);
      link.onload = link.onerror = null;
      if (ok) resolve();
      else reject(new Error('Design stylesheet unavailable'));
    }
    link.onload = () => finish(true);
    link.onerror = () => finish(false);
    link.dataset.staged = name;
    document.head.append(link);
  });
}

export async function setTheme(id, {persist = true} = {}) {
  if (!THEMES.some(theme => theme.id === id)) return false;
  const request = ++revision;
  const names = sheets(id);
  const staged = [];
  try {
    const [module] = await Promise.all([loadArt(id), ...names.map(name => stageSheet(name, staged))]);
    if (request !== revision) return false;
    const url = new URL(location.href);
    url.searchParams.set('theme', id);
    history.replaceState(history.state, '', url);
    for (const link of staged) {
      link.dataset.design = link.dataset.staged;
      delete link.dataset.staged;
      link.media = 'all';
    }
    for (const link of document.querySelectorAll('link[data-design]')) {
      if (!names.includes(link.dataset.design)) link.remove();
    }
    art = module;
    document.documentElement.dataset.theme = id;
    if (persist) {
      try { localStorage.setItem(key, id); } catch {}
    }
    announce('designchange');
    return true;
  } catch {
    if (request === revision) announce('designerror');
    return false;
  } finally {
    for (const link of staged) if (link.dataset.staged) link.remove();
  }
}
