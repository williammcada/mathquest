import {havenGroundTile,drawHavenTask,drawHavenWall,drawHavenUnder,drawHavenOver,signBoard} from './false-haven-renderer.js?v=0.14.2';
import {WORLD,BUILDINGS,TASKS,PICKUPS,PROPS,DISTRACTIONS,doorRects,propBounds,walls,nextObjective,worldFor} from './world.js?v=0.14.2';
import {drawCar,drawFixtures} from './hardware.js?v=0.14.2';
import {SHEETS,sprite,strip,tiled,CELL} from './sprites.js?v=0.14.2';
import {interiorItems,roofFor,SIGN_SIDE} from './interiors.js?v=0.14.2';
const motionPreference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
export const MEDIA={actors:'./assets/nightfall/city/actors.webp',tiles:'./assets/nightfall/city/tiles.webp',props:'./assets/nightfall/city/props.webp',...SHEETS,ambient:'./assets/nightfall/city/ambient.mp3',danger:'./assets/nightfall/city/danger.mp3',ending:'./assets/nightfall/city/ending.mp3',effects:'./assets/nightfall/city/effects.wav',sfx:Object.fromEntries(['step','shot','shotgun','glass','alarm','moan','enemy-death','breach'].map(k=>[k,'./assets/nightfall/city/v092/'+k+'.wav']))};
// Decoded sizes: shared sheets ship at 512 px WebP (1024 px PNG originals in art-source/), ample for on-screen sizes.
const SIZES={tiles:[256,256],props:[512,512],actors:[736,580],interactables:[512,512],furniture:[512,512],decals:[512,512],roofs:[512,512],machinery:[512,512]};
export async function loadArt(media=MEDIA){const art={};await Promise.all(Object.keys(SIZES).map(key=>new Promise((resolve,reject)=>{const im=new Image();im.onload=async()=>{try{const [width,height]=SIZES[key];art[key]=globalThis.createImageBitmap?await createImageBitmap(im,{resizeWidth:width,resizeHeight:height,resizeQuality:key==='tiles'||key==='actors'?'pixelated':'high'}):im;resolve();}catch(error){reject(error);}};im.onerror=()=>reject(new Error(`Missing or invalid image: ${media[key]}`));im.src=media[key];})));return art;}
function cell(c,im,n,cols,rows,x,y,w,h){if(!im)return;const sw=im.width/cols,sh=im.height/rows;c.drawImage(im,(n%cols)*sw,Math.floor(n/cols)*sh,sw,sh,x,y,w,h);}
// Ground tile and quarter turns for a 32 px cell. False Haven has its own yard
// layout; the city and First Response keep the established street grid.
function groundTile(s,buildings,x,y){
 const room=buildings.find(b=>x>=b.x&&y>=b.y&&x<b.x+b.w&&y<b.y+b.h);if(room)return [room.floor,0];
 if(s.scenario==='false-haven')return havenGroundTile(x,y);
 if(x%256<32||y%256<32)return [1,0];if(x===1184)return [8,0];return [0,0];
}
// Static ground is composed once per visible 512px chunk, not hundreds of
// high-resolution atlas copies per frame. Cache is scoped to decoded artwork.
const groundCache=new WeakMap(),groundPixels=new WeakMap();
function drawGround(c,s,art,buildings,ox,oy){
 if(!globalThis.document){return false;}
 let chunks=groundCache.get(art);if(!chunks){chunks=new Map();groundCache.set(art,chunks);}
 let tiles=groundPixels.get(art);
 if(!tiles){const sheet=document.createElement('canvas');sheet.width=sheet.height=128;const g=sheet.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;g.drawImage(art.tiles,0,0,128,128);tiles=g.getImageData(0,0,128,128).data;groundPixels.set(art,tiles);}
 for(let cy=Math.floor(oy/512)*512;cy<oy+360;cy+=512)for(let cx=Math.floor(ox/512)*512;cx<ox+640;cx+=512){
  const key=`${s.scenario}:${s.route}:${cx}:${cy}`;let canvas=chunks.get(key);
  if(!canvas){canvas=document.createElement('canvas');canvas.width=canvas.height=512;const g=canvas.getContext('2d',{willReadFrequently:true}),pixels=g.createImageData(512,512);
   for(let y=cy;y<cy+512;y+=32)for(let x=cx;x<cx+512;x+=32){
    const [tile,rot]=groundTile(s,buildings,x,y),tx=tile%4*32,ty=Math.floor(tile/4)*32;
    if(!rot)for(let row=0;row<32;row++){const start=((ty+row)*128+tx)*4;pixels.data.set(tiles.subarray(start,start+128),((y-cy+row)*512+x-cx)*4);}
    else for(let row=0;row<32;row++)for(let col=0;col<32;col++){const src=((ty+col)*128+tx+row)*4,dst=((y-cy+row)*512+x-cx+col)*4;pixels.data.set(tiles.subarray(src,src+4),dst);}
   }
   g.putImageData(pixels,0,0);
   // Keep long sessions bounded even if several scenarios share an art object.
   if(chunks.size>=48)chunks.delete(chunks.keys().next().value);chunks.set(key,canvas);
  }
  c.drawImage(canvas,cx,cy);
 }
 return true;
}
// Roofs: seamless material, parapet edges and rooftop clutter. `others` lets
// overlapping city blocks share one continuous roof without inner parapets.
function drawRoof(c,s,art,b,view,{block=false,others=[]}={}){
 const r=roofFor(s,b,{block}),vx=Math.max(b.x,view.x),vy=Math.max(b.y,view.y),vw=Math.min(b.x+b.w,view.x+view.w)-vx,vh=Math.min(b.y+b.h,view.y+view.h)-vy;
 if(vw<=0||vh<=0)return;
 tiled(c,art,'roofs',r.material,{x:vx,y:vy,w:vw,h:vh},64,b);
 const T=12,covered=(x,y)=>others.some(o=>o!==b&&x>=o.x&&y>=o.y&&x<o.x+o.w&&y<o.y+o.h);
 for(let x=b.x;x<b.x+b.w;x+=48){const w=Math.min(48,b.x+b.w-x);
  if(!covered(x+w/2,b.y-4))sprite(c,art,'roofs',CELL.parapet,x,b.y,w,T,{rot:2,full:true});
  if(!covered(x+w/2,b.y+b.h+4))sprite(c,art,'roofs',CELL.parapet,x,b.y+b.h-T,w,T,{full:true});}
 for(let y=b.y;y<b.y+b.h;y+=48){const h=Math.min(48,b.y+b.h-y);
  if(!covered(b.x-4,y+h/2))sprite(c,art,'roofs',CELL.parapet,b.x,y,T,h,{rot:1,full:true});
  if(!covered(b.x+b.w+4,y+h/2))sprite(c,art,'roofs',CELL.parapet,b.x+b.w-T,y,T,h,{rot:3,full:true});}
 for(const [k,fx,fy,w,h] of r.clutter){const x=Math.max(b.x+T+4,Math.min(b.x+b.w-T-4-w,b.x+fx*b.w-w/2)),y=Math.max(b.y+T+4,Math.min(b.y+b.h-T-4-h,b.y+fy*b.h-h/2));if(!covered(x+w/2,y+h/2)||!block)sprite(c,art,'roofs',k,x,y,w,h);}
}
// Render-only roof fade state; never serialized.
const roofFade=new WeakMap();
function roofAlpha(s,b,inside,reducedMotion){
 let m=roofFade.get(s);if(!m){m={t:s.time,a:{}};roofFade.set(s,m);}
 const target=inside?0:1,dt=Math.max(0,Math.min(.1,s.time-m.t));
 const prev=m.a[b.id]??target,next=reducedMotion?target:prev+Math.sign(target-prev)*Math.min(Math.abs(target-prev),dt/.25);
 m.a[b.id]=next;return next;
}
function buildingSign(c,art,b){
 const side=SIGN_SIDE[b.id];if(side==='top'){signBoard(c,art,b.name,b.x+b.w/2,b.y-22,{min:150});return;}
 const left=b.door-b.x,right=b.x+b.w-(b.door+80),useLeft=side?side==='left':left>=right,space=useLeft?left:right,cx=useLeft?b.x+space/2:b.door+80+space/2;
 signBoard(c,art,b.name,cx,b.y+b.h+22,{min:Math.min(150,space-8)});
}
export function render(c,s,art,{map=s.map,reducedMotion=motionPreference?.matches||false}={}){
 const {WORLD,BUILDINGS,TASKS,PICKUPS,PROPS,BARRIERS}=worldFor(s),haven=s.scenario==='false-haven';
 const ox=Math.max(0,Math.min(WORLD.width-640,s.x-320)),oy=Math.max(0,Math.min(WORLD.height-360,s.y-190));
 const visible=(x,y,w=0,h=0,pad=0)=>x+w>ox-pad&&x<ox+640+pad&&y+h>oy-pad&&y<oy+360+pad,view={x:ox,y:oy,w:640,h:360};
 c.imageSmoothingEnabled=false;c.fillStyle='#172027';c.fillRect(0,0,640,360);c.save();c.translate(-ox,-oy);
 if(!drawGround(c,s,art,BUILDINGS,ox,oy))for(let y=Math.floor(oy/32)*32;y<oy+392;y+=32)for(let x=Math.floor(ox/32)*32;x<ox+672;x+=32){
   const [tile,rot]=groundTile(s,BUILDINGS,x,y);
   if(!rot)cell(c,art.tiles,tile,4,4,x,y,32,32);else{c.save();c.translate(x+16,y+16);c.rotate(Math.PI/2);c.scale(1,-1);cell(c,art.tiles,tile,4,4,-16,-16,32,32);c.restore();}
 }
 for(const b of BUILDINGS){if(!visible(b.x,b.y,b.w,b.h))continue;c.fillStyle='#101a1c99';c.fillRect(b.x+8,b.y+8,b.w,b.h);}
 c.imageSmoothingEnabled=true;
 const items=interiorItems(s);
 for(const i of items)if(!i.solid&&visible(i.x,i.y,i.w,i.h))sprite(c,art,i.sheet,i.cell,i.x,i.y,i.w,i.h,{rot:i.rot});
 for(const p of PROPS){if(!visible(p.x,p.y,p.w,p.h,p.burning?100:0))continue;if(p.wire&&s.tasks.power)c.globalAlpha=.5;if(p.art<=3)drawCar(c,p,s,art.props,reducedMotion);else cell(c,art.props,p.art,4,4,p.x,p.y,p.w,p.h);c.globalAlpha=1;if(p.burning){const glow=c.createRadialGradient(p.x+p.w/2,p.y+p.h/2,4,p.x+p.w/2,p.y+p.h/2,100);glow.addColorStop(0,'rgba(255,126,36,.28)');glow.addColorStop(1,'rgba(255,126,36,0)');c.fillStyle=glow;c.fillRect(p.x-100,p.y-100,p.w+200,p.h+200);}}
 for(const i of items)if(i.solid&&visible(i.x,i.y,i.w,i.h)){if(i.sheet==='props'){if(i.rot)sprite(c,{props:art.props},'props',i.cell,i.x,i.y,i.w,i.h,{rot:i.rot,full:true});else cell(c,art.props,i.cell,4,4,i.x,i.y,i.w,i.h);}else sprite(c,art,i.sheet,i.cell,i.x,i.y,i.w,i.h,{rot:i.rot});}
 drawStatusLamps(c,s);
 if(haven)drawHavenUnder(c,s,art);
 for(const t of TASKS){if(!visible(t.x-32,t.y-32,64,64))continue;if(t.id==='escape'||t.id==='installed'||t.id==='return')continue;if((t.id==='survivor'&&s.tasks.survivor)||(t.id==='recruit'&&s.tasks.recruit))continue;if(!(haven&&drawHavenTask(c,s,art,t)))cell(c,art.props,t.prop,4,4,t.x-28,t.y-28,56,56);if(!s.tasks[t.id]){c.strokeStyle=t.optional?'#87d7b5':'#f7c975';c.strokeRect(t.x-30,t.y-30,60,60);}}
 cell(c,art.props,0,4,4,WORLD.bus.x-48,WORLD.bus.y-64,96,152);
 for(const p of PICKUPS)if(visible(p.x-16,p.y-16,32,32)&&!s.picked.includes(p.id)){cell(c,art.props,p.kind==='ammo'||p.kind==='shotgun'?10:13,4,4,p.x-16,p.y-16,32,32);c.strokeStyle=p.kind==='ammo'?'#e3be6f':'#9ee4b6';c.strokeRect(p.x-13,p.y-13,26,26);}
 // Walls by kind: city blocks become roofs, gates and fences use their sprites,
 // and ordinary building walls keep the established wall tile.
 const blocks=BARRIERS.filter(b=>b.kind==='block');
 for(const b of blocks)drawRoof(c,s,art,b,view,{block:true,others:blocks});
 const late=[];
 for(const wall of walls(s).filter(w=>!w.window&&!w.door&&w.kind!=='block'&&visible(w.x,w.y,w.w,w.h,40))){
  // Gates set into building walls draw after roofs so they stay visible outside.
  if(wall.kind==='gate'||wall.kind==='shutter'){late.push(wall);continue;}
  if(haven&&drawHavenWall(c,art,wall))continue;
  c.imageSmoothingEnabled=false;
  for(let x=wall.x+Math.max(0,Math.floor((ox-wall.x)/16))*16;x<Math.min(wall.x+wall.w,ox+640);x+=16)for(let y=wall.y+Math.max(0,Math.floor((oy-wall.y)/16))*16;y<Math.min(wall.y+wall.h,oy+360);y+=16)cell(c,art.tiles,5,4,4,x,y,16,16);
  c.imageSmoothingEnabled=true;
 }
 for(const b of BUILDINGS)if(visible(b.x,b.y-48,b.w,b.h+96))buildingSign(c,art,b);
 function actor(a,row,frame,scale=1){c.save();c.translate(a.x,a.y);c.rotate((a.angle||0)-Math.PI/2);c.fillStyle='#0007';c.beginPath();c.ellipse(0,5,13*scale,9*scale,0,0,Math.PI*2);c.fill();cell(c,art.actors,row*8+frame,8,5,-23*scale,-29*scale,46*scale,58*scale);c.restore();}
 c.imageSmoothingEnabled=false;
 if(s.scenario==='rescue'){
  c.fillStyle='#c5d8dd';c.font='bold 13px system-ui';c.fillText('SOUTH ROAD',640,1232);c.fillText('ALLEY ↑',758,920);c.fillText('NORTH ROAD',944,632);
  c.strokeStyle='#83edbf';c.lineWidth=3;c.beginPath();c.arc(1168,1168,72,0,Math.PI*2);c.stroke();c.fillStyle='#d7ffe9';c.font='bold 14px system-ui';c.fillText('TERMINAL · RETURN HERE',1060,1250);
  if(s.follower){actor(s.follower,0,1+Math.floor(s.time*6)%2);c.fillStyle='#9dffd4';c.fillText(s.route==='depot'?'TOMAS':'IMANI',s.follower.x-24,s.follower.y-34);}
 }
 const actors=s.enemies.filter(e=>e.x>ox-50&&e.x<ox+690&&e.y>oy-50&&e.y<oy+410).sort((a,b)=>a.y-b.y);
 for(const e of actors){const row={shambler:1,runner:2,brute:3,crawler:4}[e.kind],frame=e.hp<=0?(s.time-(e.deathTime??-10)<.18?6:7):e.phase==='lunge'||e.phase==='windup'?5:e.phase==='stagger'?6:e.phase==='recover'?0:e.kind==='runner'&&e.phase==='chase'?3+Math.floor(s.time*10)%2:1+Math.floor(s.time*6)%2;actor(e,row,frame,e.kind==='brute'?1.15:1);if(e.phase==='windup'){c.strokeStyle='#f28c67';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,29,0,Math.PI*2);c.stroke();}}
 if(s.immune<=0||Math.floor(s.time*10)%2===0){const frame=['lost','setback'].includes(s.outcome)?7:s.anim==='hurt'?6:s.anim==='fire'?5:s.anim==='run'?3+Math.floor(s.time*11)%2:s.anim==='walk'?1+Math.floor(s.time*6)%2:0;actor(s,0,frame);}
 c.strokeStyle='#e7e5b488';c.lineWidth=1;c.beginPath();c.moveTo(s.x+Math.cos(s.angle)*22,s.y+Math.sin(s.angle)*22);c.lineTo(s.x+Math.cos(s.angle)*110,s.y+Math.sin(s.angle)*110);c.stroke();
 c.fillStyle='#ffeaba';for(const b of s.bullets)c.fillRect(b.x-2,b.y-2,4,4);
 c.imageSmoothingEnabled=true;
 // Roofs hide interiors (and anything inside) until the player steps in.
 for(const b of BUILDINGS){if(!visible(b.x,b.y,b.w,b.h))continue;const inside=s.x>b.x&&s.y>b.y&&s.x<b.x+b.w&&s.y<b.y+b.h,a=roofAlpha(s,b,inside,reducedMotion);
  if(a>0){c.save();c.globalAlpha=a;drawRoof(c,s,art,b,view);c.restore();}
  c.fillStyle=b.id==='garage'&&!s.tasks.power?'#d37c66':'#91ccad';c.fillRect(b.door,b.y+b.h-8,80,4);}
 for(const wall of late){if(haven&&drawHavenWall(c,art,wall))continue;sprite(c,art,'interactables',CELL.rollGate,wall.x,wall.y-20,wall.w,56);}
 for(const d of doorRects(s)){const v=s.doors[d.id];if(!visible(d.x,d.y-24,d.w,64))continue;
  if(v.hp<=0)sprite(c,art,'decals',CELL.crack,d.x,d.y-12,d.w,40);
  else if(v.closed){sprite(c,art,'interactables',CELL.rollGate,d.x,d.y-20,d.w,56);c.fillStyle='#0009';c.fillRect(d.x,d.y-24,d.w,4);c.fillStyle=v.hp<40?'#c95748':v.hp<70?'#c99345':'#71a3ab';c.fillRect(d.x,d.y-24,d.w*v.hp/100,4);}
  else{c.fillStyle='#56866b';c.fillRect(d.x,d.y,d.w,4);}}
 drawFixtures(c,s,art);if(haven)drawHavenOver(c,s,art);
 if(s.debug){c.strokeStyle='#fb76c9';for(const r of [...walls(s),...PROPS.map(propBounds),...items.filter(i=>i.solid)])c.strokeRect(r.x,r.y,r.w,r.h);for(const e of s.enemies.filter(e=>e.hp>0)){c.strokeStyle=e.phase==='chase'?'#f44':'#6cf';if(e.target){c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.target.x,e.target.y);c.stroke();}c.strokeRect(e.x-10,e.y-10,20,20);}if(s.noise>0){c.strokeStyle='#ff9';c.beginPath();c.arc(s.noiseX,s.noiseY,s.noiseRadius,0,Math.PI*2);c.stroke();}}
 c.restore();
 const shade=c.createRadialGradient(320,190,85,320,190,390);shade.addColorStop(0,'#07131c00');shade.addColorStop(1,'#07131c99');c.fillStyle=shade;c.fillRect(0,0,640,360);
 c.strokeStyle='#b8d2dc26';c.lineWidth=1;for(let i=0;i<34;i++){const x=(i*139+s.time*29)%640,y=(i*73+s.time*205)%360;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+9);c.stroke();}
 if(s.interact>0){const t=TASKS.find(t=>t.id===s.interactId),progress=Math.min(1,s.interact/(t?.duration||1.2));c.fillStyle='#081724';c.fillRect(180,328,280,24);c.fillStyle='#76dac4';c.fillRect(184,346,272*progress,3);c.font='bold 12px system-ui';c.fillStyle='#fff';c.fillText('HOLD SEARCH / USE · '+Math.floor(progress*100)+'%',196,341);}
 const objective=nextObjective(s);if(objective){const x=Math.max(20,Math.min(620,objective.x-ox)),y=Math.max(22,Math.min(338,objective.y-oy));c.strokeStyle='#ffda8a';c.lineWidth=2;c.beginPath();c.moveTo(x,y-8);c.lineTo(x+8,y);c.lineTo(x,y+8);c.lineTo(x-8,y);c.closePath();c.stroke();}

 if(map){c.fillStyle='#0b171eee';c.fillRect(65,25,510,255);const scale=Math.min(.18,460/WORLD.width,220/WORLD.height);for(const b of BARRIERS){c.fillStyle='#34434c';c.fillRect(86+b.x*scale,40+b.y*scale,b.w*scale,b.h*scale);}for(const b of BUILDINGS){c.fillStyle='#798b89';c.fillRect(86+b.x*scale,40+b.y*scale,b.w*scale,b.h*scale);}for(const t of TASKS){c.fillStyle=s.tasks[t.id]?'#7fba99':t.optional?'#a9baf3':'#ffd183';c.fillRect(86+t.x*scale-3,40+t.y*scale-3,6,6);}c.fillStyle='#fff';c.beginPath();c.arc(86+s.x*scale,40+s.y*scale,4,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.font='12px system-ui';c.fillText(s.scenario==='false-haven'?'YOU: white · OBJECTIVES: amber · WALLS: grey':s.scenario==='rescue'?'YOU: white · RESCUE / RETURN: amber · WALLS: grey':'YOU: white   OBJECTIVES: amber   STORE: lavender',85,270);}
}

// Small powered-status lamps inside Chapter 1 buildings (light effect only).
function drawStatusLamps(c,s){
 if(s.scenario==='false-haven'||s.scenario==='rescue')return;
 for(const b of BUILDINGS){if(s.x<b.x||s.x>b.x+b.w||s.y<b.y||s.y>b.y+b.h)continue;const on=b.id==='dispatch'||s.tasks.power;c.fillStyle=on&&(Math.floor(s.time*2)%3)?'#a7d77d':'#384944';c.fillRect(b.x+50,b.y+65,6,4);}
}
