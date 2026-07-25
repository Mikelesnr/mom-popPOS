const CACHE_NAME = "mom-pop-pos-v1";
const ASSETS = [
    "/",
    "/index.php",
    "/images/android-chrome-192x192.png",
    "/images/android-chrome-512x512.png",
    "/images/favicon-32x32.png",
    "/images/favicon-16x16.png",
    "/images/apple-touch-icon.png",
];

// Install event: cache static assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
    );
});

// Fetch event: serve cached files offline with bypass for data syncs
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 1. If it's in the cache, return it
            if (cachedResponse) {
                return cachedResponse;
            }

            // 2. Try to fetch from the network
            return fetch(event.request).catch(() => {
                // 3. NAVIGATION FALLBACK:
                // If this is a navigation request and the fetch failed,
                // serve the index file (for SPA routing)
                if (event.request.mode === "navigate") {
                    return caches.match("/"); // Or "/index.php" if that is your entry point
                }

                // Propagate the error for other types of requests (API calls, images)
                throw new Error("Network fetch failed");
            });
        }),
    );
});
