const CACHE_NAME = "fx-signal-push2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./install.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./fxsignal-install-qr.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Keep Supabase/API requests network-first.
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

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});

self.addEventListener("push", event => {let data={};try{data=event.data?event.data.json():{}}catch{data={title:"FX SIGNAL",body:event.data?event.data.text():"経済イベントのお知らせ"}}event.waitUntil(self.registration.showNotification(data.title||"FX SIGNAL",{body:data.body||"経済イベントの時間が近づいています",icon:"./icon-192.png",badge:"./icon-192.png",tag:data.tag||"fxsignal-event",renotify:true,timestamp:Date.now(),data:{url:data.url||"./",eventKey:data.eventKey||null}}))});
self.addEventListener("notificationclick", event => {event.notification.close();const targetUrl=new URL(event.notification?.data?.url||"./",self.registration.scope).href;event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(windowClients=>{for(const client of windowClients){if("focus" in client){client.navigate(targetUrl).catch(()=>{});return client.focus()}}if(clients.openWindow)return clients.openWindow(targetUrl)}))});
