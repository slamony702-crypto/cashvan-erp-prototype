/* هومي — مفتاح إيقاف Service Worker
   يمسح كل الكاش القديم ويُلغي تسجيل نفسه ويعيد تحميل كل التبويبات،
   فيتخلّص كل جهاز من النسخة المخزّنة تلقائيًا دون أي تدخّل من المستخدم. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    try {
      const cls = await self.clients.matchAll({ type: 'window' });
      cls.forEach(c => { try { c.navigate(c.url); } catch (_) {} });
    } catch (_) {}
  })());
});
/* لا يوجد معالج fetch — كل الطلبات تذهب إلى الشبكة مباشرة (لا تخزين). */
