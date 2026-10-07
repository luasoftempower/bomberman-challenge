import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARENA_ATLAS } from '../client/arena-atlas-data.js';
import { drawPropFrame } from '../client/arena-art.js';

test('arena atlas has valid transparent crops and draws each prop inside its tile',()=>{
 const png=readFileSync(new URL('../public/arena-props.png',import.meta.url));
 assert.equal(png.toString('ascii',1,4),'PNG');
 assert.equal(png.readUInt32BE(16),ARENA_ATLAS.width);
 assert.equal(png.readUInt32BE(20),ARENA_ATLAS.height);
 assert.equal(png[25],6);
 for(const kind of ['wall','crate','charge','alert']){
  const [x,y,w,h]=ARENA_ATLAS[kind];assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=ARENA_ATLAS.width&&y+h<=ARENA_ATLAS.height);
  const draws=[];const stack=[];
  const ctx={globalAlpha:.7,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},drawImage(...args){draws.push(args);}};
  assert.equal(drawPropFrame(ctx,{},kind,40,80,38,38,.85),true);
  assert.equal(ctx.globalAlpha,.7);assert.deepEqual(draws[0].slice(-4),[40,80,38,38]);
 }
});
