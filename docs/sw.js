const V="prazec-mw108trl";
const SHELL=["./","./index.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const req=e.request,u=new URL(req.url);if(req.method!=="GET") return;
  if(req.mode==="navigate"){e.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put("./index.html",c));return r}).catch(()=>caches.match("./index.html")));return}
  if(u.origin===location.origin||/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.match(req).then(hit=>{const net=fetch(req).then(r=>{if(r.ok||r.type==="opaque"){const c=r.clone();caches.open(V).then(x=>x.put(req,c))}return r}).catch(()=>hit);return hit||net}));
  }
});
