// 进阶题库的离线缓存，由 web/scripts/make-pages.mjs 生成
  const VERSION = 'c927dd934a302499';
  const CACHE = 'jj-' + VERSION;
  const FILES = ['./', './manifest.webmanifest', './icon-180.png', './icon-512.png'];
  function fill() {
    return caches.open(CACHE).then(async function (cache) {
      await cache.addAll(FILES.map(function (u) { return new Request(u, { cache: 'reload' }); }));
      const page = await cache.match('./');
      if (!(await page.text()).includes('<meta name="jj-version" content="' + VERSION + '"')) {
        throw new Error('题库版本已变化');
      }
    }).catch(async function (error) { await caches.delete(CACHE); throw error; });
  }
  self.addEventListener('install', function (e) {
    e.waitUntil(fill().then(function () { return self.skipWaiting(); }));
  });
  self.addEventListener('message', function (e) {
    if (!e.data || !['jj-status', 'jj-repair'].includes(e.data.type)) return;
    e.waitUntil((async function () {
      const cache = await caches.open(CACHE);
      const urls = (await cache.keys()).map(function (k) { return k.url; });
      let ready = FILES.every(function (f) { return urls.includes(new URL(f, self.registration.scope).href); });
      if (!ready && e.data.type === 'jj-repair') {
        try { await fill(); ready = true; } catch { /* 联网后重试 */ }
      }
      e.source.postMessage({ type: 'jj-status', version: VERSION, ready: ready });
    })());
  });
  self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k.indexOf('jj-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); }));
  });
  self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (req.mode === 'navigate') {
      e.respondWith(caches.open(CACHE).then(function (c) {
        return c.match('./').then(function (hit) { return hit || fetch(req); });
      }));
      return;
    }
    e.respondWith(caches.open(CACHE).then(function (c) { return c.match(req, { ignoreSearch: true }); }).then(function (hit) { return hit || fetch(req); }));
  });
  