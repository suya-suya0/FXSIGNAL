const CACHE_NAME = "fx-signal-2026.10.06-push18";

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
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
      await self.clients.claim();
    })()
  );
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

  // Always use the network for page navigations and the main HTML.
  // This prevents an old index.html from being served forever.
  if (
    req.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/FXSIGNAL/") ||
    url.pathname.endsWith("/version.json")
  ) {
    event.respondWith(
      fetch(req, { cache: "no-store" }).catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response(
          "FX SIGNAL is offline. Please reconnect and reload.",
          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
      })
    );
    return;
  }

  // APIs must never be served from the PWA cache.
  if (
    req.url.includes("supabase.co") ||
    req.url.includes("xoomar.com") ||
    req.url.includes("financecalendar.com") ||
    req.url.includes("helious.io")
  ) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  // Static assets can be cache-first.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (response && response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "FX SIGNAL",
      body: event.data ? event.data.text() : "経済イベントのお知らせ"
    };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "FX SIGNAL", {
      body: data.body || "経済イベントの時間が近づいています",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: data.tag || "fxsignal-event",
      renotify: true,
      timestamp: Date.now(),
      data: {
        url: data.url || "./",
        eventKey: data.eventKey || null
      }
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification?.data?.url || "./",
    self.registration.scope
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
