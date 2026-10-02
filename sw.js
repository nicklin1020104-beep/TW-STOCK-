// 飆股情報局：接收開盤／收盤推播通知（不做離線快取）
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (x) {
    d = { body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || '飆股情報局', {
      body: d.body || '',
      icon: '/TW-STOCK-/icon-192.png?v=2',
      badge: '/TW-STOCK-/icon-192.png?v=2',
      tag: d.tag || undefined,
      data: { url: d.url || '/TW-STOCK-/' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/TW-STOCK-/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) if (w.url.indexOf('/TW-STOCK-/') >= 0 && 'focus' in w) return w.focus();
      return self.clients.openWindow(url);
    })
  );
});
