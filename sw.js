const CACHE_NAME = 'dudos-pacman-v0.0.6';
const IS_LOCAL_DEV = self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1' ||
    self.location.hostname === '[::1]';

self.addEventListener('install', (event) => {
    if (IS_LOCAL_DEV) {
        event.waitUntil(self.skipWaiting());
        return;
    }

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching all assets');
                return cache.addAll([
                    '/pcm/',
                    '/pcm/index.html',
                    '/pcm/manifest.json',
                    '/pcm/icon-192.png',
                    '/pcm/icon-512.png'
                ]);
            })
            .then(() => {
                console.log('[SW] Assets cached successfully');
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error('[SW] Failed to cache assets:', err);
            })
    );
});

self.addEventListener('activate', (event) => {
    if (IS_LOCAL_DEV) {
        event.waitUntil(
            caches.keys()
                .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
                .then(() => self.registration.unregister())
                .then(() => self.clients.claim())
        );
        return;
    }

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => {
                console.log('[SW] Old caches cleared');
                return self.clients.claim();
            })
    );
});

self.addEventListener('fetch', (event) => {
    if (IS_LOCAL_DEV) return;

    const url = new URL(event.request.url);

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseClone);
                            });
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
                .then((cachedOrNetwork) => cachedOrNetwork || caches.match('/pcm/index.html'))
        );
        return;
    }

    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(event.request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(event.request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.status === 200) {
                                const responseClone = networkResponse.clone();
                                caches.open(CACHE_NAME)
                                    .then((cache) => {
                                        cache.put(event.request, responseClone);
                                    });
                            }
                            return networkResponse;
                        });
                })
                .catch(() => {
                    if (event.request.destination === 'document') {
                        return caches.match('/pcm/index.html');
                    }
                    return Response.error();
                })
        );
    }
});
