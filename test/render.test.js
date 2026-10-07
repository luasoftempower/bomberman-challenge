import test from 'node:test';
import assert from 'node:assert/strict';
import { renderGame, startMenuMascotAnimation, startResultCharacterAnimation, startVictoryAnimation } from '../client/render.js';
import { CHARACTERS } from '../client/identity.js';

function canvasStub() {
  let rectangles = 0;
  const context = new Proxy({}, { get(target,key) {
    if (key in target) return target[key];
    return (...args) => {
      for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `${String(key)} received nonfinite coordinate`);
      if (key === 'fillRect') rectangles++;
    };
  }});
  return { width: 520, height: 440, getContext: () => context, count: () => rectangles };
}
test('presentation renders movement, protection, defeat and bomb trajectories without mutating snapshots', () => {
 const canvas = canvasStub();
 const state = { grid: '#o.' + '.'.repeat(140), fallingBlocks: [{x:6,y:6,ttl:0.3,duration:0.62}], players: CHARACTERS.map((p,slot)=>({id:`p${slot}`,slot,name:p.name,x:60+slot*40,y:60,alive:slot!==7,protected:slot===0})),
 bombs: [{x:2,y:3,fuse:0.2},{x:4,y:3,fuse:1,airborneTtl:0.2,throwFromX:2,throwFromY:3,throwDuration:0.42},{x:5,y:3,fuse:1,slideVisualTtl:0.06,slideFromX:4,slideFromY:3}],
 blasts: [{x:2,y:3,ttl:0.4},{x:3,y:3,ttl:0.4},{x:4,y:3,ttl:0.4}],
 powerups: ['bomb','bombPass'].map((type,id)=>({type,id,x:id+1,y:4})) };
 for (const [dx,dy] of [[0,0],[4,0],[-4,0],[0,4],[0,-4]]) {
   const frame=structuredClone(state); for(const p of frame.players){p.x+=dx;p.y+=dy;}
   const before=structuredClone(frame); renderGame(canvas,frame); assert.deepEqual(frame,before);
 }
 assert.ok(canvas.count()>0);
});
test('menu and result animation loops render and cancel for every character', (t) => {
 let callback; let id=0; const cancelled=[];
 globalThis.requestAnimationFrame=()=>{}; globalThis.cancelAnimationFrame=()=>{};
 t.after(()=>{delete globalThis.requestAnimationFrame;delete globalThis.cancelAnimationFrame;});
 t.mock.method(globalThis,'requestAnimationFrame', fn => {callback=fn;return ++id;});
 t.mock.method(globalThis,'cancelAnimationFrame', value=>cancelled.push(value));
 for (const start of [startMenuMascotAnimation, ...CHARACTERS.flatMap((_,slot)=>[c=>startResultCharacterAnimation(c,slot,'winner'),c=>startResultCharacterAnimation(c,slot,'crying'),c=>startVictoryAnimation(c,slot)])]) {
   const canvas=canvasStub();const stop=start(canvas);
   callback(performance.now()+500);assert.ok(canvas.count()>0);stop();assert.equal(cancelled.at(-1),id);
 }
});

import { drawCyborg } from '../client/identity.js';
import { drawBlast } from '../client/render.js';

test('geometric fallback walk has eight distinct poses in every direction without changing its palette', () => {
 const palette=structuredClone(CHARACTERS[0]);
 for(const direction of ['down','up','left','right']) {
  const poses=new Set();
  for(let frame=0;frame<8;frame++) {
   const rects=[];const context={fillRect(...args){rects.push([this.fillStyle,...args]);}};
   drawCyborg(context,40,40,palette,{direction,frame,moving:true});poses.add(JSON.stringify(rects));
  }
  assert.equal(poses.size,8,direction);
 }
 assert.deepEqual(palette,CHARACTERS[0]);
});
test('lightning forms and dissipates inside its tile and stops drawing after expiry', () => {
 const commands=[];
 const context=new Proxy({}, {get(target,key){return key in target?target[key]:(...args)=>{for(const v of args)if(typeof v==='number')assert.ok(Number.isFinite(v));commands.push([key,...args]);};}});
 const occupied=new Set(['2,3','3,3']);
 const drawings=[];
 for(const ttl of [.4,.2,.02]) {
  commands.length=0;drawBlast(context,Object.freeze({x:2,y:3,ttl}),1,occupied);
  assert.ok(commands.some(([name])=>name==='clip'));
  assert.ok(commands.some(([name,...args])=>name==='rect'&&args.join(',')==='80,120,40,40'));
  drawings.push(JSON.stringify(commands));
 }
 assert.equal(new Set(drawings).size,3);
 commands.length=0;drawBlast(context,{x:2,y:3,ttl:0},1,occupied);assert.equal(commands.length,0);
});
