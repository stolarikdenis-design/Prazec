// Ověření rozpoznání tempa na uměle vytvořených nahrávkách se známým tempem.
const T=require('./src/tempo.js');
const sr=44100;let seed=1;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647*2-1};
function buf(sec){return new Float32Array(Math.floor(sr*sec))}
function add(b,t,fn,dur){const s=Math.floor(t*sr);for(let i=0;i<dur*sr&&s+i<b.length;i++) b[s+i]+=fn(i/sr)}
function noise(b,a){for(let i=0;i<b.length;i++) b[i]+=a*rnd()}
function clicks(bpm,sec){const b=buf(sec);for(let t=0.3;t<sec;t+=60/bpm) add(b,t,x=>Math.sin(2*Math.PI*1500*x)*Math.exp(-x*60),0.06);noise(b,0.05);return b}
function drums(bpm,sec){const b=buf(sec),q=60/bpm;let k=0;
  for(let t=0.2;t<sec;t+=q/2,k++){
    add(b,t,x=>0.25*rnd()*Math.exp(-x*80),0.05);               // hi-hat na osminy
    if(k%4===0) add(b,t,x=>Math.sin(2*Math.PI*(55+60*Math.exp(-x*30))*x)*Math.exp(-x*12),0.3); // kopák 1,3
    if(k%4===2) add(b,t,x=>0.6*rnd()*Math.exp(-x*25),0.15);   // virbl 2,4
  }noise(b,0.02);return b}
function ks(f){const N=Math.round(sr/f),d=new Float32Array(N);for(let i=0;i<N;i++) d[i]=rnd()*0.5;let i=0;return x=>{const j=i%N,v=d[j];d[j]=0.996*0.5*(d[j]+d[(j+1)%N]);i++;return v}}
function strum(bpm,sec){const b=buf(sec),q=60/bpm,pat="D-DU-UDU",ch=[[98,147,196,247,294,392],[147,220,294,370],[82,123,165,196,247,330],[131,165,196,262,330]];let k=0;
  for(let t=0.2;t<sec;t+=q/2,k++){const c=pat[k%8];const chord=ch[Math.floor(k/8)%4];
    if(c==="-") continue;const notes=c==="U"?chord.slice(-4).reverse():chord;
    notes.forEach((f,n)=>add(b,t+n*0.012,ks(f),Math.min(q*0.9,1.2)))}
  noise(b,0.01);return b}
function voiceLike(bpm,sec){ // měkčí: basa na doby + akordy na 2 a 4, bez bicích
  const b=buf(sec),q=60/bpm;let k=0;for(let t=0.2;t<sec;t+=q,k++){add(b,t,ks(k%2?73:55),q*0.95);if(k%2) [196,247,294].forEach((f,n)=>add(b,t+n*0.015,ks(f),q*0.9))}
  noise(b,0.01);return b}
const cases=[["kliky",clicks,96],["kliky",clicks,140],["bicí",drums,128],["bicí",drums,92],["kytara D-DU-UDU",strum,84],["kytara D-DU-UDU",strum,112],["basa a akordy",voiceLike,72],["basa a akordy",voiceLike,104]];
let ok=0;for(const [n,f,bpm] of cases){const t0=Date.now(),r=T.detect(f(bpm,15),sr);const ms=Date.now()-t0;
  const err=Math.abs(r.bpm-bpm)/bpm,oct=Math.min(Math.abs(r.bpm*2-bpm),Math.abs(r.bpm/2-bpm))/bpm;
  const res=err<0.02?"OK":oct<0.02?"OKTÁVA":"CHYBA";if(res==="OK") ok++;
  console.log(`${n.padEnd(17)} skutečné ${bpm}  zjištěno ${r.bpm}  jistota ${r.conf}  ${res}  ${ms} ms`)}
const short=T.detect(strum(96,8),sr);console.log(`krátký úsek 8 s, kytara 96: ${short.bpm} jistota ${short.conf}`);if(Math.abs(short.bpm-96)>2) ok--;
const nz=buf(10);noise(nz,0.3);const rn=T.detect(nz,sr);console.log(`jen šum: ${rn?rn.bpm+" jistota "+rn.conf:"nic"}`);if(rn&&rn.conf>0.4) ok--;
console.log(`${ok}/${cases.length} přesně`);process.exitCode=ok===cases.length?0:1;
// node test-tempo.js wav <složka>: uloží testovací nahrávky pro e2e
if(process.argv[2]==="wav"){const fs=require("fs"),dir=process.argv[3];
  const wav=(x,f)=>{const b=Buffer.alloc(44+x.length*2);b.write("RIFF",0);b.writeUInt32LE(36+x.length*2,4);b.write("WAVEfmt ",8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
    b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(x.length*2,40);
    for(let i=0;i<x.length;i++) b.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(x[i]*0.7*32767))),44+i*2);fs.writeFileSync(dir+"/"+f,b)};
  wav(drums(120,60),"drums120.wav");wav(strum(96,30),"strum96.wav");}
