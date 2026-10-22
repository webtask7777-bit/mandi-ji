import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { shouldResetRouteScroll, startRouteHashScroll } from '../src/utils/routeScroll.js';

function browserFixture() {
  let observerCallback;
  let disconnected = false;
  let nextFrame = 1;
  let timeout;
  const frames = new Map();
  const listeners = new Map();
  const targets = new Map();
  const document = { documentElement: {}, getElementById: id => targets.get(id) || null };
  const window = {
    requestAnimationFrame: callback => { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: callback => { timeout = callback; return 1; },
    clearTimeout: () => { timeout = null; },
    addEventListener: (event, callback) => listeners.set(event, callback),
    removeEventListener: event => listeners.delete(event),
    MutationObserver: class {
      constructor(callback) { observerCallback = callback; }
      observe() {}
      disconnect() { disconnected = true; }
    },
  };
  return {
    document, window, targets, listeners,
    frame: () => { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(); },
    mutate: () => { if (!disconnected) observerCallback?.(); },
    interact: event => listeners.get(event)?.(),
    timeout: () => timeout?.(),
    target: (id, visible = true) => {
      const target = { visible, ready: null, calls: [], getClientRects() { return this.visible ? [{}] : []; }, getAttribute(name) { return name === 'data-scroll-ready' ? this.ready : null; }, scrollIntoView(options) { this.calls.push(options); } };
      targets.set(id, target);
      return target;
    },
  };
}

test('new page pushes reset to top while filters, initial load and history traversal keep position', () => {
  assert.equal(shouldResetRouteScroll('/ur/mandi-bhav', '/ur/blog', 'PUSH', ''), true);
  assert.equal(shouldResetRouteScroll('/blog', '/ur/blog', 'REPLACE', ''), true);
  assert.equal(shouldResetRouteScroll('/ur/blog', '/ur/blog', 'PUSH', ''), false);
  assert.equal(shouldResetRouteScroll('/ur/blog', '/ur/mandi-bhav', 'POP', ''), false);
  assert.equal(shouldResetRouteScroll(null, '/ur/blog', 'POP', ''), false);
  assert.equal(shouldResetRouteScroll('/ur/blog', '/ur/mandi-bhav', 'PUSH', '#language-delivery'), false);
});

test('fragment navigation waits for lazy or API-backed DOM and scrolls exactly once', () => {
  const browser = browserFixture();
  startRouteHashScroll({ hash: '#language-delivery', ...browser });
  browser.frame();
  const target = browser.target('language-delivery');
  browser.mutate(); browser.frame();
  assert.deepEqual(target.calls, [{ block: 'start', behavior: 'auto' }]);
  browser.mutate(); browser.frame();
  assert.equal(target.calls.length, 1);
  assert.equal(browser.listeners.size, 0, 'listeners are removed after the destination is reached');
});

test('hidden Suspense content is not scrolled until its real section becomes visible', () => {
  const browser = browserFixture();
  const target = browser.target('कृषि', false);
  startRouteHashScroll({ hash: '#%E0%A4%95%E0%A5%83%E0%A4%B7%E0%A4%BF', ...browser });
  browser.frame();
  assert.equal(target.calls.length, 0);
  target.visible = true; browser.mutate(); browser.frame();
  assert.equal(target.calls.length, 1);
});

test('mounted calculator waits until upstream API content has settled before jumping', () => {
  const browser = browserFixture();
  const target = browser.target('language-delivery');
  target.ready = 'false';
  startRouteHashScroll({ hash: '#language-delivery', ...browser });
  browser.frame();
  assert.equal(target.calls.length, 0, 'mounting the calculator does not mean its position is stable');
  browser.mutate(); browser.frame();
  assert.equal(target.calls.length, 0, 'intermediate API renders keep waiting');
  target.ready = 'true'; browser.mutate(); browser.frame();
  assert.deepEqual(target.calls, [{ block: 'start', behavior: 'auto' }]);
  assert.equal(browser.listeners.size, 0);
});

test('reader interaction cancels a pending ready-state jump', () => {
  const browser = browserFixture();
  const target = browser.target('language-guides');
  target.ready = 'false';
  startRouteHashScroll({ hash: '#language-guides', ...browser });
  browser.frame();
  browser.interact('wheel');
  target.ready = 'true'; browser.mutate(); browser.frame();
  assert.equal(target.calls.length, 0, 'late API completion cannot override the reader');
});

test('late content cannot pull the viewport after user input, a route change or timeout', () => {
  for (const cancellation of ['pointerdown', 'wheel', 'touchstart', 'keydown', 'route', 'timeout']) {
    const browser = browserFixture();
    const stop = startRouteHashScroll({ hash: '#language-prices', ...browser });
    browser.frame();
    if (cancellation === 'route') stop();
    else if (cancellation === 'timeout') browser.timeout();
    else browser.interact(cancellation);
    const target = browser.target('language-prices');
    browser.mutate(); browser.frame();
    assert.equal(target.calls.length, 0, cancellation);
    assert.equal(browser.listeners.size, 0, cancellation);
  }
});

test('malformed and empty fragments are ignored without leaving listeners behind', () => {
  for (const hash of ['', '#', '#%zz']) {
    const browser = browserFixture();
    startRouteHashScroll({ hash, ...browser });
    browser.frame();
    assert.equal(browser.listeners.size, 0);
  }
});

test('native tools keep downstream jumps pending through dependent API requests, then release on success or error', { skip: existsSync(new URL('../dist-ssr/entry-server.js', import.meta.url)) ? false : 'Build SSR first.' }, async () => {
  const { renderPage } = await import('../dist-ssr/entry-server.js');
  const route = '/ur/mandi-bhav?crop=wheat#language-delivery';
  const statesAndCrops = {
    '/states': { data: [] },
    '/crops?state=all': { data: [{ id: 'wheat', name: 'Wheat', nameHi: 'गेहूँ' }] },
  };
  const pricesPath = '/prices/wheat?state=all&months=13';
  for (const [responses, ready] of [
    [{}, false],
    [statesAndCrops, false],
    [{ ...statesAndCrops, [pricesPath]: { data: { dailyHistory: [{ date: '2026-10-16', market: 2000 }], history: [] } } }, true],
    [{ ...statesAndCrops, [pricesPath]: { error: 'API 503' } }, true],
  ]) {
    const result = await renderPage(route, responses);
    for (const id of ['language-delivery', 'language-guides']) {
      const section = result.html.match(new RegExp(`<section id="${id}"[^>]*>`))?.[0];
      assert.ok(section, `${id} is mounted while loading`);
      assert.match(section, new RegExp(`data-scroll-ready="${ready}"`));
    }
  }
});
