import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ATLAS } from '../client/cyborg-atlas-data.js';
import { spriteFrame, drawAtlasFrame } from '../client/cyborg-atlas.js';

test('illustrated frames and all player sheets fit their atlas and preserve alpha PNG format',()=>{
 assert.equal(ATLAS.frames.length,16);
 for(const [x,y,w,h] of ATLAS.frames){assert.ok(x>=0&&y>=0&&w>0&&h>0);assert.ok(x+w<=ATLAS.width&&y+h<=ATLAS.height);}
 for(let slot=1;slot<=8;slot++){
  const png=readFileSync(new URL(`../public/cyborg-${slot}.png`,import.meta.url));
  assert.equal(png.toString('ascii',1,4),'PNG');
  assert.equal(png.readUInt32BE(16),ATLAS.width);assert.equal(png.readUInt32BE(20),ATLAS.height);
  assert.equal(png[25],6,'RGBA alpha is preserved');
 }
});
test('atlas selects four real walk frames, mirrored left view and celebration without moving the anchor',()=>{
 const image={};
 for(const direction of ['down','up','left','right']){
  const frames=new Set();
  for(let frame=0;frame<8;frame++){
   const opts={direction,frame,moving:true};const choice=spriteFrame(opts);frames.add(choice.source);
   assert.equal(choice.mirror,direction==='left');
   const calls=[];const context=new Proxy({}, {get(t,k){return k in t?t[k]:(...args)=>calls.push([k,...args]);}});
   drawAtlasFrame(context,image,60,60,opts);
   const draw=calls.find(c=>c[0]==='drawImage');assert.equal(draw[1],image);
   assert.ok(Math.abs(draw[7]+draw[9])<1e-9,'sprite baseline is zero');
   assert.ok(calls.some(c=>c[0]==='restore'));
  }
  assert.equal(frames.size,4);
 }
 assert.equal(spriteFrame({mood:'winner'}).row,3);
 assert.equal(spriteFrame({moving:false,frame:7}).column,0);
});
