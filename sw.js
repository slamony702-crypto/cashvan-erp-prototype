/* هومي — Service Worker: يعمل التطبيق كاملًا دون إنترنت */
const CACHE = 'homy-rep-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(() => c.add('./index.html')))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* الصفحة: من الشبكة أولًا (بمهلة قصيرة) مع رجوع إلى النسخة المحفوظة.
   بقية الملفات: من الذاكرة أولًا ثم الشبكة. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    e.respondWith(
      Promise.race([
        fetch(req).then(r => {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', cp));
          return r;
        }),
        new Promise(res => setTimeout(() => res(null), 3500))
      ]).then(r => r || caches.match('./index.html'))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok && r.type === 'basic') {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
      }
      return r;
    }).catch(() => hit || caches.match('./index.html')))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
