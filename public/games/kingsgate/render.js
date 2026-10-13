// Kingsgate renderer: approved polygon sprites rasterized once, battlefield pre-drawn once.
import {SPRITES,SPRITE_DEFS} from './sprites.js';
import {W,H,TILE,TOWERS,ENEMIES,SPOTS,PATH,GATE_X,TOWER_ORDER,distanceToPath,pointAt} from './config.js';
import {towerAt,invested} from './sim.js';

const ENEMY_SPRITE={raider:'e-raider',wolf:'e-wolf',troll:'e-troll',shaman:'e-shaman',ram:'e-ram'};
const TOWER_SPRITE={archer:'t-archer',ballista:'t-ballista',mage:'t-mage',catapult:'t-catapult'};
export const TOWER_SIZE=64;
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};

function svgFor(id,px){const s=SPRITES[id];return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${s.viewBox}" width="${px}" height="${px}"><defs>${SPRITE_DEFS}</defs>${s.body}</svg>`;}
function loadImage(svg){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Sprite failed to load'));img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);});}
function canvas(w,h){if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(w,h);const c=document.createElement('canvas');c.width=w;c.height=h;return c;}

// River runs top to bottom and crosses the road once.
const RIVER=[[408,-20],[388,40],[430,96],[404,150],[372,196],[348,250],[384,310],[356,380]];
export function riverCrossing(){
 let best=null;
 for(let i=0;i<RIVER.length-1;i++)for(let k=0;k<=20;k++){const [ax,ay]=RIVER[i],[bx,by]=RIVER[i+1],x=ax+(bx-ax)*k/20,y=ay+(by-ay)*k/20,d=distanceToPath(x,y);if(!best||d<best.d)best={x,y,d};}
 return best;
}
export const TREES=(()=>{const r=rng(11),out=[];for(let i=0;i<400&&out.length<26;i++){const x=10+r()*590,y=14+r()*336;if(distanceToPath(x,y)<34||SPOTS.some(s=>Math.hypot(s.x-x,s.y-y)<34)||out.some(o=>Math.hypot(o.x-x,o.y-y)<26)||x>590)continue;const near=RIVER.some(([rx,ry])=>Math.hypot(rx-x,ry-y)<30);if(near)continue;out.push({x,y,k:r()<.2?'rock':'pine',s:.75+r()*.45});}return out;})();

function drawBackground(ctx,sprites){
 const r=rng(7),cols=17,rows=11,cw=W/(cols-1),ch=H/(rows-1),pts=[];
 for(let y=0;y<rows;y++){pts[y]=[];for(let x=0;x<cols;x++){const jx=x>0&&x<cols-1?(r()-.5)*cw*.6:0,jy=y>0&&y<rows-1?(r()-.5)*ch*.6:0;pts[y][x]=[x*cw+jx,y*ch+jy];}}
 const greens=['#4a7a3a','#477538','#4d7d3c','#45723a','#4f803d','#48773a'];
 const tri=(a,b,c)=>{ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.closePath();const g=greens[Math.floor(r()*greens.length)];ctx.fillStyle=g;ctx.strokeStyle=g;ctx.lineWidth=1;ctx.fill();ctx.stroke();};
 for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){const a=pts[y][x],b=pts[y][x+1],c=pts[y+1][x],d=pts[y+1][x+1];if(r()<.5){tri(a,b,d);tri(a,d,c);}else{tri(a,b,c);tri(b,d,c);}}
 const line=(pts,w,color)=>{ctx.beginPath();ctx.moveTo(...pts[0]);for(const p of pts.slice(1))ctx.lineTo(...p);ctx.lineWidth=w;ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();};
 line(RIVER,32,'#2b6a92');line(RIVER,20,'#3d82b0');
 line(PATH,38,'#866238');line(PATH,27,'#a07a4c');
 // Bridge where road meets river.
 const c=riverCrossing();let best=0,bd=Infinity;for(let d=0;d<900;d+=4){const p=pointAt(d),dd=Math.hypot(p.x-c.x,p.y-c.y);if(dd<bd){bd=dd;best=d;}}
 const p=pointAt(best),ang=Math.atan2(p.dy,p.dx);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(ang);
 ctx.fillStyle='#8a5a32';ctx.fillRect(-26,-17,52,34);ctx.strokeStyle='#5e3b1f';ctx.lineWidth=2;for(let x=-20;x<=20;x+=10){ctx.beginPath();ctx.moveTo(x,-17);ctx.lineTo(x,17);ctx.stroke();}
 ctx.fillStyle='#5e3b1f';ctx.fillRect(-28,-20,56,4);ctx.fillRect(-28,16,56,4);ctx.restore();
 // Wall and gate at the right edge.
 ctx.fillStyle='#6b7489';ctx.fillRect(GATE_X+6,0,W-GATE_X,H);ctx.fillStyle='#9aa3b6';ctx.fillRect(GATE_X,0,8,H);
 for(let y=10;y<H;y+=34){if(y>160&&y<240)continue;ctx.fillRect(GATE_X-7,y,8,13);}
 ctx.fillStyle='#1d1712';ctx.fillRect(GATE_X,176,W-GATE_X,48);ctx.fillStyle='#e0b23e';ctx.fillRect(GATE_X,172,W-GATE_X,5);
 ctx.strokeStyle='#5a5f6b';ctx.lineWidth=2;for(let x=GATE_X+6;x<W;x+=7){ctx.beginPath();ctx.moveTo(x,178);ctx.lineTo(x,224);ctx.stroke();}
 ctx.fillStyle='#2f4fa8';ctx.beginPath();ctx.moveTo(GATE_X+12,232);ctx.lineTo(GATE_X+26,232);ctx.lineTo(GATE_X+26,262);ctx.lineTo(GATE_X+19,268);ctx.lineTo(GATE_X+12,262);ctx.fill();ctx.fillStyle='#e0b23e';ctx.beginPath();ctx.moveTo(GATE_X+15,240);ctx.lineTo(GATE_X+23,240);ctx.lineTo(GATE_X+19,248);ctx.fill();
 for(const t of [...TREES].sort((a,b)=>a.y-b.y)){const img=sprites[t.k];if(!img)continue;const w=(t.k==='pine'?30:26)*t.s,h=t.k==='pine'?w*1.33:w*.66;ctx.drawImage(img,t.x-w/2,t.y-h*.9,w,h);}
}

export async function loadKingsgateArt(){
 const sprites={};
 await Promise.all(Object.keys(SPRITES).map(async id=>{
  const vb=SPRITES[id].viewBox.split(/\s+/).map(Number),aspect=vb[3]/vb[2],px=160;
  const svg=svgFor(id,px).replace(`width="${px}" height="${px}"`,`width="${px}" height="${Math.round(px*aspect)}"`);
  sprites[id==='pine'||id==='rock'?id:id]=await loadImage(svg);
 }));
 const bg=canvas(W*2,H*2),bctx=bg.getContext('2d');bctx.scale(2,2);drawBackground(bctx,{pine:sprites.pine,rock:sprites.rock});
 return {sprites,bg};
}

// Build/upgrade menu geometry, shared by drawing and tapping.
export function menuFor(g,sel){
 if(!sel)return null;const sp=SPOTS.find(s=>s.id===sel);if(!sp)return null;
 const tw=towerAt(g,sel),buttons=[];
 if(!tw)for(const type of TOWER_ORDER){const d=TOWERS[type],locked=!g.allowed.includes(type);buttons.push({act:'build',type,label:d.title.replace(' Tower',''),price:d.cost,locked,afford:g.gold>=d.cost});}
 else{const d=TOWERS[tw.type];if(!tw.tier)buttons.push({act:'upgrade',label:'Upgrade',price:d.upgrade,afford:g.gold>=d.upgrade});buttons.push({act:'sell',label:'Sell',price:-Math.floor(invested(tw)/2),afford:true});}
 buttons.push({act:'close',label:'Close',afford:true});
 const bw=60,bh=58,gap=4,w=buttons.length*bw+(buttons.length-1)*gap+12,h=bh+12;
 let x=Math.max(6,Math.min(W-w-6,sp.x-w/2)),y=sp.y>H/2?sp.y-78-h:sp.y+22;y=Math.max(30,Math.min(H-h-4,y));
 buttons.forEach((b,i)=>Object.assign(b,{x:x+6+i*(bw+gap),y:y+6,w:bw,h:bh}));
 return {x,y,w,h,buttons,spot:sp,tower:tw};
}

function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function drawSprite(ctx,img,x,y,size,flip=false){if(!img)return;const h=size*(img.height/img.width);ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(img,-size/2,-h*.93,size,h);ctx.restore();}

export function drawKingsgate(ctx,s,art){
 const g=s.g,sp=art.sprites;
 ctx.drawImage(art.bg,0,0,W,H);
 const sel=s.ui?.sel,menu=menuFor(g,sel);
 // Range of the selected tower.
 if(menu?.tower){const d=TOWERS[menu.tower.type];ctx.beginPath();ctx.arc(menu.spot.x,menu.spot.y,d.range*TILE,0,Math.PI*2);ctx.fillStyle='rgba(224,178,62,.08)';ctx.fill();ctx.setLineDash([5,5]);ctx.strokeStyle='rgba(224,178,62,.6)';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);}
 // Empty build spots.
 for(const p of SPOTS){if(towerAt(g,p.id))continue;ctx.beginPath();ctx.ellipse(p.x,p.y,19,8,0,0,Math.PI*2);ctx.fillStyle=sel===p.id?'rgba(224,178,62,.35)':'rgba(19,22,29,.25)';ctx.fill();ctx.setLineDash([4,3]);ctx.strokeStyle='#e0b23e';ctx.lineWidth=sel===p.id?2.5:1.5;ctx.stroke();ctx.setLineDash([]);}
 // Entities in depth order.
 const items=[...g.towers.map(t=>({k:'t',t,y:SPOTS.find(p=>p.id===t.spot).y})),...g.enemies.map(e=>({k:'e',e,y:pointAt(e.d).y}))].sort((a,b)=>a.y-b.y);
 for(const it of items){
  if(it.k==='t'){const p=SPOTS.find(q=>q.id===it.t.spot);drawSprite(ctx,sp[TOWER_SPRITE[it.t.type]],p.x,p.y+10,TOWER_SIZE);
   if(it.t.tier){ctx.fillStyle='#e0b23e';ctx.beginPath();ctx.moveTo(p.x-14,p.y+6);ctx.lineTo(p.x+14,p.y+6);ctx.lineTo(p.x+12,p.y+11);ctx.lineTo(p.x-12,p.y+11);ctx.fill();ctx.beginPath();ctx.moveTo(p.x+18,p.y-46);ctx.lineTo(p.x+30,p.y-42);ctx.lineTo(p.x+18,p.y-38);ctx.fill();ctx.fillStyle='#5e3b1f';ctx.fillRect(p.x+16.5,p.y-48,2,40);}}
  else{const e=it.e,def=ENEMIES[e.type],p=pointAt(e.d),bob=e.type==='ram'?0:Math.abs(Math.sin(g.t*9+e.id))*1.6;
   if(e.slowUntil>g.t){ctx.beginPath();ctx.ellipse(p.x,p.y,def.size*.42,def.size*.16,0,0,Math.PI*2);ctx.fillStyle='rgba(180,140,255,.45)';ctx.fill();}
   drawSprite(ctx,sp[ENEMY_SPRITE[e.type]],p.x,p.y-bob,def.size,p.dx<-.2);
   if(e.flash>0){ctx.globalAlpha=e.flash*5;ctx.beginPath();ctx.arc(p.x,p.y-def.size*.45,def.size*.4,0,Math.PI*2);ctx.strokeStyle='#ffd27a';ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;}
   if(e.hp<def.hp){const w=Math.max(18,def.size*.6),y=p.y-def.size*1.02;ctx.fillStyle='#13161d';ctx.fillRect(p.x-w/2-1,y-1,w+2,5);ctx.fillStyle=e.type==='ram'?'#e0b23e':'#c4463a';ctx.fillRect(p.x-w/2,y,w*Math.max(0,e.hp)/def.hp,3);}}
 }
 // Boulders in flight.
 for(const b of g.boulders){const k=Math.min(1,b.age/TOWERS.catapult.flight),x=b.x+(b.tx-b.x)*k,y=b.y+(b.ty-b.y)*k-Math.sin(k*Math.PI)*60;ctx.fillStyle='#8b8f99';ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x-2,y-5);ctx.lineTo(x+4,y-4);ctx.lineTo(x+5,y+2);ctx.lineTo(x,y+5);ctx.fill();}
 // Effects.
 for(const f of g.fx){const k=f.age/f.life;ctx.globalAlpha=1-k;
  if(f.k==='arrow'){ctx.strokeStyle='#e7e2d4';ctx.lineWidth=1.6;const x=f.x+(f.x2-f.x)*Math.min(1,k*1.6),y=f.y+(f.y2-f.y)*Math.min(1,k*1.6);ctx.beginPath();ctx.moveTo(x-(f.x2-f.x)*.12,y-(f.y2-f.y)*.12);ctx.lineTo(x,y);ctx.stroke();}
  else if(f.k==='bolt'){ctx.strokeStyle='#d8c8a0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x+(f.x2-f.x)*Math.min(1,k*2),f.y+(f.y2-f.y)*Math.min(1,k*2));ctx.stroke();}
  else if(f.k==='frost'){ctx.strokeStyle='#b48cff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(f.sx,f.sy);ctx.lineTo(f.x,f.y-6);ctx.stroke();ctx.fillStyle='rgba(180,140,255,.35)';ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.5+k*.5),0,Math.PI*2);ctx.fill();}
  else if(f.k==='blast'){ctx.fillStyle='rgba(240,138,42,.55)';for(let i=0;i<6;i++){const a=i*Math.PI/3,rr=f.r*(.4+k*.8);ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x+Math.cos(a)*rr,f.y+Math.sin(a)*rr*.6);ctx.lineTo(f.x+Math.cos(a+.6)*rr*.6,f.y+Math.sin(a+.6)*rr*.4);ctx.fill();}}
  else if(f.k==='death'){ctx.fillStyle=f.type==='troll'?'#55756c':f.type==='wolf'?'#7d7468':'#4f7428';for(let i=0;i<5;i++){const a=i*1.26+f.x,d=6+k*16;ctx.beginPath();ctx.moveTo(f.x+Math.cos(a)*d,f.y-10+Math.sin(a)*d);ctx.lineTo(f.x+Math.cos(a+.4)*(d+5),f.y-10+Math.sin(a+.4)*(d+5));ctx.lineTo(f.x+Math.cos(a-.3)*(d+4),f.y-10+Math.sin(a-.3)*(d+4));ctx.fill();}}
  else if(f.k==='coin'){ctx.fillStyle='#e0b23e';ctx.font='700 11px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('+'+f.n,f.x,f.y-k*14);}
  else if(f.k==='gatehit'){ctx.fillStyle='rgba(196,70,58,.5)';ctx.fillRect(GATE_X-4,170,W-GATE_X+4,60);}
  ctx.globalAlpha=1;}
 // On-field status.
 ctx.fillStyle='rgba(19,22,29,.82)';roundRect(ctx,8,8,236,26,4);ctx.fill();ctx.font='700 13px system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
 ctx.fillStyle='#e0b23e';ctx.fillText('◆ '+g.gold,18,21);ctx.fillStyle='#f0a59b';ctx.fillText('♥ '+g.gateHp+'/'+g.gateMax,82,21);ctx.fillStyle='#e7e2d4';ctx.fillText('WAVE '+Math.max(1,g.wave)+'/12',152,21);
 if(s.ui?.banner&&g.t<s.ui.banner.until){const a=Math.min(1,(s.ui.banner.until-g.t)/.6);ctx.globalAlpha=a;ctx.fillStyle='rgba(19,22,29,.85)';roundRect(ctx,W/2-170,44,340,46,6);ctx.fill();ctx.textAlign='center';ctx.fillStyle=s.ui.banner.boss?'#f0a59b':'#e0b23e';ctx.font='700 17px Georgia,serif';ctx.fillText(s.ui.banner.title,W/2,60);ctx.fillStyle='#e7e2d4';ctx.font='12px system-ui,sans-serif';ctx.fillText(s.ui.banner.text,W/2,79);ctx.globalAlpha=1;}
 if(!g.towers.length&&!sel&&g.wave<2){ctx.textAlign='center';ctx.fillStyle='rgba(19,22,29,.8)';roundRect(ctx,W/2-150,H-38,300,28,5);ctx.fill();ctx.fillStyle='#e7e2d4';ctx.font='13px system-ui,sans-serif';ctx.fillText('Tap a gold ring to build a tower',W/2,H-23);}
 // Build menu.
 if(menu){ctx.fillStyle='rgba(19,22,29,.94)';roundRect(ctx,menu.x,menu.y,menu.w,menu.h,6);ctx.fill();ctx.strokeStyle='#e0b23e';ctx.lineWidth=1;ctx.stroke();
  for(const b of menu.buttons){const usable=!b.locked&&b.afford;ctx.fillStyle=usable?'#273042':'#1b1f29';roundRect(ctx,b.x,b.y,b.w,b.h,4);ctx.fill();ctx.textAlign='center';ctx.textBaseline='alphabetic';
   if(b.act==='build'){ctx.globalAlpha=usable?1:.35;drawSprite(ctx,sp[TOWER_SPRITE[b.type]],b.x+b.w/2,b.y+33,34);ctx.globalAlpha=1;}
   else{ctx.fillStyle=b.act==='sell'?'#f0a59b':b.act==='upgrade'?'#e0b23e':'#9a9fae';ctx.font='700 20px system-ui,sans-serif';ctx.fillText(b.act==='upgrade'?'▲':b.act==='sell'?'↺':'✕',b.x+b.w/2,b.y+28);}
   ctx.fillStyle=usable?'#e7e2d4':'#6c7180';ctx.font='600 10px system-ui,sans-serif';ctx.fillText(b.locked?'Locked':b.label,b.x+b.w/2,b.y+44);
   if(b.price!==undefined&&!b.locked){ctx.fillStyle=b.price<0?'#9fe3a6':usable?'#e0b23e':'#8a6a2a';ctx.fillText((b.price<0?'+'+(-b.price):b.price)+'g',b.x+b.w/2,b.y+55);}}
 }
 ctx.textBaseline='alphabetic';
}
