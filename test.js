const M=require('./src/music.js');const a=require('assert');
const n=s=>M.normName(s);
a.equal(n("Bb"),"B");a.equal(n("Es"),"D#");a.equal(n("Asus4"),"Asus4");a.equal(n("Fis"),"F#");a.equal(n("Ami"),"Ami");
a.equal(M.isChord("Ale"),false);a.equal(M.isChord("Am7/G"),true);a.equal(M.isChord("Ham"),false);
a.equal(M.transpose("Am/G",2),"Hm/A");a.equal(M.transpose("H7",1),"C7");
a.ok(M.getChord("C#m").barre);a.deepEqual(M.getChord("D#").frets,[-1,6,8,8,8,6]);
a.equal(M.getChord("Ami").frets.join(),M.DICT.Am.frets.join());
a.ok(M.getChord("G9").simplified);a.equal(M.getChord("Xyz"),null);
const ug=`Wonderwall - Oasis
[Verse 1]
Em7       G              Dsus4         A7sus4
Today is gonna be the day that they're gonna
Bm  C   D
| Em | C | x2

Ref: Tak jsme si
`;
const r=M.importText(ug);console.log(r);
const cz=`R: [Am]Ráno [C]vstanu
1. [G]Tady`;console.log(M.importText(cz));
const cz2=`   Am        C
Ref: Na kopci stál
Em       H7
dům a v něm`;console.log(M.importText(cz2));
console.log("OK");
