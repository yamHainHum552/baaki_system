const CACHE_NAME = "baaki-static-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  const isStaticAsset =
    event.request.destination === "image" ||
    event.request.destination === "style" ||
    event.request.destination === "script" ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/install-icon-192" ||
    url.pathname === "/install-icon-512" ||
    url.pathname === "/apple-icon" ||
    url.pathname === "/icon";

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);

      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            void cache.put(event.request, response.clone());
          }

          return response;
        })
        .catch(() => cached);

      return cached ?? networkFetch;
    }),
  );
});
