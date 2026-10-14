import { ATLAS } from './cyborg-atlas-data.js';

const sheets = Array.from({ length: 8 }, (_, slot) => {
  if (typeof Image === 'undefined') return null;
  const image = new Image();
  const entry = { image, ready: false, failed: false };
  image.onload = () => { entry.ready = true; };
  image.onerror = () => { entry.failed = true; };
  image.src = `/cyborg-${slot + 1}.png`;
  return entry;
});

export function spriteFrame({direction='down',frame=0,moving=false,mood='idle'}={}) {
  const row=mood==='winner'?3:direction==='up'?2:(direction==='left'||direction==='right')?1:0;
  const column=moving?Math.floor(((frame%8)+8)%8/2):0;
  return { source: ATLAS.frames[row*4+column], mirror: direction==='left', row, column };
}

// Keep one scale across all frames. Crops remove transparent gutters, not artwork.
// All frames share a foot anchor so differing source margins never cause skating.
export function drawAtlasFrame(context,image,x,y,options={}) {
  const {source,mirror}=spriteFrame(options);
  const [sx,sy,sw,sh]=source;
  const scale=46/ATLAS.bodyHeight;
  const bob=options.moving && Math.floor(options.frame||0)%2 ? -1 : 0;
  context.save();
  context.imageSmoothingEnabled=false;
  
  context.translate(Math.round(x),Math.round(y)+18+bob);
  if(mirror)context.scale(-1,1);
  if(options.mood==='crying')context.translate(0,1);
  context.drawImage(image,sx,sy,sw,sh,-Math.round(sw*scale/2),-Math.round(sh*scale),Math.round(sw*scale),Math.round(sh*scale));
  context.restore();
}

export function drawAtlasCyborg(context,x,y,palette,options) {
  const entry=sheets[(palette.mark||1)-1]||sheets[0];
  // The geometric version remains a network-failure fallback and supports headless tools.
  if(!entry||entry.failed)return false;
  if(entry.ready)drawAtlasFrame(context,entry.image,x,y,options);
  return true;
}
