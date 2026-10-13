/* BLACKLINE: deterministic road and pursuit simulation. Metres, seconds, road-width units. */
(function(root){'use strict';
const VERSION='0.3.2';
const C={max:220/3.6,boostMax:260/3.6,accel:8,brake:20,boostAccel:14,gravity:20,jumpVy:10,roadHalf:7.2,length:14500,limit:300};
// v0.3.2: every gap is 64 m and needs boost (≈230 km/h at take-off; top speed without boost is 220).
const GAP=64;
const JUMPS=[{id:0,start:5050,end:5050+GAP,corridor:.68},{id:1,start:6250,end:6250+GAP,corridor:.68},{id:2,start:14200,end:14200+GAP,corridor:.68}].map(j=>({...j,safeKmh:Math.ceil((j.end-j.start+4)*3.6/5)*5,flight:1}));
const REPAIRS=[{z:8320,x:.62},{z:12480,x:-.62}];
// v0.3.0: authored road obstacles, clear of ramps and repair kits.
const OBSTACLES=[[900,-.5,'barricade'],[1650,.45,'crates'],[2450,0,'barricade'],[3300,-.55,'crates'],[3900,.5,'barricade'],[4400,.2,'crates'],[5600,-.35,'barricade'],[7100,.55,'crates'],[7900,-.45,'barricade'],[8900,0,'crates'],[9800,.45,'barricade'],[10900,-.5,'crates'],[11600,.3,'barricade'],[13200,-.25,'crates']].map(([z,x,kind],id)=>({id,z,x,kind}));
// v0.3.0: aerial strikes. A shell appears at the horizon and approaches in five
// animation steps; its hit zone shows from 1.2 s, locks at 1.8 s, lands at 3.0 s.
// v0.3.2: the zone locks onto a fixed spot of road ahead (where you would be at your current speed);
// steer out of it, boost past it or brake short of it.
const STRIKE={flight:3,frames:5,zoneAt:1.2,lockAt:1.8,width:.2,depth:6,damage:14};
const SECTIONS=[{start:0,name:'LOCKDOWN AVENUE',short:'LOCKDOWN',sky:['#080d1d','#382743','#a65653'],ground:['#1b3031','#1c3333']},{start:1900,name:'FOUNDRY SWITCHBACKS',short:'FOUNDRY',sky:['#180f1c','#552a38','#c97440'],ground:['#382d30','#34272c']},{start:4500,name:'BROKEN SKYWAY',short:'SKYWAY',sky:['#0b142b','#313b5b','#8881a1'],ground:['#152937','#172d3b']},{start:6800,name:'FREIGHT UNDERPASS',short:'UNDERPASS',sky:['#050b16','#111d28','#304748'],ground:['#182c2b','#1b3030']},{start:9300,name:'SIREN SPIRAL',short:'SPIRAL',sky:['#1b1029','#49233f','#a35769'],ground:['#2c293d','#29273a']},{start:11900,name:'LAST EXIT',short:'LAST EXIT',sky:['#0d1e2a','#405d65','#dbaa77'],ground:['#243b3d','#294144']}];
const bends=[[350,680,1.2],[800,1130,-1.8],[1280,1590,2.15],[1750,2090,-2.05],[2250,2580,1.5],[2730,3030,-2.1],[3170,3490,2.15],[3630,3940,-1.8],[4080,4380,2.1],[4580,4750,-1.3],[5500,5780,1.6],[6470,6680,-1.3],[6940,7230,1.8],[7390,7660,-2.05],[7800,8120,1.8],[8470,8730,-2],[8850,9150,1.9],[9440,9740,2.2],[9900,10200,-2.2],[10350,10660,2.3],[10800,11100,-2.15],[11220,11500,1.9],[11640,11850,-1.8],[11960,12220,1.7],[12670,13000,-2],[13140,13400,2],[13520,13720,-1.6]].map(([a,b,k])=>({a,b,k}));
const ENCOUNTERS=[{z:300,type:'interceptor'},{z:2200,type:'interceptor'},{z:4200,type:'interceptor'},{z:6950,type:'rammer'},{z:8250,type:'interceptor'},{z:9500,type:'rammer'},{z:11000,type:'interceptor'},{z:12080,type:'rammer'},{z:13250,type:'interceptor'}];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function curve(z){for(const b of bends)if(z>=b.a&&z<=b.b)return b.k*Math.sin(Math.PI*(z-b.a)/(b.b-b.a));return 0;}
function section(z){let i=0;while(i<SECTIONS.length-1&&z>=SECTIONS[i+1].start)i++;return i;}
function zone(z){return SECTIONS[section(z)].name;}
function elevation(z){const raw=n=>11*Math.sin(n/290)+6*Math.sin(n/145),smooth=n=>n*n*(3-2*n);for(const j of JUMPS){const a=j.start-170,b=j.end+110,h=raw(a-140);if(z>=a&&z<=b)return h;if(z>a-140&&z<a)return h;if(z>b&&z<b+140){const u=smooth((z-b)/140);return h*(1-u)+raw(b+140)*u;}}return raw(z);}
function nextJump(z){return JUMPS.find(j=>z<j.start);}
function protectedRoad(s){return !!s.jump||s.t<s.safeUntil||JUMPS.some(j=>s.z>=j.start-180&&s.z<=j.end+70);}
function attackSafe(s){return !protectedRoad(s)&&Math.abs(curve(s.z))<1.05&&Math.abs(curve(s.z+s.v*1.5))<1.35;}
function newState(seed=7319){return {strikes:[],blasts:[],obstaclesHit:[],strikeSerial:0,artilleryTimer:9,mode:'title',z:0,x:0,v:0,lv:0,hp:100,boost:1,t:0,cooldown:0,collisions:0,jump:null,jumpIndex:0,landings:0,landed:false,airY:0,steer:0,braking:false,boosting:false,countdown:3,reason:'',deathCause:'',events:[],resultCount:0,impact:0,safeUntil:0,picked:[],enemies:[],projectiles:[],encounterIndex:0,enemySerial:0,burstSerial:0,attackOwner:null,attackCooldown:2,rng:seed>>>0,seed:seed>>>0,notice:'',noticeUntil:0,lastHit:'',damagePending:null,stats:{spawned:0,shots:0,rams:0,hits:0,enemyCrashes:0,evaded:0,strikes:0,obstacles:0}};}
function random(s){s.rng^=s.rng<<13;s.rng^=s.rng>>>17;s.rng^=s.rng<<5;return (s.rng>>>0)/4294967296;}
function begin(s,seed=7319){for(const k of Object.keys(s))delete s[k];Object.assign(s,newState(seed),{mode:'countdown'});}
function pause(s){if(s.mode==='running'||s.mode==='countdown'){s.mode='paused';s.steer=0;s.braking=false;s.boosting=false;}}
function resume(s){if(s.mode==='paused'){s.mode='countdown';s.countdown=1;}}
function finish(s,reason){if(s.mode==='result')return;s.mode='result';s.reason=reason;s.resultCount++;s.steer=0;s.boosting=false;s.braking=false;s.events.push(reason==='escaped'?'win':'fail');}
function damage(s,amount,cause){if(!s.damagePending||amount>s.damagePending.amount)s.damagePending={amount,cause};}
function resolveDamage(s){const p=s.damagePending;s.damagePending=null;if(!p||s.cooldown>0)return;s.hp=Math.max(0,s.hp-p.amount);s.cooldown=1;s.collisions++;s.impact=1;s.lastHit=p.cause;s.events.push('hit');if(p.cause==='barrier')s.v*=.75;if(p.cause==='obstacle')s.v*=.7;if(p.cause==='ram')s.v*=.85;if(p.cause==='burst'||p.cause==='ram'||p.cause==='strike')s.stats.hits++;if(s.hp<=0){s.deathCause=p.cause;finish(s,'destroyed');}}
// Guards the partial step up to a ramp lip from re-triggering the same ramp (seen once boost is held on the ramp).
let preJump=false;
function drive(s,dt,input){
 if(s.mode!=='running'||dt<=0)return;
 const steer=clamp(Number(input.steer)||0,-1,1),brake=!!input.brake,boost=!!input.boost&&!brake&&!s.jump&&s.boost>0;
 s.steer=steer;s.braking=brake&&!s.jump;s.boosting=boost;
 if(s.jump){const j=JUMPS[s.jump.id],part=Math.min(dt,j.flight-s.jump.age);s.lv=clamp(s.lv+steer*.25*part,-.5,.5);s.x+=s.lv*part;s.z+=s.v*part;s.jump.age+=part;s.airY=Math.max(0,C.jumpVy*s.jump.age-.5*C.gravity*s.jump.age*s.jump.age);s.t+=part;
  if(s.jump.age>=j.flight-1e-8){s.jump=null;s.airY=0;if(s.z<j.end-1e-7){finish(s,'jump-too-slow');return;}if(Math.abs(s.x)>1){finish(s,'missed-landing');return;}s.landed=true;s.landings++;s.safeUntil=s.t+1;s.events.push('land');if(Math.abs(s.x)>.85)damage(s,10,'landing');if(dt>part)drive(s,dt-part,input);}return;
 }
 const oldV=s.v;if(brake)s.v=Math.max(0,s.v-C.brake*dt);else s.v=Math.min(boost?C.boostMax:C.max,s.v+(boost?C.boostAccel:C.accel)*dt);if(!boost&&!brake&&oldV>C.max)s.v=Math.max(C.max,oldV-10*dt);
 let travel=(oldV+s.v)*.5*dt;
 const j=JUMPS[s.jumpIndex];
 if(j&&!preJump&&s.z<j.start&&s.z+travel>=j.start){const f=(j.start-s.z)/travel;s.v=oldV;preJump=true;try{drive(s,Math.max(0,dt*f-1e-9),input);}finally{preJump=false;}if(s.mode!=='running')return;s.z=j.start;s.jumpIndex++;s.landed=false;if(Math.abs(s.x)>j.corridor){finish(s,'missed-ramp');return;}s.jump={id:j.id,age:0};s.lv=clamp(s.lv,-.25,.25);s.boosting=false;s.braking=false;s.events.push('jump');if(dt*(1-f)>0)drive(s,dt*(1-f),input);return;}
 if(s.z+travel>=C.length){const f=(C.length-s.z)/travel;dt*=f;travel=C.length-s.z;}
 const oldZ=s.z,n=s.v/C.max,steerRate=1.65*(.3+.7*n),outward=curve(s.z)*n*n*.98,target=steer*steerRate-outward;
 s.lv+=(target-s.lv)*Math.min(1,dt*(brake?9:7));s.x+=s.lv*dt;s.z+=travel;s.t+=dt;if(boost)s.boost=Math.max(0,s.boost-dt/2);else s.boost=Math.min(1,s.boost+dt/10);
 if(Math.abs(s.x)>1){damage(s,12,'barrier');s.x=clamp(s.x,-1.16,1.16);}
 for(const j of JUMPS)if(oldZ<j.start-450&&s.z>=j.start-450){s.notice=`GAP AHEAD · BOOST TO ${j.safeKmh} KM/H`;s.noticeUntil=s.t+4;}
 for(const o of OBSTACLES)if(oldZ<o.z-140&&s.z>=o.z-140){s.notice=`${o.kind==='crates'?'CRATES':'BARRICADE'} AHEAD · ${o.x<-.15?'LEFT':o.x>.15?'RIGHT':'CENTRE'}`;s.noticeUntil=s.t+2;}
 for(const o of OBSTACLES)if(!s.obstaclesHit.includes(o.id)&&oldZ<o.z&&s.z>=o.z&&Math.abs(s.x-o.x)<.27){s.obstaclesHit.push(o.id);s.stats.obstacles++;damage(s,12,'obstacle');}
 REPAIRS.forEach((r,i)=>{if(!s.picked.includes(i)&&oldZ<=r.z&&s.z>=r.z&&Math.abs(s.x-r.x)<.24){s.hp=Math.min(100,s.hp+20);s.picked.push(i);s.events.push('repair');s.notice='REPAIR +20';s.noticeUntil=s.t+2.5;}});
}
function spawn(s,type,behind=32){const id=++s.enemySerial,side=id%2?1:-1;const e={id,type,z:s.z-behind,x:side*.7,v:Math.min(s.v+2,60),lv:0,phase:'follow',age:0,aim:0,delay:2.1+random(s),cooldown:2,grace:2.1,jump:null,jumpIndex:JUMPS.filter(j=>j.start<s.z-behind).length,airY:0,retired:false,hit:false};s.enemies.push(e);s.stats.spawned++;s.notice=type==='rammer'?'ARMORED RAMMER JOINING':'INTERCEPTOR IN PURSUIT';s.noticeUntil=s.t+3;s.events.push('siren');return e;}
function abortAttack(s,e){if(s.attackOwner===e.id)s.attackOwner=null;e.phase='follow';e.age=0;e.cooldown=3;s.attackCooldown=Math.max(s.attackCooldown,1.5);}
function retire(s,e,crash=false){if(e.retired)return;e.retired=true;if(crash){s.stats.enemyCrashes++;s.notice='PURSUER LOST AT THE GAP';s.noticeUntil=s.t+2.5;}if(s.attackOwner===e.id)s.attackOwner=null;}
function moveEnemy(s,e,dt){
 const oldZ=e.z,j=JUMPS[e.jumpIndex];e.grace=Math.max(0,e.grace-dt);e.cooldown=Math.max(0,e.cooldown-dt);
 if(e.jump){e.jump.age+=dt;e.z+=e.v*dt;e.airY=Math.max(0,C.jumpVy*e.jump.age-.5*C.gravity*e.jump.age*e.jump.age);if(e.jump.age>=1){const gap=JUMPS[e.jump.id];e.airY=0;e.jump=null;if(e.z<gap.end||Math.abs(e.x)>.95)retire(s,e,true);}return;}
 const dz=e.z-s.z,k=Math.abs(curve(e.z)),upcoming=j&&j.start-e.z<260&&j.start>e.z;
 let target=e.type==='interceptor'?64:65;
 if(k>.55)target=Math.min(target,Math.max(40,57-k*6.2));
 let tx;
 if(upcoming)tx=0;
 else if(e.phase==='ram')tx=e.aim;
 else if(e.phase==='ram-warn')tx=e.side*.76;
 else if(e.type==='rammer'){e.side=e.side||((e.id%2)?1:-1);tx=e.side*.76;target=Math.min(target,s.v+clamp((-2-dz)*.65,-12,12));}
 else{tx=e.phase==='aim'&&e.age>=.7?e.aim:s.x;if(dz>-12)target=Math.min(target,Math.max(12,s.v-3));}
 const block=OBSTACLES.find(o=>o.z>e.z&&o.z-e.z<55&&Math.abs(o.x-tx)<.34);if(block)tx=clamp(block.x+(tx>=block.x?.42:-.42),-.85,.85);
 const rate=e.phase==='ram'?1.7:.68;e.lv=clamp((tx-e.x)*3,-rate,rate)-curve(e.z)*Math.pow(e.v/C.max,2)*.10;e.x+=e.lv*dt;
 if(Math.abs(e.x)>.97){e.x=clamp(e.x,-1.03,1.03);target=Math.min(target,30);}
 e.v+=clamp(target-e.v,-18*dt,7*dt);e.v=Math.max(0,e.v);e.z+=e.v*dt;
 if(j&&oldZ<j.start&&e.z>=j.start){e.jumpIndex++;if(Math.abs(e.x)>j.corridor){retire(s,e,true);return;}e.jump={id:j.id,age:(e.z-j.start)/Math.max(1,e.v)};abortAttack(s,e);}
 if(e.z<s.z-340)retire(s,e);
}
function strikeClear(s){const j=nextJump(s.z);return !protectedRoad(s)&&Math.abs(curve(s.z))<1.9&&!s.strikes.length&&(!j||j.start-s.z>s.v*(STRIKE.flight+.4)+180);}
function launchStrike(s,source,owner){s.strikes.push({id:++s.strikeSerial,source,owner,age:0,aim:s.x,z:s.z+s.v*STRIKE.flight,locked:false});s.stats.shots++;s.stats.strikes++;s.events.push('lock');}
function updateStrikes(s,dt){
 for(const k of s.strikes){k.age+=dt;if(!k.locked){k.aim=s.x;k.z=s.z+s.v*(STRIKE.flight-k.age);if(k.age>=STRIKE.lockAt){k.locked=true;s.events.push('shot');s.notice='SHELL LOCKED · STEER, BOOST PAST OR BRAKE';s.noticeUntil=s.t+1.3;}}
  if(k.age>=STRIKE.flight){k.landed=true;s.blasts.push({x:k.aim,z:k.z,t:s.t});if(!protectedRoad(s)&&s.mode==='running'&&Math.abs(s.x-k.aim)<STRIKE.width&&Math.abs(s.z-k.z)<STRIKE.depth)damage(s,STRIKE.damage,'strike');else s.stats.evaded++;s.events.push('ram');}}
 s.strikes=s.strikes.filter(k=>!k.landed);
 s.blasts=s.blasts.filter(b=>s.t-b.t<.6);
}
function strikeFrame(k){return Math.min(STRIKE.frames-1,Math.floor(k.age/(STRIKE.flight/STRIKE.frames)));}
function pursuit(s,dt,oldPlayerZ){
 s.attackCooldown=Math.max(0,s.attackCooldown-dt);
 while(s.encounterIndex<ENCOUNTERS.length&&s.z>=ENCOUNTERS[s.encounterIndex].z){const c=ENCOUNTERS[s.encounterIndex++];const max=s.z<6800?2:3;if(s.enemies.length<max)spawn(s,c.type,30+random(s)*14);}
 const safe=attackSafe(s);
 if(protectedRoad(s))s.projectiles=[];
 for(const e of s.enemies){moveEnemy(s,e,dt);if(e.retired)continue;
  const dz=e.z-s.z;
  if(!safe||e.jump){if(e.phase!=='follow')abortAttack(s,e);continue;}
   if(e.phase==='ram-warn'){
   e.age+=dt;if(Math.abs(dz)>22){abortAttack(s,e);continue;}if(e.age>=1.1){e.phase='ram';e.age=0;e.hit=false;s.stats.rams++;s.events.push('ram');}
  }else if(e.phase==='ram'){
   e.age+=dt;if(!e.hit&&Math.abs(dz)<7&&Math.abs(e.x-s.x)<.27){damage(s,15,'ram');e.hit=true;}
   if(e.age>.85){abortAttack(s,e);e.cooldown=6.5+random(s)*2;}
  }else if(s.attackOwner===null&&s.attackCooldown<=0&&e.cooldown<=0&&e.grace<=0){
   if(e.type==='interceptor'&&dz<-8&&dz>-65&&strikeClear(s)){launchStrike(s,'interceptor',e.id);e.cooldown=2.6+random(s);}
   if(e.type==='rammer'&&Math.abs(dz)<10&&Math.abs(e.x-s.x)>.3){e.phase='ram-warn';e.age=0;e.aim=s.x;e.side=e.x<0?-1:1;s.attackOwner=e.id;s.events.push('lock');}
  }
 }
 // Background artillery adds strikes when no pursuer is attacking.
 if(s.z>800){s.artilleryTimer-=dt;if(s.artilleryTimer<=0&&strikeClear(s)){launchStrike(s,'artillery',null);s.artilleryTimer=3.5+random(s)*2;}}
 updateStrikes(s,dt);
 const consumed=new Set();
 for(const p of s.projectiles){const old=p.z;p.z+=p.v*dt;p.life-=dt;if(old<=oldPlayerZ+1&&p.z>=s.z-1){if(!protectedRoad(s)&&Math.abs(p.x-s.x)<.18){damage(s,10,'burst');consumed.add(p.burst);}else{s.stats.evaded++;}p.life=0;}if(p.z>s.z+50)p.life=0;}
 s.projectiles=s.projectiles.filter(p=>p.life>0&&!consumed.has(p.burst));s.enemies=s.enemies.filter(e=>!e.retired);
}
function step(s,dt,input){const old=s.z;s.damagePending=null;s.cooldown=Math.max(0,s.cooldown-dt);s.impact=Math.max(0,s.impact-3*dt);drive(s,dt,input);if(s.mode!=='running')return;pursuit(s,dt,old);resolveDamage(s);if(s.mode==='running'&&s.z>=C.length-1e-7)finish(s,s.t<C.limit?'escaped':'timeout');if(s.mode==='running'&&s.t>=C.limit-1e-8)finish(s,'timeout');}
function tick(s,dt,input={}){if(!Number.isFinite(dt)||dt<=0)return;if(dt>.25){pause(s);return;}if(s.mode==='countdown'){s.countdown-=dt;if(s.countdown<=0){s.mode='running';s.events.push('go');}return;}if(s.mode!=='running')return;while(dt>1e-8&&s.mode==='running'){const part=Math.min(dt,1/60,C.limit-s.t);if(part<=1e-8){finish(s,'timeout');break;}step(s,part,input);dt-=part;}}
// U-13 DEV playtest: begin at a section start with the earlier course treated as driven.
function startAt(s,z){s.z=z;s.jumpIndex=JUMPS.filter(j=>j.start<z).length;s.landings=s.jumpIndex;s.encounterIndex=ENCOUNTERS.filter(e=>e.z<z).length;s.picked=REPAIRS.map((r,i)=>i).filter(i=>REPAIRS[i].z<z);s.obstaclesHit=[];}
const api={startAt,VERSION,C,JUMPS,JUMP:JUMPS[0],REPAIRS,OBSTACLES,STRIKE,strikeFrame,SECTIONS,ENCOUNTERS,bends,curve,elevation,zone,section,nextJump,protectedRoad,attackSafe,clamp,newState,begin,pause,resume,finish,tick,spawn,damage,resolveDamage};root.BlacklineSim=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

export default globalThis.BlacklineSim;
