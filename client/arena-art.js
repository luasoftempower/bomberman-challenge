import { ARENA_ATLAS } from './arena-atlas-data.js';
let image=null, ready=false;
if(typeof Image!=='undefined'){
 image=new Image();image.onload=()=>{ready=true;};image.src='/arena-props.png';
}

export function drawPropFrame(context,source,kind,x,y,width,height,alpha=1){
 const bounds=ARENA_ATLAS[kind];
 if(!bounds)return false;
 context.save();context.globalAlpha*=alpha;
 context.imageSmoothingEnabled=false;
 context.drawImage(source,...bounds,x,y,width,height);
 context.restore();return true;
}

export function drawArenaProp(context,kind,x,y,width,height,alpha=1){
 if(!ready)return false;
 return drawPropFrame(context,image,kind,x,y,width,height,alpha);
}
