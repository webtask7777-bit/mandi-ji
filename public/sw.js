// Cache only the public shell/assets. Prices and signed-in API responses always
// come from the network, so offline caches cannot masquerade as current quotes.
const CACHE_NAME = 'sahibhav-v5';

// SPA fallbacks can answer a missing deployment chunk with 200 HTML. Never
// persist that response under a hashed asset URL (or reuse an older bad entry).
function isUsableAssetResponse(response, pathname) {
  if (!response?.ok || response.type !== 'basic') return false;
  const mime = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (mime === 'text/html' || mime === 'application/xhtml+xml') return false;
  if (/\.(?:js|mjs)$/i.test(pathname)) {
    return ['text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript'].includes(mime);
  }
  if (/\.css$/i.test(pathname)) return mime === 'text/css';
  return Boolean(mime);
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('mandiji-') || (key.startsWith('sahibhav-') && key !== CACHE_NAME)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => new Response(
      '<!doctype html><html lang="hi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>सही भाव — ऑफ़लाइन</title><body style="font-family:system-ui;background:#f7f5ec;color:#174c3c;padding:32px;line-height:1.7"><h1>इंटरनेट से जुड़ें</h1><p>दर्ज मंडी भाव देखने के लिए इंटरनेट कनेक्शन ज़रूरी है। कनेक्शन लौटने पर पेज दोबारा खोलें।</p><button onclick="location.reload()" style="padding:12px 20px">दोबारा कोशिश करें</button></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )));
    return;
  }
  if (/^\/(assets|visuals|fonts|brand)\//.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached && isUsableAssetResponse(cached, url.pathname)) return cached;
      if (cached) await cache.delete(request);
      const response = await fetch(request, cached ? { cache: 'reload' } : undefined);
      if (isUsableAssetResponse(response, url.pathname)) {
        // A full browser cache must not discard a successful network response.
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })());
  }
});
