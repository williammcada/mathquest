import {T,VERSION,UPGRADES,BONUS_SECONDS,OUTCOMES} from './tuning.js';
import {LEVEL,OPPORTUNITIES,CHECKPOINTS} from './level.js';
const clone=value=>structuredClone(value);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const emit=(s,type,detail={})=>s.events.push({type,...detail});
const ground=e=>e.kind==='ship'||e.kind==='shore';
export function normalizeInput(input={}) {let x=Number(!!input.right)-Number(!!input.left),y=Number(!!input.down)-Number(!!input.up);const m=Math.hypot(x,y);return m?{x:x/m,y:y/m}:{x:0,y:0};}
export function configFor(input={}) {
  const loadout=[...new Set(input.loadout||[])].sort();
  if(loadout.some(x=>!UPGRADES.some(u=>u.id===x)))throw Error('Unknown aircraft upgrade.');
  return {...VERSION,runId:input.runId||'practice',configRevision:input.configRevision||'aerial-practice/2',seed:input.seed??1942,
    mode:input.mode||'action',loadout,difficulty:'standard',phaseId:input.phaseId||'practice'};
}
export function createRun(config={},saved) {
  const c=configFor(config);if(saved)return restore(c,saved);
  if(!['action','assisted'].includes(c.mode)||!Number.isInteger(c.seed))throw Error('Invalid aircraft configuration.');
  const maxHealth=c.loadout.includes('armor')?T.armor:T.health;
  return {config:c,tick:0,levelTick:0,checkpoint:0,attempt:0,lives:T.lives,maxHealth,health:maxHealth,
    mode:c.mode,player:{x:320,y:300,dx:0,dy:0,fire:0,protection:120},bonus:null,
    enemies:[],friendly:[],hostile:[],pickups:[],effects:[],pending:[],boss:null,cursor:0,nextId:1,
    collected:[],volleyHits:[],rng:c.seed>>>0,assistedStep:0,outcome:null,message:'Move with the D-pad. Your aircraft fires automatically.',messageTick:0,
    counters:{deaths:0,shots:0,hits:0,damage:0,pickups:0,missed:0,guns:0,maxProgress:0,modeSwitchTick:null,capDeferrals:0},events:[]};
}
// U-13 DEV playtest: begin at a checkpoint. Active time starts at that checkpoint, as on a retry.
export function startAtCheckpoint(s,seconds){if(!CHECKPOINTS.includes(seconds))throw Error('Unknown checkpoint');if(!seconds)return s;s.tick=s.levelTick=seconds*60;s.checkpoint=seconds;s.counters.maxProgress=s.levelTick;s.cursor=LEVEL.findIndex(e=>e.tick>=s.levelTick);if(s.cursor<0)s.cursor=LEVEL.length;return s;}
export function snapshot(s){const v=clone(s);v.events=[];v.effects=[];return v;}
function check(ok,message){if(!ok)throw Error(`Recovery unavailable: ${message}`);}
const bounded=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
export function restore(config,saved) {
  const c=configFor(config),s=clone(saved);
  check(s&&typeof s==='object','missing snapshot');
  check(JSON.stringify(s.config)===JSON.stringify(c),'this save belongs to a different run or revision');
  check(Number.isInteger(s.tick)&&bounded(s.tick,0,T.limit),'active time');
  check(Number.isInteger(s.levelTick)&&bounded(s.levelTick,0,s.tick),'level progress');
  check(CHECKPOINTS.includes(s.checkpoint)&&s.levelTick>=s.checkpoint*60,'checkpoint');
  check(Number.isInteger(s.attempt)&&bounded(s.attempt,0,3)&&s.lives===3-s.attempt,'life count');
  check(s.maxHealth===(c.loadout.includes('armor')?150:100)&&bounded(s.health,0,s.maxHealth),'health');
  check(['action','assisted'].includes(s.mode)&&(!s.outcome||OUTCOMES.includes(s.outcome)),'mode/result');
  check(s.mode==='assisted'||s.lives>0||s.outcome==='defeat','exhausted lives');
  check(bounded(s.player?.x,8,632)&&bounded(s.player?.y,12,348)&&bounded(s.player?.protection,0,120)&&bounded(s.player?.fire,-1,8),'aircraft position/cooldown');
  check(bounded(s.player.dx,-1,1)&&bounded(s.player.dy,-1,1),'movement');
  check(Array.isArray(s.collected)&&new Set(s.collected).size===s.collected.length&&s.collected.every(id=>OPPORTUNITIES.includes(id)),'supplies');
  check(Array.isArray(s.volleyHits)&&s.volleyHits.length<=300&&s.volleyHits.every(h=>typeof h.key==='string'&&h.key.length<150&&bounded(h.tick,0,s.tick)),'volley history');
  check(s.bonus===null||(Object.hasOwn(BONUS_SECONDS,s.bonus?.kind)&&bounded(s.bonus.ticks,0,BONUS_SECONDS[s.bonus.kind]*60)),'temporary bonus');
  for(const [key,cap] of Object.entries({enemies:40,friendly:96,hostile:96,pickups:6,pending:120,effects:40}))check(Array.isArray(s[key])&&s[key].length<=cap,key);
  const allIds=new Set();
  for(const e of [...s.enemies,...s.friendly,...s.hostile,...s.pickups]){check(typeof e.id==='string'&&e.id.length<120&&!allIds.has(e.id),'entity IDs');allIds.add(e.id);check(bounded(e.x,-700,1300)&&bounded(e.y,-300,700),'entity positions');}
  for(const e of s.enemies)check(T.enemies[e.kind]&&bounded(e.hp,0,T.enemies[e.kind].hp)&&bounded(e.age,0,T.limit)&&bounded(e.nextAttack,0,T.limit)&&bounded(e.baseX,0,640)&&bounded(e.w,1,100)&&bounded(e.h,1,100)&&bounded(e.phase,-10,10),'enemy data');
  for(const b of [...s.friendly,...s.hostile])check(bounded(b.vx,-500,500)&&bounded(b.vy,-500,500)&&bounded(b.damage,0,20)&&bounded(b.radius,1,8),'projectile');
  for(const p of s.pickups)check(OPPORTUNITIES.includes(p.opportunity)&&['repair',...Object.keys(BONUS_SECONDS)].includes(p.kind),'pickup data');
  for(const p of s.pending)check(bounded(p.due,0,T.limit+240)&&typeof p.owner==='string'&&Array.isArray(p.shots)&&p.shots.length<=7&&p.shots.every(b=>bounded(b.angle,-10,10)&&bounded(b.speed,0,160)&&[10,20].includes(b.damage)),'pending attack');
  check(Number.isInteger(s.cursor)&&bounded(s.cursor,0,LEVEL.length)&&Number.isInteger(s.nextId)&&bounded(s.nextId,1,100000),'event cursor');
  check(Number.isInteger(s.rng)&&bounded(s.rng,0,4294967295)&&Number.isInteger(s.assistedStep)&&bounded(s.assistedStep,0,3),'random/accessibility state');
  check(s.counters&&s.counters.deaths===s.attempt&&s.counters.pickups===s.collected.length,'evidence counters');
  for(const [key,n] of Object.entries(s.counters))check((key==='modeSwitchTick'&&n===null)||bounded(n,0,1000000),'evidence bounds');
  if(s.boss){const b=s.boss;check(['entry','guns','transition','core','destroyed'].includes(b.phase)&&bounded(b.x,285,355)&&bounded(b.y,-80,88)&&bounded(b.age,0,T.limit)&&bounded(b.core,0,T.boss.coreHP)&&Array.isArray(b.guns)&&b.guns.length===2&&b.guns.every(h=>bounded(h,0,T.boss.gunHP))&&bounded(b.nextLeft,0,T.limit+240)&&bounded(b.nextRight,0,T.limit+240)&&bounded(b.nextCore,0,T.limit+240)&&bounded(b.phaseTick,0,T.limit)&&bounded(b.quietUntil,0,T.limit+180),'boss');}
  s.events=[];s.effects=[];return s;
}
function message(s,text){s.message=text;s.messageTick=s.tick;}
function effect(s,x,y,kind='explosion'){if(s.effects.length>=T.cap.effects)s.effects.shift();s.effects.push({x,y,kind,age:0});}
function bullet(s,side,x,y,angle,speed,damage,volley) {
  const a=s[side],cap=T.cap[side];if(a.length>=cap){s.counters.capDeferrals++;return false;}
  a.push({id:`${side}-${s.nextId++}`,x,y,vx:Math.sin(angle)*speed,vy:Math.cos(angle)*speed,damage,radius:side==='friendly'?2:damage===20?5:3,volley});return true;
}
function schedule(s,owner,delay,angles,speed,damage){s.pending.push({owner,due:s.tick+delay,shots:angles.map(angle=>({angle,speed,damage}))});}
function fan(count,span,center=0){return Array.from({length:count},(_,i)=>center+(i/(count-1)-.5)*span);}
function aimed(from,to){return Math.atan2(to.x-from.x,to.y-from.y);}
function spawn(s,event) {
  if(event.escort&&s.boss)s.boss.quietUntil=s.tick+75;
  event.xs.forEach((x,i)=>{
    const def=T.enemies[event.kind],surface=['ship','shore'].includes(event.kind);
    if(s.enemies.filter(e=>ground(e)===surface).length>=(surface?T.cap.ground:T.cap.air))throw Error('Authored population limit exceeded');
    s.enemies.push({id:`${event.id}-${i}-${s.attempt}`,kind:event.kind,x,baseX:x,y:-40-(event.shape==='v'?Math.abs(i-1)*25:event.shape==='stagger'?i*22:0),
      w:def.w,h:def.h,hp:def.hp,age:0,nextAttack:90+i*18,phase:i*Math.PI,pickup:event.pickup||null,opportunity:event.opportunity||null,escort:!!event.escort});
  });
  if(event.opportunity&&!s.collected.includes(event.opportunity)){message(s,`${event.pickup==='repair'?'Repair':event.pickup==='rapid'?'Rapid fire':event.pickup==='wingman'?'Wingman':'Spread shot'} carrier approaching`);emit(s,'carrier');}
}
function retire(s,includeSupplies=false){
  for(const e of s.enemies.filter(e=>includeSupplies||e.kind!=='supply'))effect(s,e.x,e.y,'retreat');
  s.enemies=s.enemies.filter(e=>!includeSupplies&&e.kind==='supply');s.hostile=[];s.pending=[];
}
function beginBoss(s){
  retire(s,true);s.boss={x:320,y:-65,age:0,phase:'entry',phaseTick:s.tick,core:T.boss.coreHP,guns:[T.boss.gunHP,T.boss.gunHP],nextLeft:s.tick+159,nextRight:s.tick+267,nextCore:s.tick+120,quietUntil:0};
  message(s,'Boss: destroy the two outer wing guns first.');emit(s,'boss');
}
function events(s){
  while(s.cursor<LEVEL.length&&LEVEL[s.cursor].tick<=s.levelTick){const e=LEVEL[s.cursor++];
    if(e.checkpoint){s.checkpoint=e.checkpoint;emit(s,'checkpoint');message(s,e.kind==='boss'?'Boss checkpoint secured':'Midpoint checkpoint secured');}
    if(e.kind==='checkpoint')retire(s);
    else if(e.kind==='boss')beginBoss(s);
    else if(e.kind==='warning'){retire(s);message(s,'Large aircraft approaching — clear the outer gun lanes');emit(s,'warning');}
    else if(e.xs)spawn(s,e);
  }
}
function shoot(s){
  const p=s.player;p.fire-=1;if(p.fire>0)return;
  p.fire+=s.bonus?.kind==='rapid'?T.rapidPeriod:T.shotPeriod;
  const damage=T.damage*(s.config.loadout.includes('weapons')?1.5:1),volley=`v-${s.nextId++}`;
  if(s.friendly.length+4>T.cap.friendly){s.counters.capDeferrals++;return;}
  bullet(s,'friendly',p.x,p.y-19,Math.PI,T.shotSpeed,damage,volley);
  if(s.bonus?.kind==='spread')for(const angle of [-15,15])bullet(s,'friendly',p.x,p.y-19,Math.PI+angle*Math.PI/180,T.shotSpeed,damage/2,volley);
  if(s.bonus?.kind==='wingman')bullet(s,'friendly',clamp(p.x-35,12,628),p.y-6,Math.PI,T.shotSpeed,damage/2,`${volley}-wing`);
  s.counters.shots++;emit(s,s.bonus?.kind==='rapid'?'rapid':damage>10?'upgraded':'shot');
}
function updateEnemies(s){
  for(const e of s.enemies){e.age++;e.y+=T.enemies[e.kind].speed/60;
    if(e.kind==='interceptor')e.x=e.baseX+Math.sin(e.age/45+e.phase)*55;
    if(e.age<45||e.y<e.h/2||e.y>330)continue;
    if(e.age>=e.nextAttack){
      const heavy=e.kind==='bomber',aim=e.kind==='interceptor'||ground(e),delay=heavy||aim?39:0;
      e.nextAttack=e.age+T.enemies[e.kind].period;
      e.warningUntil=s.tick+delay;
      const angle=aim?aimed(e,s.player):0;
      if(heavy)schedule(s,e.id,delay,fan(5,64*Math.PI/180),T.shell.heavy,20);
      else if(ground(e))for(const d of [0,12,24])schedule(s,e.id,delay+d,[angle],T.shell.ground,10);
      else if(e.kind==='interceptor')schedule(s,e.id,delay,[angle],T.shell.aimed,10);
      else for(const d of [0,18])schedule(s,e.id,d,[0],T.shell.light,10);
    }
  }
  s.enemies=s.enemies.filter(e=>{if(e.y<410)return true;if(e.opportunity&&!s.collected.includes(e.opportunity))s.counters.missed++;return false;});
}
function updateBoss(s){
  const b=s.boss;if(!b)return;b.age++;b.x=320+Math.sin(b.age/180)*35;
  if(b.phase==='entry'){b.y=-65+153*Math.min(1,b.age/120);if(b.age>=120){b.phase='guns';b.phaseTick=s.tick;}return;}
  if(b.phase==='guns'&&b.guns.every(h=>h<=0)){b.phase='transition';b.phaseTick=s.tick;s.hostile=[];s.pending=s.pending.filter(p=>!p.owner.startsWith('boss'));emit(s,'expose');message(s,'Armor broken — target the exposed center');return;}
  if(b.phase==='transition'&&s.tick-b.phaseTick>=60){b.phase='core';b.nextCore=s.tick+39;}
  if(s.tick<b.quietUntil)return;
  if(b.phase==='guns')for(let i=0;i<2;i++){const key=i?'nextRight':'nextLeft';if(s.tick>=b[key]){b[key]+=T.boss.gunPeriod;if(b.guns[i]>0)schedule(s,`boss-${i}`,0,fan(5,72*Math.PI/180),T.shell.light,10);}}
  if(b.phase==='core'&&s.tick>=b.nextCore){b.nextCore=s.tick+T.boss.corePeriod;b.warningUntil=s.tick+39;for(let i=0;i<7;i++)schedule(s,'boss-core',39+i*11,[-.7+i*(1.4/6)],T.shell.heavy,20);}
}
function executeAttacks(s){
  const future=[];
  for(const p of s.pending){let e;if(p.owner.startsWith('boss')){const b=s.boss,index=p.owner==='boss-0'?0:1;if(!b||(p.owner==='boss-core'?b.phase!=='core':b.guns[index]<=0))continue;e={x:b.x+(p.owner==='boss-core'?0:index?180:-180),y:b.y+(p.owner==='boss-core'?51:12)};}
    else e=s.enemies.find(e=>e.id===p.owner);
    if(!e||e.y<0||e.y>360)continue;
    if(p.due>s.tick){future.push(p);continue;}
    if(s.hostile.length+p.shots.length>T.cap.hostile){s.counters.capDeferrals++;future.push({...p,due:s.tick+1});continue;}
    for(const b of p.shots)bullet(s,'hostile',e.x,e.y+8,b.angle,b.speed,b.damage);
    emit(s,p.shots[0]?.damage===20?'heavy':'enemy');
  }s.pending=future;
}
function inEllipse(a,b,rx,ry){return ((a.x-b.x)/rx)**2+((a.y-b.y)/ry)**2<=1;}
export function damagePlayer(s,amount){if(s.outcome||s.player.protection>0||s.mode!=='action')return false;s.health=Math.max(0,s.health-amount);s.player.protection=T.protection;s.counters.damage++;emit(s,'hurt');effect(s,s.player.x,s.player.y,'hit');return true;}
function enemyKilled(s,e){
  effect(s,e.x,e.y);emit(s,'explosion');
  if(e.opportunity&&!s.collected.includes(e.opportunity))s.pickups.push({id:`pickup-${e.opportunity}-${s.attempt}`,opportunity:e.opportunity,kind:e.pickup,x:clamp(e.x,24,616),y:clamp(e.y,24,316)});
}
function hits(s){
  const spent=new Set(),volleyHits=new Set(s.volleyHits.map(h=>h.key));
  const remember=key=>{volleyHits.add(key);s.volleyHits.push({key,tick:s.tick});};
  for(const bullet of s.friendly){
    for(const e of s.enemies){if(e.hp<=0||e.y<0)continue;if(inEllipse(bullet,e,e.w*.42+bullet.radius,e.h*.42+bullet.radius)){
      spent.add(bullet.id);const key=`${bullet.volley}/${e.id}`;if(!volleyHits.has(key)){remember(key);e.hp=Math.max(0,e.hp-bullet.damage);s.counters.hits++;if(!e.hp)enemyKilled(s,e);}break;
    }}
    if(spent.has(bullet.id)||!s.boss||s.boss.phase==='entry')continue;
    const b=s.boss;
    for(let i=0;i<2;i++)if(b.guns[i]>0&&inEllipse(bullet,{x:b.x+(i?180:-180),y:b.y+5},17,22)){
      spent.add(bullet.id);const key=`${bullet.volley}/gun-${i}`;if(!volleyHits.has(key)){remember(key);b.guns[i]=Math.max(0,b.guns[i]-bullet.damage);s.counters.hits++;if(!b.guns[i]){s.counters.guns++;effect(s,bullet.x,bullet.y);emit(s,'explosion');}}break;
    }
    if(!spent.has(bullet.id)&&inEllipse(bullet,{x:b.x,y:b.y+32},25,32)){
      spent.add(bullet.id);if(b.phase==='core'){const key=`${bullet.volley}/core`;if(!volleyHits.has(key)){remember(key);b.core=Math.max(0,b.core-bullet.damage);s.counters.hits++;}}else effect(s,bullet.x,bullet.y,'shield');
    }
  }
  s.friendly=s.friendly.filter(b=>!spent.has(b.id));s.enemies=s.enemies.filter(e=>e.hp>0);
  s.hostile=s.hostile.filter(b=>{if(inEllipse(b,s.player,8+b.radius,12+b.radius)){damagePlayer(s,b.damage);return false;}return true;});
  for(const e of s.enemies.filter(e=>!ground(e)))if(inEllipse(s.player,e,e.w*.36+8,e.h*.36+12)){damagePlayer(s,20);s.player.y=clamp(e.y+e.h*.36+13,12,348);}
  if(s.boss&&s.boss.phase!=='entry'&&Math.abs(s.player.x-s.boss.x)<210&&Math.abs(s.player.y-s.boss.y)<45){damagePlayer(s,20);s.player.y=clamp(s.boss.y+58,12,348);}
}
export function collect(s,p){
  if(s.collected.includes(p.opportunity))return;
  s.collected.push(p.opportunity);s.counters.pickups++;
  if(p.kind==='repair'){message(s,s.health===s.maxHealth?'Hull full':'+25 hull health');s.health=Math.min(s.maxHealth,s.health+25);emit(s,'repair');}
  else{s.bonus={kind:p.kind,ticks:BONUS_SECONDS[p.kind]*60};message(s,`${p.kind==='rapid'?'Rapid fire':p.kind==='spread'?'Spread shot':'Wingman'} ready`);emit(s,'bonus');}
  emit(s,'pickup',{opportunity:p.opportunity});
}
export function closeRun(s,outcome){if(s.outcome)return false;if(!OUTCOMES.includes(outcome))throw Error('Unknown flight outcome');s.outcome=outcome;s.hostile=[];s.pending=[];s.friendly=[];s.enemies=[];emit(s,'complete',{outcome});return true;}
function respawn(s){
  s.lives--;s.attempt++;s.counters.deaths++;emit(s,'life_lost',{lives:s.lives});
  if(!s.lives){closeRun(s,'defeat');return;}
  s.levelTick=s.checkpoint*60;s.health=s.maxHealth;s.bonus=null;s.player={x:320,y:300,dx:0,dy:0,fire:0,protection:120};
  s.enemies=[];s.hostile=[];s.friendly=[];s.pickups=[];s.pending=[];s.boss=null;s.effects=[];
  s.cursor=LEVEL.findIndex(e=>e.tick>=s.levelTick);if(s.cursor<0)s.cursor=LEVEL.length;
  events(s);message(s,`Aircraft replaced · ${s.lives} lives remain · active time is unchanged`);
}
export function resolveTerminal(s){const bossDead=s.boss?.core===0;if(s.health<=0)respawn(s);if(s.outcome)return;if(bossDead){if(s.boss)s.boss.phase='destroyed';closeRun(s,'success');}else if(s.tick>=T.limit)closeRun(s,'escape_lesser');}
export function enterAssisted(s){if(s.outcome)return false;if(s.mode==='assisted')return true;s.mode='assisted';s.counters.modeSwitchTick=s.tick;s.hostile=[];s.pending=[];s.friendly=[];emit(s,'assist');return true;}
export function chooseAssisted(s,choice){if(s.mode!=='assisted'||s.outcome)return false;const answers=[0,1,0];if(choice!==answers[s.assistedStep])return false;s.assistedStep++;if(s.assistedStep===3)closeRun(s,'assisted_completed');return true;}
export function step(s,input={},dt=1/60){
  if(Math.abs(dt-1/60)>1e-8)throw Error('Aerial simulation requires a fixed 60 Hz step.');
  if(s.outcome||s.mode!=='action')return;s.events=[];s.tick++;s.levelTick++;
  s.counters.maxProgress=Math.max(s.counters.maxProgress,s.levelTick);
  s.player.protection=Math.max(0,s.player.protection-1);if(s.bonus&&--s.bonus.ticks<=0)s.bonus=null;
  const v=normalizeInput(input),speed=T.speed*(s.config.loadout.includes('agility')?T.agility:1);s.player.dx=v.x;s.player.dy=v.y;
  s.player.x=clamp(s.player.x+v.x*speed/60,8,632);s.player.y=clamp(s.player.y+v.y*speed/60,12,348);
  events(s);shoot(s);updateEnemies(s);updateBoss(s);executeAttacks(s);
  for(const side of ['friendly','hostile']){for(const b of s[side]){b.x+=b.vx/60;b.y+=b.vy/60;}s[side]=s[side].filter(b=>b.x>-20&&b.x<660&&b.y>-30&&b.y<390);}
  hits(s);
  // v0.3.0: supplies persist until they drift off the bottom of the screen.
  s.pickups=s.pickups.filter(p=>{p.y+=T.pickupSpeed/60;if(inEllipse(p,s.player,24,28)){collect(s,p);return false;}if(p.y>380){s.counters.missed++;return false;}return true;});
  s.effects=s.effects.filter(e=>++e.age<36);s.volleyHits=s.volleyHits.filter(h=>s.tick-h.tick<120);resolveTerminal(s);
}
