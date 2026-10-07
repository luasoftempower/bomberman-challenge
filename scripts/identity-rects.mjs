import { CHARACTERS, drawCyborg, drawCharge } from '../client/identity.js';
const sprites = CHARACTERS.map(p => {
  const rectangles=[];
  drawCyborg({set fillStyle(v) {this.color=v;}, fillRect(x,y,w,h) {rectangles.push([this.color,x+32,y+36,w,h]);}},0,0,p);
  return rectangles;
});
const charge=[];
drawCharge({set fillStyle(v){this.color=v;},fillRect(x,y,w,h){charge.push([this.color,x+32,y+32,w,h]);}},0,0);
console.log(JSON.stringify({sprites,charge}));
