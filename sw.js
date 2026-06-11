const CACHE_NAME = 'jere-v1';
const ASSETS = [
  '/Jere/',
  '/Jere/index.html',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500&family=Barlow+Condensed:wght@600;700&family=DM+Mono:wght@300;400&display=swap',
];

// Instalación — cachear assets críticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activación — limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — Cache First para el index.html, Network First para el resto
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Solo manejar GET
  if(event.request.method !== 'GET') return;

  // Cache First para el index.html principal
  if(url.pathname.endsWith('/Jere/') || url.pathname.endsWith('index.html')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const network = fetch(event.request).then(response => {
          if(response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Fuentes de Google — Cache First
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if(cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network First para todo lo demás
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'JERE', {
      body: data.body || '¿Cómo te fue? Calificá tu plan.',
      icon: '/Jere/icons/icon-192.png',
      badge: '/Jere/icons/icon-192.png',
      tag: 'jere-notif',
      renotify: true,
      data: { url: data.url || '/Jere/' }
    })
  );
});

// Click en notificación — abrir la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window'}).then(clientList => {
      const url = event.notification.data?.url || '/Jere/';
      for(const client of clientList) {
        if(client.url.includes('/Jere') && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
