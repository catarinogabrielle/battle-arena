/**
 * SERVICE WORKER - BATTLE ARENA: LAST ONE STANDING
 * v3.0 - Suporte OFFLINE COMPLETO
 * - Fontes e ícones servidos localmente (sem Google Fonts / CDN)
 * - Cache-First para todos os assets do jogo
 * - Fallback offline para navegação
 */

const CACHE_NAME = 'battle-arena-v3.0';

// TODOS os assets necessários para funcionar 100% offline
const STATIC_ASSETS = [
    // Páginas
    './',
    './index.html',
    './menu.html',
    './arena.html',

    // CSS
    './style-menu.css',
    './style-arena.css',

    // JavaScript
    './script-menu.js',
    './script-arena.js',

    // PWA
    './manifest.json',
    './favicon.ico',

    // Imagens de jogo
    './assets/logo-los.png',
    './assets/pwa-icon-192.png',
    './assets/pwa-icon-512.png',
    './assets/pwa-icon-maskable.png',
    './assets/fundo.png',
    './assets/fundo-arena.png',

    // Personagens
    './assets/kaelen.png',
    './assets/elara.png',
    './assets/malacor.png',
    './assets/lyra.png',
    './assets/silas.png',
    './assets/morwen.png',

    // ===== FONTES LOCAIS (OFFLINE READY) =====
    // Font Awesome CSS + Webfonts
    './assets/fontawesome/css/all.min.css',
    './assets/fontawesome/webfonts/fa-solid-900.woff2',
    './assets/fontawesome/webfonts/fa-regular-400.woff2',
    './assets/fontawesome/webfonts/fa-brands-400.woff2',
    './assets/fontawesome/webfonts/fa-v4compatibility.woff2',

    // Google Fonts (auto-hospedadas)
    './assets/fonts/fonts.css',
    './assets/fonts/orbitron.woff2',
    './assets/fonts/rajdhani-500-latin.woff2',
    './assets/fonts/rajdhani-600-latin.woff2',
    './assets/fonts/rajdhani-700-latin.woff2',
    './assets/fonts/inter-400.woff2',
    './assets/fonts/inter-500-latin.woff2',
    './assets/fonts/inter-600-latin.woff2',
    './assets/fonts/inter-700-latin.woff2',
];

// ===== INSTALL: pré-carrega tudo no cache =====
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Instalando cache offline v3.0...');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => {
            console.log('[SW] Cache offline completo!');
            return self.skipWaiting();
        }).catch((err) => {
            console.error('[SW] Erro no cache de instalação:', err);
        })
    );
});

// ===== ACTIVATE: limpa caches antigos =====
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Removendo cache antigo:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Ativado - controlando todos os clientes');
            return self.clients.claim();
        })
    );
});

// ===== FETCH: Cache-First com fallback para rede =====
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Ignora: Socket.io (multiplayer online), requisições não-GET, extensões do browser
    if (
        event.request.method !== 'GET' ||
        url.includes('/socket.io/') ||
        url.includes('/api/') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('moz-extension://')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Encontrado no cache — serve imediatamente (offline ok!)
                // Atualiza em background quando online (stale-while-revalidate)
                if (navigator.onLine) {
                    fetch(event.request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(event.request, networkResponse);
                                });
                            }
                        })
                        .catch(() => {}); // silencioso se offline
                }
                return cachedResponse;
            }

            // Não está no cache — tenta a rede
            return fetch(event.request)
                .then((networkResponse) => {
                    // Cache dinâmico: salva resposta 200 de same-origin ou CDN de fontes
                    if (
                        networkResponse &&
                        networkResponse.status === 200 &&
                        (networkResponse.type === 'basic' || networkResponse.type === 'cors')
                    ) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Offline e não está no cache
                    if (event.request.mode === 'navigate') {
                        // Para navegação, retorna a página do menu (que deve estar em cache)
                        return caches.match('./menu.html') ||
                               caches.match('./index.html') ||
                               new Response(
                                   '<html><body style="background:#0a0a1a;color:#00d2ff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column">' +
                                   '<h1 style="font-size:2rem">⚔️ Battle Arena</h1>' +
                                   '<p>Sem conexão. Aguarde um momento e tente novamente.</p>' +
                                   '<button onclick="location.reload()" style="margin-top:1rem;padding:.7rem 2rem;background:#00d2ff;border:none;border-radius:8px;cursor:pointer;font-size:1rem">Tentar novamente</button>' +
                                   '</body></html>',
                                   { headers: { 'Content-Type': 'text/html' } }
                               );
                    }
                    // Para outros recursos (imagens, fontes), retorna undefined (browser trata)
                });
        })
    );
});
