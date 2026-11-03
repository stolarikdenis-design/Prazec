(function(){
"use strict";
const M=Music,$=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const dkey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today=()=>dkey(new Date());
const fmtDay=k=>{const [y,m,d]=k.split("-");return (+d)+". "+(+m)+"."};
const IS_ARTIFACT=!!(window.claude&&window.claude.use);

/* ---------- nastavení zařízení ---------- */
const PREF_KEY="prazec-prefs";
let prefs={lefty:false,wake:true,font:1.05,tuning:"standard",bpm:80,pattern:"pop",prog:"G D Em C",scroll:3};
try{Object.assign(prefs,JSON.parse(localStorage.getItem(PREF_KEY)||"{}"))}catch(e){}
function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}catch(e){}}
document.documentElement.style.setProperty("--lyr",prefs.font+"rem");

function toast(t){const el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),2600)}

/* ---------- zvuk ---------- */
let ac=null;const cache={};
function ctx(){if(!ac) ac=new (window.AudioContext||window.webkitAudioContext)(); if(ac.state==="suspended") ac.resume(); return ac}
function pluckBuf(midi,dur){
  const key=midi+":"+dur;if(cache[key]) return cache[key];
  const a=ctx(),sr=a.sampleRate,len=Math.floor(sr*dur),buf=a.createBuffer(1,len,sr),d=buf.getChannelData(0);
  const N=Math.max(2,Math.round(sr/M.midiFreq(midi))),decay=midi<50?0.997:0.995;
  for(let i=0;i<N;i++) d[i]=(Math.random()*2-1)*0.5;
  for(let i=N;i<len;i++) d[i]=decay*0.5*(d[i-N]+d[i-N+1]);
  return cache[key]=buf;
}
function pluck(midi,when,dur,gain){const a=ctx(),s=a.createBufferSource(),g=a.createGain();s.buffer=pluckBuf(midi,dur);g.gain.value=gain;s.connect(g).connect(a.destination);s.start(when)}
function strumAt(ch,t,dir,gain){
  if(!ch) return;const idx=[0,1,2,3,4,5].filter(i=>ch.frets[i]>=0);
  const order=dir==="U"?idx.slice().reverse().slice(0,4):idx;
  order.forEach((i,k)=>pluck(M.STD[i]+ch.frets[i],t+k*(dir==="U"?0.018:0.03),1.8,(gain||0.3)*(dir==="U"?0.7:1)));
}
function strum(ch){if(ch) strumAt(ch,ctx().currentTime+0.02,"D",0.32)}
function click(t,acc){const a=ctx(),o=a.createOscillator(),g=a.createGain();o.frequency.value=acc?1600:1000;
  g.gain.setValueAtTime(acc?0.5:0.3,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.05);o.connect(g).connect(a.destination);o.start(t);o.stop(t+0.06)}

/* ---------- hmatník ---------- */
function diagram(ch,opt){
  opt=opt||{};
  if(!ch) return '<svg viewBox="0 0 110 132"><text x="55" y="70" text-anchor="middle" font-size="10" fill="var(--muted)">neznám tvar</text></svg>';
  const L=prefs.lefty,col=i=>L?5-i:i;
  const used=ch.frets.filter(f=>f>0),max=Math.max(0,...used),min=used.length?Math.min(...used):0;
  const base=max>4?min:1,X0=17,DX=15.2,Y0=30,DY=19,n=5;
  let s=`<svg viewBox="0 0 110 ${opt.mini?128:142}" role="img" aria-label="Hmatník akordu ${esc(ch.name)}">`;
  s+=`<rect x="${X0}" y="${Y0}" width="${DX*5}" height="${DY*n}" fill="var(--surface-2)" rx="2"/>`;
  if(base===1) s+=`<rect x="${X0-1}" y="${Y0-3}" width="${DX*5+2}" height="4" fill="var(--fg)" rx="1"/>`;
  else s+=`<text x="${L?X0+DX*5+6:X0-6}" y="${Y0+DY/2+4}" text-anchor="${L?"start":"end"}" font-size="10" fill="var(--muted)">${base}</text>`;
  for(let i=1;i<=n;i++) s+=`<line x1="${X0}" x2="${X0+DX*5}" y1="${Y0+i*DY}" y2="${Y0+i*DY}" stroke="var(--fret)" stroke-width="1.4"/>`;
  for(let i=0;i<6;i++) s+=`<line x1="${X0+col(i)*DX}" x2="${X0+col(i)*DX}" y1="${Y0}" y2="${Y0+DY*n}" stroke="var(--string)" stroke-width="${1.6-i*0.15}"/>`;
  if(ch.barre){const [bf,a,b]=ch.barre,y=Y0+(bf-base+0.5)*DY,x1=X0+Math.min(col(a),col(b))*DX,x2=X0+Math.max(col(a),col(b))*DX;
    s+=`<rect x="${x1-6}" y="${y-6}" width="${x2-x1+12}" height="12" rx="6" fill="var(--accent)"/>`}
  ch.frets.forEach((f,i)=>{const x=X0+col(i)*DX;
    if(f<0) s+=`<text x="${x}" y="${Y0-8}" text-anchor="middle" font-size="11" fill="var(--muted)">×</text>`;
    else if(f===0) s+=`<circle cx="${x}" cy="${Y0-11}" r="3.6" fill="none" stroke="var(--muted)" stroke-width="1.3"/>`;
    else if(!(ch.barre&&f===ch.barre[0]&&i>=ch.barre[1]&&i<=ch.barre[2])) s+=`<circle cx="${x}" cy="${Y0+(f-base+0.5)*DY}" r="6" fill="var(--accent)"/>`;
  });
  if(!opt.mini) ["E","A","D","G","H","e"].forEach((nm,i)=>s+=`<text x="${X0+col(i)*DX}" y="${Y0+DY*n+14}" text-anchor="middle" font-size="9" fill="var(--muted)">${nm}</text>`);
  return s+"</svg>";
}

/* ---------- úložiště ---------- */
const docs=new Map();let col=null,mode="local";const LS="prazec-v1";
function lsLoad(){try{const o=JSON.parse(localStorage.getItem(LS)||"{}");Object.entries(o).forEach(([k,v])=>docs.set(k,v))}catch(e){}}
function lsSave(){try{localStorage.setItem(LS,JSON.stringify(Object.fromEntries(docs)))}catch(e){toast("Úložiště v prohlížeči je plné nebo zakázané")}}
const pending={};
function put(id,data){
  docs.set(id,data);render();
  if(mode!=="db"){lsSave();return}
  if(pending[id]){pending[id].next=data;return}
  pending[id]={next:null};
  const run=d=>col.doc(id).set(d).catch(()=>toast("Uložení se nepovedlo, zkus to znovu")).finally(()=>{const p=pending[id];if(p&&p.next){const n=p.next;p.next=null;run(n)}else delete pending[id]});
  run(data);
}
function del(id){docs.delete(id);render();if(mode==="db") col.doc(id).delete().catch(()=>toast("Smazání se nepovedlo"));else lsSave()}
function note(t){$("saveNote").textContent=t}
function chordStat(n){return docs.get("chord-"+idOf(n))||{kind:"chord",name:n,rating:null,clean:0,attempts:0,last:null}}
const idOf=n=>n.replace(/#/g,"is").replace(/\//g,"_");
function getLog(){const l=docs.get("log")||{};return {kind:"log",days:l.days||{},mins:l.mins||{}}}
function logActivity(){const l=getLog();l.days={...l.days,[today()]:(l.days[today()]||0)+1};put("log",l)}
let secBuf=0,secTimer=null;
function practiceSec(n){secBuf+=n;if(!secTimer) secTimer=setTimeout(flushSec,30000)}
function flushSec(){clearTimeout(secTimer);secTimer=null;if(secBuf<1) return;const l=getLog();l.mins={...l.mins,[today()]:(l.mins[today()]||0)+secBuf};secBuf=0;put("log",l)}
window.addEventListener("pagehide",flushSec);
document.addEventListener("visibilitychange",()=>{if(document.hidden) flushSec()});

const EXAMPLE={kind:"song",example:true,title:"Cesta k řece",artist:"ukázka",capo:0,status:"ucim",created:1,bpm:90,
 text:"{Předehra}\n[G] [D] [Em] [C]\n\n{1. sloka}\n[G]Ráno vyjdu [D]z vrat a jdu\n[Em]po cestě, co [C]vede k řece,\n[G]batoh těžký, [D]boty mokrý,\n[C]stejně se mi [D]chce.\n\n{Refrén}\n[C]Hej, řeko, [G]počkej chvíli,\n[D]ať tě dojdu [Em]dřív, než zmizí\n[C]slunce za ko[G]pcem a [D]den je [G]pryč."};

async function initStore(){
  lsLoad();
  try{if(navigator.storage&&navigator.storage.persist) navigator.storage.persist()}catch(e){}
  if(!IS_ARTIFACT){
    if(!localStorage.getItem("prazec-seeded")){try{localStorage.setItem("prazec-seeded","1")}catch(e){}
      if(![...docs.values()].some(d=>d&&d.kind==="song")){docs.set("song-ukazka",EXAMPLE);lsSave()}}
    note("Uloženo v telefonu");$("storeInfo").textContent="Data jsou uložená jen v tomhle zařízení a prohlížeči. Občas si stáhni zálohu, ať o nic nepřijdeš.";
    render();return;
  }
  render();
  const timer=setTimeout(()=>{if(mode!=="db") note("Uloženo v prohlížeči")},10000);
  try{
    const [d,u]=await Promise.all([claude.use("db"),claude.use("user")]);
    const uid=u?await u.id():null;
    if(!d||!uid){clearTimeout(timer);note("Uloženo v prohlížeči");return}
    col=d.collection("data/users/"+uid);let first=true;
    col.onSnapshot(snap=>{
      clearTimeout(timer);
      if(first){first=false;const local=new Map(docs);snap.docs.forEach(s=>local.delete(s.id));local.forEach((v,k)=>col.doc(k).set(v).catch(()=>{}))}
      mode="db";docs.clear();snap.docs.forEach(s=>{if(s.exists) docs.set(s.id,s.data())});
      Object.keys(pending).forEach(k=>{if(pending[k].next) docs.set(k,pending[k].next)});
      note("Uloženo ve tvém účtu");$("storeInfo").textContent="Data jsou uložená ve tvém účtu Claude a vidíš je jen ty.";render();
    },()=>{clearTimeout(timer);mode="local";note("Uloženo v prohlížeči")});
  }catch(e){clearTimeout(timer);note("Uloženo v prohlížeči")}
}

/* ---------- navigace ---------- */
const VIEWS=["ladicka","akordy","pisnicky","cviceni","pokrok"];let view="ladicka";
function route(){
  const h=location.hash.slice(1);const nv=VIEWS.includes(h)?h:"ladicka";
  if(nv!==view){if(view==="ladicka") stopMic();if(view==="cviceni") stopPractice();if(view==="pisnicky"){stopScroll();releaseWake()}}
  view=nv;VIEWS.forEach(v=>$("v-"+v).hidden=v!==view);
  document.querySelectorAll("nav.tabs a").forEach(a=>{if(a.dataset.v===view) a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  render();
}
window.addEventListener("hashchange",()=>{route();window.scrollTo(0,0)});

/* ---------- spodní panel ---------- */
let sheetClose=null;
function openSheet(html,onClose){
  closeSheet();const L=$("layer");
  L.innerHTML=`<div class="sheet-bg" data-bg><div class="bsheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  sheetClose=onClose||null;const f=L.querySelector("input,button:not([data-close]),select,textarea");if(f) f.focus({preventScroll:true});
}
function closeSheet(){const L=$("layer");if(!L.innerHTML) return;L.innerHTML="";if(sheetClose){const f=sheetClose;sheetClose=null;f()}}
$("layer").addEventListener("click",e=>{if(e.target.matches("[data-bg]")||e.target.closest("[data-close]")) closeSheet()});
document.addEventListener("keydown",e=>{if(e.key==="Escape") closeSheet()});

function lvlButtons(n,r){return `<div class="lvl" role="group" aria-label="Jak ti jde ${esc(n)}">${M.LEVELS.map((l,i)=>`<button type="button" data-rate="${esc(n)}" data-l="${i}" aria-pressed="${r===i}" title="${l}" aria-label="${l}">${["✕","~","✓","★"][i]}</button>`).join("")}</div>`}
function chordPop(name){
  const ch=M.getChord(name),st=chordStat(ch&&M.DICT[ch.name]?ch.name:name);strum(ch);
  openSheet(`<div class="chord-pop"><div class="dg" data-play="${esc(name)}">${diagram(ch)}</div>
    <div style="display:grid;gap:8px"><div class="name">${esc(name)}</div>
      ${ch&&ch.simplified?'<p class="muted small-t">Zjednodušený tvar</p>':""}${ch&&ch.bassNote?`<p class="muted small-t">Bas ${ch.bassNote} zahraj palcem nebo vynech</p>`:""}
      ${M.ALIAS[name]?`<p class="muted small-t">Anglicky ${M.ALIAS[name]}</p>`:""}
      <button class="btn small" type="button" data-play="${esc(name)}">Přehrát znovu</button></div></div>
    ${lvlButtons(name,st.rating)}<p class="lvl-label">${st.rating==null?"Jak ti tenhle akord jde?":M.LEVELS[st.rating]}${st.attempts?` · v tréninku čistě ${st.clean} z ${st.attempts}`:""}</p>
    <button class="btn ghost" type="button" data-close>Zavřít</button>`);
}
document.addEventListener("click",e=>{
  const r=e.target.closest("[data-rate]");
  if(r){const n=r.dataset.rate,st=chordStat(n),l=+r.dataset.l;put("chord-"+idOf(n),{...st,kind:"chord",name:n,rating:st.rating===l?null:l,last:today()});logActivity();
    if($("layer").innerHTML){const b=r.closest(".lvl");b.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(+x.dataset.l===l&&st.rating!==l)));
      const lab=b.nextElementSibling;if(lab) lab.textContent=st.rating===l?"Jak ti tenhle akord jde?":M.LEVELS[l]}
    return}
  const p=e.target.closest("[data-play]");if(p){strum(M.getChord(p.dataset.play));return}
  const c=e.target.closest("[data-chord]");if(c){chordPop(c.dataset.chord)}
});

/* ---------- ladička ---------- */
const needle=$("needle"),tNote=$("tNote"),tInfo=$("tInfo"),tHint=$("tHint");
(function(){let s="";for(let c=-50;c<=50;c+=10){const a=c/50*60*Math.PI/180,r1=c%50===0?112:118,r2=126;
  s+=`<line x1="${150+r1*Math.sin(a)}" y1="${150-r1*Math.cos(a)}" x2="${150+r2*Math.sin(a)}" y2="${150-r2*Math.cos(a)}" stroke="var(--muted)" stroke-width="${c===0?2.5:1.2}"/>`}$("ticks").innerHTML=s})();
$("tuning").innerHTML=Object.entries(M.TUNINGS).map(([k,t])=>`<option value="${k}"${k===prefs.tuning?" selected":""}>${t.name}</option>`).join("");
$("tuning").onchange=e=>{prefs.tuning=e.target.value;savePrefs();renderStrings()};
const tun=()=>M.TUNINGS[prefs.tuning]||M.TUNINGS.standard;
function setNeedle(c){needle.style.transform=`rotate(${Math.max(-50,Math.min(50,c))/50*60}deg)`}
let loopT=null;
function renderStrings(){
  const t=tun();
  $("strings").innerHTML=t.midi.map((m,i)=>({m,i})).reverse().map(({m,i})=>`<button type="button" class="str" data-s="${i}" style="--w:${1+(5-i)*0.5}px"><b>${t.names[i]}</b><div class="wire"></div><span>${M.midiName(m)} · ${M.midiFreq(m).toFixed(1)} Hz</span></button>`).join("");
}
$("strings").addEventListener("click",e=>{const b=e.target.closest(".str");if(!b) return;const i=+b.dataset.s,m=tun().midi[i];
  clearInterval(loopT);document.querySelectorAll(".str").forEach(x=>x.classList.remove("on"));
  const go=()=>pluck(m,ctx().currentTime+0.01,3,0.6);go();b.classList.add("on");
  tNote.textContent=tun().names[i];tHint.textContent="";tInfo.textContent=`Referenční tón ${M.midiName(m)} · ${M.midiFreq(m).toFixed(2)} Hz`;setNeedle(0);
  if($("loopTone").checked) loopT=setInterval(go,2600);else setTimeout(()=>b.classList.remove("on"),2500)});
$("loopTone").onchange=e=>{if(!e.target.checked){clearInterval(loopT);document.querySelectorAll(".str").forEach(x=>x.classList.remove("on"))}};
let mic=null,raf=0,smooth=null,lastHeard=0;
$("micBtn").onclick=()=>mic?stopMic():startMic();
async function startMic(){
  $("micMsg").hidden=true;
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) throw new Error("none");
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    const a=ctx(),src=a.createMediaStreamSource(stream),an=a.createAnalyser();an.fftSize=4096;src.connect(an);
    mic={stream,an,buf:new Float32Array(an.fftSize)};$("micBtn").textContent="Vypnout mikrofon";tInfo.textContent="Poslouchám, brnkni na strunu";loop();
  }catch(e){
    $("micMsg").hidden=false;
    $("micMsg").textContent=IS_ARTIFACT?"V náhledu na claude.ai mikrofon nefunguje. V aplikaci nainstalované do telefonu ano. Zatím laď podle sluchu: zapni Opakovat tón a toč kolíčkem, dokud se zvuky nepřestanou chvět."
      :"Mikrofon se nepodařilo zapnout. Povol ho v nastavení prohlížeče pro tuhle stránku a zkus to znovu.";
  }
}
function stopMic(){if(!mic) return;cancelAnimationFrame(raf);mic.stream.getTracks().forEach(t=>t.stop());mic=null;$("micBtn").textContent="Zapnout mikrofon";document.querySelectorAll(".str").forEach(x=>x.classList.remove("target"))}
function detect(b,sr){
  let rms=0;for(let i=0;i<b.length;i++) rms+=b[i]*b[i];rms=Math.sqrt(rms/b.length);if(rms<0.008) return -1;
  // YIN
  const W=Math.floor(b.length/2),maxT=Math.min(W,Math.ceil(sr/65)),d=new Float32Array(maxT);
  for(let t=1;t<maxT;t++){let s=0;for(let i=0;i<W;i++){const x=b[i]-b[i+t];s+=x*x}d[t]=s}
  let run=0;d[0]=1;for(let t=1;t<maxT;t++){run+=d[t];d[t]=d[t]*t/(run||1)}
  let tau=-1;for(let t=Math.floor(sr/1000);t<maxT;t++){if(d[t]<0.12){while(t+1<maxT&&d[t+1]<d[t]) t++;tau=t;break}}
  if(tau<0) return -1;
  const x0=d[tau-1]||d[tau],x2=d[tau+1]||d[tau],den=2*(2*d[tau]-x2-x0);
  return sr/(den?tau+(x2-x0)/den:tau);
}
function loop(){
  if(!mic) return;mic.an.getFloatTimeDomainData(mic.buf);
  const f=detect(mic.buf,ac.sampleRate),now=performance.now();
  if(f>60&&f<1100){
    lastHeard=now;const midi=69+12*Math.log2(f/440);
    smooth=smooth==null||Math.abs(midi-smooth)>0.7?midi:smooth*0.8+midi*0.2;
    const t=tun();let si=0;t.midi.forEach((m,i)=>{if(Math.abs(m-smooth)<Math.abs(t.midi[si]-smooth)) si=i});
    const sc=Math.round((smooth-t.midi[si])*100);
    tNote.textContent=t.names[si];
    tInfo.textContent=`${f.toFixed(1)} Hz · slyším ${M.NOTES[Math.round(smooth)%12]} · ${sc>0?"+":""}${sc} centů`;
    const ok=Math.abs(sc)<=4;
    tHint.textContent=ok?"Naladěno":Math.abs(sc)>100?(sc<0?"Hodně nízko, přitáhni":"Hodně vysoko, povol"):(sc<0?"Přitáhni":"Povol");
    tHint.style.color=ok?"var(--lv3)":"var(--fg)";
    setNeedle(sc);needle.setAttribute("stroke",ok?"var(--lv3)":"var(--accent)");
    document.querySelectorAll(".str").forEach(x=>x.classList.toggle("target",+x.dataset.s===si));
  } else if(now-lastHeard>1500){smooth=null;tHint.textContent="";}
  raf=requestAnimationFrame(loop);
}

/* ---------- akordy ---------- */
let cat="vse",q="";
function chips(el,cur,list){el.innerHTML=list.map(([k,l])=>`<button class="chip" type="button" data-k="${k}" aria-pressed="${k===cur}">${l}</button>`).join("")}
$("chordFilters").onclick=e=>{const b=e.target.closest(".chip");if(b){cat=b.dataset.k;render()}};
$("chordSearch").oninput=e=>{q=e.target.value.trim();render()};
function chordCard(n,extra){
  const ch=M.getChord(n),st=chordStat(n);
  return `<div class="card"><div class="name">${esc(n)}</div><div class="alias">${M.ALIAS[n]?"anglicky "+M.ALIAS[n]:extra||""}</div>
    <div class="dg" data-play="${esc(n)}" role="button" tabindex="0" aria-label="Přehrát ${esc(n)}">${diagram(ch)}</div>${lvlButtons(n,st.rating)}
    <div class="lvl-label">${st.rating==null?"Neohodnoceno":M.LEVELS[st.rating]}${st.attempts?` · ${st.clean}/${st.attempts}`:""}</div></div>`;
}
function renderChords(){
  chips($("chordFilters"),cat,M.CATS);
  let list=M.CHORDS.filter(c=>cat==="vse"||c[2]===cat).map(c=>c[0]),extra="";
  if(q){const lq=q.toLowerCase();list=M.CHORDS.map(c=>c[0]).filter(n=>n.toLowerCase().startsWith(lq));
    const g=M.getChord(q);if(g&&!list.includes(g.name)&&!M.DICT[g.name]){list.unshift(g.name);extra=g.simplified?"zjednodušeno":"barré tvar"}}
  $("chordGrid").innerHTML=list.length?list.map(n=>chordCard(n,!M.DICT[n]?extra:"")).join(""):`<div class="empty" style="grid-column:1/-1">Takový akord neznám. Zkus třeba Am, F#m nebo C7.</div>`;
}

/* ---------- písničky ---------- */
let sel=null,editing=null,trans=0,capo=0,confirmDel=false,sq="";
function songs(){return [...docs.entries()].filter(([,v])=>v&&v.kind==="song").map(([k,v])=>({id:k,...v})).sort((a,b)=>(b.created||0)-(a.created||0))}
function renderLyrics(text,st){
  return (text||"").split("\n").map(line=>{
    const h=/^\s*\{(.+)\}\s*$/.exec(line);if(h) return `<div class="line head">${esc(h[1])}</div>`;
    if(!line.trim()) return `<div class="line nochords">&nbsp;</div>`;
    const parts=line.split(/\[([^\]]+)\]/);let html="",has=parts.length>1;
    if(parts[0]) html+=`<span class="seg"><span class="ch"></span><span class="ly">${esc(parts[0])}</span></span>`;
    for(let i=1;i<parts.length;i+=2){const raw=parts[i].trim();
      if(!M.isChord(raw)){html+=`<span class="seg"><span class="ch"></span><span class="ly">[${esc(raw)}]${esc(parts[i+1]||"")}</span></span>`;continue}
      const c=M.transpose(raw,st);
      html+=`<span class="seg"><span class="ch" data-chord="${esc(c)}" role="button" tabindex="0">${esc(c)}</span><span class="ly">${esc(parts[i+1]||" ")}</span></span>`}
    return `<div class="line${has?"":" nochords"}">${html}</div>`}).join("");
}
function songCost(chords,shift){return chords.reduce((s,c)=>{const n=M.transpose(c,shift),ch=M.getChord(n),st=chordStat(ch&&M.DICT[n]?n:n);
  let d=M.difficulty(ch);if(st.rating===3) d*=0.6;else if(st.rating===0) d*=1.3;return s+d},0)}
function bestCapo(s){
  const orig=M.chordsIn(s.text);if(!orig.length) return null;
  const keyShift=trans+(+s.capo||0);let best={k:capo,cost:songCost(orig,keyShift-capo)};
  for(let k=0;k<=7;k++){const c=songCost(orig,keyShift-k);if(c<best.cost-0.5) best={k,cost:c}}
  if(best.k===capo) return null;
  const shapes=[...new Set(orig.map(c=>M.transpose(c,keyShift-best.k)))];
  return {k:best.k,shapes};
}
function openSong(id){sel=id;editing=null;confirmDel=false;trans=0;const s=docs.get(id);capo=+(s&&s.capo)||0;stopScroll();
  $("songsWrap").classList.add("reading");render();requestWake();window.scrollTo(0,0)}
function renderSongs(){
  const all=songs(),list=sq?all.filter(s=>(s.title+" "+s.artist).toLowerCase().includes(sq.toLowerCase())):all;
  if(sel&&!docs.has(sel)) sel=null;
  $("songList").innerHTML=list.length?list.map(s=>`<button type="button" class="song-item" data-song="${esc(s.id)}" aria-current="${s.id===sel}">
    <b>${esc(s.title||"Bez názvu")}</b><small>${esc(s.artist||"")}${s.artist?" · ":""}${M.chordsIn(s.text).length} akordů</small>
    <span>${s.example?'<span class="tag ex">Ukázka</span> ':""}<span class="tag ${s.status==="umim"?"done":""}">${s.status==="umim"?"Umím":"Učím se"}</span></span></button>`).join("")
    :all.length?`<p class="muted">Nic takového nemáš.</p>`:`<div class="empty"><b>Zatím tu nic není</b><span>Najdi písničku s akordy na webu a přidej ji tlačítkem Z webu.</span></div>`;
  const P=$("songPane");
  if(editing!=null){P.innerHTML=editor(editing==="new"?{title:"",artist:"",capo:0,status:"ucim",text:""}:docs.get(editing));bindEditor();$("scrollFab")&&($("scrollFab").hidden=true);return}
  if(!sel){$("songsWrap").classList.remove("reading");P.innerHTML=`<div class="empty"><b>Vyber písničku</b><span>Akordy uvidíš nad textem. Klepnutím na akord se ukáže hmatník.</span></div>`;fab(false);return}
  const s=docs.get(sel),keyShift=trans+(+s.capo||0),shift=keyShift-capo;
  const used=[...new Set(M.chordsIn(s.text).map(c=>M.transpose(c,shift)))],sug=bestCapo(s);
  P.innerHTML=`<article class="sheet">
    <button class="btn small ghost back-btn" type="button" data-back style="justify-self:start">← Všechny písničky</button>
    <div class="sheet-head"><div style="min-width:0"><h2>${esc(s.title||"Bez názvu")}</h2><p class="muted">${esc(s.artist||"")}</p></div>
      <div class="row"><button class="btn small" type="button" data-status>${s.status==="umim"?"✓ Umím":"Označit, že umím"}</button>
      <button class="btn small ghost" type="button" data-edit>Upravit</button></div></div>
    <div class="toolbar">
      <div class="grp" aria-label="Tónina"><button type="button" data-tr="-1" aria-label="O půltón níž">−</button><span>tónina ${trans?(trans>0?"+":"")+trans:"původní"}</span><button type="button" data-tr="1" aria-label="O půltón výš">+</button></div>
      <div class="grp" aria-label="Kapodastr"><button type="button" data-capo="-1" aria-label="Kapodastr níž">−</button><span>kapo ${capo||"bez"}</span><button type="button" data-capo="1" aria-label="Kapodastr výš">+</button></div>
      <div class="grp" aria-label="Velikost písma"><button type="button" data-font="-1" aria-label="Menší písmo">A−</button><button type="button" data-font="1" aria-label="Větší písmo">A+</button></div>
    </div>
    ${sug?`<div class="suggest"><span>S kapodastrem na ${sug.k}. pražci zahraješ snáz: ${sug.shapes.map(esc).join(", ")}</span><button class="btn small" type="button" data-capo-set="${sug.k}">Použít</button></div>`:""}
    <div class="used">${used.map(c=>{const st=chordStat(c);return `<div class="mini" data-chord="${esc(c)}" role="button" tabindex="0"><b>${esc(c)}</b>${diagram(M.getChord(c),{mini:1})}
      <span class="dot" style="background:${st.rating==null?"var(--line)":`var(--lv${st.rating})`}" title="${st.rating==null?"Neohodnoceno":M.LEVELS[st.rating]}"></span></div>`}).join("")}</div>
    <div class="lyrics" id="lyrics">${renderLyrics(s.text,shift)}</div>
    ${s.source?`<p class="muted small-t">Zdroj: <a href="${esc(s.source)}" target="_blank" rel="noopener" style="color:inherit">${esc(s.source.replace(/^https?:\/\//,"").slice(0,60))}</a></p>`:""}
    <div class="row"><button class="btn small ghost danger" type="button" data-del>${confirmDel?"Opravdu smazat? Klepni znovu":"Smazat písničku"}</button></div></article>`;
  fab(true);
}
function editor(s){return `<form class="sheet" id="songForm" style="gap:12px"><h3>${editing==="new"?"Nová písnička":"Upravit písničku"}</h3>
  <div class="fields"><label for="fTitle">Název<input id="fTitle" required value="${esc(s.title)}"></label>
  <label for="fArtist">Interpret<input id="fArtist" value="${esc(s.artist)}"></label>
  <label for="fCapo">Kapodastr<input id="fCapo" type="number" inputmode="numeric" min="0" max="12" value="${+s.capo||0}"></label>
  <label for="fStatus">Stav<select id="fStatus"><option value="ucim"${s.status!=="umim"?" selected":""}>Učím se</option><option value="umim"${s.status==="umim"?" selected":""}>Umím</option></select></label></div>
  <label for="fText">Text s akordy<textarea id="fText" placeholder="{1. sloka}&#10;[Am]Ráno když [C]vstanu&#10;[G]čaj si [Em]uvařím">${esc(s.text)}</textarea></label>
  <p class="muted small-t">Akord dej do [hranatých závorek] před slabiku, kde se mění. Nadpis části do {složených}. Můžeš sem vložit i text, kde jsou akordy na řádku nad slovy, a klepnout na Převést.</p>
  <div class="row"><button class="btn primary" type="submit">Uložit</button><button class="btn" type="button" data-convert>Převést akordy nad textem</button><button class="btn ghost" type="button" data-cancel>Zrušit</button></div></form>`}
function bindEditor(){
  const f=$("songForm");
  f.querySelector("[data-convert]").onclick=()=>{const r=M.importText(f.fText.value,{title:f.fTitle.value||"-"});f.fText.value=r.text;toast(`Převedeno, ${r.chords.length} různých akordů`)};
  f.onsubmit=e=>{e.preventDefault();
    const old=editing==="new"?{}:docs.get(editing),id=editing==="new"?"song-"+Date.now().toString(36):editing;
    put(id,{...old,kind:"song",title:f.fTitle.value.trim(),artist:f.fArtist.value.trim(),capo:+f.fCapo.value||0,status:f.fStatus.value,text:f.fText.value,example:false,created:old.created||Date.now()});
    editing=null;openSong(id)};
}
$("songSearch").oninput=e=>{sq=e.target.value;render()};
$("newSong").onclick=()=>{editing="new";$("songsWrap").classList.add("reading");render()};
$("importSong").onclick=()=>importSheet();
$("v-pisnicky").addEventListener("click",e=>{
  const t=e.target;
  const it=t.closest("[data-song]");if(it){openSong(it.dataset.song);return}
  if(t.closest("[data-back]")){sel=null;stopScroll();releaseWake();$("songsWrap").classList.remove("reading");render();return}
  if(t.closest("[data-cancel]")){editing=null;if(!sel) $("songsWrap").classList.remove("reading");render();return}
  if(t.closest("[data-edit]")){editing=sel;stopScroll();render();return}
  const tr=t.closest("[data-tr]");if(tr){trans=Math.max(-11,Math.min(11,trans+ +tr.dataset.tr));render();return}
  const cp=t.closest("[data-capo]");if(cp){capo=Math.max(0,Math.min(9,capo+ +cp.dataset.capo));render();return}
  const cs=t.closest("[data-capo-set]");if(cs){capo=+cs.dataset.capoSet;render();toast(`Kapodastr na ${capo}. pražec`);return}
  const fo=t.closest("[data-font]");if(fo){prefs.font=Math.max(0.85,Math.min(1.6,+(prefs.font+0.1*+fo.dataset.font).toFixed(2)));savePrefs();document.documentElement.style.setProperty("--lyr",prefs.font+"rem");return}
  if(t.closest("[data-status]")){const s=docs.get(sel);put(sel,{...s,status:s.status==="umim"?"ucim":"umim"});logActivity();return}
  if(t.closest("[data-del]")){if(confirmDel){confirmDel=false;del(sel);sel=null;$("songsWrap").classList.remove("reading");toast("Písnička smazaná")}else{confirmDel=true;render();setTimeout(()=>{if(confirmDel){confirmDel=false;render()}},4000)}}
});

/* autoscroll */
let scrolling=false,scrollRaf=0,scrollLast=0,scrollAcc=0;
function fab(show){
  let f=$("scrollFab");
  if(!f){f=document.createElement("div");f.id="scrollFab";f.className="scroll-fab";f.setAttribute("role","group");f.setAttribute("aria-label","Posouvání textu");document.body.appendChild(f);
    f.addEventListener("click",e=>{const b=e.target.closest("button");if(!b) return;
      if(b.dataset.sp){prefs.scroll=Math.max(1,Math.min(9,prefs.scroll+ +b.dataset.sp));savePrefs();fab(true)}else{scrolling?stopScroll():startScroll()}})}
  f.hidden=!show||view!=="pisnicky";
  f.innerHTML=`<button type="button" data-sp="-1" aria-label="Pomaleji">−</button><span>${prefs.scroll}</span><button type="button" data-sp="1" aria-label="Rychleji">+</button><button type="button" class="go" aria-label="${scrolling?"Zastavit posouvání":"Spustit posouvání"}">${scrolling?"❚❚":"▶"}</button>`;
}
function startScroll(){scrolling=true;scrollLast=performance.now();scrollAcc=0;fab(true);requestWake();
  const step=t=>{if(!scrolling) return;const dt=(t-scrollLast)/1000;scrollLast=t;scrollAcc+=dt*prefs.scroll*7;
    if(scrollAcc>=1){const px=Math.floor(scrollAcc);scrollAcc-=px;window.scrollBy(0,px)}practiceSec(dt);
    if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-2){stopScroll();return}
    scrollRaf=requestAnimationFrame(step)};scrollRaf=requestAnimationFrame(step)}
function stopScroll(){if(!scrolling) return;scrolling=false;cancelAnimationFrame(scrollRaf);if($("scrollFab")) fab(view==="pisnicky"&&!!sel&&editing==null)}
let wake=null;
async function requestWake(){if(!prefs.wake||wake||!("wakeLock" in navigator)) return;try{wake=await navigator.wakeLock.request("screen");wake.addEventListener("release",()=>{wake=null})}catch(e){}}
function releaseWake(){if(wake){wake.release().catch(()=>{});wake=null}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&view==="pisnicky"&&sel) requestWake()});

/* import z webu */
function htmlToSong(html,url){
  const doc=new DOMParser().parseFromString(html,"text/html");
  const meta=(doc.querySelector('meta[property="og:title"]')||{}).content||(doc.querySelector("title")||{}).textContent||"";
  // Ultimate Guitar: obsah v JSON
  const un=html.replace(/&quot;/g,'"');const ug=/"content":"((?:[^"\\]|\\.)*?\[ch\](?:[^"\\]|\\.)*?)"/.exec(un);
  if(ug){try{const raw=JSON.parse('"'+ug[1]+'"').replace(/\[ch\]([^\[]*?)\[\/ch\]/g,"$1").replace(/\[\/?tab\]/g,"");const r=M.importText(raw,{title:meta});r.rawText=raw;r.meta=meta;return r}catch(e){}}
  doc.querySelectorAll("script,style,noscript,nav,header,footer,form,iframe,svg,button,select").forEach(n=>n.remove());
  doc.querySelectorAll("sup,b,strong,span,a,i,em,[class*=chord],[class*=akord],[class*=Chord]").forEach(n=>{
    if(n.children.length) return;const t=n.textContent.trim();
    const cls=(n.className||"")+"";
    if(t&&M.isChord(t)&&(n.tagName==="SUP"||/chord|akord|ch\b|acc/i.test(cls))) n.replaceWith(doc.createTextNode("["+t+"]"));
  });
  doc.querySelectorAll("br").forEach(n=>n.replaceWith(doc.createTextNode("\n")));
  doc.querySelectorAll("p,div,li,h1,h2,h3,h4,tr,pre,section,article").forEach(n=>n.appendChild(doc.createTextNode("\n")));
  const pres=[...doc.querySelectorAll("pre")].map(p=>p.textContent).filter(t=>t.split("\n").some(l=>M.chordTokens(l)||/\[[A-H][^\]]*\]/.test(l)));
  let text;
  if(pres.length) text=pres.sort((a,b)=>b.length-a.length)[0];
  else{
    // blok s nejvíc akordy
    let best=null,bs=0;doc.querySelectorAll("main,article,section,div,td").forEach(n=>{const t=n.textContent;const c=(t.match(/\[[A-H][^\]\n]{0,7}\]/g)||[]).length+t.split("\n").filter(l=>M.chordTokens(l)).length*3;
      const score=c*1000-t.length/50;if(c>0&&score>bs){bs=score;best=t}});
    text=best||(doc.body?doc.body.textContent:"");
  }
  const r=M.importText(text,{title:meta.trim()});r.rawText=text;r.meta=meta.trim();return r;
}
async function fetchUrl(url){
  try{const r=await fetch(url,{mode:"cors",credentials:"omit"});if(r.ok){const t=await r.text();if(t.length>200) return t}}catch(e){}
  const r=await fetch("https://r.jina.ai/"+url,{headers:{"X-Return-Format":"html"}});
  if(!r.ok) throw new Error("http "+r.status);return await r.text();
}
let imp=null;
function importSheet(pre){
  imp={tab:pre&&pre.text&&!pre.url?"text":"url",result:null,english:null,source:pre&&pre.url||"",raw:pre&&pre.text||""};
  openSheet(`<h3>Přidat písničku z webu</h3>
    <div class="sub" role="group" aria-label="Způsob"><button type="button" data-itab="url">Odkaz</button><button type="button" data-itab="text">Vložit text</button></div>
    <div id="iUrlBox" style="display:grid;gap:8px">
      <label for="iUrl">Odkaz na stránku s akordy<input id="iUrl" type="url" inputmode="url" placeholder="https://…" value="${esc(imp.source)}"></label>
      <button class="btn primary" type="button" data-ifetch>Načíst</button>
      <p class="muted small-t">Když web nepovolí přímé čtení, pošle aplikace odkaz službě r.jina.ai, která stránku přečte. Nejde-li to, otevři stránku, označ text s akordy, zkopíruj ho a vlož na kartě Vložit text.</p>
    </div>
    <div id="iTextBox" style="display:grid;gap:8px" hidden>
      <label for="iText">Zkopírovaný text písničky<textarea id="iText" style="min-height:160px" placeholder="Interpret - Název&#10;&#10;Am        C&#10;Ráno když vstanu">${esc(imp.raw)}</textarea></label>
      <button class="btn primary" type="button" data-iparse>Převést</button>
    </div>
    <div id="iResult"></div>`,()=>{imp=null});
  setITab(imp.tab);
  if(imp.source&&!imp.raw) doFetch();else if(imp.raw) parseText();
}
function setITab(t){imp.tab=t;document.querySelectorAll("[data-itab]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.itab===t)));$("iUrlBox").hidden=t!=="url";$("iTextBox").hidden=t!=="text"}
async function doFetch(){
  const url=$("iUrl").value.trim();if(!/^https?:\/\//i.test(url)){$("iResult").innerHTML=`<p class="notice">Vlož celý odkaz začínající https://</p>`;return}
  imp.source=url;$("iResult").innerHTML=`<p class="muted">Načítám stránku…</p>`;
  try{const html=await fetchUrl(url);if(!imp) return;
    imp.raw=html;imp.isHtml=/<html|<body|<div/i.test(html);showResult(imp.isHtml?htmlToSong(html,url):M.importText(html))}
  catch(e){if(!imp) return;$("iResult").innerHTML=`<p class="notice">Stránku se nepodařilo načíst${IS_ARTIFACT?" (v náhledu na claude.ai načítání z webu nefunguje, v nainstalované aplikaci ano)":""}. Otevři ji v prohlížeči, zkopíruj text s akordy a vlož ho na kartě Vložit text.</p>`;setITab("text")}
}
function parseText(){imp.raw=$("iText").value;imp.isHtml=false;showResult(M.importText(imp.raw,{englishB:imp.english==null?undefined:imp.english}))}
function showResult(r){
  imp.result=r;const n=r.chords.length;
  if(!n){$("iResult").innerHTML=`<p class="notice">V textu jsem nenašel žádné akordy. Zkontroluj, že jsi zkopíroval i řádky s akordy.</p>`;return}
  $("iResult").innerHTML=`<div style="display:grid;gap:10px">
    <p><b>Našel jsem ${n} ${n===1?"akord":n<5?"akordy":"akordů"}:</b> ${r.chords.map(esc).join(", ")}</p>
    <label class="inline" for="iEng"><input type="checkbox" id="iEng"${r.english?" checked":""}> Akordy jsou v anglickém značení (B převést na H)</label>
    <div class="fields" style="grid-template-columns:1fr 1fr"><label for="iTitle">Název<input id="iTitle" value="${esc(r.title)}"></label><label for="iArtist">Interpret<input id="iArtist" value="${esc(r.artist)}"></label></div>
    <div class="preview lyrics">${renderLyrics(r.text,0)}</div>
    <div class="row"><button class="btn primary" type="button" data-isave>Uložit písničku</button><button class="btn ghost" type="button" data-iedit>Uložit a upravit</button></div></div>`;
}
$("layer").addEventListener("click",e=>{
  if(!imp) return;const t=e.target;
  const tb=t.closest("[data-itab]");if(tb){setITab(tb.dataset.itab);return}
  if(t.closest("[data-ifetch]")){doFetch();return}
  if(t.closest("[data-iparse]")){imp.english=null;parseText();return}
  if(t.closest("[data-isave],[data-iedit]")){const r=imp.result,id="song-"+Date.now().toString(36),ed=!!t.closest("[data-iedit]");
    put(id,{kind:"song",title:$("iTitle").value.trim()||"Bez názvu",artist:$("iArtist").value.trim(),capo:0,status:"ucim",text:r.text,source:imp.source||"",created:Date.now()});
    logActivity();closeSheet();location.hash="#pisnicky";openSong(id);if(ed){editing=id;render()}toast("Písnička uložená");}
});
$("layer").addEventListener("change",e=>{if(!imp||e.target.id!=="iEng") return;imp.english=e.target.checked;
  const keep={t:$("iTitle").value,a:$("iArtist").value};
  const base=imp.result||{};const r=M.importText(base.rawText||imp.raw,{englishB:imp.english,title:base.meta});r.rawText=base.rawText;r.meta=base.meta;
  showResult(r);$("iTitle").value=keep.t;$("iArtist").value=keep.a});

/* ---------- cvičení ---------- */
let pmode="drill";
document.querySelector("#v-cviceni .sub").addEventListener("click",e=>{const b=e.target.closest("[data-mode]");if(b){stopPractice();pmode=b.dataset.mode;render()}});
function stopPractice(){stopDrillTimer();stopPair(true);stopMetro()}
/* trénink akordů */
let dcat="zaklad",cur=null,t0=0,tInt=null,sess={c:0,n:0};
function pick(){
  const pool=M.CHORDS.filter(c=>dcat==="vse"||c[2]===dcat).map(c=>c[0]).filter(n=>n!==cur);
  const w=pool.map(n=>{const s=chordStat(n);return 1+(3-(s.rating==null?1:s.rating))*2+(s.attempts?(1-s.clean/s.attempts)*3:2)});
  let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0) return pool[i]}return pool[0];
}
function stopDrillTimer(){clearInterval(tInt);tInt=null}
function nextDrill(){cur=pick();t0=Date.now();stopDrillTimer();tInt=setInterval(tick,250);render()}
function tick(){const el=$("dTimer");if(!el) return;const s=Math.floor((Date.now()-t0)/1000);el.textContent=Math.floor(s/60)+":"+String(s%60).padStart(2,"0");practiceSec(0.25)}
function renderDrill(P){
  if(!cur) cur=pick();if(!tInt){t0=Date.now();tInt=setInterval(tick,250)}
  const st=chordStat(cur);
  P.innerHTML=`<div style="display:grid;gap:14px"><div class="chips" id="drillFilters"></div>
  <div class="drill"><div class="drill-card"><div class="name">${cur}</div><div class="dg" data-play="${cur}">${diagram(M.DICT[cur])}</div>
    <div class="muted small-t">${st.rating==null?"Neohodnoceno":M.LEVELS[st.rating]} · čistě ${st.clean} z ${st.attempts}</div></div>
  <div style="display:grid;gap:12px">
    <p class="muted">Chyť akord, zahraj ho a řekni po pravdě, jestli zněly všechny struny. Akordy, které ti nejdou, chodí častěji.</p>
    <div class="row"><button class="btn primary" id="dGood" type="button">Zněl čistě</button><button class="btn" id="dBad" type="button">Ještě ne</button><button class="btn ghost" id="dSkip" type="button">Přeskočit</button></div>
    <div class="row"><button class="btn small" type="button" data-play="${cur}">Přehrát</button><span class="timer" id="dTimer">0:00</span><span class="muted small-t">Teď ${sess.c} z ${sess.n} čistě</span></div>
  </div></div></div>`;
  chips($("drillFilters"),dcat,M.CATS);
  $("drillFilters").onclick=e=>{const b=e.target.closest(".chip");if(b){dcat=b.dataset.k;cur=null;nextDrill()}};
  const ans=ok=>{const s=chordStat(cur);sess.n++;if(ok) sess.c++;put("chord-"+idOf(cur),{...s,kind:"chord",name:cur,clean:s.clean+(ok?1:0),attempts:s.attempts+1,last:today()});logActivity();nextDrill()};
  $("dGood").onclick=()=>ans(true);$("dBad").onclick=()=>ans(false);$("dSkip").onclick=()=>nextDrill();
}
/* přechody */
let pa=null,pb=null,pRun=null;
function weakest(){const s=M.CHORDS.filter(c=>c[2]==="zaklad").map(c=>c[0]).sort((a,b)=>{const x=chordStat(a).rating,y=chordStat(b).rating;return (x==null?1.5:x)-(y==null?1.5:y)});return [s[0],s[1]]}
const pairId=(a,b)=>"pair-"+idOf(a)+"-"+idOf(b);
function stopPair(silent){if(!pRun) return;clearInterval(pRun.int);pRun=null;if(!silent) render()}
function renderPair(P){
  if(!pa){[pa,pb]=weakest()}
  const opts=n=>M.CHORDS.map(c=>`<option${c[0]===n?" selected":""}>${c[0]}</option>`).join("");
  const rec=docs.get(pairId(pa,pb))||{best:0,hist:[]};
  const running=!!pRun;
  P.innerHTML=`<div style="display:grid;gap:14px">
    <p class="muted">Za minutu přehmatni mezi dvěma akordy co nejvíckrát. Každou čistou změnu odklepni. Přes 30 změn za minutu je skvělé.</p>
    <div class="pair"><div style="display:grid;gap:6px;justify-items:center"><select id="pA" aria-label="První akord"${running?" disabled":""}>${opts(pa)}</select><div class="dg" data-play="${pa}">${diagram(M.DICT[pa])}</div></div>
      <span style="font-size:1.6rem" aria-hidden="true">⇄</span>
      <div style="display:grid;gap:6px;justify-items:center"><select id="pB" aria-label="Druhý akord"${running?" disabled":""}>${opts(pb)}</select><div class="dg" data-play="${pb}">${diagram(M.DICT[pb])}</div></div></div>
    <div class="countdown" id="pCd">${running?pRun.left:60} s</div>
    <button class="big-tap" type="button" id="pTap">${running?`<b id="pCount">${pRun.n}</b>Změna!`:`<span>Start</span>`}</button>
    <p class="muted small-t" style="text-align:center">Rekord ${esc(pa)} ⇄ ${esc(pb)}: <b>${rec.best||0}</b> změn${rec.hist&&rec.hist.length?` · naposledy ${rec.hist[rec.hist.length-1].n}`:""}</p>
  </div>`;
  $("pA").onchange=e=>{pa=e.target.value;render()};$("pB").onchange=e=>{pb=e.target.value;render()};
  $("pTap").onclick=()=>{
    if(!pRun){pRun={n:0,left:60,int:setInterval(()=>{pRun.left--;practiceSec(1);const c=$("pCd");if(c) c.textContent=pRun.left+" s";if(pRun.left<=0) finishPair()},1000)};ctx();render();return}
    pRun.n++;const c=$("pCount");if(c) c.textContent=pRun.n;if(navigator.vibrate) navigator.vibrate(8)};
}
function finishPair(){const n=pRun.n;clearInterval(pRun.int);pRun=null;const id=pairId(pa,pb),rec=docs.get(id)||{kind:"pair",a:pa,b:pb,best:0,hist:[]};
  const hist=[...(rec.hist||[]),{d:today(),n}].slice(-20);const nb=n>(rec.best||0);
  put(id,{kind:"pair",a:pa,b:pb,best:Math.max(rec.best||0,n),hist});logActivity();
  click(ctx().currentTime+0.01,true);toast(nb?`Nový rekord: ${n} změn!`:`${n} změn za minutu`)}
/* metronom */
const PATTERNS=[
  {id:"ctvrt",name:"Čtvrtky dolů",beats:4,slots:"D-D-D-D-"},
  {id:"pop",name:"Pop: D DU UDU",beats:4,slots:"D-DU-UDU"},
  {id:"tabor",name:"Táborák: D DU DU DU",beats:4,slots:"D-DUDUDU"},
  {id:"country",name:"Country: D DU D DU",beats:4,slots:"D-DUD-DU"},
  {id:"osminy",name:"Osminy DUDU",beats:4,slots:"DUDUDUDU"},
  {id:"valcik",name:"Valčík 3/4",beats:3,slots:"D-D-D-"},
  {id:"offbeat",name:"Offbeat (reggae)",beats:4,slots:"-U-U-U-U"},
  {id:"jen",name:"Jen metronom",beats:4,slots:"--------"}
];
let met=null,taps=[];
const pat=()=>PATTERNS.find(p=>p.id===prefs.pattern)||PATTERNS[1];
function progList(){return prefs.prog.split(/[\s,|]+/).filter(Boolean).filter(M.isChord)}
function startMetro(){
  const a=ctx();met={next:a.currentTime+0.1,slot:0,bar:0,timer:null,last:performance.now(),q:[]};
  const sched=()=>{const p=pat(),spb=60/prefs.bpm/2,prog=$("mPlay")&&$("mPlay").checked?progList():[];
    while(met.next<a.currentTime+0.12){
      const s=met.slot,ch=p.slots[s];
      if(s%2===0) click(met.next,s===0);
      if(prog.length&&ch!=="-") strumAt(M.getChord(prog[met.bar%prog.length]),met.next,ch,0.28);
      met.q.push({t:met.next,s,bar:met.bar});
      met.next+=spb;met.slot++;if(met.slot>=p.slots.length){met.slot=0;met.bar++}
    }};
  met.timer=setInterval(sched,25);sched();
  const draw=()=>{if(!met) return;const now=a.currentTime;let ev=null;while(met.q.length&&met.q[0].t<=now) ev=met.q.shift();
    if(ev){document.querySelectorAll(".pattern div").forEach((d,i)=>d.classList.toggle("on",i===ev.s));
      document.querySelectorAll(".beats i").forEach((d,i)=>d.classList.toggle("on",i===Math.floor(ev.s/2)));
      const prog=progList();if(prog.length&&$("mCur")){$("mCur").textContent=prog[ev.bar%prog.length];$("mNext").textContent="další "+prog[(ev.bar+1)%prog.length]}}
    const t=performance.now();practiceSec((t-met.last)/1000);met.last=t;met.raf=requestAnimationFrame(draw)};
  met.raf=requestAnimationFrame(draw);
}
function stopMetro(){if(!met) return;clearInterval(met.timer);cancelAnimationFrame(met.raf);met=null;document.querySelectorAll(".pattern div.on,.beats i.on").forEach(d=>d.classList.remove("on"));if($("mGo")) $("mGo").textContent="Spustit"}
function renderMetro(P){
  const p=pat(),prog=progList();
  P.innerHTML=`<div class="metro">
    <div class="bpm"><b id="mBpm">${prefs.bpm}</b><span class="muted">úderů za minutu</span></div>
    <input type="range" id="mRange" min="40" max="200" value="${prefs.bpm}" aria-label="Tempo">
    <div class="row" style="justify-content:center"><button class="btn small" type="button" data-bpm="-5">−5</button><button class="btn small" type="button" data-bpm="-1">−1</button>
      <button class="btn small" type="button" id="mTap">Ťukni do rytmu</button><button class="btn small" type="button" data-bpm="1">+1</button><button class="btn small" type="button" data-bpm="5">+5</button></div>
    <div class="beats">${Array.from({length:p.beats},(_,i)=>`<i class="${i===0?"acc":""}"></i>`).join("")}</div>
    <label for="mPat">Rytmus úhozů<select id="mPat">${PATTERNS.map(x=>`<option value="${x.id}"${x.id===p.id?" selected":""}>${x.name}</option>`).join("")}</select></label>
    <div class="pattern" style="--n:${p.slots.length}">${[...p.slots].map((c,i)=>`<div><b>${c==="D"?"↓":c==="U"?"↑":""}</b>${i%2?"a":i/2+1}</div>`).join("")}</div>
    <div class="panel"><label class="inline" for="mPlay"><input type="checkbox" id="mPlay"> Hrát se mnou akordy (jeden akord na takt)</label>
      <label for="mProg">Sled akordů<input id="mProg" value="${esc(prefs.prog)}" placeholder="G D Em C"></label>
      <div class="row between"><span style="font-family:var(--f-display);font-size:2.2rem;font-weight:800" id="mCur">${esc(prog[0]||"")}</span><span class="muted" id="mNext">${prog[1]?"další "+esc(prog[1]):""}</span></div></div>
    <button class="btn primary wide" type="button" id="mGo">${met?"Zastavit":"Spustit"}</button></div>`;
  const setB=v=>{prefs.bpm=Math.max(40,Math.min(200,Math.round(v)));savePrefs();$("mBpm").textContent=prefs.bpm;$("mRange").value=prefs.bpm};
  $("mRange").oninput=e=>setB(+e.target.value);
  P.querySelectorAll("[data-bpm]").forEach(b=>b.onclick=()=>setB(prefs.bpm+ +b.dataset.bpm));
  $("mTap").onclick=()=>{const t=performance.now();taps=taps.filter(x=>t-x<2500);taps.push(t);if(taps.length>=3){const iv=(taps[taps.length-1]-taps[0])/(taps.length-1);setB(60000/iv)}};
  $("mPat").onchange=e=>{prefs.pattern=e.target.value;savePrefs();const r=!!met;stopMetro();render();if(r){startMetro();$("mGo").textContent="Zastavit"}};
  $("mProg").onchange=e=>{prefs.prog=e.target.value;savePrefs();const l=progList();$("mCur").textContent=l[0]||"";$("mNext").textContent=l[1]?"další "+l[1]:""};
  $("mGo").onclick=()=>{if(met){stopMetro();flushSec()}else{startMetro();$("mGo").textContent="Zastavit"}};
}
function renderPractice(){
  document.querySelectorAll("#v-cviceni .sub button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===pmode)));
  const P=$("practicePane");
  if(pmode==="drill") renderDrill(P);else if(pmode==="pair") renderPair(P);else if(!P.querySelector(".metro")||!met) renderMetro(P);
}

/* ---------- pokrok ---------- */
function renderProgress(){
  const stats=M.CHORDS.map(([n])=>chordStat(n)),counts=[0,0,0,0];let none=0,att=0,cl=0;
  stats.forEach(s=>{if(s.rating==null) none++;else counts[s.rating]++;att+=s.attempts;cl+=s.clean});
  const lg=getLog(),act=k=>(lg.days[k]||0)+(lg.mins[k]||0);
  let streak=0;for(let d=new Date(),first=true;;d.setDate(d.getDate()-1),first=false){const k=dkey(d);if(act(k)) streak++;else if(!first) break}
  let week=0;for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);week+=lg.mins[dkey(d)]||0}
  const sl=songs().filter(s=>!s.example);
  const dn=n=>n===1?"den":n>=2&&n<=4?"dny":"dní";
  $("stats").innerHTML=[[counts[3],`akordů ti sedí z ${M.CHORDS.length}`],[streak,`${dn(streak)} v řadě`],[Math.round(week/60),"minut cvičení za týden"],[sl.filter(s=>s.status==="umim").length+"/"+sl.length,"písniček umíš"]]
    .map(([b,s])=>`<div class="stat"><b>${b}</b><span>${s}</span></div>`).join("");
  const tot=M.CHORDS.length;
  $("lvBar").innerHTML=counts.map((c,i)=>`<i style="width:${c/tot*100}%;background:var(--lv${i})"></i>`).join("");
  $("lvLegend").innerHTML=counts.map((c,i)=>`<span><i style="background:var(--lv${i})"></i>${M.LEVELS[i]} ${c}</span>`).join("")+`<span><i style="background:var(--surface-2);border:1px solid var(--line)"></i>Neohodnoceno ${none}</span>`;
  const days=[];let mx=1;const ks=[];for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);ks.push(dkey(d))}
  ks.forEach(k=>mx=Math.max(mx,act(k)));
  ks.forEach(k=>{const n=act(k),m=Math.round((lg.mins[k]||0)/60);days.push(`<div title="${fmtDay(k)}: ${m} min, ${lg.days[k]||0} záznamů"${n?` data-n style="--k:${(n/mx).toFixed(2)}"`:""}></div>`)});
  $("days").innerHTML=days.join("");$("dFrom").textContent=fmtDay(ks[0]);
  const focus=stats.filter(s=>s.rating!==3).sort((a,b)=>{const ra=a.rating==null?1.5:a.rating,rb=b.rating==null?1.5:b.rating;return ra-rb||((a.attempts?a.clean/a.attempts:0.5)-(b.attempts?b.clean/b.attempts:0.5))}).slice(0,8);
  $("focus").innerHTML=focus.length?focus.map(s=>`<tr><td><b data-chord="${esc(s.name)}" role="button" tabindex="0" style="cursor:pointer;font-family:var(--f-display)">${esc(s.name)}</b></td>
    <td>${s.rating==null?'<span class="muted">neohodnoceno</span>':`<span class="pill" style="background:var(--lv${s.rating})">${M.LEVELS[s.rating]}</span>`}</td>
    <td class="num">${s.attempts?`${s.clean}/${s.attempts} (${Math.round(s.clean/s.attempts*100)} %)`:"–"}</td><td class="num">${s.last?fmtDay(s.last):"–"}</td></tr>`).join("")
    :`<tr><td colspan="4">Všechny akordy ti sedí. Zkus barré nebo novou písničku.</td></tr>`;
  const pairs=[...docs.values()].filter(d=>d&&d.kind==="pair").sort((a,b)=>b.best-a.best);
  $("pairsBox").innerHTML=pairs.length?`<h3>Přechody za minutu</h3><div class="tbl"><table><thead><tr><th>Přechod</th><th>Rekord</th><th>Naposledy</th><th>Pokusů</th></tr></thead><tbody>${pairs.map(p=>{const l=p.hist[p.hist.length-1]||{};
    return `<tr><td><b>${esc(p.a)} ⇄ ${esc(p.b)}</b></td><td class="num">${p.best}</td><td class="num">${l.n!=null?l.n+" ("+fmtDay(l.d)+")":"–"}</td><td class="num">${p.hist.length}</td></tr>`}).join("")}</tbody></table></div>`:"";
  $("optLefty").checked=prefs.lefty;$("optWake").checked=prefs.wake;
}
$("optLefty").onchange=e=>{prefs.lefty=e.target.checked;savePrefs()};
$("optWake").onchange=e=>{prefs.wake=e.target.checked;savePrefs();if(!prefs.wake) releaseWake()};
$("exportBtn").onclick=async()=>{
  const data=JSON.stringify({app:"prazec",version:1,exported:new Date().toISOString(),docs:Object.fromEntries(docs)},null,1),name=`prazec-zaloha-${today()}.json`;
  if(IS_ARTIFACT){try{const dl=await claude.use("downloads");if(dl){await dl.save({filename:name,data});return}}catch(e){toast("Zálohu se nepodařilo uložit");return}}
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
};
$("importFile").onchange=async e=>{const f=e.target.files[0];if(!f) return;
  try{const o=JSON.parse(await f.text());if(o.app!=="prazec"||!o.docs) throw 0;let n=0;
    Object.entries(o.docs).forEach(([k,v])=>{if(!docs.has(k)||k==="log"||(v.kind==="chord")){put(k,v);n++}});toast(`Nahráno ${n} záznamů`)}
  catch(err){toast("Tohle není záloha z Pražce")}e.target.value=""};
let installEvt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;$("installBtn").hidden=false});
$("installBtn").onclick=async()=>{if(!installEvt) return;installEvt.prompt();await installEvt.userChoice.catch(()=>{});installEvt=null;$("installBtn").hidden=true};

function render(){
  if(view==="akordy") renderChords();
  else if(view==="pisnicky") renderSongs();
  else if(view==="cviceni") renderPractice();
  else if(view==="pokrok") renderProgress();
  if(view!=="pisnicky"&&$("scrollFab")) $("scrollFab").hidden=true;
}

/* sdílení do aplikace (Android) */
function shareParams(){
  const p=new URLSearchParams(location.search);if(!p.has("text")&&!p.has("url")) return null;
  const text=(p.get("text")||"")+" "+(p.get("url")||"");const url=(text.match(/https?:\/\/\S+/)||[""])[0];
  history.replaceState(null,"",location.pathname+"#pisnicky");
  return {url,text:url?"":text.trim()};
}
renderStrings();route();initStore();
const sp=shareParams();if(sp){location.hash="#pisnicky";route();importSheet(sp)}
})();
