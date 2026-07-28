/* هومي — Service Worker باستراتيجية Network-first
   يجلب من الشبكة أولًا دائمًا (فتصل آخر نسخة فورًا)،
   ويرجع للنسخة المحفوظة فقط عند غياب الاتصال أو بطئه الشديد.
   وعند تفعيل نسخة جديدة يعيد تحميل كل التبويبات المفتوحة تلقائيًا. */
const CACHE = 'homy-net-v6';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(() => c.add('./index.html')))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    /* إعادة تحميل أي تبويب مفتوح كان يعمل بنسخة قديمة */
    try {
      const cls = await self.clients.matchAll({ type: 'window' });
      cls.forEach(c => { if ('navigate' in c) { try { c.navigate(c.url); } catch (_) {} } });
    } catch (_) {}
  })());
});

/* Network-first لكل الطلبات: الشبكة أولًا بمهلة قصيرة،
   ثم الذاكرة كنسخة احتياطية عند تعذّر الوصول. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  /* للصفحة والسكربتات: تجاوز كاش المتصفح (HTTP) وأحضر من الشبكة مباشرة */
  const fresh = (req.mode === 'navigate' || req.destination === 'script' || req.destination === 'document')
    ? fetch(req, { cache: 'no-store' }) : fetch(req);

  e.respondWith(
    Promise.race([
      fresh.then(r => {
        if (r && r.ok && (r.type === 'basic' || req.mode === 'navigate')) {
          const cp = r.clone();
          const key = req.mode === 'navigate' ? './index.html' : req;
          caches.open(CACHE).then(c => c.put(key, cp));
        }
        return r;
      }),
      new Promise(res => setTimeout(() => res(null), 3000))
    ])
      .then(r => r || caches.match(req).then(h => h || caches.match('./index.html')))
      .catch(() => caches.match(req).then(h => h || caches.match('./index.html')))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
