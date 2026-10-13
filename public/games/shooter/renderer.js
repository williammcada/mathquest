import {CONFIG as C} from './config.js';
import {WORLD} from './world.js';
import {colliders} from './simulation.js';

// Original code-drawn pixel assets; crisp integer cells, no franchise artwork.
const P={bg:'#081420',steel:'#506477',edge:'#93afc1',orange:'#d87924',water:'#1b839b',teal:'#49e5db',violet:'#7535bc',silver:'#cedae8',lime:'#d5f044'};
export function render(ctx,g){
  ctx.imageSmoothingEnabled=false;ctx.fillStyle=P.bg;ctx.fillRect(0,0,C.width,C.height);
  const cx=Math.round(g.camera.x),cy=Math.round(g.camera.y);
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const line=(x,y,nx,ny,c,w=1)=>{ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(Math.round(x),Math.round(y));ctx.lineTo(Math.round(nx),Math.round(ny));ctx.stroke();};
  const text=(s,x,y,color='#c7dce9',size=10)=>{ctx.font=`bold ${size}px ui-monospace, monospace`;ctx.fillStyle=color;ctx.fillText(s,Math.round(x),Math.round(y));};
  // Subdued multi-depth factory silhouette.
  for(let i=-1;i<12;i++){const x=i*94-(cx*.2%94);rect(x,0,55,360,'#0c2030');rect(x+8,0,3,360,'#132d3c');
    for(let j=0;j<7;j++){rect(x+17,j*70-(cy*.15%70),29,18,'#112c3d');rect(x+19,j*70+2-(cy*.15%70),2,12,'#20515b');}}
  for(let i=-1;i<6;i++){const x=i*210-(cx*.45%210);rect(x,70-cy*.25,10,270,'#1c3342');line(x,88-cy*.25,x+178,198-cy*.25,'#172e3d',4);}
  ctx.save();ctx.translate(-cx,-cy);
  for(const s of WORLD.sectors){if(s.x0>cx+680||s.x1<cx)continue;text(s.title.toUpperCase(),s.x0+30,75,'#28485a',15);}
  for(const w of WORLD.layers.Water){
    rect(w.x,w.y,w.w,w.h,P.water);rect(w.x,w.y+12,w.w,w.h-12,'#155268');
    for(let x=w.x;x<w.x+w.w;x+=28){const offset=Math.sin(g.t*3+x)*2;rect(x,w.y+offset,17,2,'#5fe2e2');rect(x+4,w.y+19+offset,9,1,'#257b8e');}
    rect(w.x,w.y+w.h-9,w.w,9,'#113a4d');
  }
  for(const r of WORLD.layers.Solids){
    rect(r.x,r.y,r.w,r.h,P.steel);rect(r.x,r.y,r.w,3,P.edge);rect(r.x,r.y+r.h-4,r.w,4,'#283e50');
    for(let x=r.x+8;x<r.x+r.w;x+=32)for(let y=r.y+7;y<r.y+r.h-3;y+=32)rect(x,y,2,2,'#233a4b');
  }
  for(const r of WORLD.layers.OneWay){
    rect(r.x,r.y,r.w,4,'#eab36b');rect(r.x,r.y+4,r.w,7,P.orange);rect(r.x,r.y+11,r.w,5,'#563c31');
    for(let x=r.x+3;x<r.x+r.w-6;x+=20){rect(x,r.y+7,8,4,'#77461f');line(x,r.y+16,x+10,r.y+29,'#2c4551',2);}
  }
  for(const l of WORLD.layers.Ladders){rect(l.x,l.y,3,l.h,'#bd9049');rect(l.x+l.w-3,l.y,3,l.h,'#bd9049');for(let y=l.y+3;y<l.y+l.h;y+=10)rect(l.x+3,y,l.w-6,2,'#f1bd66');}
  for(const h of g.hazards){
    const warning=h.state==='warning',active=h.state==='active',col=warning||active?'#ffce60':'#738995';
    if(h.type==='water_pulse'){
      rect(h.x,h.y-10,6,24,'#466278');rect(h.x+h.w-6,h.y-10,6,24,'#466278');rect(h.x,h.y-12,6,4,col);rect(h.x+h.w-6,h.y-12,6,4,col);
      if(warning||active){for(let x=h.x+5;x<h.x+h.w-5;x+=8)line(x,h.y+15,x+7,h.y+(active?Math.sin(x+g.t*30)*10:20),active?'#efff95':'#f5b65e',2);}
    }else {
      rect(h.x,h.y,h.w,8,'#617b8b');line(h.x+8,h.y,h.x+8,h.y+h.h-24,'#445461',2);line(h.x+h.w-8,h.y,h.x+h.w-8,h.y+h.h-24,'#445461',2);
      const y=active?h.hitbox.y:h.y+8;rect(h.x+2,y,h.w-4,22,'#748590');rect(h.x+2,y+15,h.w-4,7,'#eaa33b');
      for(let x=h.x+3;x<h.x+h.w-5;x+=12)line(x,y+15,x+6,y+22,'#302b28',4);
      if(warning){rect(h.x,h.y+h.h-3,h.w,3,'#ffcf62');text('!',h.x+h.w/2-3,h.y+h.h-10,'#ffcf62',17);}
    }
  }
  for(const cp of WORLD.layers.Checkpoints){const active=cp.id===g.checkpoint;rect(cp.x+12,cp.y,4,cp.h,'#45687a');rect(cp.x+16,cp.y+2,24,12,active?P.teal:'#3b6672');text(cp.id,cp.x-2,cp.y-8,active?P.teal:'#8ba6b7',10);}
  const gate=colliders(g).filter(x=>x.type==='enemy_gate'||x.id==='BOSS-GATE');
  for(const r of gate){rect(r.x,r.y,r.w,r.h,'#4f2d72');for(let y=0;y<640;y+=18)rect(r.x+4,y,8,8,'#bf7ce9');}
  for(const p of g.pickups)if(!p.collected){const y=p.y+Math.sin(g.t*3)*2;rect(p.x-2,y-2,20,20,'#183c3a');rect(p.x,y,16,16,'#46c8a4');rect(p.x+6,y+3,4,10,'#e6fff4');rect(p.x+3,y+6,10,4,'#e6fff4');}
  for(const e of g.enemies){if(e.hp<=0||e.x+e.w<cx||e.x>cx+C.width)continue;
    const warn=e.state==='warning',hurt=e.hit>0,frame=Math.floor(g.t*7)%2,color=hurt?'#fff7d6':e.type==='heavy'?'#c3653e':e.type==='drone'?'#bf76c9':'#b9b2a0';
    if(e.type==='boss'){
      const x=e.x,y=e.y,bob=e.state==='arrival'?Math.sin(g.t*12)*2:0;
      rect(x+18,y+108,35,45,'#453f63');rect(x+78,y+108,35,45,'#453f63');rect(x+10,y+147,47,13,P.silver);rect(x+75,y+147,48,13,P.silver);
      rect(x+8,y+26+bob,115,83,hurt?'#f1f2d6':P.violet);rect(x+21,y+35,93,7,'#ad75e8');rect(x+28,y+9,71,34,P.silver);rect(x+37,y+17,54,12,'#172b3b');rect(x+44,y+20,32,5,P.lime);
      rect(x+46,y+65,35,26,'#292640');rect(x+55,y+71,17,14,P.lime);rect(x+92,y+57,27,35,'#a6b9ca');
      const gunY=e.attack==='low'?y+135:e.attack==='high'?y+124:y+93;rect(x-17,gunY,44,19,P.silver);rect(x-23,gunY+4,10,11,'#30384a');
      for(let j=0;j<3;j++)rect(x+15+j*12,y+99,6,5,'#d0bedf');
      if(e.enraged){rect(x+5,y+38,7,26,P.lime);rect(x+111,y+38,7,26,P.lime);}
      if(warn){rect(x+3,y-12,120,4,P.lime);if(e.attack==='overhead'){line(e.targetX,92,e.targetX,332,'#f0cc70');rect(e.targetX-25,332,50,3,'#ffd574');text('MOVE',e.targetX-14,302,'#ffd574',11);}else {const hy=e.attack==='low'?329:312;for(let dx=WORLD.boss.targetMin;dx<x;dx+=24)rect(dx,hy,10,2,'#aa8257');}}
      if(e.mortarTargets&&(warn||e.state==='attack'))for(const tx of e.mortarTargets){const pulse=Math.floor(g.t*8)%2;rect(tx-18,333,36,3,pulse?'#ff8a4c':'#ffd574');rect(tx-2,318,4,10,'#ffd574');rect(tx-2,330,4,2,'#ffd574');}
      if(e.attack==='mortar'&&warn){rect(x+60,y-2,22,14,'#30384a');rect(x+64,y-10,14,10,P.silver);rect(x+67,y-14,8,5,'#ff8a4c');}
    }else if(e.type==='turret'){
      rect(e.x+8,e.y-24,8,24,'#40566a');rect(e.x,e.y,e.w,12,color);rect(e.x+5,e.y+12,15,10,'#69657e');line(e.x+12,e.y+17,e.x+12+(e.dir||-1)*14,e.y+30,'#d5a564',5);rect(e.x+8,e.y+5,8,4,warn?'#ffe27e':'#f976a7');
    }else if(e.type==='drone'){
      rect(e.x+3,e.y+4,18,14,color);rect(e.x-5,e.y+9,9,5,'#78657e');rect(e.x+21,e.y+9,9,5,'#78657e');rect(e.x+7,e.y+8,11,4,warn?'#ffe27e':'#dfff9a');rect(e.x+4,e.y+21,4,frame?6:3,'#42bcd9');rect(e.x+17,e.y+21,4,frame?3:6,'#42bcd9');
    }else if(e.type==='skimmer'){
      rect(e.x,e.y+12,32,7,'#849da9');rect(e.x+5,e.y+4,22,12,color);rect(e.x+9,e.y,12,7,'#626b7a');rect(e.x+9,e.y+5,10,3,warn?'#ffe27e':'#fc81bd');
    }else {
      rect(e.x+4,e.y+e.h-11,7,11,'#4e5460');rect(e.x+e.w-11,e.y+e.h-11,7,11,'#4e5460');rect(e.x+2,e.y+10,e.w-4,e.h-20,color);rect(e.x+5,e.y,e.w-10,15,color);rect(e.x+7,e.y+5,e.w-14,4,warn?'#ffe27e':'#fe79a1');
      rect(e.x+(e.dir===1?e.w-2:-8),e.y+e.h-24,10,5,'#75889e');rect(e.x+7,e.y+20,4,3,'#455567');
      if(e.type==='lobber'){rect(e.x+e.w-5,e.y-4,9,18,'#b08d4f');if(warn){rect(e.targetX-12,e.targetY+6,24,2,'#ffc260');text('!',e.targetX-3,e.targetY,'#ffc260',13);}}
    }
    if(warn&&e.type!=='boss')text('!',e.x+e.w/2-3,e.y-6,'#ffe393',16);
    if(e.hp<e.maxHP&&e.type!=='boss'){rect(e.x,e.y-12,e.w,2,'#273a47');rect(e.x,e.y-12,e.w*e.hp/e.maxHP,2,'#f4b27d');}
  }
  const p=g.player,blink=p.immunity>0&&Math.floor(g.t*9)%2;
  ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));if(p.facing<0)ctx.scale(-1,1);
  const armor=blink?'#deffff':'#b2c5cb',shadow='#48647c',stride=p.grounded&&p.vx?Math.floor(g.t*12)%4:0;
  if(g.status==='downed'||g.outcome==='defeated'){rect(-14,-8,29,7,shadow);rect(8,-12,9,8,armor);rect(11,-10,5,3,P.teal);}
  else if(p.stance==='prone'){rect(-15,-8,28,8,shadow);rect(6,-13,12,9,armor);rect(11,-10,7,3,P.teal);rect(-16,-7,8,4,armor);}
  else{
    const y=-p.h;rect(-8,y+10,16,Math.max(6,p.h-19),shadow);rect(-7,y+9,14,8,armor);rect(-8,y,16,12,armor);rect(-7,y+2,4,7,'#587b8b');rect(0,y+3,10,5,P.teal);rect(-10,y+11,5,11,armor);
    if(!p.swimming){rect(-7,-9+(stride===1?-2:0),5,9,armor);rect(2,-9+(stride===3?-2:0),5,9,armor);rect(-9,-3,8,3,shadow);rect(2,-3,8,3,shadow);}
    if(p.climbing){rect(8,y+5+Math.sin(g.t*12)*4,4,8,armor);}
  }
  ctx.restore();
  if(g.status==='active'){
    const a=Math.atan2(p.aimY,p.aimX),gx=p.x+Math.cos(a)*15,gy=p.y-Math.min(p.h-4,18)+Math.sin(a)*8;
    line(p.x,p.y-Math.min(p.h-4,18),gx,gy,'#263a52',6);line(p.x+Math.cos(a)*6,p.y-Math.min(p.h-4,18)+Math.sin(a)*3,gx,gy,g.upgrades.includes('spread')?'#ecb759':'#d5e2e9',3);
  }
  if(p.swimming){rect(p.x-19,p.y-1,38,2,'#83edef');rect(p.x-24,p.y+3,17,1,'#4acece');}
  for(const b of g.bullets){if(b.kind==='mortar'){rect(b.x-7,b.y-7,14,14,'#2a2f3d');rect(b.x-5,b.y-9,10,18,'#3b4254');rect(b.x-3,b.y-5,6,4,'#8996a8');rect(b.x-2,b.y-12+Math.floor(g.t*20)%3,4,4,'#ffb35c');continue;}
    rect(b.x-b.r,b.y-b.r,b.r*2,b.r*2,b.side==='player'?'#ffeaae':'#fa83be');if(b.side==='player')rect(b.x-b.vx/75,b.y-b.vy/75,3,2,'#d98c40');}
  for(const e of g.effects){const radius=(1-e.life/e.total)*24;for(let j=0;j<8;j++){const a=j*Math.PI/4;rect(e.x+Math.cos(a)*radius,e.y+Math.sin(a)*radius,Math.max(2,e.life/e.total*6),Math.max(2,e.life/e.total*6),e.color);}}
  ctx.restore();
  if(g.bossActive){const b=g.enemies.find(e=>e.type==='boss');rect(168,11,304,16,'#101c2b');rect(170,13,300*b.hp/b.maxHP,12,P.violet);text(b.enraged?'SECURITY ROBOT / PHASE 2':'SECURITY ROBOT',b.enraged?242:267,23,'#f4f3e8',10);}
  if(g.messageUntil>g.t){const w=Math.min(590,g.message.length*6.5+24);rect((640-w)/2,335,w,21,'#0a1b2dea');text(g.message,(640-w)/2+12,350,'#e6efec',11);}
}
