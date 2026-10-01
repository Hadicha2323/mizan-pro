const CACHE_NAME = 'mizan-pro-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/aws4fetch@1.0.19/dist/aws4fetch.umd.js',
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap'
];

// O‘rnatish
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(err => {
        console.warn('Cache xato:', err);
      });
    })
  );
  self.skipWaiting();
});

// Faollashtirish
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// So‘rovlarni ushlash
self.addEventListener('fetch', event => {
  // Supabase va R2 so‘rovlarini cache qilmaymiz
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('r2.dev') ||
      event.request.url.includes('r2.cloudflarestorage.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Offline bo‘lsa cache'dan qaytarish
        return caches.match(event.request);
      });
    })
  );
});