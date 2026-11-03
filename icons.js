const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const svg=fs.readFileSync('icon.svg','utf8');
for(const [n,s] of [["icon-512",512],["icon-192",192],["apple-touch-icon",180]]){const p=await b.newPage({viewport:{width:s,height:s}});
await p.setContent(`<style>body{margin:0}svg{width:${s}px;height:${s}px;display:block}</style>${svg}`);await p.screenshot({path:`docs/icons/${n}.png`});await p.close()}
await b.close()})();
