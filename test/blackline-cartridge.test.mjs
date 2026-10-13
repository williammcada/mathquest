import test from 'node:test';
import assert from 'node:assert/strict';
import {QuestSession} from './authenticated-session.mjs';
import {createBlackline,stepBlackline,blacklineAdapter} from '../public/games/blackline/adapter.js';
import Sim from '../public/games/blackline/sim.js';


import {BLACKLINE as c,blacklineScene} from '../public/cartridges/blackline.js';
import {validateBlackline} from '../src/cartridges/blackline/validation.js';
const ctx=()=>{const data=new Map();return {storage:{get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),setAlarm:async()=>{}},blockConcurrencyWhile:fn=>fn()};};
async function call(r,path,body){const res=await r.fetch(new Request(`https://test${path}`,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{}));return {...await res.json(),status:res.status};}
const cmd=(r,type,extra={})=>call(r,'/command',{type,commandId:crypto.randomUUID(),...extra});
async function setup(gates=3,route='register'){
 const context=ctx(),r=new QuestSession(context);await call(r,'/init',{code:'HAVEN2',teacherKey:'teacher',config:{engineVersion:'0.9.4',cartridgeId:c.id,gateCount:gates,teamNames:['Crew'],modules:[{id:'number.gcf',itemCount:gates,band:'beginner'}]}});
 for(const id of ['a','b'])await cmd(r,'student.join',{deviceId:id,alias:id,teamPin:r.state.teams['team-1'].pin});await cmd(r,'teacher.start',{teacherKey:'teacher'});for(const id of ['a','b'])await cmd(r,'briefing.ready',{deviceId:id});
 const t=r.state.teams['team-1'];
 for(let i=0;i<gates;i++){
  for(const id of ['a','b']){await call(r,`/state?deviceId=${id}`);const v=await cmd(r,'math.submit',{deviceId:id,answer:r.state.students[id].currentItem.answer});assert.equal(v.feedback?.correct,true);}
  if(i===0){await vote(r,route);assert.equal(t.stage,'gate','Chapter 2 must not insert Chapter 1 rescue');}
 }
 for(const id of ['a','b']){assert.equal((await cmd(r,'market.propose',{deviceId:id,items:['impact-plating']})).status,200);await cmd(r,'market.ready',{deviceId:id});}
 const lead=r.members(t.id)[t.leadIndex%2].id;await cmd(r,'market.commit',{deviceId:lead});assert.equal((await cmd(r,'market.continue',{deviceId:lead})).status,200);assert.equal(t.stage,'minigame');assert.ok(Math.abs(t.finaleDeadline-Date.now()-300000)<2000);
 return {r,t,context};
}
async function vote(r,choice){for(const id of ['a','b'])await cmd(r,'choice.vote',{deviceId:id,choice});const t=r.state.teams['team-1'];assert.equal((await cmd(r,'choice.resolve',{deviceId:r.members(t.id)[t.leadIndex%2].id})).status,200);}
function driver(r){
 const k=Sim.curve(r.z),n=r.v/Sim.C.max,e=r.enemies.find(e=>e.phase!=='follow');let target=0;
 if(e)target=e.type==='rammer'?-(e.side||1)*.62:e.aim>=0?-.58:.58;
 else if(r.projectiles.length)target=r.projectiles[0].x>=0?-.58:.58;
 // v0.3.0: leave a visible strike zone; steer around obstacles ahead.
 const k3=r.strikes.find(k=>k.age>=Sim.STRIKE.zoneAt);if(k3&&Math.abs(target-k3.aim)<.34)target=k3.aim>=0?k3.aim-.42:k3.aim+.42;
 const o=Sim.OBSTACLES.find(o=>o.z>r.z&&o.z-r.z<r.v*1.8+10);if(o&&Math.abs(target-o.x)<.36)target=Math.max(-.62,Math.min(.62,o.x+(r.x<o.x?-.44:.44)));
 const j=Sim.nextJump(r.z);if(j&&j.start-r.z<270||r.jump)target=0;
 const desired=(k*n*n*.98+(target-r.x)*3-r.lv*.2)/(1.65*(.3+.7*n));
 // Binary keyboard/touch input, using pulse density for precise correction.
 driver.error=(driver.error||0)+Math.max(-1,Math.min(1,desired));let direction=0;
 if(driver.error>.5){direction=1;driver.error-=1;}else if(driver.error<-.5){direction=-1;driver.error+=1;}
 return {left:direction<0,right:direction>0,brake:Math.abs(k)>1.2&&r.v>46};
}
function play(run){driver.error=0;const s=createBlackline(run);let prior={...run};
 for(let i=0;i<18001&&!s.outcome;i++){
  stepBlackline(s,driver(s.race),1/60);
  if(i%300===0||s.outcome){const error=validateBlackline(prior,{type:s.outcome?'minigame.complete':'minigame.progress',snapshot:s,outcome:s.outcome,activeElapsedMs:Math.round(s.time*1000)});assert.equal(error,null,JSON.stringify({error,z:s.race.z,t:s.time}));prior.snapshot=structuredClone(s);}
 }
 return s;
}
async function submit(r,t,id,outcome){
 const run=t.runs[id],mode=outcome==='assisted_completed'?'assisted':'action',base={deviceId:id,runId:run.runId,configRevision:run.configRevision};
 assert.equal((await cmd(r,'minigame.start',{...base,mode})).status,200);
 let s;
 if(outcome==='success'){s=play(run);assert.equal(s.outcome,'success');run.startedAt=Date.now()-Math.ceil(s.time*1000);}
 else {s=createBlackline(run);s.outcome=outcome;if(outcome==='assisted_completed')s.guideStep=6;else {s.race.hp=0;s.race.mode='result';s.race.reason='destroyed';}}
 const v=await cmd(r,'minigame.complete',{...base,seq:1,activeElapsedMs:Math.round(s.time*1000),snapshot:s,outcome});assert.equal(v.status,200,v.error);
}
test('BLACKLINE authenticated 3/4/5 gates, both cargo choices, all endings, persistence and evidence separation',async()=>{
 for(const [i,gates] of [3,4,5].entries()){
  const {r,t,context}=await setup(gates,i===1?'evidence':'register'),before=r.state.students.a.firstAttemptCorrect;
  await submit(r,t,'a',i===1?'assisted_completed':'success');await submit(r,t,'b','lost');assert.equal(t.stage,'finale');await vote(r,c.choices[i].id);assert.equal(t.stage,'victory');assert.equal(r.state.students.a.firstAttemptCorrect,before);assert.equal(r.report().gameplayEvidence.length,2);assert.equal(r.report().rescueEvidence.length,0);assert.equal(r.report().session.cartridge,c.title);
  const loaded=new QuestSession(context);await loaded.ready;assert.equal(loaded.state.teams[t.id].finalAction,c.choices[i].id);assert.ok(blacklineScene(c,t,r.state.config.gateNames,r.members(t.id)).paragraphs.length>=3);
 }
});
test('BLACKLINE deadline, absent drivers, teacher pause and teacher closure',async()=>{
 const {r,t}=await setup(),deadline=t.finaleDeadline;await cmd(r,'teacher.pause',{teacherKey:'teacher'});r.state.pausedAt-=20000;await cmd(r,'teacher.pause',{teacherKey:'teacher'});assert.ok(t.finaleDeadline>=deadline+20000);
 t.finaleDeadline=Date.now()-1;await r.alarm();assert.equal(t.stage,'finale');assert.ok(Object.values(t.runs).every(x=>x.outcome==='timed_out'));assert.match(blacklineScene(c,t,r.state.config.gateNames,r.members(t.id)).paragraphs[0],/No completed/);
 const b=await setup();await cmd(b.r,'teacher.advanceFinale',{teacherKey:'teacher',teamId:b.t.id});assert.ok(Object.values(b.t.runs).every(x=>x.outcome==='teacher_advanced'));
});
test('BLACKLINE ownership, stale sequence, forged configuration, distance, time and resources rejected',async()=>{
 const {r,t}=await setup(),run=t.runs.a,base={deviceId:'a',runId:run.runId,configRevision:run.configRevision};await cmd(r,'minigame.start',{...base,mode:'action'});
 assert.equal((await cmd(r,'minigame.start',{...base,runId:t.runs.b.runId,mode:'action'})).status,400);
 const s=createBlackline(run),input={type:'minigame.progress',snapshot:s,activeElapsedMs:0};assert.equal(validateBlackline(run,input),null);
 for(const mutate of [s=>s.revision='old',s=>s.race.z=14500,s=>s.race.landings=3,s=>s.race.hp=101,s=>s.race.boost=2,s=>s.route='other',s=>s.used['repair-reserve']=true,s=>s.race.enemies=[{}],s=>s.time=1,s=>s.guideStep=6]){const copy=structuredClone(s);mutate(copy);assert.ok(validateBlackline(run,{...input,snapshot:copy}));}
 let v=await cmd(r,'minigame.progress',{...base,seq:1,activeElapsedMs:0,snapshot:s});assert.equal(v.status,200,v.error);v=await cmd(r,'minigame.progress',{...base,seq:1,activeElapsedMs:0,snapshot:s});assert.equal(v.status,400);
});
test('BLACKLINE earned equipment triggers once and reconnect retains exact state',()=>{
 const run={runId:'gear',route:'register',mode:'action',threat:1,loadout:['impact-plating','boost-capacitor','repair-reserve']};
 const s=createBlackline(run);s.race.x=1.15;s.race.v=50;stepBlackline(s,{right:true},1/60);assert.equal(s.race.hp,100);assert.equal(s.used['impact-plating'],true);
 s.race.z=1900;s.race.x=0;s.race.boost=.2;stepBlackline(s,{},1/60);assert.ok(s.race.boost>.45);
 s.race.z=6800;s.race.jumpIndex=2;s.race.hp=50;stepBlackline(s,{},1/60);assert.equal(s.race.hp,60);
 const restored=createBlackline({...run,snapshot:s});assert.deepEqual({...restored,events:s.events},s);stepBlackline(restored,{},1/60);assert.equal(restored.race.hp,60);assert.deepEqual(restored.used,s.used);
 const stale=structuredClone(restored);delete stale.used['repair-reserve'];assert.ok(validateBlackline({...run,snapshot:s},{type:'minigame.progress',snapshot:stale,activeElapsedMs:Math.round(stale.time*1000)}));
});
test('BLACKLINE binary controls finish in 4–5 minutes with all jumps and both pursuers',()=>{
 const s=play({runId:'drive',route:'register',mode:'action',threat:1,loadout:[]});assert.equal(s.outcome,'success');assert.equal(s.race.landings,3);assert.ok(s.time>=240&&s.time<300);assert.ok(s.race.stats.shots>0&&s.race.stats.rams>0);assert.ok(s.race.stats.strikes>=50,'strikes are frequent (v0.2.0 driver saw 33 bursts)');assert.equal(s.race.stats.obstacles,0,'every obstacle is avoidable: hit '+s.race.obstaclesHit);console.log('BLACKLINE binary driver',s.time,s.race.hp,JSON.stringify(s.race.stats));
});
test('U-13 DEV start at each section keeps jump and repair history consistent',()=>{
 for(const sec of Sim.SECTIONS){const s=createBlackline({runId:'dev',route:'register',mode:'action',threat:1,loadout:['impact-plating','boost-capacitor','repair-reserve']});Sim.startAt(s.race,sec.start);for(let i=0;i<120;i++)stepBlackline(s,{},1/60);assert.ok(s.race.z>=sec.start);assert.equal(s.race.jumpIndex,Sim.JUMPS.filter(j=>j.start<s.race.z).length);assert.notEqual(s.race.mode,'result');}
});
