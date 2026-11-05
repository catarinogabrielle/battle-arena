/**
 * SERVICE WORKER - BATTLE ARENA: LAST ONE STANDING
 * Permite funcionamento offline (PWA) e cache acelerado de assets
 */

const CACHE_NAME = 'battle-arena-v2.7';

const STATIC_ASSETS = [
    './',
    './index.html',
    './login.html',
    './menu.html',
    './arena.html',
    './style-login.css',
    './style-menu.css',
    './style-arena.css',
    './script-menu.js',
    './script-arena.js',
    './manifest.json',
    './favicon.ico',
    './assets/logo-los.png',
    './assets/pwa-icon-192.png',
    './assets/pwa-icon-512.png',
    './assets/pwa-icon-maskable.png',
    './assets/fundo.png',
    './assets/fundo-arena.png',
    './assets/kaelen.png',
    './assets/elara.png',
    './assets/malacor.png',
    './assets/lyra.png',
    './assets/silas.png',
    './assets/morwen.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Pré-carregando assets estáticos...');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[ServiceWorker] Removendo cache antigo:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Ignora requisições de socket.io e requisições não-GET
    if (event.request.method !== 'GET' || event.request.url.includes('/socket.io/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Atualiza cache em segundo plano (stale-while-revalidate)
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            }).catch(() => {
                // Se offline e for navegação, retorna menu.html do cache
                if (event.request.mode === 'navigate') {
                    return caches.match('./menu.html');
                }
            });
        })
    );
});
