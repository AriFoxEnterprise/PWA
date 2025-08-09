/* service-worker.js - cache simples + showNotification support */
const CACHE_NAME = 'clima-inteligente-cache-v1';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  // Strategy: cache-first for app shell, fallback to network
  if (evt.request.mode === 'navigate' || evt.request.destination === 'document') {
    evt.respondWith(
      caches.match(evt.request).then(cached => {
        return cached || fetch(evt.request).then(resp => {
          return caches.open(CACHE_NAME).then(cache => {
            try { cache.put(evt.request, resp.clone()); } catch(e){}
            return resp;
          });
        }).catch(()=> caches.match('./index.html'));
      })
    );
    return;
  }

  evt.respondWith(
    caches.match(evt.request).then(cached => cached || fetch(evt.request).catch(()=>{}))
  );
});

// Simple push-like capability: show notification from client via ServiceWorker registration
self.addEventListener('message', event => {
  const data = event.data;
  if(data && data.type === 'show-notification'){
    const {title, options} = data.payload;
    self.registration.showNotification(title, options);
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(clientList=>{
      if(clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});