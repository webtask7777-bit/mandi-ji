export function shouldResetRouteScroll(previousPath, nextPath, navigationType, hash) {
  return Boolean(previousPath && previousPath !== nextPath && navigationType !== 'POP' && !hash);
}

// A fragment may arrive before a lazy route or an API-backed section exists.
// Stop after one scroll, on navigation cleanup, or as soon as the reader acts.
export function startRouteHashScroll({ hash, document: doc, window: win, timeoutMs = 15000 }) {
  let id;
  try { id = decodeURIComponent(String(hash || '').replace(/^#/, '')); } catch { return () => {}; }
  if (!id || !doc || !win) return () => {};
  let stopped = false;
  let frame = null;
  let timer = null;
  let observer;
  const events = ['pointerdown', 'wheel', 'touchstart', 'keydown'];
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    if (frame !== null) win.cancelAnimationFrame(frame);
    if (timer !== null) win.clearTimeout(timer);
    observer?.disconnect();
    for (const event of events) win.removeEventListener(event, cleanup, true);
  };
  const attempt = () => {
    if (stopped || frame !== null) return;
    frame = win.requestAnimationFrame(() => {
      frame = null;
      if (stopped) return;
      const target = doc.getElementById(id);
      // Suspense can retain a hidden route. A mounted target can also move while
      // API-backed content above it is loading; wait for the page's ready signal.
      if (!target || !target.getClientRects().length || target.getAttribute('data-scroll-ready') === 'false') return;
      target.scrollIntoView({ block: 'start', behavior: 'auto' });
      cleanup();
    });
  };
  for (const event of events) win.addEventListener(event, cleanup, { capture: true, passive: true });
  if (win.MutationObserver) {
    observer = new win.MutationObserver(attempt);
    observer.observe(doc.getElementById('root') || doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'hidden', 'data-scroll-ready'] });
  }
  timer = win.setTimeout(cleanup, timeoutMs);
  attempt();
  return cleanup;
}
