const CACHE_NAME = "mom-pop-pos-v1";
const ASSETS = [
  "/",
  "/index.php",
  "/images/android-chrome-192x192.png",
  "/images/android-chrome-512x512.png",
  "/images/favicon-32x32.png",
  "/images/favicon-16x16.png",
  "/images/apple-touch-icon.png"
];

// Install event: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Fetch event: serve cached files offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
