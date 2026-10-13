import {CONFIG as C, ENEMY, UPGRADES} from './config.js';
import {WORLD} from './world.js';

export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const copy=v=>JSON.parse(JSON.stringify(v));
// v0.2.0: boss shots ~30% faster; mortar barrage added to the rotation.
export const BOSS_ATTACKS=Object.freeze(['high','low','mortar','overhead']);
export const BOSS_SHOT=Object.freeze({high:365,low:250,lowEnraged:275,overhead:455,mortarFlight:1.05,mortarGravity:600});
const sectionRank={START:0,MID:1,MID2:2,BOSS:3};
const ARENA=WORLD.boss,GUARD_GATES=WORLD.layers.Gates.filter(g=>g.type==='enemy_gate');
export const SECTION_RANK=Object.freeze({...sectionRank});
export function body(p){return {x:p.x-C.bodyWidth/2,y:p.y-p.h,w:C.bodyWidth,h:p.h};}
// Segment versus rectangle: returns first intersection, including fast projectiles.
export function rayRect(x,y,nx,ny,r,pad=0){
  let lo=0,hi=1;
  for(const [v,d,min,max] of [[x,nx-x,r.x-pad,r.x+r.w+pad],[y,ny-y,r.y-pad,r.y+r.h+pad]]){
    if(Math.abs(d)<1e-9){if(v<min||v>max)return null;}
    else {let a=(min-v)/d,b=(max-v)/d;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return null;}
  }
  return lo;
}
function enemyState(e){const hp=e.type==='boss'?C.bossHP:e.id==='P01'?2:ENEMY[e.type].hp;return {...copy(e),hp,maxHP:hp,homeX:e.x,homeY:e.y,state:'idle',clock:0,phase:0,hit:0,volleyHits:[],burst:0,burstClock:0};}
export function createGame({upgrades=[],checkpoint='START',timed=true,now=Date.now()}={}){
  if(!Array.isArray(upgrades)||new Set(upgrades).size!==upgrades.length||upgrades.some(x=>!UPGRADES.includes(x)))throw Error('Choose distinct supported upgrades.');
  if(!sectionRank.hasOwnProperty(checkpoint))throw Error('Choose a supported checkpoint.');
  const g={revision:WORLD.revision,upgrades:[...upgrades],checkpoint,timed,deadline:timed?now+C.windowMs:null,
    status:'active',outcome:null,lives:C.lives,attempt:1,t:0,activeTime:0,damage:0,kills:0,
    enemies:WORLD.layers.Enemies.map(enemyState),hazards:WORLD.layers.Hazards.map(h=>({...copy(h),clock:0,state:'idle',armed:false})),
    pickups:WORLD.layers.Pickups.map(p=>({...copy(p),collected:false})),bullets:[],effects:[],events:[],
    bossActive:false,bossGate:false,volley:0,camera:{x:0,y:0},message:'Reach the security chamber',messageUntil:5,prev:{},lastDown:-10};
  for(const e of g.enemies)if(sectionRank[e.reset_section]<sectionRank[checkpoint])e.hp=0;
  for(const p of g.pickups)if(sectionRank[p.reset_section]<sectionRank[checkpoint])p.collected=true;
  spawn(g);return g;
}
function spawn(g){
  const cp=WORLD.layers.Checkpoints.find(x=>x.id===g.checkpoint),maxHP=g.upgrades.includes('armor')?4:3;
  g.player={x:cp.spawn_x,y:cp.spawn_feet_y,vx:0,vy:0,h:C.bodyHeight,facing:1,aimX:1,aimY:0,hp:maxHP,maxHP,
    grounded:true,stance:'stand',climbing:null,swimming:false,immunity:C.spawnImmunity,shot:0,
    coyote:C.coyote,jumpBuffer:0,jumps:0,dropUntil:0,dropY:null,safe:{x:cp.spawn_x,y:cp.spawn_feet_y}};
  g.prev={};g.lastDown=-10;g.bullets=[];g.bossActive=false;g.bossGate=false;
  g.camera={x:clamp(g.player.x-230,0,WORLD.world.width-C.width),y:clamp(g.player.y-220,0,WORLD.world.height-C.height)};
}
export function event(g,type,x=g.player.x,y=g.player.y){g.events.push({type,x,y});}
export function message(g,text){g.message=text;g.messageUntil=g.t+3;}
export function damage(g,source='hit'){
  if(g.status!=='active'||g.player.immunity>0)return false;
  const p=g.player;p.hp=Math.max(0,p.hp-1);p.immunity=C.immunity;g.damage++;event(g,'hurt');
  if(!p.hp){g.lives--;g.status=g.lives?'downed':'terminal';g.outcome=g.lives?null:'defeated';g.bullets=[];event(g,'downed');message(g,g.lives?'Robot suit disabled — retry from checkpoint':'All three lives used');}
  return true;
}
export function expire(g,now=Date.now()){
  if(g.status==='terminal'||!g.timed||now<g.deadline)return false;
  g.status='terminal';g.outcome='time_window_closed';g.bullets=[];event(g,'time-closed');return true;
}
export function retry(g,now=Date.now()){
  if(expire(g,now)||g.status!=='downed'||g.lives<1)return false;
  const rank=sectionRank[g.checkpoint];
  g.enemies=g.enemies.map(e=>sectionRank[e.reset_section]>=rank?enemyState(WORLD.layers.Enemies.find(a=>a.id===e.id)):e);
  for(const h of g.hazards)if(sectionRank[h.reset_section]>=rank){h.clock=0;h.state='idle';h.armed=false;}
  for(const p of g.pickups)if(sectionRank[p.reset_section]>=rank)p.collected=false;
  g.attempt++;g.status='active';g.effects=[];spawn(g);event(g,'respawn');return true;
}
export function colliders(g){
  const solids=[...WORLD.layers.Solids];
  for(const gate of GUARD_GATES)if(g.enemies.find(e=>e.id===gate.enemy).hp>0)solids.push(gate);
  if(g.bossGate)solids.push({id:'BOSS-GATE',x:ARENA.gateX,y:0,w:16,h:640});
  return solids;
}
function standingClear(g,p){return !colliders(g).some(r=>overlap({x:p.x-10,y:p.y-28,w:20,h:27.9},r));}
function movePlayer(g,i,dt){
  const p=g.player,x=clamp(i.x||0,-1,1),y=clamp(i.y||0,-1,1),jump=!!i.jump&&!g.prev.jump,down=y===1&&x===0,
    downTap=down&&!g.prev.down,speed=g.upgrades.includes('agility')?1.1:1;
  p.immunity=Math.max(0,p.immunity-dt);p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
  p.coyote=p.grounded?C.coyote:Math.max(0,p.coyote-dt);
  if(jump)p.jumpBuffer=C.jumpBuffer;
  const ladder=WORLD.layers.Ladders.filter(r=>Math.abs(p.x-(r.x+r.w/2))<17&&p.y>=r.y-2&&p.y<=r.y+r.h+3&&((y<0&&p.y>r.y+1)||(y>0&&p.y<r.y+r.h-1))).sort((a,b)=>Math.abs(p.x-a.x-a.w/2)-Math.abs(p.x-b.x-b.w/2))[0];
  if(y&&x===0&&ladder&&!jump&&((y<0&&p.y>ladder.y+1)||(y>0&&p.y<ladder.y+ladder.h-1))){p.climbing=ladder.id;p.stance='stand';}
  if((i.prone&&!g.prev.prone||downTap&&g.t-g.lastDown<=.3)&&p.grounded&&!p.climbing&&!p.swimming)p.stance='prone';
  if(downTap)g.lastDown=g.t;
  if(p.stance==='prone'&&((x&&!down)||y<0)&&standingClear(g,p))p.stance='stand';
  if(p.stance!=='prone')p.stance=down&&p.grounded&&!p.climbing&&!p.swimming?'crouch':'stand';
  const desiredH=p.stance==='prone'?C.proneHeight:p.stance==='crouch'?C.crouchHeight:C.bodyHeight;
  if(desiredH<=p.h||standingClear(g,p))p.h=desiredH;
  if(x)p.facing=x;
  p.aimX=x||(!y||down&&p.grounded?p.facing:0);p.aimY=y;
  if(down&&p.grounded||p.stance==='prone'){p.aimX=p.facing;p.aimY=0;}
  if(p.swimming&&p.aimY>0){p.aimX=p.facing;p.aimY=0;}
  if(!p.aimX&&!p.aimY)p.aimX=p.facing;
  if(p.climbing){
    const l=WORLD.layers.Ladders.find(r=>r.id===p.climbing);
    if(jump||x){p.climbing=null;p.grounded=false;}
    else {p.x=l.x+l.w/2;p.y=clamp(p.y+y*C.climbSpeed*speed*dt,l.y,l.y+l.h);p.vx=0;p.vy=0;p.swimming=false;p.grounded=false;
      if(p.y===l.y||p.y===l.y+l.h){p.climbing=null;p.grounded=true;p.jumps=0;}
      g.prev={jump:!!i.jump,down,prone:!!i.prone};return;}
    if(jump){p.vy=-C.jump;p.jumps=1;p.jumpBuffer=0;event(g,'jump');}
  }
  const thin=WORLD.layers.OneWay.find(r=>Math.abs(p.y-r.y)<2&&p.x+10>r.x&&p.x-10<r.x+r.w);
  if(jump&&y>0&&p.grounded&&thin){p.dropUntil=g.t+.32;p.dropY=thin.y;p.y+=2;p.grounded=false;p.vy=45;p.jumpBuffer=0;p.coyote=0;}
  else if(p.jumpBuffer>0&&standingClear(g,p)&&(p.grounded||p.coyote>0||p.swimming||jump&&g.upgrades.includes('agility')&&p.jumps<2)){
    p.vy=-C.jump;p.jumps=p.grounded||p.coyote>0||p.swimming?1:p.jumps+1;p.grounded=false;p.swimming=false;p.climbing=null;
    p.stance='stand';p.h=C.bodyHeight;p.jumpBuffer=0;p.coyote=0;event(g,p.jumps>1?'double-jump':'jump');
  }
  if(!i.jump&&g.prev.jump&&p.vy<-150)p.vy=-150;
  p.vx=x*(p.swimming?C.swimSpeed:C.runSpeed)*speed;
  if(p.stance==='prone')p.vx=0; // Crawling remains deliberately unimplemented.
  const solids=colliders(g),oldY=p.y;
  p.x+=p.vx*dt;p.x=clamp(p.x,10,WORLD.world.width-10);
  for(const r of solids)if(overlap(body(p),r)){if(p.vx>0)p.x=r.x-10;else if(p.vx<0)p.x=r.x+r.w+10;}
  p.vy=Math.min(600,p.vy+C.gravity*dt);p.y+=p.vy*dt;
  const wasGrounded=p.grounded,wasWater=p.swimming;p.grounded=false;p.swimming=false;
  for(const r of solids){if(!overlap(body(p),r))continue;
    if(p.vy>=0&&oldY<=r.y+.1){p.y=r.y;p.vy=0;p.grounded=true;}
    else if(p.vy<0&&oldY-p.h>=r.y+r.h-.1){p.y=r.y+r.h+p.h;p.vy=0;}}
  if(p.vy>=0){
    for(const r of WORLD.layers.OneWay){if(g.t<p.dropUntil&&Math.abs(r.y-p.dropY)<1)continue;
      if(oldY<=r.y+.2&&p.y>=r.y&&p.x+10>r.x&&p.x-10<r.x+r.w){p.y=r.y;p.vy=0;p.grounded=true;}}
    for(const r of WORLD.layers.Water)if(p.x>=r.x&&p.x<=r.x+r.w&&oldY<=r.surface_y+.5&&p.y>=r.surface_y){p.y=r.surface_y;p.vy=0;p.swimming=true;p.grounded=false;p.h=22;p.stance='stand';}
  }
  if(p.grounded||p.swimming){p.jumps=0;if(p.grounded)p.safe={x:p.x,y:p.y};}
  if(!wasWater&&p.swimming)event(g,'splash');
  if(!wasGrounded&&p.grounded&&oldY<p.y-2)event(g,'land');
  if(p.y>WORLD.world.height+32){damage(g,'fall');p.x=p.safe.x;p.y=p.safe.y;p.vy=0;p.grounded=true;p.swimming=false;p.immunity=Math.max(p.immunity,C.immunity);}
  g.prev={jump:!!i.jump,down,prone:!!i.prone};
}
function bullet(g,b){if(g.bullets.length<C.maxBullets)g.bullets.push({life:3,r:3,gravity:0,...b});}
function shoot(g,dt,fire){
  const p=g.player;p.shot-=dt;if(!fire||p.shot>0)return;p.shot=C.shotPeriod;
  const angle=Math.atan2(p.aimY,p.aimX),spread=g.upgrades.includes('spread'),volley=++g.volley;
  const muzzle={x:p.x+Math.cos(angle)*15,y:p.y-Math.min(p.h-4,18)+Math.sin(angle)*8};
  for(const delta of spread?[-C.spreadAngle,0,C.spreadAngle]:[0])bullet(g,{...muzzle,vx:Math.cos(angle+delta)*C.shotSpeed,vy:Math.sin(angle+delta)*C.shotSpeed,side:'player',volley,life:C.shotLife,r:2});
  event(g,spread?'spread-shot':'shot',muzzle.x,muzzle.y);
}
function visible(g,e){return e.x>=g.camera.x+4&&e.x+e.w<=g.camera.x+C.width-4&&e.y>=g.camera.y+8&&e.y+e.h<=g.camera.y+C.height-4;}
function lineClear(g,x,y,tx,ty){return ![...colliders(g),...WORLD.layers.OneWay].some(r=>rayRect(x,y,tx,ty,r)!==null);}
function robotShot(g,e){
  const cfg=ENEMY[e.type],dir=e.dir||-1,origin={x:e.x+e.w/2+dir*(e.w/2+2),y:e.y+e.h-22};
  if(e.type==='skimmer')origin.y=e.y+8;
  if(e.type==='heavy')origin.y=e.y+e.h-(e.phase%2?8:24);
  let angle=e.angle??(dir<0?Math.PI:0),speed=cfg.speed;
  if(e.type==='lobber'){
    const flight=.95;bullet(g,{...origin,vx:(e.targetX-origin.x)/flight,vy:(e.targetY-origin.y-.5*360*flight*flight)/flight,gravity:360,side:'enemy',r:5,life:2.5});
  }else bullet(g,{...origin,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,side:'enemy'});
  event(g,'enemy-shot',origin.x,origin.y);
}
function robots(g,dt){
  for(const e of g.enemies){if(e.hp<=0||e.type==='boss')continue;e.hit=Math.max(0,e.hit-dt);
    if(!visible(g,e)){e.state='idle';e.clock=0;e.burst=0;continue;}
    const cfg=ENEMY[e.type];e.clock-=dt;
    if(e.state==='idle'){
      if(e.type==='drone'){e.x=e.homeX+Math.sin(g.t*.8+e.homeX)*38;e.y=e.homeY+Math.sin(g.t*1.3)*12;}
      else if(e.patrol_radius)e.x=e.homeX+Math.sin(g.t*.6+e.homeX)*e.patrol_radius;
      const dir=Math.sign(g.player.x-(e.x+e.w/2))||-1,sy=e.y+e.h-(e.type==='skimmer'?12:22),sx=e.x+e.w/2+dir*(e.w/2+2);
      if(e.clock<=0&&lineClear(g,sx,sy,g.player.x,g.player.y-g.player.h/2)){
        e.state='warning';e.clock=cfg.warn;e.dir=dir;e.targetX=g.player.x;e.targetY=g.player.y-8;
        e.angle=e.type==='turret'?(dir<0?Math.PI*.75:Math.PI*.25):e.type==='drone'?Math.atan2(e.targetY-sy,e.targetX-sx):dir<0?Math.PI:0;
        event(g,'robot-warning',e.x,e.y);
      }
    }else if(e.state==='warning'&&e.clock<=0){e.state='attack';e.burst=cfg.burst;e.burstClock=0;}
    if(e.state==='attack'){
      e.burstClock-=dt;if(e.burst>0&&e.burstClock<=0){robotShot(g,e);e.burst--;e.burstClock=.18;}
      if(!e.burst){e.state='recover';e.clock=cfg.rest;e.phase++;}
    }else if(e.state==='recover'&&e.clock<=0){e.state='idle';e.clock=.2;}
    if(overlap(body(g.player),e))damage(g,'contact');
  }
}
function boss(g,dt){
  const e=g.enemies.find(e=>e.type==='boss');if(!g.bossActive||e.hp<=0)return;e.hit=Math.max(0,e.hit-dt);e.clock-=dt;
  if(e.state==='idle'){e.state='arrival';e.clock=1.2;}
  else if((e.state==='arrival'||e.state==='recover')&&e.clock<=0&&!g.bullets.some(b=>b.owner==='boss'&&b.life>0)){
    e.enraged=e.hp<=e.maxHP/2;
    e.attack=BOSS_ATTACKS[e.phase%BOSS_ATTACKS.length];e.state='warning';e.clock={high:.9,low:1,mortar:1.1,overhead:1.1}[e.attack];
    e.strikes=e.enraged?2:1;
    e.targetX=clamp(g.player.x,ARENA.targetMin,ARENA.targetMax);
    if(e.attack==='mortar'){const n=e.enraged?4:3,gap=e.enraged?64:80,first=clamp(e.targetX-gap*(n-1)/2,ARENA.targetMin,ARENA.targetMax-gap*(n-1));e.mortarTargets=Array.from({length:n},(_,i)=>first+i*gap);}else e.mortarTargets=null;
    event(g,'boss-'+e.attack,e.x,e.y);
    message(g,{high:'HIGH VOLLEY — duck',low:e.enraged?'DOUBLE SWEEP — jump twice':'FLOOR SWEEP — jump',mortar:'MORTAR BARRAGE — leave the marked spots',overhead:e.enraged?'TWIN STRIKES — keep moving':'OVERHEAD STRIKE — move'}[e.attack]);
  }else if(e.state==='warning'&&e.clock<=0){e.state='attack';e.clock=e.attack==='high'?.7:e.attack==='low'&&e.enraged?1.1:e.attack==='overhead'?.85:.2;e.burst=e.attack==='high'?(e.enraged?4:3):e.attack==='low'&&e.enraged?2:e.attack==='mortar'?e.mortarTargets.length:1;e.burstClock=0;if(e.attack==='mortar')e.clock=.2;}
  if(e.state==='attack'){
    e.burstClock-=dt;if(e.burst>0&&e.burstClock<=0){
      if(e.attack==='high')bullet(g,{x:e.x-6,y:312,vx:-BOSS_SHOT.high,vy:0,side:'enemy',owner:'boss',r:4,life:3});
      else if(e.attack==='low')bullet(g,{x:e.x-6,y:329,vx:-(e.enraged?BOSS_SHOT.lowEnraged:BOSS_SHOT.low),vy:0,side:'enemy',owner:'boss',r:6,life:4});
      else if(e.attack==='mortar'){const tx=e.mortarTargets[e.mortarTargets.length-e.burst],o={x:e.x+40,y:e.y+12},t=BOSS_SHOT.mortarFlight;
        bullet(g,{...o,vx:(tx-o.x)/t,vy:(336-o.y-.5*BOSS_SHOT.mortarGravity*t*t)/t,gravity:BOSS_SHOT.mortarGravity,side:'enemy',owner:'boss',kind:'mortar',r:8,life:3});}
      else bullet(g,{x:e.targetX,y:90,vx:0,vy:BOSS_SHOT.overhead,side:'enemy',owner:'boss',r:18,life:2});
      event(g,e.attack==='mortar'?'boss-mortar-fire':'boss-fire',e.x,e.y);e.burst--;e.burstClock=e.attack==='low'?.95:e.attack==='mortar'?.24:.18;
    }
    if(e.clock<=0&&!e.burst){
      if(e.attack==='overhead'&&e.strikes>1){e.strikes--;e.state='warning';e.clock=1.1;e.targetX=clamp(g.player.x,ARENA.targetMin,ARENA.targetMax);event(g,'boss-overhead');message(g,'SECOND STRIKE — move again');}
      else{e.state='recover';e.clock=e.attack==='high'?1.2:e.attack==='mortar'?1.3:1.5;e.phase++;}
    }
  }
  if(overlap(body(g.player),e))damage(g,'boss-contact');
}
function hazards(g,dt){
  for(const h of g.hazards){
    if(!visible(g,h)){h.clock=0;h.state='idle';h.armed=false;continue;}
    const a=h.period_seconds-h.active_seconds,w=a-h.warning_seconds,old=h.state;
    const distance=Math.max(h.x-g.player.x,g.player.x-(h.x+h.w),0);
    if(!h.armed){if(distance>(h.type==='water_pulse'?140:170))continue;h.armed=true;h.clock=w;}
    else h.clock=(h.clock+dt)%h.period_seconds;
    h.state=h.clock>=a?'active':h.clock>=w?'warning':'idle';
    if(old!==h.state&&h.state!=='idle')event(g,h.state==='warning'?'hazard-warning':'hazard-impact',h.x,h.y);
    h.hitbox=h.type==='water_pulse'?{x:h.x,y:h.y,w:h.w,h:h.h}:{x:h.x,y:h.y+Math.min(1,(h.clock-a)/.22)*(h.h-24),w:h.w,h:24};
    if(h.state==='active'&&overlap(body(g.player),h.hitbox))damage(g,'hazard');
  }
}
function impact(g,x,y,color='#ffcf65'){g.effects.push({x,y,color,life:.25,total:.25});}
function hitEnemy(g,e,b){
  if(g.status!=='active')return;
  if(e.volleyHits.includes(b.volley))return;e.volleyHits.push(b.volley);if(e.volleyHits.length>20)e.volleyHits.shift();
  e.hp=Math.max(0,e.hp-1);e.hit=.12;event(g,'robot-hit',e.x,e.y);
  if(!e.hp){g.kills++;event(g,e.type==='boss'?'boss-destroyed':'robot-destroyed',e.x,e.y);g.effects.push({x:e.x+e.w/2,y:e.y+e.h/2,color:e.type==='boss'?'#d5f044':'#ff9d54',life:.65,total:.65});
    if(GUARD_GATES.some(gate=>gate.enemy===e.id))message(g,'Guard disabled — checkpoint ahead');
    if(e.type==='boss'){g.status='terminal';g.outcome='success';g.bullets=[];message(g,'Security robot disabled');}
  }
}
function bullets(g,dt){
  const terrain=[...colliders(g),...WORLD.layers.OneWay];
  for(const b of g.bullets){
    b.life-=dt;const nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;b.vy+=b.gravity*dt;
    let first=2,target=null;
    for(const r of terrain){const at=rayRect(b.x,b.y,nx,ny,r,b.r);if(at!==null&&at<first){first=at;target='wall';}}
    const targets=b.side==='player'?g.enemies.filter(e=>e.hp>0&&(e.type!=='boss'||g.bossActive)):[body(g.player)];
    for(const r of targets){const at=rayRect(b.x,b.y,nx,ny,r,b.r);if(at!==null&&at<first){first=at;target=r;}}
    if(target){b.life=0;impact(g,b.x+(nx-b.x)*first,b.y+(ny-b.y)*first,b.side==='player'?'#ffe39a':'#fc7fb2');
      if(target!=='wall'){if(b.side==='player')hitEnemy(g,target,b);else damage(g,'projectile');}}
    b.x=nx;b.y=ny;
  }
  g.bullets=g.bullets.filter(b=>b.life>0&&b.x>=0&&b.x<=WORLD.world.width&&b.y>=0&&b.y<=WORLD.world.height);
}
function checkpoints(g){
  for(const cp of WORLD.layers.Checkpoints){
    if(sectionRank[cp.id]<=sectionRank[g.checkpoint]||g.player.x<cp.spawn_x)continue;
    if(cp.requires_enemy_defeated&&g.enemies.find(e=>e.id===cp.requires_enemy_defeated)?.hp>0)continue;
    g.checkpoint=cp.id;message(g,{MID:'Midpoint checkpoint secured',MID2:'Second loop checkpoint secured',BOSS:'Boss checkpoint secured'}[cp.id]);event(g,'checkpoint');
  }
  if(g.player.x>ARENA.triggerX&&!g.bossActive){g.bossActive=true;g.bossGate=true;g.bullets=g.bullets.filter(b=>b.side==='player');event(g,'boss-entry');}
}
export function step(g,input={},dt=C.step){
  if(g.status!=='active')return;g.events=[];g.t+=dt;g.activeTime+=dt;
  movePlayer(g,input,dt);if(g.status!=='active')return;
  checkpoints(g);shoot(g,dt,input.fire!==false);robots(g,dt);if(g.status!=='active')return;
  boss(g,dt);hazards(g,dt);if(g.status!=='active')return;bullets(g,dt);
  for(const p of g.pickups)if(!p.collected&&g.player.hp<g.player.maxHP&&overlap(body(g.player),p)){
    p.collected=true;g.player.hp=Math.min(g.player.maxHP,g.player.hp+p.heal);event(g,'repair',p.x,p.y);message(g,'Repair cache: +1 health');}
  for(const e of g.effects)e.life-=dt;g.effects=g.effects.filter(e=>e.life>0).slice(-C.maxEffects);
  const tx=clamp(g.player.x-230,0,WORLD.world.width-C.width),ty=clamp(g.player.y-220,0,WORLD.world.height-C.height);
  g.camera.x+=(tx-g.camera.x)*Math.min(1,dt*8);g.camera.y+=(ty-g.camera.y)*Math.min(1,dt*9);
  if(g.bossActive)g.camera.x=Math.max(ARENA.cameraMin,g.camera.x);
}
export function clearInput(g){g.prev={};g.lastDown=-10;g.player.jumpBuffer=0;}
