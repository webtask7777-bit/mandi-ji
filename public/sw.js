// Cache only the public shell/assets. Prices and signed-in API responses always
// come from the network, so offline caches cannot masquerade as current quotes.
const CACHE_NAME = 'sahibhav-v3';
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
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    })());
  }
});
