import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,body,damage,retry,expire,rayRect,clearInput} from '../public/games/shooter/simulation.js';
import {CONFIG as C} from '../public/games/shooter/config.js';
import {WORLD} from '../public/games/shooter/world.js';
// v0.2.0 inserted a second loop before the boss chamber; boss-room coordinates shift by LOOP.
const LOOP=WORLD.boss.entryX-5376;
import {padSector} from '../public/games/shooter/input.js';
import {SOUND_MANIFEST} from '../public/games/shooter/audio.js';

function run(g,n,input={}){for(let i=0;i<n;i++)step(g,{fire:false,...input});return g;}
function quiet(options={}){const g=createGame({...options,now:0});for(const e of g.enemies)e.hp=0;g.hazards=[];return g;}
function place(g,x,y){Object.assign(g.player,{x,y,vy:0,grounded:true,h:28,stance:'stand',immunity:0,swimming:false,climbing:null,jumps:0});return g;}

test('authored inventory and all eight distinct upgrade combinations',()=>{
  assert.equal(WORLD.layers.Enemies.length,87);assert.equal(WORLD.layers.Hazards.length,12);assert.equal(WORLD.layers.Pickups.length,7);
  for(let bits=0;bits<8;bits++){const items=['spread','armor','agility'].filter((_,i)=>bits&(1<<i)),g=createGame({upgrades:items});assert.equal(g.player.maxHP,bits&2?4:3);assert.equal(g.lives,3);run(g,60,{fire:true});assert.ok(Number.isFinite(g.player.y));}
  assert.throws(()=>createGame({upgrades:['spread','spread']}));assert.throws(()=>createGame({upgrades:['beam']}));assert.throws(()=>createGame({checkpoint:'END'}));
});
test('fixed-step run speed, agility rate and platform seam crossing',()=>{
  const a=quiet(),b=quiet({upgrades:['agility']});run(a,60,{x:1});run(b,60,{x:1});assert.equal(a.player.x,276);assert.ok(Math.abs(b.player.x-294)<.001);assert.equal(a.player.y,336);assert.equal(b.player.y,336);
});
test('baseline full jump crosses a required 80px gap and lands',()=>{
  const g=place(quiet(),1430,192);run(g,48,{x:1,jump:true});assert.equal(g.player.y,192);assert.ok(g.player.x>1536);assert.equal(g.player.grounded,true);
});
test('early jump release reduces height; hold does not auto-repeat',()=>{
  const a=quiet(),b=quiet();run(a,1,{jump:true});run(b,1,{jump:true});run(a,20,{jump:true});run(b,20,{jump:false});assert.ok(a.player.y<b.player.y-15);run(a,90,{jump:true});assert.equal(a.player.y,336);assert.equal(a.player.jumps,0);
});
test('drop-through affects a thin deck, but never a solid floor',()=>{
  const g=place(quiet(),400,192);run(g,1,{y:1,jump:true});run(g,50);assert.equal(g.player.y,336);
  const b=quiet();run(b,1,{y:1,jump:true});assert.ok(b.player.vy<0);run(b,80);assert.equal(b.player.y,336);
});
test('one jump normally, two distinct presses with agility, no third jump',()=>{
  for(const agility of [false,true]){const g=quiet({upgrades:agility?['agility']:[]});run(g,12,{jump:true});run(g,1);run(g,1,{jump:true});assert.equal(g.player.jumps,agility?2:1);const vy=g.player.vy;run(g,1);run(g,1,{jump:true});assert.equal(g.player.jumps,agility?2:1);assert.ok(g.player.vy>vy);}
});
test('double Down enters stationary prone; cancellation clears gesture history',()=>{
  const g=quiet();run(g,1,{y:1});run(g,3);run(g,1,{y:1});assert.equal(g.player.stance,'prone');assert.equal(body(g.player).h,10);run(g,3,{y:1});assert.equal(g.player.x,96);run(g,1,{x:1});assert.equal(g.player.stance,'stand');
  const b=quiet();run(b,1,{y:1});clearInput(b);run(b,1,{y:1});assert.equal(b.player.stance,'crouch');
});
test('ladder ascends, descends adjacent connector, and jump disengages',()=>{
  const g=place(quiet(),272,336);run(g,100,{y:-1});assert.equal(g.player.y,192);assert.equal(g.player.grounded,true);
  place(g,768,336);run(g,60,{y:1});assert.ok(g.player.y>410);run(g,1,{jump:true});assert.equal(g.player.climbing,null);assert.ok(g.player.vy<0);
});
test('surface swimming has no dive, permits fire, and jumps onto bank',()=>{
  const g=place(quiet(),900,490);g.player.grounded=false;run(g,8);assert.equal(g.player.swimming,true);const x=g.player.x;run(g,60,{x:1,y:1,fire:true});assert.ok(Math.abs(g.player.x-x-110)<.01);assert.equal(g.player.y,496);assert.equal(g.player.aimY,0);
  place(g,2160,496);g.player.swimming=true;g.player.grounded=false;run(g,15,{x:1,jump:true});assert.ok(g.player.y<448);
});
test('all four repair cache positions collect at low health; full health leaves them',()=>{
  for(const cache of WORLD.layers.Pickups){const g=place(quiet(),cache.x+8,cache.y+16);g.player.hp=2;run(g,1);assert.equal(g.player.hp,3);assert.equal(g.pickups.find(p=>p.id===cache.id).collected,true);}
  const g=place(quiet(),512,192);run(g,1);assert.equal(g.pickups[0].collected,false);
});
test('guard gate blocks all three heights until H01 is defeated',()=>{
  for(const y of [192,336,496]){const g=createGame();for(const e of g.enemies)if(e.id!=='H01')e.hp=0;g.hazards=[];place(g,2500,y);run(g,8,{x:1});assert.ok(g.player.x<=2518);g.enemies.find(e=>e.id==='H01').hp=0;run(g,8,{x:1});assert.ok(g.player.x>2528);}
});
test('checkpoints do not refill on first arrival; jumping cannot skip them',()=>{
  const g=place(quiet(),2638,300);g.player.hp=2;g.player.grounded=false;run(g,1,{x:1});assert.equal(g.checkpoint,'MID');assert.equal(g.player.hp,2);
  place(g,(5454+LOOP),280);g.player.hp=1;run(g,1,{x:1});assert.equal(g.checkpoint,'BOSS');assert.equal(g.player.hp,1);
});
test('three deaths consume exactly three lives, protection prevents stacked hits',()=>{
  const g=createGame({now:0,upgrades:['armor','spread']});for(let life=3;life>0;life--){g.player.immunity=0;assert.equal(damage(g),true);assert.equal(damage(g),false);for(let n=0;n<3;n++){g.player.immunity=0;damage(g);}assert.equal(g.lives,life-1);if(life>1){assert.equal(retry(g,100),true);assert.equal(g.player.hp,4);assert.deepEqual(g.upgrades,['armor','spread']);}else{assert.equal(g.outcome,'defeated');assert.equal(retry(g,100),false);}}
});
test('checkpoint retry resets current/later sections and retains earlier state',()=>{
  const g=createGame({checkpoint:'MID',now:0});g.pickups[2].collected=true;g.enemies.find(e=>e.id==='P04').hp=0;g.status='downed';g.lives=2;const deadline=g.deadline;
  assert.equal(retry(g,10000),true);assert.equal(g.player.x,2640);assert.equal(g.enemies.find(e=>e.id==='H01').hp,0);assert.equal(g.enemies.find(e=>e.id==='P04').hp,4);assert.equal(g.pickups[0].collected,true);assert.equal(g.pickups[2].collected,false);assert.equal(g.deadline,deadline);
});
test('deadline wins over a downed retry and never overwrites resolved success',()=>{
  const g=createGame({now:0});g.status='downed';assert.equal(retry(g,300000),false);assert.equal(g.outcome,'time_window_closed');
  const b=createGame({now:0});b.status='terminal';b.outcome='success';assert.equal(expire(b,900000),false);assert.equal(b.outcome,'success');
});
test('fast bullet segment intersects cover before a target behind it',()=>{
  assert.equal(rayRect(0,10,1000,10,{x:100,y:0,w:32,h:30}),.1);
  const g=place(quiet(),2270,336);const e=g.enemies.find(e=>e.id==='H01');e.hp=8;e.clock=999;g.bullets.push({x:2280,y:318,vx:10000,vy:0,gravity:0,r:2,side:'player',life:1,volley:1});run(g,1);assert.equal(e.hp,8);assert.equal(g.bullets.length,0);
});
test('spread hits boss once per volley; single victory remains terminal',()=>{
  const g=place(quiet({checkpoint:'BOSS'}),(6040+LOOP),336),b=g.enemies.find(e=>e.type==='boss');b.hp=2;g.bossActive=true;b.state='recover';b.clock=99;
  for(let j=0;j<3;j++)g.bullets.push({x:(6090+LOOP),y:310+j,vx:2000,vy:0,gravity:0,r:2,side:'player',life:1,volley:70});run(g,1);assert.equal(b.hp,1);
  g.bullets.push({x:(6090+LOOP),y:310,vx:2000,vy:0,gravity:0,r:2,side:'player',life:1,volley:71});run(g,1);assert.equal(g.outcome,'success');const kills=g.kills;run(g,120,{fire:true});assert.equal(g.kills,kills);
});
test('boss trigger cannot be skipped with a jump; retry restores boss HP only on new attempt',()=>{
  const g=place(createGame({checkpoint:'BOSS',now:0}),(5583+LOOP),240);run(g,1,{x:1});assert.equal(g.bossActive,true);assert.equal(g.bossGate,true);const b=g.enemies.find(e=>e.type==='boss');b.hp=25;g.status='downed';g.lives=2;retry(g,10);assert.equal(g.enemies.find(e=>e.type==='boss').hp,C.bossHP);assert.equal(g.player.x,(5456+LOOP));assert.equal(g.bossGate,false);
});
test('boss high volley is duckable; low sweep is jumpable without agility',()=>{
  for(const attack of ['high','low']){const g=place(createGame({checkpoint:'BOSS',now:0}),(5940+LOOP),336);for(const e of g.enemies)if(e.type!=='boss')e.hp=0;g.hazards=[];g.bossActive=true;const b=g.enemies.find(e=>e.type==='boss');Object.assign(b,{state:'warning',attack,clock:.05});g.player.immunity=0;
    if(attack==='high')run(g,110,{y:1});else{run(g,25);run(g,36,{jump:true});}
    assert.equal(g.player.hp,3,attack);
  }
});
test('offscreen enemies cannot launch unseen projectiles',()=>{
  const g=createGame();run(g,300);assert.ok(g.bullets.every(b=>b.side!=='enemy'||b.x<1000));
});
test('eight directional sectors and center dead zone',()=>{
  const expected=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];expected.forEach(([x,y],i)=>assert.deepEqual(padSector(Math.cos(i*Math.PI/4)*50,Math.sin(i*Math.PI/4)*50,60),{x,y}));assert.deepEqual(padSector(4,2,60),{x:0,y:0});
});
test('all emitted effect names have a declared original sound',()=>{
  const events=['shot','spread-shot','hurt','robot-hit','robot-destroyed','jump','double-jump','land','splash','repair','checkpoint','respawn','robot-warning','hazard-warning','hazard-impact','boss-high','boss-low','boss-overhead','boss-entry','boss-fire','boss-destroyed','downed','time-closed'];for(const key of events)assert.ok(SOUND_MANIFEST[key],key);
});

test('baseline boss encounter can reach success through ordinary controls and damage rules',()=>{
  const g=createGame({checkpoint:'BOSS',now:0});
  for(let n=0;n<12000&&g.status==='active';n++){
    const p=g.player,b=g.enemies.find(e=>e.type==='boss');let x=p.x<(5840+LOOP)?1:p.x>(6040+LOOP)?-1:0,y=0,jump=p.vy<0;
    if(g.bossActive){
      if(g.bullets.some(a=>a.side==='enemy'&&a.vx<0&&a.y>322&&a.x-p.x<75&&a.x>p.x-20)&&p.grounded)jump=true;
      if(g.bullets.some(a=>a.side==='enemy'&&a.vx<0&&a.y>300&&a.y<320&&a.x-p.x<180&&a.x>p.x-20)&&p.grounded)y=1;
      if(b.attack==='overhead'&&(b.state==='warning'||b.state==='attack')&&Math.abs(p.x-b.targetX)<55)x=b.targetX<(5920+LOOP)?1:-1;
      else if(x===0&&p.facing<0)x=1;
      if(b.mortarTargets&&(b.state==='warning'||b.state==='attack')){const m=b.mortarTargets.find(t=>Math.abs(p.x-t)<36);if(m!==undefined)x=p.x<m?-1:1;}
    }
    step(g,{x,y,jump,fire:true});
  }
  assert.equal(g.outcome,'success');assert.equal(g.lives,3);assert.ok(g.player.hp>0);
  assert.ok(g.t>=30&&g.t<=45,'scripted boss target: 30–45 seconds');
  // This catches a usable end-to-end combat path, not novice difficulty or pacing.
});

test('standing and continuously firing no longer wins the boss fight',()=>{
  const g=createGame({checkpoint:'BOSS'});for(let n=0;n<3600&&g.status==='active';n++)step(g,{x:g.player.x<(5840+LOOP)?1:0,fire:true});
  assert.equal(g.status,'downed');assert.ok(g.enemies.find(e=>e.type==='boss').hp>0);
});
test('approach-triggered hazards show the full warning before damage',()=>{
  const g=place(quiet(),3400,336);g.camera={x:3170,y:116};const source=WORLD.layers.Hazards.find(h=>h.type==='press');g.hazards=[{...source,clock:0,state:'idle',armed:false}];
  run(g,1);assert.equal(g.hazards[0].state,'warning');assert.ok(g.events.some(e=>e.type==='hazard-warning'));
  run(g,48);assert.equal(g.hazards[0].state,'warning');run(g,8);assert.equal(g.hazards[0].state,'active');
});
test('three new cover beats remain jumpable without agility',()=>{
  for(const [x,end] of [[1270,1344],[3010,3088],[4790,4880]]){const g=place(quiet(),x,336);run(g,55,{x:1,jump:true});assert.ok(g.player.x>end);assert.equal(g.player.hp,3);assert.ok(g.player.y<=336);}
});
test('second-phase low sweep sends two spaced shots and overhead repeats its warning',()=>{
  for(const attack of ['low','overhead']){const g=place(createGame({checkpoint:'BOSS'}),(5800+LOOP),336),b=g.enemies.find(e=>e.type==='boss');g.player.immunity=99;g.bossActive=true;Object.assign(b,{hp:80,enraged:true,state:'warning',attack,clock:.01,strikes:2});
    let fired=0,warnings=0;for(let n=0;n<200;n++){step(g,{fire:false});fired+=g.events.filter(e=>e.type==='boss-fire').length;warnings+=g.events.filter(e=>e.type==='boss-overhead').length;}
    assert.equal(fired,2,attack);if(attack==='overhead')assert.equal(warnings,1);
  }
});

test('v0.2.0 doubles the route and the robot count, with a guarded MID2 checkpoint',async()=>{
  const {WORLD:BASE}=await import('../public/games/shooter/world-blockout-0.2.js');
  const regular=w=>w.layers.Enemies.filter(e=>e.type!=='boss').length;
  assert.ok(regular(WORLD)>=2*regular(BASE)*1.5,'at least double density across the doubled route');
  assert.ok(WORLD.boss.triggerX/5584>=1.8,'route to the boss arena is at least 80% longer');
  assert.deepEqual(WORLD.layers.Checkpoints.map(c=>c.id),['START','MID','MID2','BOSS']);
  const ids=WORLD.layers.Enemies.map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
  const g=place(createGame({checkpoint:'MID',now:0}),7000,336);for(const e of g.enemies)if(e.id!=='H01-L2')e.hp=0;g.hazards=[];
  run(g,90,{x:1});assert.ok(g.player.x<7104,'second guard gate blocks the route');assert.equal(g.checkpoint,'MID');
  g.enemies.find(e=>e.id==='H01-L2').hp=0;run(g,90,{x:1});assert.equal(g.checkpoint,'MID2');
});
test('v0.2.0 boss mortar marks landing spots and its shells land on them',()=>{
  const g=place(quiet({checkpoint:'BOSS'}),5900+LOOP,336),b=g.enemies.find(e=>e.type==='boss');b.hp=180;g.bossActive=true;g.player.immunity=99;
  Object.assign(b,{state:'recover',clock:0,phase:2});run(g,2);assert.equal(b.attack,'mortar');assert.equal(b.mortarTargets.length,3);
  const targets=[...b.mortarTargets],landed=[];
  for(let i=0;i<240;i++){const before=g.bullets.filter(x=>x.kind==='mortar').map(x=>({...x}));run(g,1);for(const old of before)if(!g.bullets.some(x=>x.kind==='mortar'&&Math.abs(x.vx-old.vx)<1e-9&&x.life>0))landed.push(old.x);}
  assert.equal(landed.length,3);landed.forEach((x,i)=>assert.ok(Math.abs(x-targets[i])<24,`shell ${i} landed at ${x}, marked ${targets[i]}`));
});
test('v0.2.0 boss shots are faster than v0.1.0',async()=>{
  const {BOSS_SHOT}=await import('../public/games/shooter/simulation.js');
  assert.ok(BOSS_SHOT.high>=280*1.25&&BOSS_SHOT.low>=190*1.25&&BOSS_SHOT.overhead>=350*1.25);
});
