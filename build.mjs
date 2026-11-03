import fs from "fs";
const r=f=>fs.readFileSync("src/"+f,"utf8");
const css=r("styles.css"),body=r("body.html"),music=r("music.js"),app=r("app.js");
const fonts='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@500;700&display=swap">';
const version=Date.now().toString(36);
const html=`<!doctype html>
<html lang="cs"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Pražec</title>
<meta name="description" content="Ladička, akordy, zpěvník a trénink na kytaru.">
<meta name="theme-color" content="#1b1713" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#eef0ea" media="(prefers-color-scheme: light)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Pražec">
${fonts}
<style>${css}</style></head><body>
${body}
<script>${music}</script>
<script>${app}</script>
<script>if("serviceWorker" in navigator&&location.protocol==="https:") navigator.serviceWorker.register("sw.js");</script>
</body></html>`;
fs.writeFileSync("docs/index.html",html);
fs.writeFileSync("docs/manifest.webmanifest",JSON.stringify({
  name:"Pražec – kytara",short_name:"Pražec",description:"Ladička, akordy, zpěvník a trénink na kytaru",lang:"cs",
  start_url:"./",scope:"./",display:"standalone",orientation:"any",background_color:"#1b1713",theme_color:"#1b1713",
  icons:[{src:"icons/icon-192.png",sizes:"192x192",type:"image/png"},{src:"icons/icon-512.png",sizes:"512x512",type:"image/png"},{src:"icons/icon-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}],
  share_target:{action:"./",method:"GET",params:{title:"title",text:"text",url:"url"}}
},null,2));
fs.writeFileSync("docs/sw.js",`const V="prazec-${version}";
const SHELL=["./","./index.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const req=e.request,u=new URL(req.url);if(req.method!=="GET") return;
  if(req.mode==="navigate"){e.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put("./index.html",c));return r}).catch(()=>caches.match("./index.html")));return}
  if(u.origin===location.origin||/fonts\\.(googleapis|gstatic)\\.com$/.test(u.hostname)){
    e.respondWith(caches.match(req).then(hit=>{const net=fetch(req).then(r=>{if(r.ok||r.type==="opaque"){const c=r.clone();caches.open(V).then(x=>x.put(req,c))}return r}).catch(()=>hit);return hit||net}));
  }
});
`);
fs.mkdirSync("out",{recursive:true});fs.writeFileSync("out/artifact.html",`<title>Pražec</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>${css}</style>
${body}
<script>${music}</script>
<script>${app}</script>
`);
console.log("built",version,html.length);
