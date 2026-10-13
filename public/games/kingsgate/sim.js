// Kingsgate battle simulation. Pure and deterministic: no randomness, no DOM.
import {TOWERS,ENEMIES,WAVES,SPAWN_GAP,FIRST_WAVE_AT,WAVE_SPACING,CLEAR_DELAY,GOLD,GATE_HP,REINFORCED_BONUS,TILE,ACTIVE_LIMIT,WAVE_COUNT,PATH_LENGTH,SPOTS,pointAt} from './config.js';

export function allowedTowers(goldMode,loadout=[]){
 if(goldMode==='arcade')return ['archer','ballista','mage','catapult'];
 return ['archer','ballista',...(loadout.includes('mage-circle')?['mage']:[]),...(loadout.includes('siege-yard')?['catapult']:[])];
}
export function startingGold(goldMode,loadout=[]){const g=GOLD[goldMode]||GOLD.mathquest;return g.start+(loadout.includes('war-chest')?g.warChest:0);}
export function gateMax(loadout=[]){return GATE_HP+(loadout.includes('reinforced-gate')?REINFORCED_BONUS:0);}

export function newState({goldMode='mathquest',loadout=[],breaks,startWave=1,bonusGold=0}={}){
 const start=startingGold(goldMode,loadout)+bonusGold;
 const s={goldMode,breaks:breaks??(GOLD[goldMode]||GOLD.mathquest).mathBreaks,allowed:allowedTowers(goldMode,loadout),startGold:start,gold:start,gateMax:gateMax(loadout),
  t:0,mode:'running',reason:null,wave:startWave-1,cleared:startWave-1,clearedAt:0,spawning:null,nextWaveAt:startWave>1?4:FIRST_WAVE_AT,breakFor:null,breakDone:startWave-1,
  towers:[],enemies:[],boulders:[],serial:0,
  stats:{kills:0,leaks:0,spawned:0,bounty:0,mathGold:0,spent:0,refund:0,shots:0,answered:0,correct:0},
  fx:[],events:[]};
 s.gateHp=s.gateMax;
 return s;
}

const spot=id=>SPOTS.find(x=>x.id===id);
export function towerAt(s,spotId){return s.towers.find(t=>t.spot===spotId);}
export function invested(t){const def=TOWERS[t.type];return def.cost+(t.tier?def.upgrade:0);}
export function place(s,spotId,type){
 if(s.mode==='result')return 'The defense is over.';
 const def=TOWERS[type];if(!def||!s.allowed.includes(type))return 'That tower is not available.';
 if(!spot(spotId))return 'Choose a build spot.';if(towerAt(s,spotId))return 'That spot is taken.';
 if(s.gold<def.cost)return 'Not enough gold.';
 s.gold-=def.cost;s.stats.spent+=def.cost;s.towers.push({spot:spotId,type,tier:0,cd:0});s.events.push({type:'build'});return null;
}
export function upgrade(s,spotId){
 const t=towerAt(s,spotId);if(!t)return 'No tower there.';if(t.tier)return 'Already upgraded.';if(s.mode==='result')return 'The defense is over.';
 const cost=TOWERS[t.type].upgrade;if(s.gold<cost)return 'Not enough gold.';
 s.gold-=cost;s.stats.spent+=cost;t.tier=1;s.events.push({type:'upgrade'});return null;
}
export function sell(s,spotId){
 const t=towerAt(s,spotId);if(!t)return 'No tower there.';if(s.mode==='result')return 'The defense is over.';
 const back=Math.floor(invested(t)/2);s.gold+=back;s.stats.refund+=back;s.towers=s.towers.filter(x=>x!==t);s.events.push({type:'sell'});return null;
}
// Arcade: the host reports how a between-wave question round went.
export function resolveBreak(s,{answered=0,correct=0,perCorrect=GOLD.arcade.perCorrect}={}){
 if(s.mode!=='break')return 'No question round is open.';
 const earned=correct*perCorrect;s.gold+=earned;s.stats.mathGold+=earned;s.stats.answered+=answered;s.stats.correct+=correct;
 s.breakDone=s.breakFor;s.mode='running';s.breakFor=null;s.events.push({type:'gold',amount:earned});return null;
}
// Skip a question round without questions (DEV mode).
export function skipBreak(s){if(s.mode!=='break')return;s.breakDone=s.breakFor;s.mode='running';s.breakFor=null;}

function fx(s,f){s.fx.push({...f,age:0});if(s.fx.length>60)s.fx.splice(0,s.fx.length-60);}
function enemyPos(e){return pointAt(e.d);}
function hit(s,e,dmg){
 const def=ENEMIES[e.type],dealt=Math.max(1,dmg-def.armor);e.hp-=dealt;e.flash=.12;
 if(e.hp<=0&&!e.dead){e.dead=true;s.stats.kills++;s.stats.bounty+=def.bounty;s.gold+=def.bounty;const p=enemyPos(e);fx(s,{k:'death',x:p.x,y:p.y,type:e.type,life:.5});if(def.bounty)fx(s,{k:'coin',x:p.x,y:p.y-16,n:def.bounty,life:.9});s.events.push({type:e.type==='ram'?'boss_down':'kill'});}
}
function startWave(s){
 s.wave++;s.spawning={w:s.wave-1,g:0,i:0,next:s.t};s.events.push({type:'wave',wave:s.wave});
 if(s.wave===WAVE_COUNT)s.events.push({type:'boss'});
}
function spawn(s){
 const sp=s.spawning;if(!sp)return;
 while(sp&&s.t>=sp.next){
  const [type,count]=WAVES[sp.w][sp.g];
  s.enemies.push({id:++s.serial,type,w:sp.w,hp:ENEMIES[type].hp,d:0,slowUntil:0});s.stats.spawned++;
  sp.next+=SPAWN_GAP[type];sp.i++;
  if(sp.i>=count){sp.g++;sp.i=0;if(sp.g>=WAVES[sp.w].length){s.spawning=null;return;}}
 }
}
function waveDone(s,w){return !(s.spawning&&s.spawning.w===w)&&!s.enemies.some(e=>e.w===w);}
function inRange(s,tw,def,minTiles=0){
 const p=spot(tw.spot),r=def.range*TILE,min=minTiles*TILE;let best=null;
 for(const e of s.enemies){const q=enemyPos(e),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<=r&&d>=min&&(!best||e.d>best.d))best=e;}
 return best;
}
function fire(s,tw){
 const def=TOWERS[tw.type],p=spot(tw.spot),dmg=def.damage[tw.tier];
 const target=inRange(s,tw,def,def.minRange||0);if(!target)return false;
 const q=enemyPos(target);s.stats.shots++;
 if(tw.type==='archer'){hit(s,target,dmg);fx(s,{k:'arrow',x:p.x,y:p.y-26,x2:q.x,y2:q.y-8,life:.18});s.events.push({type:'bow'});}
 else if(tw.type==='ballista'){
  const len=def.range*TILE,dx=q.x-p.x,dy=q.y-p.y,n=Math.hypot(dx,dy)||1,ux=dx/n,uy=dy/n,ex=p.x+ux*len,ey=p.y-20+uy*len;
  for(const e of [...s.enemies]){const m=enemyPos(e),k=Math.max(0,Math.min(len,(m.x-p.x)*ux+(m.y-p.y)*uy)),px=p.x+ux*k,py=p.y+uy*k;if(Math.hypot(m.x-px,m.y-py)<=12)hit(s,e,dmg);}
  fx(s,{k:'bolt',x:p.x,y:p.y-20,x2:ex,y2:ey,life:.25});s.events.push({type:'bolt'});
 }
 else if(tw.type==='mage'){
  for(const e of [...s.enemies]){const m=enemyPos(e);if(Math.hypot(m.x-q.x,m.y-q.y)<=def.splash*TILE){hit(s,e,dmg);e.slowUntil=s.t+def.slowFor;}}
  fx(s,{k:'frost',x:q.x,y:q.y,sx:p.x,sy:p.y-34,r:def.splash*TILE,life:.4});s.events.push({type:'frost'});
 }
 else if(tw.type==='catapult'){
  const lead=Math.min(PATH_LENGTH,target.d+ENEMIES[target.type].speed*TILE*(target.slowUntil>s.t?.6:1)*def.flight),aim=pointAt(lead);
  s.boulders.push({x:p.x-24,y:p.y-34,tx:aim.x,ty:aim.y,age:0,dmg,r:def.splash*TILE});s.events.push({type:'throw'});
 }
 for(const e of s.enemies)if(e.dead)e.hp=0;s.enemies=s.enemies.filter(e=>!e.dead);
 return true;
}
export function tick(s,dt){
 s.events=[];if(s.mode!=='running')return;
 s.t=Math.min(ACTIVE_LIMIT,s.t+dt);
 for(const f of s.fx)f.age+=dt;s.fx=s.fx.filter(f=>f.age<f.life);
 // Waves
 if(s.wave<WAVE_COUNT&&!s.spawning){
  const scheduled=s.wave===0?s.nextWaveAt:FIRST_WAVE_AT+s.wave*WAVE_SPACING;
  const early=s.wave>0&&s.cleared===s.wave&&s.t>=Math.max(s.clearedAt+CLEAR_DELAY,s.nextWaveAt);
  if(s.t>=scheduled||early){
   // Arcade: a question round comes between waves, before waves 2–12 begin. The clock stops during it.
   if(s.breaks&&s.wave>=1&&s.breakDone<s.wave){s.mode='break';s.breakFor=s.wave;s.events.push({type:'break',wave:s.wave});return;}
   startWave(s);
  }
 }
 spawn(s);
 // Movement, healing, leaks
 for(const e of s.enemies){
  const def=ENEMIES[e.type];e.d+=def.speed*TILE*(e.slowUntil>s.t?.6:1)*dt;if(e.flash)e.flash=Math.max(0,e.flash-dt);
  if(def.heal){const p=enemyPos(e);for(const o of s.enemies){if(o===e)continue;const q=enemyPos(o);if(Math.hypot(q.x-p.x,q.y-p.y)<=def.healRange*TILE)o.hp=Math.min(ENEMIES[o.type].hp,o.hp+def.heal*dt);}}
  if(e.d>=PATH_LENGTH){e.leaked=true;s.gateHp=Math.max(0,s.gateHp-def.gate);s.stats.leaks++;fx(s,{k:'gatehit',x:612,y:200,life:.4});s.events.push({type:'gate'});}
 }
 s.enemies=s.enemies.filter(e=>!e.leaked);
 // Towers
 for(const tw of s.towers){tw.cd=Math.max(0,tw.cd-dt);if(tw.cd===0&&fire(s,tw))tw.cd=1/TOWERS[tw.type].rate;}
 // Boulders
 for(const b of s.boulders){b.age+=dt;if(b.age>=TOWERS.catapult.flight){for(const e of [...s.enemies]){const m=enemyPos(e);if(Math.hypot(m.x-b.tx,m.y-b.ty)<=b.r)hit(s,e,b.dmg);}s.enemies=s.enemies.filter(e=>!e.dead);fx(s,{k:'blast',x:b.tx,y:b.ty,r:b.r,life:.4});s.events.push({type:'boom'});b.done=true;}}
 s.boulders=s.boulders.filter(b=>!b.done);
 // Wave bookkeeping
 while(s.cleared<s.wave&&waveDone(s,s.cleared)){s.cleared++;s.clearedAt=s.t;}
 // Outcome
 if(s.gateHp<=0){s.mode='result';s.reason='breached';s.events.push({type:'fail'});}
 else if(s.cleared>=WAVE_COUNT){s.mode='result';s.reason='held';s.events.push({type:'win'});}
 else if(s.t>=ACTIVE_LIMIT){s.mode='result';s.reason='time';s.events.push({type:'win'});}
}
export const outcomeOf=s=>s.mode!=='result'?null:s.reason==='breached'?'lost':'success';
