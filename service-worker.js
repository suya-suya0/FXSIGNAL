const CACHE_NAME = "fx-signal-static-2026.10.06-push23";

const STATIC_ASSETS = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./install.html",
  "./fxsignal-install-qr.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(STATIC_ASSETS.map(url => cache.add(url).catch(() => null)))
    )
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys=await caches.keys();
    await Promise.all(keys.map(key => key===CACHE_NAME ? null : caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if(event.data?.type==="SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req=event.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);

  if(
    req.mode==="navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/FXSIGNAL/") ||
    url.pathname.endsWith("/version.json") ||
    url.pathname.endsWith("/reset.html")
  ){
    event.respondWith(fetch(req,{cache:"no-store"}));
    return;
  }

  if(url.hostname.endsWith("supabase.co")){
    event.respondWith(fetch(req,{cache:"no-store"}));
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(response => {
        if(response?.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));
        }
        return response;
      }))
    );
  }
});

self.addEventListener("push", event => {
  let data={};
  try{ data=event.data ? event.data.json() : {}; }
  catch{ data={title:"FX SIGNAL",body:event.data ? event.data.text() : "経済イベントのお知らせ"}; }

  event.waitUntil(
    self.registration.showNotification(data.title || "FX SIGNAL",{
      body:data.body || "経済イベントの時間が近づいています",
      icon:"./icon-192.png",
      badge:"./icon-192.png",
      tag:data.tag || "fxsignal-event",
      renotify:true,
      data:{url:data.url || "./"}
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl=new URL(event.notification?.data?.url || "./",self.registration.scope).href;
  event.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(list => {
      for(const client of list){
        if("focus" in client){
          client.navigate(targetUrl).catch(()=>{});
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
    })
  );
});
