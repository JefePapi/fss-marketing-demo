import { toast } from './ui.js';
import { feedbackEntries } from './store.js';

export function initFeedbackControls() {
  const pill = document.getElementById('feedback-open');
  for (const button of document.querySelectorAll('#feedback-open,.feedback-link')) {
    button.addEventListener('click', async () => {
      const route = location.hash;
      try {
        const { openFeedback } = await import('./lazy/feedback.js');
        if (location.hash === route) openFeedback(button);
      } catch { toast('Feedback could not open. Try again.'); }
    });
  }

  function updateBadge() {
    const count = document.getElementById('feedback-count');
    if (count) count.textContent = feedbackEntries().filter(entry => !entry.read).length;
  }
  window.addEventListener('feedbackchange', updateBadge);
  window.addEventListener('storage', event => {
    if (!event.key || event.key === 'mktdemo.feedback') window.dispatchEvent(new Event('feedbackchange'));
  });

  // Keep the lowest free 48px on the right edge. The observer limits geometry
  // reads to controls in that strip. A crowded edge has a reserved banner slot.
  const controls = 'a,button,input,select,textarea,summary,label,.tray,[tabindex="0"]';
  let observer, frame;
  const watched = new Set();
  const visible = new Set();
  function place() {
    frame = 0;
    if (!observer || document.documentElement.classList.contains('scrolling')) return;
    const height = document.documentElement.clientHeight;
    let bottom = height - 12;
    const boxes = Array.from(visible, node => node.getBoundingClientRect()).sort((a,b) => b.bottom - a.bottom);
    for (const box of boxes) {
      if (box.bottom + 6 > bottom - 48 && box.top - 6 < bottom) bottom = box.top - 6;
    }
    pill.classList.toggle('docked', bottom < height / 2);
    pill.style.translate = '0 ' + (bottom + 12 - height) + 'px';
  }
  function schedule() {
    if (observer && !frame) frame = requestAnimationFrame(place);
  }
  function syncTargets() {
    if (!observer) return;
    for (const node of watched) {
      if (node.isConnected) continue;
      observer.unobserve(node);
      watched.delete(node);
      visible.delete(node);
    }
    for (const node of document.body.querySelectorAll(controls)) {
      if (node === pill || watched.has(node)) continue;
      watched.add(node);
      observer.observe(node);
    }
    schedule();
  }
  function resize() {
    observer?.disconnect();
    observer = null;
    watched.clear();
    visible.clear();
    if (!matchMedia('(min-width:900px)').matches) return;
    const left = Math.max(0, document.documentElement.clientWidth - 148);
    pill.classList.add('docked');
    observer = new IntersectionObserver(entries => {
      for (const {target, isIntersecting} of entries) {
        if (isIntersecting && target.isConnected) visible.add(target);
        else visible.delete(target);
      }
      place();
    }, {rootMargin:`0px 0px 0px -${left}px`});
    syncTargets();
  }
  new MutationObserver(syncTargets).observe(document.body, {childList:true, subtree:true});
  window.addEventListener('scrollidle', place);
  window.addEventListener('resize', resize);
  resize();
}
