/* Pražec: hudební logika bez DOM (akordy, transpozice, import textu) */
const Music=(()=>{
"use strict";
const NOTES=["C","C#","D","D#","E","F","F#","G","G#","A","B","H"];
const STD=[40,45,50,55,59,64];
const TUNINGS={
  standard:{name:"Standardní (E A D G H e)",midi:[40,45,50,55,59,64],names:["E","A","D","G","H","e"]},
  dropd:{name:"Drop D (D A D G H e)",midi:[38,45,50,55,59,64],names:["D","A","D","G","H","e"]},
  half:{name:"O půltón níž (Es As Des Ges B es)",midi:[39,44,49,54,58,63],names:["Es","As","Des","Ges","B","es"]},
  dadgad:{name:"DADGAD",midi:[38,45,50,55,57,62],names:["D","A","D","G","A","d"]},
  openg:{name:"Open G (D G D G H d)",midi:[38,43,50,55,59,62],names:["D","G","D","G","H","d"]}
};
const LEVELS=["Neumím","Učím se","Jde to","Sedí"];
// pražce od basové E po tenkou e; -1 = nehraje; barre = [pražec, od struny, po strunu]
const CHORDS=[
 ["Em",[0,2,2,0,0,0],"zaklad"],["Am",[-1,0,2,2,1,0],"zaklad"],["C",[-1,3,2,0,1,0],"zaklad"],["G",[3,2,0,0,0,3],"zaklad"],
 ["D",[-1,-1,0,2,3,2],"zaklad"],["E",[0,2,2,1,0,0],"zaklad"],["A",[-1,0,2,2,2,0],"zaklad"],["Dm",[-1,-1,0,2,3,1],"zaklad"],
 ["E7",[0,2,0,1,0,0],"sept"],["A7",[-1,0,2,0,2,0],"sept"],["D7",[-1,-1,0,2,1,2],"sept"],["G7",[3,2,0,0,0,1],"sept"],
 ["C7",[-1,3,2,3,1,0],"sept"],["H7",[-1,2,1,2,0,2],"sept"],["Am7",[-1,0,2,0,1,0],"sept"],["Em7",[0,2,2,0,3,0],"sept"],
 ["Dm7",[-1,-1,0,2,1,1],"sept"],["Cmaj7",[-1,3,2,0,0,0],"sept"],["Fmaj7",[-1,-1,3,2,1,0],"sept"],["Dmaj7",[-1,-1,0,2,2,2],"sept"],
 ["Amaj7",[-1,0,2,1,2,0],"sept"],
 ["F",[1,3,3,2,1,1],"barre",[1,0,5]],["Fm",[1,3,3,1,1,1],"barre",[1,0,5]],["Hm",[-1,2,4,4,3,2],"barre",[2,1,5]],
 ["F#m",[2,4,4,2,2,2],"barre",[2,0,5]],["F#",[2,4,4,3,2,2],"barre",[2,0,5]],["Gm",[3,5,5,3,3,3],"barre",[3,0,5]],
 ["Cm",[-1,3,5,5,4,3],"barre",[3,1,5]],["H",[-1,2,4,4,4,2],"barre",[2,1,5]],["B",[-1,1,3,3,3,1],"barre",[1,1,5]],
 ["C#m",[-1,4,6,6,5,4],"barre",[4,1,5]],["G#m",[4,6,6,4,4,4],"barre",[4,0,5]],
 ["Dsus2",[-1,-1,0,2,3,0],"sus"],["Dsus4",[-1,-1,0,2,3,3],"sus"],["Asus2",[-1,0,2,2,0,0],"sus"],["Asus4",[-1,0,2,2,3,0],"sus"],
 ["Esus4",[0,2,2,2,0,0],"sus"],["Cadd9",[-1,3,2,0,3,0],"sus"],["G6",[3,2,0,0,0,0],"sus"],["Am/G",[3,0,2,2,1,0],"sus"]
];
const CATS=[["vse","Všechny"],["zaklad","Základní"],["sept","Septakordy a maj7"],["barre","Barré"],["sus","Sus, add a další"]];
const ALIAS={Hm:"Bm",H7:"B7",H:"B",B:"Bb"};
const DICT={};CHORDS.forEach(([n,f,c,b])=>DICT[n]={name:n,frets:f,cat:c,barre:b||null});

const Q_OK=/^(?:maj|min|mi|m|M|dim|aug|sus|add|no|[0-9]|\+|-|°|ø|\(|\)|b|#|,)*$/;
function parseChord(s){
  if(typeof s!=="string") return null;
  s=s.trim(); const m=/^([A-H])(.*)$/.exec(s); if(!m) return null;
  let r=m[1]==="B"?10:NOTES.indexOf(m[1]),rest=m[2];
  if(m[1]==="B"&&rest.startsWith("b")&&!/^b(?:5|9|13)/.test(rest)) rest=rest.slice(1);
  else   if(rest.startsWith("#")||rest.startsWith("is")&&m[1]!=="H"){r++;rest=rest.slice(rest[0]==="#"?1:2)}
  else if(rest.startsWith("b")&&!/^b(?:5|9|13)/.test(rest)){r--;rest=rest.slice(1)}
  else if(rest.startsWith("es")&&m[1]!=="E"&&m[1]!=="A"){r--;rest=rest.slice(2)}
  else if((m[1]==="E"||m[1]==="A")&&rest.startsWith("s")&&!rest.startsWith("sus")){r--;rest=rest.slice(1)}
  let bass=null; const sl=rest.indexOf("/");
  if(sl>=0){const b=parseChord(rest.slice(sl+1)); if(!b||b.q) return null; bass=b.root; rest=rest.slice(0,sl)}
  if(!Q_OK.test(rest)) return null;
  return {root:(r+12)%12,q:rest,bass};
}
const isChord=s=>!!parseChord(s);
function fmt(p){return NOTES[p.root]+p.q+(p.bass!=null?"/"+NOTES[p.bass]:"")}
function normName(s){const p=parseChord(s);return p?fmt(p):s}
function qNorm(q){
  if(/^(mi|min|-)$/.test(q)) return "m";
  if(/^(mi7|min7|-7)$/.test(q)) return "m7";
  if(/^(maj7|M7|7maj|maj)$/.test(q)) return q==="maj"?"":"maj7";
  if(q==="sus") return "sus4";
  return q;
}
// když tvar neznám, zjednoduším na příbuzný
const SIMPLER={"9":"7","7sus4":"7","6":"","add9":"","add2":"","m6":"m","m9":"m7","maj9":"maj7","5":"","13":"7","11":"7","m11":"m7","7b9":"7","aug":"","dim":"m","dim7":"m","sus2":"sus2"};
const SHAPES={
  E:{"":[0,2,2,1,0,0],m:[0,2,2,0,0,0],"7":[0,2,0,1,0,0],m7:[0,2,0,0,0,0],maj7:[0,-1,1,1,0,-1],sus4:[0,2,2,2,0,0]},
  A:{"":[-1,0,2,2,2,0],m:[-1,0,2,2,1,0],"7":[-1,0,2,0,2,0],m7:[-1,0,2,0,1,0],maj7:[-1,0,2,1,2,0],sus4:[-1,0,2,2,3,0],sus2:[-1,0,2,2,0,0]}
};
function getChord(name){
  const p=parseChord(name); if(!p) return null;
  const full=fmt(p); if(DICT[full]) return DICT[full];
  let q=qNorm(p.q),simplified=false;
  const base=NOTES[p.root]+q;
  if(DICT[base]) return {...DICT[base],name:full,bassNote:p.bass!=null?NOTES[p.bass]:null};
  if(!(q in SHAPES.E)&&!(q in SHAPES.A)){ if(q in SIMPLER){q=SIMPLER[q];simplified=true} else return null }
  if(DICT[NOTES[p.root]+q]) return {...DICT[NOTES[p.root]+q],name:full,simplified,bassNote:p.bass!=null?NOTES[p.bass]:null};
  const opts=[];
  if(SHAPES.E[q]) opts.push(["E",(p.root-4+12)%12]);
  if(SHAPES.A[q]) opts.push(["A",(p.root-9+12)%12]);
  opts.sort((a,b)=>a[1]-b[1]);
  const [shape,f]=opts[0];
  const frets=SHAPES[shape][q].map(x=>x<0?-1:x+f);
  const barre=f>0&&q!=="maj7"?[f,shape==="A"?1:0,5]:null;
  return {name:full,frets,cat:"gen",barre,simplified,bassNote:p.bass!=null?NOTES[p.bass]:null};
}
function difficulty(ch){if(!ch) return 5; if(ch.cat==="gen") return ch.barre?3.5:2.5; if(ch.cat==="barre") return 3; return ch.cat==="zaklad"?1:1.5}
function transpose(s,st){const p=parseChord(s); if(!p||!st) return p?fmt(p):s;
  return fmt({root:(p.root+st+120)%12,q:p.q,bass:p.bass!=null?(p.bass+st+120)%12:null})}
const midiFreq=m=>440*Math.pow(2,(m-69)/12);
const midiName=m=>NOTES[m%12]+(Math.floor(m/12)-1);

function chordsIn(text){const s=[];(text||"").replace(/\[([^\]]+)\]/g,(_,c)=>{c=c.trim();if(isChord(c)&&!s.includes(c)) s.push(c)});return s}

/* ---- import textu z webu ---- */
const DECOR=/^(\|+|\/+|-+|:+|%|x\d+|\d+x|\(x?\d+x?\)|\.+|N\.?C\.?|\*+)$/i;
function chordTokens(line){
  const out=[];let any=false,re=/\S+/g,m;
  while((m=re.exec(line))){
    let t=m[0],off=0;
    if(DECOR.test(t)) continue;
    const lead=/^[(|[]+/.exec(t); if(lead){off=lead[0].length;t=t.slice(off)}
    t=t.replace(/[)|\],.:]+$/,"");
    if(!t) continue;
    if(!isChord(t)) return null;
    out.push({pos:m.index+off,name:t});any=true;
  }
  return any?out:null;
}
const HEAD_ONLY=/^\s*[\[(]?\s*((?:ref(?:r[eé]n)?|rf|r|chorus|verse|sloka|intro|outro|bridge|mezihra|předehra|predehra|dohra|coda|solo|pre-chorus|interlude)\s*\d*|\d+)\s*[\])]?\s*[.:)]?\s*$/i;
const HEAD_PREFIX=/^\s*((?:ref(?:r[eé]n)?|rf|r|chorus|verse|sloka)\s*\d*|\d+)\s*[.:)]\s+(?=\S)/i;
const LABELS={r:"Refrén",rf:"Refrén",ref:"Refrén","refrén":"Refrén",refren:"Refrén",chorus:"Refrén",verse:"Sloka",sloka:"Sloka",intro:"Předehra","předehra":"Předehra",predehra:"Předehra",outro:"Dohra",dohra:"Dohra",bridge:"Mezihra",mezihra:"Mezihra",interlude:"Mezihra",solo:"Sólo",coda:"Dohra","pre-chorus":"Předrefrén"};
function label(raw){
  const m=/^([^\d\s]*)\s*(\d*)$/.exec(raw.trim().toLowerCase().replace(/\.$/,""));
  if(!m) return raw;
  if(!m[1]) return m[2]+". sloka";
  const l=LABELS[m[1]]||raw.trim();
  return m[2]?l+" "+m[2]:l;
}
function englishToCzech(name){
  const p=/^B(b|#)?(.*)$/.exec(name); if(!p) return name;
  if(p[1]==="b") return "B"+p[2];
  if(p[1]==="#") return "C"+p[2];
  return "H"+p[2];
}
function importText(raw,opt){
  opt=opt||{};
  let title=opt.title||"",artist=opt.artist||"";
  let t=String(raw||"").replace(/\r\n?/g,"\n").replace(/ /g," ");
  t=t.split("\n").map(l=>{let o="";for(const c of l){if(c==="\t"){o+=" ".repeat(8-o.length%8)}else o+=c}return o}).join("\n");
  // r.jina.ai hlavička
  const jt=/^Title:\s*(.+)$/m.exec(t); if(jt&&!title) title=jt[1].trim();
  t=t.replace(/^(Title|URL Source|Published Time|Markdown Content|Warning):.*$/gm,"");
  // Ultimate Guitar značky
  t=t.replace(/\[ch\]([^\[]*?)\[\/ch\]/g,"$1").replace(/\[\/?tab\]/g,"");
  // největší blok kódu s akordy (markdown)
  const blocks=[...t.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(m=>m[1]).filter(b=>b.split("\n").some(l=>chordTokens(l)));
  if(blocks.length) t=blocks.sort((a,b)=>b.length-a.length)[0];
  let lines=t.split("\n").map(l=>l.replace(/\s+$/,""));
  // název z první řádky "Interpret - Název"
  if(!title){
    const i=lines.findIndex(l=>l.trim());
    if(i>=0){const l=lines[i].trim(),m=/^(.{1,60}?)\s+[-–—]\s+(.{1,60})$/.exec(l);
      if(m&&!chordTokens(l)&&!/\[/.test(l)){artist=m[1].trim();title=m[2].trim();lines.splice(i,1)}}
  } else if(/\s[-–—]\s/.test(title)&&!artist){
    const m=/^(.+?)\s+[-–—]\s+(.+?)(?:\s+[-–|—].*)?$/.exec(title); if(m){artist=m[1].trim();title=m[2].trim()}
  }
  title=title.replace(/\s*[(\[]?(akordy|chords?|text|tab|ver\.?\s*\d+)[)\]]?.*$/i,"").replace(/\s+[@|].*$/,"").trim();
  // anglické B?
  const allTok=[];lines.forEach(l=>{const c=chordTokens(l);if(c) c.forEach(x=>allTok.push(x.name));(l.match(/\[([^\]]+)\]/g)||[]).forEach(x=>allTok.push(x.slice(1,-1)))});
  const hasH=allTok.some(x=>/^H/.test(x)),hasB=allTok.some(x=>/^B(?!b)/.test(x));
  const english=opt.englishB!=null?opt.englishB:(hasB&&!hasH);
  const conv=n=>english?englishToCzech(n):n;
  const out=[];
  for(let i=0;i<lines.length;i++){
    let line=lines[i];
    const h=HEAD_ONLY.exec(line);
    if(h&&!chordTokens(line)){out.push("{"+label(h[1])+"}");continue}
    const ct=chordTokens(line);
    if(ct){
      const nx=lines[i+1];
      if(nx!=null&&nx.trim()&&!chordTokens(nx)&&!HEAD_ONLY.test(nx)&&!/\[[^\]]+\]/.test(nx)){
        let ly=nx;const pre=HEAD_PREFIX.exec(ly);let head=null;
        if(pre){head=label(pre[1]);ly=" ".repeat(pre[0].length)+ly.slice(pre[0].length)}
        for(const c of ct.slice().reverse()){
          if(c.pos>ly.length) ly=ly+" ".repeat(c.pos-ly.length);
          ly=ly.slice(0,c.pos)+"["+conv(c.name)+"]"+ly.slice(c.pos);
        }
        if(head) out.push("{"+head+"}");
        out.push(head?ly.trim().replace(/^(\[[^\]]+\])\s+/,"$1"):ly.replace(/\s+$/,"").replace(/^ +(?=\[)/,""));i++;
      } else out.push(ct.map(c=>"["+conv(c.name)+"]").join(" "));
      continue;
    }
    if(english) line=line.replace(/\[([^\]]+)\]/g,(m,c)=>isChord(c)?"["+englishToCzech(c)+"]":m);
    const pre=HEAD_PREFIX.exec(line);
    if(pre&&(/\[/.test(line)||/^(ref|r|rf|chorus)/i.test(pre[1]))){out.push("{"+label(pre[1])+"}");line=line.slice(pre[0].length)}
    out.push(line);
  }
  let text=out.join("\n").replace(/\n{3,}/g,"\n\n").replace(/^\n+|\n+$/g,"");
  // odstraň běžné ocásky webu
  text=text.replace(/\n.*(©|copyright|všechna práva|all rights).*$/gim,"");
  return {title,artist,text,english,chords:chordsIn(text)};
}

return {NOTES,STD,TUNINGS,LEVELS,CHORDS,CATS,ALIAS,DICT,parseChord,isChord,normName,getChord,difficulty,transpose,midiFreq,midiName,chordsIn,chordTokens,importText};
})();
if(typeof module!=="undefined") module.exports=Music;
