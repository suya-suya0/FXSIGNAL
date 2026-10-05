const CACHE_NAME = "fx-signal-v4";

const STATIC_ASSETS = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./install.html",
  "./fxsignal-install-qr.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(() => null)
        )
      )
    )
  );

  // Intentionally do NOT call skipWaiting() here.
  // The app's "更新する" button tells the new worker when to activate.
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Live/API data should never be trapped behind stale cache.
  if (
    req.url.includes("supabase.co") ||
    req.url.includes("xoomar.com") ||
    req.url.includes("financecalendar.com") ||
    req.url.includes("helious.io")
  ) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // HTML/navigation: network first.
  // This is essential for installed PWAs to receive the newest app code.
  if (
    req.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/install.html") ||
    url.pathname.endsWith("/FXSIGNAL/")
  ) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then(response => {
          if (response && response.ok) {
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return response;
        })
        .catch(async() => {
          const cached=await caches.match(req);
          if(cached) return cached;
          return caches.match("./index.html");
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then(cached => {
      const network=fetch(req)
        .then(response => {
          if(response && response.ok){
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req,copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
