// ============================================
// Mizan Pro — Service Worker
// Avtomatik yangilanadigan cache
// ============================================

const CACHE_VERSION = '3.0.0';
const CACHE_NAME = `mizan-pro-v${CACHE_VERSION}`;

const URLS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/aws4fetch@1.0.19/dist/aws4fetch.umd.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap'
];

// ============================================
// 1. INSTALL
// ============================================
self.addEventListener('install', event => {
    console.log('[SW] Install — versiya:', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cache yaratildi:', CACHE_NAME);
                return cache.addAll(URLS_TO_CACHE).catch(err => {
                    console.warn('[SW] Ba\'zi fayllar yuklanmadi:', err);
                });
            })
            .then(() => self.skipWaiting())
    );
});

// ============================================
// 2. ACTIVATE
// ============================================
self.addEventListener('activate', event => {
    console.log('[SW] Activate — versiya:', CACHE_VERSION);
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Eski cache o\'chirildi:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ============================================
// 3. FETCH
// ============================================
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Supabase, R2 va boshqa API so'rovlarini cache qilmaymiz
    if (url.includes('supabase.co') || 
        url.includes('r2.dev') ||
        url.includes('r2.cloudflarestorage.com')) {
        return;
    }

    // index.html uchun — network-first
    if (url.includes('index.html') || url.endsWith('/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Boshqa fayllar — cache-first
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (event.request.method === 'GET' && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => caches.match(event.request));
        })
    );
});

// ============================================
// 4. MESSAGE
// ============================================
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] SKIP_WAITING xabari qabul qilindi');
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }
});

console.log('[SW] Service Worker yuklandi — versiya:', CACHE_VERSION);