const CACHE_NAME = "fx-signal-v7";

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
      Promise.all(STATIC_ASSETS.map(url => cache.add(url).catch(() => null)))
    )
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
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

  if (
    req.url.includes("supabase.co") ||
    req.url.includes("xoomar.com") ||
    req.url.includes("financecalendar.com") ||
    req.url.includes("helious.io")
  ) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Never cache version.json; it is the source of truth for update availability.
  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  // HTML/navigation always network-first.
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
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return response;
        })
        .catch(async() => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return caches.match("./index.html");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});


// Background Web Push:
// This runs even when the installed PWA is not open, provided the OS/browser
// has granted notification permission and a push subscription exists.
self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "FX SIGNAL", body: event.data ? event.data.text() : "経済イベントのお知らせ" };
  }

  const title = data.title || "FX SIGNAL";
  const options = {
    body: data.body || "経済イベントの時間が近づいています",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: data.tag || "fxsignal-event",
    renotify: true,
    data: {
      url: data.url || "./",
      eventKey: data.eventKey || null
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification?.data?.url || "./",
    self.location.origin + self.registration.scope
  ).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
