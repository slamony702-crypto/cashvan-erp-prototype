/* هومي — Service Worker باستراتيجية Network-first
   يجلب من الشبكة أولًا دائمًا (فتصل آخر نسخة فورًا)،
   ويرجع للنسخة المحفوظة فقط عند غياب الاتصال أو بطئه الشديد. */
const CACHE = 'homy-net-v4';
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

/* Network-first لكل الطلبات: الشبكة أولًا بمهلة قصيرة،
   ثم الذاكرة كنسخة احتياطية عند تعذّر الوصول. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith(
    Promise.race([
      fetch(req).then(r => {
        if (r && r.ok && (r.type === 'basic' || req.mode === 'navigate')) {
          const cp = r.clone();
          const key = req.mode === 'navigate' ? './index.html' : req;
          caches.open(CACHE).then(c => c.put(key, cp));
        }
        return r;
      }),
      new Promise(res => setTimeout(() => res(null), 2500))
    ])
      .then(r => r || caches.match(req).then(h => h || caches.match('./index.html')))
      .catch(() => caches.match(req).then(h => h || caches.match('./index.html')))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
