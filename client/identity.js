import { drawArenaProp } from "./arena-art.js";
import { drawAtlasCyborg } from "./cyborg-atlas.js";
export const CHARACTERS = [
  { name: 'Íon', shell: '#637f83', accent: '#65f5ff', skin: '#d6a17e', hair: '#503139', mark: 1 },
  { name: 'Ônix', shell: '#6950ad', accent: '#d8a0ff', skin: '#a97458', hair: '#252031', mark: 2 },
  { name: 'Fluxo', shell: '#216eaa', accent: '#7abfff', skin: '#e3b697', hair: '#413032', mark: 3 },
  { name: 'Fagulha', shell: '#b54768', accent: '#ff98ba', skin: '#bd8767', hair: '#792f49', mark: 4 },
  { name: 'Dínamo', shell: '#b48d37', accent: '#fff18a', skin: '#885940', hair: '#262832', mark: 5 },
  { name: 'Arco', shell: '#268d83', accent: '#84ffd4', skin: '#cea086', hair: '#243c36', mark: 6 },
  { name: 'Pulso', shell: '#8d51b4', accent: '#f8a9ff', skin: '#edc4a3', hair: '#ded8cd', mark: 7 },
  { name: 'Surto', shell: '#5f9238', accent: '#c9ff80', skin: '#ac795b', hair: '#473927', mark: 8 },
];
export const characterFor = (slot) => CHARACTERS[slot] || CHARACTERS[0];
const rect = (c, color, x, y, w, h) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };
const shade = (hex, n) => '#' + [1,3,5].map(i => Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');

// Original pixel geometry guided by the reference's hair, shirt, jeans and boots.
// Eight contact/passing poses; a human face with one ocular implant and prosthetic forearm.
export function drawCyborg(c,x,y,p,{direction='down',frame=0,moving=false,mood='idle'}={}) {
 if(drawAtlasCyborg(c,x,y,p,{direction,frame,moving,mood}))return;
 const pose=((Math.floor(frame)%8)+8)%8;
 const stride=moving?[0,1,3,2,0,-1,-3,-2][pose]:0;
 const rise=moving?[0,-1,-1,0,0,-1,-1,0][pose]:0;
 const profile=direction==='left'||direction==='right';
 const back=direction==='up';
 const r=(color,a,b,w,h)=>rect(c,color,x+(direction==='left'?-a-w:a),y+b+rise,w,h);
 const ink='#222333',skinDark=shade(p.skin,-30),hairLight=shade(p.hair,28),clothDark=shade(p.shell,-25);
 const armLift=mood==='winner'?-10:mood==='crying'?-4:0;
 // Jeans and boots: feet pass each other rather than sliding a whole rigid body.
 for(const [a,d] of [[-7,stride],[2,-stride]]) {
  const forward=profile?d:0, lift=moving&&(d<0||(stride===0&&((pose===0&&a<0)||(pose===4&&a>0))))?-1:0;
  r('#20283d',a+forward,5,6,11+lift);
  r('#345582',a+forward+1,6,4,7+lift);r('#497298',a+forward+1,7,2,4);
  r('#30242b',a+forward-1,14+lift,8,5);
  r('#684137',a+forward,14+lift,6,3);r('#8b5540',a+forward,14+lift,3,1);
 }
 // Broad readable shirt with a shaped waist and a small rolled sleeve.
 r(ink,-9,-9,18,16);r(clothDark,-8,-8,16,13);
 r(p.shell,-7,-8,13,12);r(shade(p.shell,17),-6,-7,5,7);
 r(clothDark,-4,1,11,3);r('#233443',-7,5,14,2);
 r(skinDark,-3,-12,6,5);r(p.skin,-2,-12,4,4);
 r(clothDark,-1,-7,3,3);
 const humanSwing=profile?-stride:Math.round(stride/2);
 r(ink,-13,-6+humanSwing+armLift,5,14);
 r(p.shell,-12,-6+humanSwing+armLift,4,5);
 r(p.skin,-12,-1+humanSwing+armLift,4,8);
 r(skinDark,-12,3+humanSwing+armLift,2,5);
 // The prosthesis is confined to the forearm, leaving a visible human upper arm.
 r(ink,8,-6-humanSwing+armLift,5,15);r(p.shell,8,-6-humanSwing+armLift,4,4);
 r(p.skin,9,-2-humanSwing+armLift,3,3);
 r('#536879',9,1-humanSwing+armLift,4,7);r('#a1b4ba',9,1-humanSwing+armLift,2,5);
 r(p.accent,10,3-humanSwing+armLift,2,2);r('#354654',9,7-humanSwing+armLift,4,2);
 // Large hair silhouette, broken fringe and exposed jaw, like a small RPG portrait.
 r('#302330',-8,-27,16,19);r('#302330',-10,-23,20,12);
 r(skinDark,-7,-22,14,13);r(p.skin,-6,-22,12,12);r(shade(p.skin,16),-5,-20,5,8);
 r(p.skin,-4,-10,8,2);
 if(back) {
  r(p.hair,-8,-26,16,16);r(hairLight,-5,-25,4,10);r(shade(p.hair,12),1,-23,5,11);
  r(skinDark,-3,-10,6,2);r('#566c7d',7,-16,2,5);
 } else if(profile) {
  r(p.hair,-8,-26,14,6);r(p.hair,-9,-23,8,12);r(hairLight,-6,-25,3,10);
  r(p.hair,1,-24,6,6);r(p.skin,5,-19,4,7);r(skinDark,8,-16,2,3);
  r('#edf0de',4,-18,4,4);r('#244358',6,-18,2,4);
  r('#63798c',-2,-18,3,5);r(p.accent,-1,-17,2,2);
  r(skinDark,3,-11,4,1);
 } else {
  r(p.hair,-8,-26,16,6);r(p.hair,-9,-22,3,12);r(p.hair,7,-22,2,11);
  r(hairLight,-5,-25,3,6);r(shade(p.hair,12),1,-25,4,6);
  r(p.hair,-5,-21,4,3);r(p.hair,2,-22,4,5);
  if(p.mark%3===0)r(hairLight,-8,-24,4,4);
  if(p.mark%3===2)r(p.hair,-4,-28,10,3);
  r('#e0ecde',-5,-17,4,mood==='crying'?2:5);r('#284257',-3,-17,2,mood==='crying'?1:5);
  r('#748795',2,-17,5,5);r(p.accent,3,-16,3,3);r('#e8ffff',4,-16,1,2);
  r(skinDark,-1,-13,2,2);r('#8c5c4e',-2,-10,4,1);
 }
}
export function drawCharge(c,x,y,alert=false,small=false) {
 const size=small?.6:1;
 if(drawArenaProp(c,alert?"alert":"charge",x-14*size,y-16*size,28*size,31*size))return;
 const s=small?0.6:1;
 const r=(color,a,b,w,h)=>rect(c,color,x+a*s,y+b*s,Math.ceil(w*s),Math.ceil(h*s));
 r('#101724',-10,-11,20,24);r('#3c5265',-8,-9,16,20);
 r('#7b94a5',-8,-9,16,3);r('#253648',-5,-4,10,12);
 r(alert?'#ee97c4':'#82dce5',-2,-3,4,9);
 r('#d5f5f3',-1,-2,1,6);r('#253648',-11,-3,3,10);r('#253648',8,-3,3,10);
}
