// Digital Signage Service Worker
// Network-first strategy with cache fallback for media files

const MEDIA_CACHE = "signage-media-v1";
const SCHEDULE_CACHE = "signage-schedule-v1";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Only intercept signage API requests
    if (!url.pathname.startsWith("/api/signage/")) return;

    // Media files: network-first with cache fallback
    if (url.pathname.startsWith("/api/signage/media/") && !url.pathname.includes("/upload")) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(MEDIA_CACHE).then((cache) => {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then((cached) => {
                        return cached || new Response("Offline - media not cached", { status: 503 });
                    });
                })
        );
        return;
    }

    // Schedule data: network-first with cache fallback
    if (url.pathname.startsWith("/api/signage/screens/")) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(SCHEDULE_CACHE).then((cache) => {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then((cached) => {
                        return cached || new Response(JSON.stringify({ error: "Offline" }), {
                            status: 503,
                            headers: { "Content-Type": "application/json" },
                        });
                    });
                })
        );
        return;
    }
});
