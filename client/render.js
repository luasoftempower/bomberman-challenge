import { drawArenaProp } from "./arena-art.js";
import { CHARACTERS, drawCyborg, drawCharge } from "./identity.js";
import { arenaDimensions, isArenaBoundary } from "../shared/arena.js";
import { BLAST_SECONDS, CRATE, PLAYER_COLORS, TILE_SIZE, VOID, WALL } from "../shared/constants.js";

const px = (context, color, x, y, width, height) => {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
};

// Quiet matte surfaces: navigable floor, solid steel and segmented breakable cover.
function drawFloor(context,left,top,x,y) {
 // Broad slate panels: restrained material shading leaves the action readable.
 px(context,'#111e2a',left,top,40,40);
 px(context,(x+y)%2?'#1b2d3a':'#1d303d',left+1,top+1,39,39);
 px(context,'#263b48',left+2,top+1,36,1);
 px(context,'#213440',left+2,top+2,36,7);
 px(context,'#152530',left+2,top+36,36,3);
 px(context,'#172834',left+37,top+3,2,33);
 // Very occasional wear, never repeated circuitry or blinking decorations.
 if((x*7+y*3)%11===0){px(context,'#2a404b',left+27,top+29,5,1);px(context,'#152631',left+30,top+30,4,1);}
}
function drawWall(context,left,top,border) {
 if(drawArenaProp(context,"wall",left+1,top+1,38,38,border?.85:1))return;
 const r=(color,a,b,w,h)=>px(context,color,left+a,top+b,w,h);
 r('#0c1724',1,1,38,38);r(border?'#3b5063':'#46596c',2,2,36,32);
 r(border?'#536a7c':'#647c8f',2,2,36,4);
 r('#2e4053',4,30,34,6);r('#203041',4,36,34,2);
 // One recessed seam; one small cool indicator, no repeated circuitry.
 r('#304356',8,12,24,2);
 r('#3d5265',7,15,26,13);r('#4a6173',7,15,26,1);r('#273a4b',2,6,2,26);
 if(!border)r('#80b8c3',29,23,3,3);
}
function drawCrate(context,left,top) {
 if(drawArenaProp(context,"crate",left+3,top+3,34,35))return;
 const r=(color,a,b,w,h)=>px(context,color,left+a,top+b,w,h);
 r('#151c27',4,4,32,34);r('#77675c',5,5,30,28);
 r('#a2927d',5,5,30,4);r('#584e49',7,29,28,6);
 // Two wide panels and a copper latch identify destructible modules by shape.
 r('#8a7968',8,11,10,16);r('#857564',22,11,10,16);
 r('#4b4847',19,10,2,19);r('#cbb08a',16,17,8,5);
 r('#655849',18,18,4,3);
 r('#b09a7f',8,11,10,1);r('#ad977b',22,11,10,1);
 r('#67584f',8,26,10,1);r('#67584f',22,26,10,1);
}

const POWERUP_COLORS = {
  fire: ["#327cbb", "#b5faff"], bomb: ["#776dff", "#dad5ff"], speed: ["#26d7f2", "#c8ff50"],
  remote: ["#ff4f7d", "#ffe45c"], glove: ["#ff79b8", "#fff0f7"], kick: ["#f2b43d", "#fff173"],
  bombPass: ["#7774a8", "#8ff4ff"], blockPass: ["#b76b3e", "#f2b35e"], suit: ["#55dff7", "#ecffff"],
  fullFire: ["#7859d0", "#b5faff"],
};

function drawPowerup(context, powerup, animationTime) {
  const left = powerup.x * TILE_SIZE;
  const top = powerup.y * TILE_SIZE + Math.round(Math.sin(animationTime * 5 + powerup.id) * 2);
  const [main, light] = POWERUP_COLORS[powerup.type] || POWERUP_COLORS.fire;
  const pulse = Math.floor(animationTime * 8 + powerup.id) % 2;
  px(context, "rgba(0,0,0,.38)", left + 8, top + 31, 25, 4);
  px(context, "#090c18", left + 5, top + 5, 30, 29);
  px(context, pulse ? "#4b3d74" : "#332a55", left + 7, top + 7, 26, 25);
  px(context, main, left + 9, top + 9, 22, 21);
  px(context, light, left + 11, top + 10, 18, 3);
  px(context, "rgba(8,10,20,.4)", left + 11, top + 27, 18, 2);

  if (powerup.type === "fire" || powerup.type === "fullFire") {
    px(context, "#e4ffff", left + 20, top + 13, 6, 5);
    px(context, "#65f5ff", left + 16, top + 17, 8, 5);
    px(context, "#e4ffff", left + 19, top + 21, 5, 4);
    px(context, "#65f5ff", left + 16, top + 25, 5, 4);
    if (powerup.type === "fullFire") px(context, "#ffffff", left + 12, top + 12, 4, 4);
  } else if (powerup.type === "bomb" || powerup.type === "bombPass") {
    drawCharge(context, left + 20, top + 21, false, true);
    if (powerup.type === "bombPass") {
      px(context, "#ecffff", left + 10, top + 19, 4, 4);
      px(context, "#ecffff", left + 27, top + 19, 4, 4);
    }
  } else if (powerup.type === "speed") {
    px(context, "#071522", left + 12, top + 22, 17, 6);
    px(context, "#f4ffff", left + 14, top + 16, 9, 8);
    px(context, "#c8ff50", left + 22, top + 20, 7, 5);
    px(context, "#071522", left + 15, top + 28, 4, 3);
    px(context, "#071522", left + 25, top + 28, 4, 3);
  } else if (powerup.type === "remote") {
    px(context, "#151627", left + 13, top + 13, 14, 16);
    px(context, "#f4f2ff", left + 15, top + 15, 10, 4);
    px(context, "#ff365f", left + 17, top + 22, 6, 5);
    px(context, "#ffe45c", left + 24, top + 11, 3, 4);
  } else if (powerup.type === "glove") {
    px(context, "#7e244e", left + 13, top + 18, 15, 10);
    px(context, "#fff0f7", left + 15, top + 14, 4, 9);
    px(context, "#fff0f7", left + 20, top + 13, 4, 10);
    px(context, "#fff0f7", left + 25, top + 16, 4, 9);
  } else if (powerup.type === "kick") {
    px(context, "#3e2630", left + 13, top + 14, 8, 13);
    px(context, "#fff173", left + 16, top + 15, 7, 10);
    px(context, "#fff173", left + 21, top + 22, 9, 6);
    px(context, "#3e2630", left + 13, top + 27, 17, 3);
  } else if (powerup.type === "blockPass") {
    px(context, "#542719", left + 12, top + 14, 17, 15);
    px(context, "#ffd174", left + 14, top + 16, 5, 11);
    px(context, "#ffd174", left + 23, top + 16, 4, 11);
    px(context, "#33223a", left + 19, top + 19, 4, 8);
  } else if (powerup.type === "suit") {
    px(context, "#ecffff", left + 13, top + 13, 14, 5);
    px(context, "#166a9e", left + 14, top + 18, 12, 8);
    px(context, "#ecffff", left + 17, top + 18, 6, 10);
    px(context, "#166a9e", left + 19, top + 20, 3, 5);
  }
}

export function drawBlast(context, blast, animationTime, occupied) {
 const x=blast.x*TILE_SIZE,y=blast.y*TILE_SIZE;
 const remaining=Number.isFinite(blast.ttl)?Math.max(0,Math.min(BLAST_SECONDS,blast.ttl)):BLAST_SECONDS*.55;
 if(remaining<=0)return;
 const age=1-remaining/BLAST_SECONDS,growth=Math.min(1,.4+age*6);
 const strength=age<.18?.55+age*2.5:Math.max(.18,1-Math.pow((age-.18)/.82,2));
 const frame=Math.floor(animationTime*24);
 const noise=n=>{const v=Math.sin((blast.x*71+blast.y*137+frame*19+n*31)*1.739)*43758.5453;return v-Math.floor(v);};
 const links=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>occupied?.has((blast.x+dx)+','+(blast.y+dy)));
 const paths=links.length?links:[[1,0],[-1,0],[0,1],[0,-1]];
 context.save();context.beginPath();context.rect(x,y,TILE_SIZE,TILE_SIZE);context.clip();
 // The complete lethal cell remains tinted even during formation and dissipation.
 px(context,'rgba(71,176,213,.10)',x+1,y+1,38,38);
 context.lineJoin='round';context.lineCap='round';
 const stroke=(points,branch=false)=>{
  const layers=branch?[[`rgba(35,197,241,${.16*strength})`,4],[`rgba(100,233,255,${.75*strength})`,1],[`rgba(230,255,255,${strength})`,.45]]:
   [[`rgba(31,166,219,${.10*strength})`,9],[`rgba(35,202,237,${.24*strength})`,4.5],[`rgba(89,230,255,${strength})`,1.8],[`rgba(235,255,255,${strength})`,.8]];
  for(const [color,width] of layers){context.strokeStyle=color;context.lineWidth=width;context.beginPath();points.forEach(([a,b],i)=>i?context.lineTo(x+a,y+b):context.moveTo(x+a,y+b));context.stroke();}
 };
 paths.forEach(([dx,dy],index)=>{
  const points=[[20,20]];
  for(let n=1;n<=6;n++){
   const length=n/6*20*growth,offset=n===6?0:(noise(index*13+n)-.5)*8;
   points.push([20+dx*length-dy*offset,20+dy*length+dx*offset]);
  }
  stroke(points);
  if(age<.8){const [a,b]=points[3],sign=noise(index+80)>.5?1:-1;
   stroke([[a,b],[a+dx*3-dy*sign*4,b+dy*3+dx*sign*4],[a-dy*sign*7,b+dx*sign*7],[a+dx*3-dy*sign*9,b+dy*3+dx*sign*9]],true);
  }
 });
 if(age>.65){context.fillStyle=`rgba(122,240,255,${strength})`;context.fillRect(x+8+noise(99)*22,y+8+noise(100)*22,1,2);}
 context.restore();
}

function drawBomb(context, bomb, animationTime) {
  let bombX = bomb.x;
  let bombY = bomb.y;
  let arc = 0;
  if (bomb.airborneTtl > 0 && Number.isFinite(bomb.throwFromX)) {
    const progress = 1 - bomb.airborneTtl / (bomb.throwDuration || 0.42);
    bombX = bomb.throwFromX + (bomb.x - bomb.throwFromX) * progress;
    bombY = bomb.throwFromY + (bomb.y - bomb.throwFromY) * progress;
    arc = Math.sin(progress * Math.PI) * 30;
  } else if (bomb.slideVisualTtl > 0 && Number.isFinite(bomb.slideFromX)) {
    const progress = 1 - bomb.slideVisualTtl / 0.12;
    bombX = bomb.slideFromX + (bomb.x - bomb.slideFromX) * progress;
    bombY = bomb.slideFromY + (bomb.y - bomb.slideFromY) * progress;
  }
  const x = Math.round((bombX + 0.5) * TILE_SIZE);
  const y = Math.round((bombY + 0.5) * TILE_SIZE - arc);
  const alert = bomb.fuse < 0.7 && Math.floor(animationTime * 12) % 2 === 0;
  px(context, "rgba(0,0,0,.35)", x - 12, y + 12, 27, 5);
  drawCharge(context, x, y, alert);
}

function drawFallingBlock(context, block, animationTime) {
  const progress = 1 - block.ttl / (block.duration || 0.62);
  const left = block.x * TILE_SIZE;
  const targetTop = block.y * TILE_SIZE;
  const top = targetTop - (1 - progress) * 105;
  const flash = Math.floor(animationTime * 12) % 2 === 0;
  context.globalAlpha = 0.42 + progress * 0.35;
  px(context, flash ? "#ff365f" : "#ffd24d", left + 3, targetTop + 3, 34, 34);
  px(context, "#120b18", left + 8, targetTop + 8, 24, 24);
  context.globalAlpha = 1;
  px(context, "rgba(0,0,0,.45)", left + 5, targetTop + 31, 30, 6);
  drawWall(context, left, top, false);
  // Red warning stripe belongs only to the falling hazard.
  px(context, '#351323', left+10, top+28, 21, 5);
  for(let i=0;i<4;i++) px(context, '#ff688c', left+11+i*5, top+29, 3, 3);

}

const spriteMotion = new Map();
const CHARACTER_PALETTES = CHARACTERS;

function motionFor(player, animationTime) {
 const previous=spriteMotion.get(player.id);
 const dx=previous?player.x-previous.x:0,dy=previous?player.y-previous.y:0;
 const distance=Math.hypot(dx,dy);
 let direction=previous?.direction||'down';
 if(distance>.02)direction=Math.abs(dx)>=Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
 const lastMoved=distance>.02?animationTime:(previous?.lastMoved??-Infinity);
 const moving=animationTime-lastMoved<.085;
 const travel=(previous?.travel||0)+(distance<TILE_SIZE?distance:0);
 const frame=moving?Math.floor(travel/6)%8:0;
 spriteMotion.set(player.id,{x:player.x,y:player.y,direction,travel,lastMoved});
 return {direction,moving,frame};
}

function drawKnockedOutPlayer(context, player, palette) {
 context.save(); context.globalAlpha = 0.72;
 context.translate(Math.round(player.x), Math.round(player.y)+5);
 context.rotate(-Math.PI/2); context.scale(0.72,0.72);
 drawCyborg(context,0,0,palette,{mood:'crying'}); context.restore();
}

function drawPlayer(context, player, palette, animationTime) {
  if (!player.alive) {
    drawKnockedOutPlayer(context, player, palette);
    return;
  }

  const motion = motionFor(player, animationTime);
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  if (player.protected) {
    const pulse = 18 + Math.sin(animationTime * 8 + player.slot) * 2;
    context.strokeStyle = Math.floor(animationTime * 10) % 2 ? "#7ff9ff" : "#f4ffff";
    context.lineWidth = 3;
    context.globalAlpha = 0.72;
    context.beginPath();
    context.arc(x, y - 4, pulse, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
  }

  px(context, "rgba(0,0,0,.42)", x - 13, y + 12, 26, 5);

  drawCyborg(context, x, y, palette, motion);

  context.fillStyle = "#f7f3ff";
  context.font = "700 8px Silkscreen, monospace";
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.shadowColor = "#05070d";
  context.shadowBlur = 0;
  context.fillText(player.name, x, y - 29);
}

function drawVictoryMascot(context, palette, elapsed) {
  const jump = Math.round(Math.abs(Math.sin(elapsed * 3.8)) * 12);
  for (let i = 0; i < 16; i++) px(context, ['#c8ff50','#a675ff','#55dff7'][i%3], 6 + (i*29)%98 + Math.sin(elapsed*1.8+i*2.1)*5, 4 + (elapsed*(18+i%4*5)+i*9)%76, 3, 4);
  drawCyborg(context, 56, 72-jump, palette, { mood: 'winner', moving: true, frame: Math.floor(elapsed*12)%8 });
}



function drawCryingMascot(context, palette, elapsed) {
  const y = 69 + Math.round(Math.abs(Math.sin(elapsed * 5.4)) * 2);
  drawCyborg(context, 56, y, palette, { mood: 'crying', moving: true, frame: Math.floor(elapsed*8)%8 });
  const fall = Math.round((elapsed*24)%24);
  px(context, '#55dff7', 49, y-8+fall, 2, 4);
  px(context, '#55dff7', 60, y-8+(fall+10)%24, 2, 4);
}



function drawJugglingBomb(context,x,y,sparkFrame) { drawCharge(context,x,y,Boolean(sparkFrame),true); }

function drawJugglingMascot(context, elapsed) {
  const palette = CHARACTER_PALETTES[0];
  const x = 60;
  const sway = Math.round(Math.sin(elapsed * 2.5));
  const y = 105 + Math.abs(sway);
  const leftHandX = x - 20;
  const rightHandX = x + 20;
  const catchHeight = y - 26;
  for (let index = 0; index < 3; index += 1) {
    const fullPhase = (elapsed * 0.82 + index * (2 / 3)) % 2;
    const movingRight = fullPhase < 1;
    const throwProgress = fullPhase % 1;
    const fromX = movingRight ? leftHandX : rightHandX;
    const toX = movingRight ? rightHandX : leftHandX;
    const bombX = fromX + (toX - fromX) * throwProgress;
    const bombY = catchHeight - Math.sin(throwProgress * Math.PI) * 34;
    drawJugglingBomb(context, bombX, bombY, (Math.floor(elapsed * 12) + index) % 2);
  }

  context.save(); context.translate(x,y); context.scale(1.3,1.3);
  drawCyborg(context,0,0,palette,{mood:'winner',moving:true,frame:Math.floor(elapsed*8)%8});
  context.restore();
}

export function startMenuMascotAnimation(canvas) {
  const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) return () => {};
  const startedAt = performance.now();
  let animationFrameId;
  const frame = (now) => {
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(3, 3);
    drawJugglingMascot(context, (now - startedAt) / 1000);
    context.restore();
    animationFrameId = requestAnimationFrame(frame);
  };
  animationFrameId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(animationFrameId);
}

export function startResultCharacterAnimation(canvas, slot = 0, mood = "crying") {
  const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) return () => {};
  const palette = CHARACTER_PALETTES[slot] || CHARACTER_PALETTES[0];
  const startedAt = performance.now();
  let animationFrameId;
  const frame = (now) => {
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (mood === "winner") drawVictoryMascot(context, palette, (now - startedAt) / 1000);
    else drawCryingMascot(context, palette, (now - startedAt) / 1000);
    animationFrameId = requestAnimationFrame(frame);
  };
  animationFrameId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(animationFrameId);
}
export function startVictoryAnimation(canvas, slot = 0) {
  const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) return () => {};
  const palette = CHARACTER_PALETTES[slot] || CHARACTER_PALETTES[0];
  const startedAt = performance.now();
  let animationFrameId;
  const frame = (now) => {
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawVictoryMascot(context, palette, (now - startedAt) / 1000);
    animationFrameId = requestAnimationFrame(frame);
  };
  animationFrameId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(animationFrameId);
}

export function renderGame(canvas, state) {
  if (!state) return;
  const context = canvas.getContext("2d");
  const { width: columns, height: rows } = arenaDimensions(state.arenaType);
  const width = columns * TILE_SIZE;
  const height = rows * TILE_SIZE;
  const grid = state.grid || ".".repeat(columns * rows);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const animationTime = performance.now() / 1000;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  px(context, "#07111c", 0, 0, width, height);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const tile = grid[y * columns + x];
      const left = x * TILE_SIZE;
      const top = y * TILE_SIZE;
      if (tile === VOID) continue;
      drawFloor(context, left, top, x, y);
      if (tile === WALL) {
        const border = isArenaBoundary(state.arenaType, x, y);
        drawWall(context, left, top, border);
      } else if (tile === CRATE) {
        drawCrate(context, left, top);
      }
    }
  }
  for (const powerup of state.powerups || []) drawPowerup(context, powerup, animationTime);
  const liveDischarges = new Set((state.blasts || []).map(({x,y}) => `${x},${y}`));
  for (const blast of state.blasts || []) drawBlast(context, blast, animationTime, liveDischarges);
  for (const bomb of state.bombs || []) drawBomb(context, bomb, animationTime);
  for (const player of state.players || []) drawPlayer(context, player, CHARACTER_PALETTES[player.slot] || CHARACTER_PALETTES[0], animationTime);
  for (const block of state.fallingBlocks || []) drawFallingBlock(context, block, animationTime);
}

