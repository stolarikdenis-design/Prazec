/* Pražec: rozpoznání tempa ze zvuku (bez DOM).
   Postup: spektrální tok -> obálka nástupů -> autokorelace -> hřebenový filtr přes násobky doby. */
const Tempo=(()=>{
"use strict";
const N=1024;
const fftCache={};
function tables(n){
  if(fftCache[n]) return fftCache[n];
  const rev=new Uint32Array(n),bits=Math.log2(n);
  for(let i=0;i<n;i++){let r=0;for(let b=0;b<bits;b++) r|=((i>>b)&1)<<(bits-1-b);rev[i]=r}
  const cos=new Float32Array(n/2),sin=new Float32Array(n/2);
  for(let i=0;i<n/2;i++){cos[i]=Math.cos(2*Math.PI*i/n);sin[i]=-Math.sin(2*Math.PI*i/n)}
  const win=new Float32Array(n);for(let i=0;i<n;i++) win[i]=0.5-0.5*Math.cos(2*Math.PI*i/(n-1));
  return fftCache[n]={rev,cos,sin,win};
}
function fftMag(re,im,out){
  const n=re.length,{rev,cos,sin}=tables(n);
  for(let i=0;i<n;i++){const j=rev[i];if(j>i){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
  for(let size=2;size<=n;size<<=1){const half=size>>1,step=n/size;
    for(let s=0;s<n;s+=size) for(let k=0;k<half;k++){
      const c=cos[k*step],sn=sin[k*step],a=s+k,b=a+half;
      const tr=re[b]*c-im[b]*sn,ti=re[b]*sn+im[b]*c;
      re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti}}
  for(let i=0;i<out.length;i++) out[i]=Math.sqrt(re[i]*re[i]+im[i]*im[i]);
}
// obálka nástupů: 100 snímků za sekundu
function onsets(x,sr){
  const fps=100,hop=Math.max(1,Math.round(sr/fps)),{win}=tables(N);
  const frames=Math.max(0,Math.floor((x.length-N)/hop)),bins=Math.min(N/2,Math.round(8000/(sr/N)));
  const env=new Float32Array(frames),re=new Float32Array(N),im=new Float32Array(N),mag=new Float32Array(bins);
  let prev=new Float32Array(bins),cur=new Float32Array(bins);
  for(let f=0;f<frames;f++){
    const o=f*hop;for(let i=0;i<N;i++){re[i]=x[o+i]*win[i];im[i]=0}
    fftMag(re,im,mag);
    let s=0;for(let k=1;k<bins;k++){cur[k]=Math.log(1+100*mag[k]);const d=cur[k]-prev[k];if(d>0) s+=d}
    env[f]=f?s:0;const t=prev;prev=cur;cur=t;
  }
  // odečti klouzavý průměr (0,5 s) a normalizuj
  const w=Math.round(fps*0.25),out=new Float32Array(frames);let sum=0;
  const pre=new Float64Array(frames+1);for(let i=0;i<frames;i++) pre[i+1]=pre[i]+env[i];
  for(let i=0;i<frames;i++){const a=Math.max(0,i-w),b=Math.min(frames,i+w+1);const v=env[i]-(pre[b]-pre[a])/(b-a);out[i]=v>0?v:0;sum+=out[i]*out[i]}
  const sd=Math.sqrt(sum/(frames||1))||1;for(let i=0;i<frames;i++) out[i]/=sd;
  return {env:out,fps};
}
function autocorr(e,maxLag){
  const n=e.length,ac=new Float32Array(maxLag+1);let m=0;for(let i=0;i<n;i++) m+=e[i];m/=n||1;
  for(let l=0;l<=maxLag;l++){let s=0;for(let i=0;i+l<n;i++) s+=(e[i]-m)*(e[i+l]-m);ac[l]=s/(n-l)}
  return ac;
}
const lin=(a,p)=>{const i=Math.floor(p),f=p-i;return i+1<a.length?a[i]*(1-f)+a[i+1]*f:0};
// skóre tempa: autokorelace na násobcích periody (doba), s mírnou preferencí kolem 110 BPM
function score(ac,fps,bpm,K){
  const p=fps*60/bpm;let s=0,c=0;
  for(let k=1;k<=K;k++){if(k*p+1>=ac.length) break;s+=lin(ac,k*p);c++}
  return c?s/c:-Infinity;
}
function prior(bpm){const z=Math.log2(bpm/110);return Math.exp(-0.5*(z/0.9)*(z/0.9))}
function detect(x,sr,opt){
  opt=opt||{};const lo=opt.min||50,hi=opt.max||210;
  if(!x||x.length<sr*4) return null;
  const {env,fps}=onsets(x,sr);
  let energy=0;for(const v of env) energy+=v;if(energy<1e-3) return null;
  const K=Math.max(2,Math.min(8,Math.floor(env.length/2/(fps*60/lo))));
  const maxLag=Math.min(env.length-2,Math.ceil(K*fps*60/lo)+2);
  const ac=autocorr(env,maxLag);
  // hrubé hledání po 0,5 BPM
  const cand=[];for(let b=lo;b<=hi;b+=0.5){const s=score(ac,fps,b,K);cand.push({b,s,w:s*prior(b)})}
  const ss=cand.map(c=>c.s).sort((a,b)=>a-b),med=ss[ss.length>>1];
  let best=cand.reduce((a,c)=>c.w>a.w?c:a,cand[0]);
  // jemné doladění po 0,05 BPM
  let fb=best.b,fs=-Infinity;for(let b=best.b-0.6;b<=best.b+0.6;b+=0.05){const s=score(ac,fps,b,K);if(s>fs){fs=s;fb=b}}
  let mean=0;for(const v of ss) mean+=v;mean/=ss.length;let sd=0;for(const v of ss) sd+=(v-mean)*(v-mean);sd=Math.sqrt(sd/ss.length)||1e-9;
  const z=(fs-med)/sd;
  // z≈3 dává i čistý šum, z≥6 má zřetelný rytmus
  const conf=Math.max(0,Math.min(1,(z-3)/3));
  const alt=[fb/2,fb*2].filter(b=>b>=40&&b<=240).map(b=>Math.round(b));
  return {bpm:Math.round(fb*10)/10,conf:Math.round(conf*100)/100,alt};
}
return {detect,onsets};
})();
if(typeof module!=="undefined") module.exports=Tempo;
