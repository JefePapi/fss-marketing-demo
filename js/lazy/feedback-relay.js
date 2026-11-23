import { h } from '../ui.js';

export const FEEDBACK_RELAY_URL = 'https://fss-demo-feedback.jefepapi.workers.dev/feedback';
export const TURNSTILE_SITE_KEY = '0x4AAAAAAGHZ9lCct43QwQB_';

export function relayResult(status, body) {
  if (status >= 200 && status < 300 && body?.ok === true)
    return {delivery:'sent', issue:body.number, text:'Sent to the marketing team.'};
  const reason = status === 503 ? "Shared sending isn't switched on yet."
    : status === 429 ? 'Too many messages right now — try again in a minute.'
    : "We couldn't send it right now.";
  return {delivery:'local', text:'Saved in this browser. ' + reason};
}

export async function postFeedback(entry, token, screenshot) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const {type, message, name, page, route, theme} = entry;
    const response = await fetch(FEEDBACK_RELAY_URL, {
      method:'POST', mode:'cors', credentials:'omit', referrerPolicy:'no-referrer', redirect:'error',
      headers:{'Content-Type':screenshot ? 'application/json; screenshot=jpeg' : 'application/json'},
      signal:controller.signal,
      body:JSON.stringify({type:type.toLowerCase(), message, name, page:page.slice(0, 200),
        route:route.slice(0, 200), theme, ...(token && {turnstileToken:token}),
        ...(screenshot && {id:entry.id, screenshot})}),
    });
    if (screenshot && [413, 422, 429].includes(response.status)) {
      const screenshotError = response.status === 413 ? 'This screenshot is too large.'
        : response.status === 429 ? 'Screenshots are busy right now.'
        : 'Could not read this screenshot.';
      return {delivery:'local', screenshotError};
    }
    return relayResult(response.status, response.ok ? await response.json() : null);
  } catch {
    return relayResult(0);
  } finally {
    clearTimeout(timeout);
  }
}

let loading;
function loadTurnstile() {
  if (!loading) loading = new Promise((resolve, reject) => {
    const script = h('script', {
      src:'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
      async:true, onload:() => resolve(window.turnstile),
      onerror:() => { script.remove(); loading = undefined; reject(new Error('Check unavailable')); },
    });
    document.head.append(script);
  });
  return loading;
}

// Each open form owns one widget. Ignore a late script load after the sheet closes.
export function feedbackCheck() {
  const container = TURNSTILE_SITE_KEY && h('div', {class:'feedback-check'});
  let id, token = '', closed = false;
  return {
    container,
    token:() => token,
    async mount() {
      if (!container) return;
      try {
        const api = await loadTurnstile();
        if (closed || !container.isConnected) return;
        const theme = getComputedStyle(container).colorScheme === 'dark' ? 'dark' : 'light';
        id = api.render(container, {sitekey:TURNSTILE_SITE_KEY, theme,
          size:container.clientWidth < 300 ? 'compact' : 'flexible',
          callback:value => { token = value; }, 'expired-callback':() => { token = ''; },
          'error-callback':() => { token = ''; },
        });
      } catch {
        container.textContent = 'The check could not load. You can still save feedback.';
      }
    },
    remove() {
      closed = true;
      // A provider cleanup error must not prevent dismissal or hide a confirmed send.
      try { if (id != null) window.turnstile.remove(id); } catch { /* The sheet removes the container. */ }
      id = undefined;
      token = '';
    },
  };
}
