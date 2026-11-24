import { h } from '../ui.js';

export const FEEDBACK_RELAY_URL = 'https://fss-demo-feedback.jefepapi.workers.dev/feedback';
export const TURNSTILE_SITE_KEY = '0x4AAAAAAGHZ9lCct43QwQB_';

export function relayResult(status, body, withScreenshot = false) {
  if (status >= 200 && status < 300 && body?.ok === true) {
    const screenshotStatus = body.screenshot === 'attached' ? 'attached'
      : body.screenshot === 'failed' || withScreenshot ? 'failed' : undefined;
    const text = screenshotStatus === 'attached' ? 'Your feedback and screenshot were sent to the marketing team.'
      : screenshotStatus === 'failed' ? 'Your written feedback was sent to the marketing team. We could not confirm your screenshot.'
      : 'Sent to the marketing team.';
    return {delivery:'sent', issue:body.number, text, ...(screenshotStatus && {screenshotStatus})};
  }
  const reason = status === 503 ? "Shared sending isn't switched on yet."
    : status === 429 ? 'Too many messages right now — try again in a minute.'
    : "We couldn't send it right now.";
  return {delivery:'local', text:'Saved in this browser. ' + reason};
}

export async function postFeedback(entry, token, screenshot) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), screenshot || entry.imageSubmission ? 20_000 : 10_000);
  const screenshotFailure = {delivery:'local', screenshotError:'Could not send this screenshot.', refreshCheck:true};
  try {
    const {type, message, name, page, route, theme} = entry;
    const contentType = screenshot ? 'application/json; screenshot=jpeg'
      : entry.imageSubmission ? `application/json; submission=${entry.id}` : 'application/json';
    const response = await fetch(FEEDBACK_RELAY_URL, {
      method:'POST', mode:'cors', credentials:'omit', referrerPolicy:'no-referrer', redirect:'error',
      headers:{'Content-Type':contentType},
      signal:controller.signal,
      body:JSON.stringify({type:type.toLowerCase(), message, name, page:page.slice(0, 200),
        route:route.slice(0, 200), theme, ...(token && {turnstileToken:token}),
        ...(screenshot && {id:entry.id, screenshot})}),
    });
    if (screenshot && [413, 422, 429].includes(response.status)) {
      const screenshotError = response.status === 413 ? 'This screenshot is too large.'
        : response.status === 429 ? 'Screenshots are busy right now.'
        : 'Could not read this screenshot.';
      // The pre-check can refuse an image before its token reaches siteverify.
      const refreshCheck = response.status === 429 &&
        (await response.json().catch(() => null))?.checkUsed !== false;
      return {delivery:'local', screenshotError, refreshCheck};
    }
    const result = relayResult(response.status, response.ok ? await response.json() : null, Boolean(screenshot));
    if (screenshot && result.delivery !== 'sent') {
      const refreshCheck = response.status === 403 || response.status >= 500 || response.ok;
      return {...screenshotFailure, refreshCheck};
    }
    return result;
  } catch {
    return screenshot ? screenshotFailure : relayResult(0);
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
  let id, token = '', closed = false, unavailable = !container, resolveReady, readyTimer;
  function notifyReady() {
    clearTimeout(readyTimer);
    resolveReady?.(token);
    resolveReady = undefined;
  }
  function checkFailed() {
    token = '';
    unavailable = true;
    notifyReady();
  }
  return {
    container,
    token:() => token,
    waitForToken() {
      if (token || unavailable || closed) return Promise.resolve(token);
      return new Promise(resolve => {
        resolveReady = resolve;
        readyTimer = setTimeout(notifyReady, 8000);
      });
    },
    async mount() {
      if (!container) return;
      try {
        const api = await loadTurnstile();
        if (closed || !container.isConnected) return;
        const theme = getComputedStyle(container).colorScheme === 'dark' ? 'dark' : 'light';
        id = api.render(container, {sitekey:TURNSTILE_SITE_KEY, theme,
          size:container.clientWidth < 300 ? 'compact' : 'flexible',
          callback:value => {
            token = value;
            unavailable = false;
            if (token) notifyReady();
          },
          'expired-callback':() => { token = ''; },
          'error-callback':checkFailed,
        });
      } catch {
        checkFailed();
        container.textContent = 'The check could not load. You can still save feedback.';
      }
    },
    reset() {
      token = '';
      // The preceding send may already have used this token.
      try { if (id != null) window.turnstile.reset(id); } catch { checkFailed(); }
    },
    remove() {
      closed = true;
      // A provider cleanup error must not prevent dismissal or hide a confirmed send.
      try { if (id != null) window.turnstile.remove(id); } catch { /* The sheet removes the container. */ }
      id = undefined;
      token = '';
      notifyReady();
    },
  };
}
