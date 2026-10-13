import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../public/games/kingsgate/config.js';
import * as S from '../public/games/kingsgate/sim.js';
import {createKingsgate,stepKingsgate,tapKingsgate} from '../public/games/kingsgate/adapter.js';
import {menuFor} from '../public/games/kingsgate/render.js';

const PLAN=[['s2','archer'],['s4','archer'],['s6','ballista'],['s3','mage'],['s9','ballista'],['s4','archer',1],['s2','archer',1],['s8','catapult'],['s6','ballista',1],['s9','ballista',1],['s1','archer'],['s10','archer'],['s7','ballista'],['s3','mage',1]];
export function play(g,plan=PLAN,{correct=3}={}){
 const waves=[];
 for(let i=0;i<20000&&g.mode!=='result';i++){
  if(g.mode==='break'){S.resolveBreak(g,{answered:3,correct});continue;}
  for(const [spot,type,up] of plan){const t=S.towerAt(g,spot);if(!t){if(g.allowed.includes(type)&&g.gold>=C.TOWERS[type].cost){S.place(g,spot,type);break;}if(g.allowed.includes(type))break;}else if(up&&!t.tier){if(g.gold>=C.TOWERS[type].upgrade)S.upgrade(g,spot);break;}}
  S.tick(g,1/60);for(const e of g.events)if(e.type==='wave')waves.push([e.wave,g.t]);
 }
 return waves;
}

test('Kingsgate map: build spots clear of the road, path reaches the gate',()=>{
 assert.equal(C.SPOTS.length,10);
 for(const p of C.SPOTS)assert.ok(C.distanceToPath(p.x,p.y)>=36,`${p.id} too close to the road`);
 assert.equal(C.PATH.at(-1)[0],C.GATE_X);
 assert.equal(C.WAVES.length,12);assert.equal(C.WAVES[11][0][0],'ram');
});

test('Approved tuning values are used',()=>{
 assert.deepEqual([C.TOWERS.archer.cost,C.TOWERS.ballista.cost,C.TOWERS.mage.cost,C.TOWERS.catapult.cost],[50,90,80,120]);
 assert.deepEqual([C.ENEMIES.raider.hp,C.ENEMIES.wolf.hp,C.ENEMIES.troll.hp,C.ENEMIES.shaman.hp,C.ENEMIES.ram.hp],[30,22,140,40,900]);
 assert.equal(C.ENEMIES.troll.armor,4);assert.equal(C.ENEMIES.ram.gate,10);
 assert.equal(S.newState().gold,180);assert.equal(S.newState({loadout:['war-chest']}).gold,260);
 assert.equal(S.newState({goldMode:'arcade'}).gold,120);assert.equal(S.newState({loadout:['reinforced-gate']}).gateHp,25);
});

test('Equipment controls which towers a MathQuest crew may build',()=>{
 assert.deepEqual(S.allowedTowers('mathquest',[]),['archer','ballista']);
 assert.deepEqual(S.allowedTowers('mathquest',['mage-circle','siege-yard']),['archer','ballista','mage','catapult']);
 assert.deepEqual(S.allowedTowers('arcade',[]),['archer','ballista','mage','catapult']);
 const g=S.newState();assert.match(S.place(g,'s1','mage'),/not available/);assert.equal(S.place(g,'s1','archer'),null);assert.match(S.place(g,'s1','archer'),/taken/);
});

test('Gold accounting: spending, upgrades, selling and bounties balance',()=>{
 const g=S.newState();S.place(g,'s2','archer');S.upgrade(g,'s2');assert.equal(g.gold,180-90);S.sell(g,'s2');assert.equal(g.gold,180-90+45);
 play(g);const st=g.stats;assert.equal(g.gold,g.startGold+st.bounty+st.mathGold+st.refund-st.spent);
});

test('MathQuest pacing: twelve waves, wave 12 begins by 4:00, holdable and losable',()=>{
 const g=S.newState({loadout:['mage-circle','siege-yard']}),waves=play(g);
 assert.equal(waves.length,12);assert.ok(waves[11][1]<=240,`wave 12 at ${waves[11][1]}`);
 assert.equal(S.outcomeOf(g),'success');assert.ok(g.gateHp>0);
 const base=S.newState();play(base,PLAN);assert.equal(S.outcomeOf(base),'success','archer + ballista default kit must be viable');
 const idle=S.newState();play(idle,[]);assert.equal(S.outcomeOf(idle),'lost');assert.equal(idle.reason,'breached');
});

test('Armor, slow, pierce, splash, minimum range and healing',()=>{
 const g=S.newState({loadout:['mage-circle','siege-yard']});g.enemies.push({id:1,type:'troll',w:0,hp:140,d:300,slowUntil:0});
 S.place(g,'s4','archer');g.towers[0].cd=0;S.tick(g,1/60);assert.equal(g.enemies[0].hp,140-2,'archer 6 minus armor 4');
 const m=S.newState({loadout:['mage-circle']});m.enemies.push({id:1,type:'raider',w:0,hp:30,d:300,slowUntil:0});S.place(m,'s4','mage');S.tick(m,1/60);assert.ok(m.enemies[0].slowUntil>m.t);
 const b=S.newState();b.enemies.push({id:1,type:'raider',w:0,hp:30,d:260,slowUntil:0},{id:2,type:'raider',w:0,hp:30,d:262,slowUntil:0});S.place(b,'s4','ballista');S.tick(b,1/60);assert.ok(b.enemies.every(e=>e.hp<30)||b.enemies.length<2,'bolt pierces both');
 const c=S.newState({loadout:['siege-yard']});const near=C.SPOTS.find(p=>p.id==='s9');let d=0;for(;d<C.PATH_LENGTH;d+=2){const q=C.pointAt(d);if(Math.hypot(q.x-near.x,q.y-near.y)<30)break;}
 c.enemies.push({id:1,type:'raider',w:0,hp:30,d,slowUntil:0});S.place(c,'s9','catapult');S.tick(c,1/60);assert.equal(c.boulders.length,0,'catapult cannot hit inside 1.5 tiles');
 const h=S.newState();h.wave=1;h.enemies.push({id:1,type:'shaman',w:0,hp:40,d:100,slowUntil:0},{id:2,type:'raider',w:0,hp:10,d:110,slowUntil:0});for(let i=0;i<60;i++)S.tick(h,1/60);assert.ok(h.enemies[1].hp>13,'shaman heals 4 per second');
});

test('Gate damage, outcomes and the five-minute cap',()=>{
 const g=S.newState();g.wave=1;g.enemies.push({id:1,type:'ram',w:0,hp:900,d:C.PATH_LENGTH-.1,slowUntil:0});S.tick(g,1/30);assert.equal(g.gateHp,10);
 g.enemies.push({id:2,type:'ram',w:0,hp:900,d:C.PATH_LENGTH-.1,slowUntil:0});S.tick(g,1/30);assert.equal(g.gateHp,0);assert.equal(S.outcomeOf(g),'lost');
 const t=S.newState();t.t=299.99;t.wave=3;t.cleared=2;S.tick(t,1/30);assert.equal(t.reason,'time');assert.equal(S.outcomeOf(t),'success');assert.equal(t.t,300);
});

test('Arcade: question rounds before waves 2–12 pause the clock and pay 30 gold per correct answer',()=>{
 const g=S.newState({goldMode:'arcade'});let rounds=0;
 for(let i=0;i<20000&&g.mode!=='result';i++){if(g.mode==='break'){rounds++;const t=g.t;S.tick(g,1);assert.equal(g.t,t,'clock frozen');const before=g.gold;S.resolveBreak(g,{answered:3,correct:2});assert.equal(g.gold,before+60);continue;}
  for(const [spot,type,up] of PLAN){const t=S.towerAt(g,spot);if(!t){if(g.gold>=C.TOWERS[type].cost){S.place(g,spot,type);break;}break;}else if(up&&!t.tier){if(g.gold>=C.TOWERS[type].upgrade)S.upgrade(g,spot);break;}}S.tick(g,1/60);}
 assert.equal(rounds,11);assert.equal(g.stats.mathGold,11*60);assert.equal(g.stats.correct,22);assert.equal(S.outcomeOf(g),'success');
 const none=S.newState({goldMode:'arcade'});play(none,PLAN,{correct:0});assert.equal(S.outcomeOf(none),'lost','no correct answers should not hold the gate');
 const dev=S.newState({goldMode:'arcade'});for(let i=0;i<60*40;i++){if(dev.mode==='break')S.skipBreak(dev);S.tick(dev,1/60);}assert.ok(dev.wave>=2);assert.equal(dev.stats.mathGold,0);
});

test('Adapter: taps open menus, build, upgrade, sell; locked towers explained; snapshot restores',()=>{
 const s=createKingsgate({runId:'r1',loadout:['war-chest']});const sp=C.SPOTS.find(p=>p.id==='s2');
 tapKingsgate(s,sp.x,sp.y);assert.equal(s.ui.sel,'s2');let m=menuFor(s.g,'s2');assert.equal(m.buttons.length,5);
 const mage=m.buttons.find(b=>b.type==='mage');assert.ok(mage.locked);tapKingsgate(s,mage.x+5,mage.y+5);assert.match(s.message,/Earn this tower/);
 const archer=m.buttons.find(b=>b.type==='archer');tapKingsgate(s,archer.x+5,archer.y+5);assert.equal(S.towerAt(s.g,'s2').type,'archer');assert.equal(s.ui.sel,null);assert.equal(s.g.gold,210);
 tapKingsgate(s,sp.x,sp.y);m=menuFor(s.g,'s2');const up=m.buttons.find(b=>b.act==='upgrade');tapKingsgate(s,up.x+5,up.y+5);assert.equal(S.towerAt(s.g,'s2').tier,1);
 for(let i=0;i<600;i++)stepKingsgate(s,{},1/60);
 const copy=createKingsgate({runId:'r1',loadout:['war-chest'],snapshot:structuredClone(s)});assert.equal(copy.g.towers.length,1);assert.equal(copy.time,s.time);
 const other=createKingsgate({runId:'r2',loadout:['war-chest'],snapshot:structuredClone(s)});assert.equal(other.g.towers.length,0,'snapshot from another run is ignored');
 assert.ok(JSON.stringify(s).length<60000);
});
