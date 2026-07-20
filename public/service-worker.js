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
    // 1. Ignore non-GET requests (like POST/PUT requests to sync data)
    // This ensures your database syncs are never blocked or cached
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 2. If it's in the cache, return it
            if (cachedResponse) {
                return cachedResponse;
            }

            // 3. Otherwise, try to fetch from the network
            return fetch(event.request).catch((err) => {
                // 4. Log error for navigation requests if network fails
                if (event.request.mode === "navigate") {
                    console.error("Network fetch failed for navigation:", err);
                }
                // Propagate the error so the app knows the request failed
                throw err;
            });
        }),
    );
});
