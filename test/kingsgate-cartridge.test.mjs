import test from 'node:test';
import assert from 'node:assert/strict';
import {QuestSession} from './authenticated-session.mjs';
import {createKingsgate,stepKingsgate} from '../public/games/kingsgate/adapter.js';
import * as Sim from '../public/games/kingsgate/sim.js';
import {TOWERS} from '../public/games/kingsgate/config.js';
import {KINGSGATE as c,kingsgateScene} from '../public/cartridges/kingsgate.js';
import {CARTRIDGES,gateNames} from '../public/cartridges.js';
import {GAME_REGISTRY} from '../public/games/registry.js';
import {validateKingsgate} from '../src/cartridges/kingsgate/validation.js';

const ctx=()=>{const data=new Map();return {storage:{get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),setAlarm:async()=>{}},blockConcurrencyWhile:fn=>fn()};};
async function call(r,path,body){const res=await r.fetch(new Request(`https://test${path}`,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{}));return {...await res.json(),status:res.status};}
const cmd=(r,type,extra={})=>call(r,'/command',{type,commandId:crypto.randomUUID(),...extra});
async function vote(r,choice){for(const id of ['a','b'])await cmd(r,'choice.vote',{deviceId:id,choice});const t=r.state.teams['team-1'];assert.equal((await cmd(r,'choice.resolve',{deviceId:r.members(t.id)[t.leadIndex%2].id})).status,200);}
async function setup(gates=3,route='evacuate',items=['siege-yard']){
 const context=ctx(),r=new QuestSession(context);
 await call(r,'/init',{code:'KINGS1',teacherKey:'teacher',config:{engineVersion:'0.9.4',cartridgeId:c.id,gateCount:gates,teamNames:['Crew'],modules:[{id:'number.gcf',itemCount:gates,band:'beginner'}]}});
 for(const id of ['a','b'])await cmd(r,'student.join',{deviceId:id,alias:id,teamPin:r.state.teams['team-1'].pin});
 await cmd(r,'teacher.start',{teacherKey:'teacher'});for(const id of ['a','b'])await cmd(r,'briefing.ready',{deviceId:id});
 const t=r.state.teams['team-1'];
 for(let i=0;i<gates;i++){
  for(const id of ['a','b']){await call(r,`/state?deviceId=${id}`);const v=await cmd(r,'math.submit',{deviceId:id,answer:r.state.students[id].currentItem.answer});assert.equal(v.feedback?.correct,true);}
  if(i===0){assert.equal(t.stage,'decision');await vote(r,route);}
 }
 assert.equal(t.stage,'market');
 for(const id of ['a','b']){assert.equal((await cmd(r,'market.propose',{deviceId:id,items})).status,200);await cmd(r,'market.ready',{deviceId:id});}
 const lead=r.members(t.id)[t.leadIndex%2].id;await cmd(r,'market.commit',{deviceId:lead});
 assert.equal((await cmd(r,'market.continue',{deviceId:lead})).status,200);assert.equal(t.stage,'minigame');
 assert.ok(Math.abs(t.finaleDeadline-Date.now()-300000)<2000,'shared five-minute crew window');
 return {r,t,context};
}
const PLAN=[['s2','archer'],['s4','archer'],['s6','ballista'],['s9','ballista'],['s4','archer',1],['s2','archer',1],['s8','catapult'],['s6','ballista',1],['s9','ballista',1],['s1','archer'],['s10','archer'],['s7','ballista']];
function play(run){
 const s=createKingsgate(run);let prior={...run};
 for(let i=0;i<20000&&!s.outcome;i++){
  const g=s.g;for(const [spot,type,up] of PLAN){const t=Sim.towerAt(g,spot);if(!t){if(!g.allowed.includes(type))continue;if(g.gold>=TOWERS[type].cost)Sim.place(g,spot,type);break;}else if(up&&!t.tier){if(g.gold>=TOWERS[type].upgrade)Sim.upgrade(g,spot);break;}}
  stepKingsgate(s,{},1/60);
  if(i%300===0||s.outcome){const error=validateKingsgate(prior,{type:s.outcome?'minigame.complete':'minigame.progress',snapshot:s,outcome:s.outcome,activeElapsedMs:Math.round(s.time*1000)});assert.equal(error,null,JSON.stringify({error,t:s.time}));prior.snapshot=structuredClone(s);}
 }
 return s;
}
async function submit(r,t,id,outcome){
 const run=t.runs[id],mode=outcome==='assisted_completed'?'assisted':'action',base={deviceId:id,runId:run.runId,configRevision:run.configRevision};
 assert.equal((await cmd(r,'minigame.start',{...base,mode})).status,200);
 let s;
 if(outcome==='success'){s=play(run);assert.equal(s.outcome,'success');run.startedAt=Date.now()-Math.ceil(s.time*1000);}
 else if(outcome==='assisted_completed'){s=createKingsgate({...run,mode:'assisted'});s.guideStep=6;s.outcome=outcome;}
 else{s=createKingsgate(run);for(let i=0;i<20000&&!s.outcome;i++)stepKingsgate(s,{},1/60);assert.equal(s.outcome,'lost');run.startedAt=Date.now()-Math.ceil(s.time*1000);}
 const v=await cmd(r,'minigame.complete',{...base,seq:1,activeElapsedMs:Math.round(s.time*1000),snapshot:s,outcome});assert.equal(v.status,200,v.error);
}

test('Kingsgate is registered as a cartridge and a game',()=>{
 assert.ok(CARTRIDGES.some(x=>x.id==='kingsgate'));assert.ok(GAME_REGISTRY['kingsgate-defense'].adapter);
 assert.deepEqual(gateNames(c,5),['Ring the Bells','Stone and Mortar','Arrows for the Wall','The Bridge Timbers','The Granary Count']);
 assert.equal(c.items.length,4);assert.equal(c.choices.length,3);assert.equal(c.routes.length,2);
});

test('Kingsgate authenticated 3/4/5 gates, both routes, all three endings, evidence separation and persistence',async()=>{
 for(const [i,gates] of [3,4,5].entries()){
  const {r,t,context}=await setup(gates,i===1?'bridge':'evacuate'),before=r.state.students.a.firstAttemptCorrect;
  await submit(r,t,'a',i===1?'assisted_completed':'success');await submit(r,t,'b','lost');
  assert.equal(t.stage,'finale');await vote(r,c.choices[i].id);assert.equal(t.stage,'victory');
  assert.equal(r.state.students.a.firstAttemptCorrect,before,'gameplay never changes mathematics');
  assert.equal(r.report().gameplayEvidence.length,2);assert.equal(r.report().session.cartridge,c.title);
  const loaded=new QuestSession(context);await loaded.ready;assert.equal(loaded.state.teams[t.id].finalAction,c.choices[i].id);
  const scene=kingsgateScene(c,t,r.state.config.gateNames,r.members(t.id));assert.equal(scene.title,c.endings[c.choices[i].id][0]);
  assert.ok(scene.paragraphs.includes(c.routeEndings[t.route]));
 }
});

test('Kingsgate neutral bridge, deadline, teacher pause and closure',async()=>{
 const {r,t}=await setup(),deadline=t.finaleDeadline;
 await cmd(r,'teacher.pause',{teacherKey:'teacher'});r.state.pausedAt-=20000;await cmd(r,'teacher.pause',{teacherKey:'teacher'});assert.ok(t.finaleDeadline>=deadline+20000);
 t.finaleDeadline=Date.now()-1;await r.alarm();assert.equal(t.stage,'finale');assert.ok(Object.values(t.runs).every(x=>x.outcome==='timed_out'));
 assert.match(kingsgateScene(c,t,r.state.config.gateNames,r.members(t.id)).paragraphs[0],/No defense from your crew was confirmed/);
 const b=await setup();await cmd(b.r,'teacher.advanceFinale',{teacherKey:'teacher',teamId:b.t.id});assert.ok(Object.values(b.t.runs).every(x=>x.outcome==='teacher_advanced'));
});

test('Kingsgate rejects forged loadouts, created gold, restored gate health, rewinds and false victories',async()=>{
 const {r,t}=await setup(),run=t.runs.a,base={deviceId:'a',runId:run.runId,configRevision:run.configRevision};
 await cmd(r,'minigame.start',{...base,mode:'action'});
 assert.equal((await cmd(r,'minigame.start',{...base,runId:t.runs.b.runId,mode:'action'})).status,400);
 const s=createKingsgate(run);for(let i=0;i<600;i++)stepKingsgate(s,{},1/60);
 const check=(mutate,type='minigame.progress',outcome)=>{const x=structuredClone(s);mutate(x);return validateKingsgate(run,{type,snapshot:x,outcome,activeElapsedMs:Math.round(x.time*1000)});};
 assert.equal(check(()=>{}),null);
 assert.match(check(x=>{x.loadout=['siege-yard','war-chest'];}),/configuration/);
 assert.match(check(x=>{x.g.allowed=['archer','ballista','mage','catapult'];}),/Equipment/);
 assert.match(check(x=>{x.g.gold+=500;}),/Gold/);
 assert.match(check(x=>{x.g.towers.push({spot:'s1',type:'mage',tier:0,cd:0});x.g.stats.spent+=80;x.g.gold-=80;}),/tower/i);
 assert.match(check(x=>{x.g.stats.mathGold=30;x.g.gold+=30;}),/question rounds/);
 assert.match(check(x=>{x.g.stats.bounty+=50;x.g.gold+=50;}),/Bounty/);
 assert.match(check(x=>{x.outcome='success';x.g.mode='result';},'minigame.complete','success'),/twelve waves/);
 const later=structuredClone(s);later.g.gateHp=15;const prior={...run,snapshot:later};
 assert.match(validateKingsgate(prior,{type:'minigame.progress',snapshot:s,activeElapsedMs:Math.round(s.time*1000)}),/Gate health|rewind/);
 assert.match(check(x=>{x.time+=5;}),/clock/);
});

test('Every Kingsgate scene keeps story and instructions apart',()=>{
 for(const count of [3,4,5]){const names=gateNames(c,count);
  for(const stage of ['briefing','decision','gate','market','minigame','finale','victory'])for(const gateIndex of stage==='gate'?names.map((_,i)=>i):[0]){
   const scene=kingsgateScene(c,{stage,gateIndex,route:'evacuate',finalAction:'fortify',runs:{}},names,[{alias:'Learner'}]);
   assert.ok(scene&&scene.paragraphs.length>=1,stage);
   if(stage!=='victory'){const story=scene.paragraphs.slice(0,-1).join(' ');assert.doesNotMatch(story,/\b(tap|answer your|complete your|vote on|recommend equipment)\b/i,`${stage} ${gateIndex}: instruction inside story`);}
  }}
});
