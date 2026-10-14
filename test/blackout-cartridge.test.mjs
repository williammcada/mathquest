// Blackout Protocol cartridge v0.2.1 (MathQuest 0.12.0): classroom flow, validation, reports, adapter.
import test from 'node:test';
import assert from 'node:assert/strict';
import {QuestSession} from './authenticated-session.mjs';
import {BLACKOUT as c,blackoutScene} from '../public/cartridges/blackout.js';
import {validateBlackout} from '../src/cartridges/blackout/validation.js';
import {blackoutAdapter as A,createBlackout,stepBlackout,tapBlackout} from '../public/games/blackout/adapter.js';
import C from '../public/games/blackout/core.js';
import {revisionFor} from '../public/games/blackout/config.js';
import {gameFor} from '../public/games/registry.js';
import {cartridgeFor,sceneFor,gateNames} from '../public/cartridges.js';
import {readFileSync} from 'node:fs';

const ctx=()=>{const data=new Map();return {storage:{get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),async setAlarm(v){this.alarmAt=v;},async deleteAlarm(){},async deleteAll(){data.clear();}},blockConcurrencyWhile:fn=>fn()};};
async function call(r,path,body){const res=await r.fetch(new Request('https://test'+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{}));return {...await res.json(),status:res.status};}
const cmd=(r,type,extra={})=>call(r,'/command',{type,commandId:crypto.randomUUID(),...extra});
const lead=(r,t)=>r.members(t.id)[t.leadIndex%r.members(t.id).length].id;
async function vote(r,t,choice){for(const s of r.members(t.id))await cmd(r,'choice.vote',{deviceId:s.id,choice});assert.equal((await cmd(r,'choice.resolve',{deviceId:lead(r,t)})).status,200);}
async function setup({gates=3,route='harbor',prepare=0,items}={}){
 const context=ctx(),r=new QuestSession(context);
 await call(r,'/init',{code:'BLACK',teacherKey:'teacher',config:{engineVersion:'0.12.0',cartridgeId:c.id,gateCount:gates,teamNames:['Crew'],modules:[{id:'number.gcf',itemCount:gates,band:'beginner'}]}});
 const t=r.state.teams['team-1'];
 for(const id of ['a','b'])await cmd(r,'student.join',{deviceId:id,alias:id.toUpperCase(),teamPin:t.pin});
 await cmd(r,'teacher.start',{teacherKey:'teacher'});for(const id of ['a','b'])await cmd(r,'briefing.ready',{deviceId:id});
 const answerGate=async()=>{for(const s of r.members(t.id))while(!s.gateComplete){await call(r,'/state?deviceId='+s.id);const v=await cmd(r,'math.submit',{deviceId:s.id,answer:s.currentItem.answer});assert.equal(v.status,200,v.error);}};
 await answerGate();assert.equal(t.stage,'decision');await vote(r,t,route);
 while(t.stage==='gate')await answerGate();assert.equal(t.stage,'market');
 if(prepare){await cmd(r,'teacher.setSupply',{teacherKey:'teacher',teamId:t.id,count:2,enabled:true,moduleIds:['number.gcf']});for(let n=0;n<prepare;n++){assert.equal((await cmd(r,'equipment.extend',{deviceId:lead(r,t)})).status,200);await answerGate();assert.equal(t.stage,'market');}}
 const loadout=items||c.items.map(i=>i.id).slice(0,1+prepare);
 for(const s of r.members(t.id)){assert.equal((await cmd(r,'market.propose',{deviceId:s.id,items:loadout})).status,200);await cmd(r,'market.ready',{deviceId:s.id});}
 assert.equal((await cmd(r,'market.commit',{deviceId:lead(r,t)})).status,200);
 assert.equal((await cmd(r,'market.continue',{deviceId:lead(r,t)})).status,200);
 assert.equal(t.stage,'minigame');assert.ok(Math.abs(t.finaleDeadline-Date.now()-300000)<2000);
 return {r,t,context};
}
// Puzzle drivers ------------------------------------------------------------
function fix(g){for(const i of g.board.order){const t=g.board.tiles[i];if(t.locked)continue;for(let k=0;k<4&&C.rotMask(t.base,t.rot)!==t.sol;k++)g.rotate(i);}}
function clearDistrict(s){const g=s.game,d=g.district;let guard=0;while(g.district===d&&g.status==='playing'&&guard++<10){if(g.lockoutMs>0)stepBlackout(s,{},g.lockoutMs/1000+.01);fix(g);g.energize();stepBlackout(s,{},1/60);}if(g.phase==='lit')stepBlackout(s,{},(C.RULES.litMs+1)/1000);}
function blowFuse(s){const g=s.game;fix(g);const i=g.board.order.find(x=>!g.board.tiles[x].locked&&g.board.tiles[x].base!==15);g.rotate(i);g.energize();stepBlackout(s,{},(C.RULES.lockoutMs+5)/1000);}
const base=(t,id)=>({deviceId:id,runId:t.runs[id].runId,configRevision:t.runs[id].configRevision});
// Tests simulate minutes of play instantly; the server (correctly) refuses play time more than 2 s ahead of the
// wall clock since the run started, so backdate the start rather than depend on how fast the machine runs.
async function start(r,t,id,mode='action'){assert.equal((await cmd(r,'minigame.start',{...base(t,id),mode})).status,200);t.runs[id].startedAt=Date.now()-C.RULES.runMs;}
async function send(r,t,id,s,type='minigame.progress'){const run=t.runs[id];return cmd(r,type,{...base(t,id),seq:run.seq+1,activeElapsedMs:Math.round(s.time*1000),snapshot:structuredClone(s),...(type==='minigame.complete'?{outcome:s.outcome}:{})});}
async function playSuccess(r,t,id){await start(r,t,id);const s=createBlackout(t.runs[id]);for(let d=0;d<5;d++){clearDistrict(s);const v=await send(r,t,id,s,s.outcome?'minigame.complete':'minigame.progress');assert.equal(v.status,200,v.error);}assert.equal(s.outcome,'success');return s;}
async function playLost(r,t,id){await start(r,t,id);const s=createBlackout(t.runs[id]);while(!s.outcome)blowFuse(s);assert.equal(s.outcome,'lost');t.runs[id].startedAt=Date.now()-Math.ceil(s.time*1000)-10;const v=await send(r,t,id,s,'minigame.complete');assert.equal(v.status,200,v.error);return s;}

test('cartridge is registered across catalog, scenes, server, game registry and revisions',()=>{
 assert.equal(cartridgeFor('blackout-protocol').revision,c.revision);assert.equal(gameFor('blackout').id,A.id);assert.equal(gameFor('blackout').revision,A.revision);
 assert.equal(c.mapRevision,revisionFor(C.VERSION),'cartridge mapRevision follows the vendored core');
 const prov=JSON.parse(readFileSync(new URL('../public/games/blackout/core.provenance.json',import.meta.url),'utf8'));
 assert.equal(prov.version,C.VERSION);assert.equal(prov.repository,'williammcada/blackout-protocol');assert.match(prov.commit,/^[0-9a-f]{40}$/);
 for(const p of Object.values(c.assets))assert.ok(readFileSync(new URL('../public/'+p.slice(2),import.meta.url)).length>1000,p);
 for(const p of ['cover','radio','market','lantern','ending']){const svg=readFileSync(new URL(`../public/assets/blackout/${p}.svg`,import.meta.url),'utf8');assert.ok(!/<text/.test(svg),p+' has no text');}
 for(const n of [3,4,5])for(const stage of ['briefing','decision','gate','market','minigame','finale','victory']){const sc=sceneFor(c,{stage,gateIndex:0,route:'hospital',finalAction:'microgrid',runs:{}},gateNames(c,n),[{alias:'A'}]);assert.ok(sc.title&&Array.isArray(sc.paragraphs)&&Array.isArray(sc.instructions),stage);}
});

test('classroom flow: 3/4/5 gates, both routes, every ending; results never touch academic evidence; report and CSV',async()=>{
 for(const [i,gates] of [3,4,5].entries()){
  const {r,t,context}=await setup({gates,route:i%2?'hospital':'harbor'}),before=r.state.students.a.firstAttemptCorrect;
  assert.equal(t.runs.a.loadout.length,1);
  await playSuccess(r,t,'a');await playLost(r,t,'b');
  assert.equal(t.stage,'finale');assert.equal(t.runs.a.outcome,'success');assert.equal(t.runs.b.outcome,'lost');assert.equal(t.runs.a.validation,'client-reported; server-checked boards');
  await vote(r,t,c.choices[i].id);assert.equal(t.stage,'victory');assert.equal(t.finalAction,c.choices[i].id);
  assert.equal(r.state.students.a.firstAttemptCorrect,before,'puzzle never changes academic evidence');
  const scene=blackoutScene(c,t,r.state.config.gateNames,r.members(t.id));assert.equal(scene.title,c.endings[c.choices[i].id][0]);
  const report=r.report();assert.equal(report.gameplayEvidence.length,2);assert.ok(report.students.some(s=>s.narrativeFate===c.personal.success));
  const csv=r.reportCsv();assert.match(csv,/BLACKOUT PROTOCOL · ENGAGEMENT ONLY/);assert.match(csv,/server-checked boards/);
  const loaded=new QuestSession(context);await loaded.ready;assert.equal(loaded.state.teams[t.id].finalAction,c.choices[i].id);
 }
});

test('extra preparation earns up to three distinct items with their exact effects',async()=>{
 const {t}=await setup({prepare:2});assert.equal(t.equipmentBlocks.length,2);
 assert.deepEqual([...t.runs.a.loadout].sort(),['grid-scanner','spare-fuse','surge-stabilizer']);
 const s=createBlackout(t.runs.a);assert.equal(s.game.fuses,4);assert.equal(s.game.has('scanner'),true);assert.equal(s.game.stormIntervalMs(),16000);assert.equal(s.game.surgeWindowMs(),37500);
 const none=createBlackout({runId:'x',loadout:[]});assert.equal(none.game.fuses,3);assert.equal(none.game.useScanner(),null);
});

test('progress survives reconnect: the server snapshot restores the same boards and districts',async()=>{
 const {r,t}=await setup();await start(r,t,'a');const s=createBlackout(t.runs.a);clearDistrict(s);clearDistrict(s);
 {const v=await send(r,t,'a',s);assert.equal(v.status,200,v.error);}
 const projection=await call(r,'/state?deviceId=a');const run=projection.team?.finale?.run||t.runs.a;
 const back=createBlackout({...run,snapshot:run.snapshot});
 assert.deepEqual(back.game.restored,[0,1]);assert.equal(back.game.district,2);
 assert.deepEqual(back.game.board.tiles.map(x=>x.rot),s.game.board.tiles.map(x=>x.rot));
 assert.equal(typeof back.game.energize,'function');
});

test('validator accepts honest play and rejects forged, replayed or impossible panels',async()=>{
 const {r,t}=await setup({items:['spare-fuse']});await start(r,t,'a');const run=t.runs.a,s=createBlackout(run);clearDistrict(s);
 const check=(snap,extra={})=>validateBlackout(run,{type:'minigame.progress',snapshot:snap,activeElapsedMs:Math.round(snap.time*1000),...extra});
 assert.equal(check(s),null);
 const forge=f=>{const x=structuredClone(s);f(x);return x;};
 assert.match(check(forge(x=>{x.game.solved[0]=C.generateBoard(0,run.runId).tiles.map(t=>t.rot);})),/not actually connected/);
 assert.match(check(forge(x=>{x.game.seed='easy-seed';})),/configuration/);
 assert.match(check(forge(x=>{x.runId='someone-else';})),/configuration/);
 assert.match(check(forge(x=>{x.loadout=['spare-fuse','grid-scanner'];})),/configuration/);
 assert.match(check(forge(x=>{x.game.equipment=['spareFuse','scanner'];})),/configuration/);
 assert.match(check(forge(x=>{x.game.fuses=3;x.game.stats.fusesBlown=0;x.game.fusesMax=3;})),/Fuses/);
 assert.match(check(forge(x=>{x.game.restored=[1];x.game.solved={1:x.game.solved[0]};})),/in order/);
 assert.match(check(forge(x=>{x.game.guided=true;})),/guided/);
 assert.match(validateBlackout(run,{type:'minigame.progress',snapshot:forge(x=>{x.time=x.time+10;}),activeElapsedMs:Math.round(s.time*1000)}),/run clock/);
 assert.match(check(forge(x=>{x.game.elapsedMs=x.time*1000+500;})),/panel clock/);
 assert.match(check(forge(x=>{x.outcome='success';})),/completion command/);
 assert.match(validateBlackout(run,{type:'minigame.complete',outcome:'success',snapshot:forge(x=>{x.outcome='success';}),activeElapsedMs:Math.round(s.time*1000)}),/all five/);
 // accepted progress becomes the baseline: fuses cannot come back, restored districts cannot be rewired
 assert.equal((await send(r,t,'a',s)).status,200);
 blowFuse(s);const v=await send(r,t,'a',s);assert.equal(v.status,200,v.error);
 assert.match(check(forge(x=>{x.game.fuses+=1;x.game.stats.fusesBlown-=1;})),/restored|cannot/i);
 assert.match(check(forge(x=>{x.game.solved[0]=x.game.solved[0].map((r,i)=>i===x.game.board.gen?r:r);x.game.solved[0][0]=(x.game.solved[0][0]+1)%4;})),/rewired/);
 const stale=await cmd(r,'minigame.progress',{...base(t,'a'),seq:t.runs.a.seq,activeElapsedMs:Math.round(s.time*1000),snapshot:s});assert.equal(stale.status,400);
});

test('guided route records assisted_completed, costs no fuses and is separate from success',async()=>{
 const {r,t}=await setup();await start(r,t,'a');assert.equal((await cmd(r,'minigame.assist',base(t,'a'))).status,200);
 const s=createBlackout(t.runs.a);s.mode='assisted';
 const overlay={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>({addEventListener(){}})};
 A.assisted(s,overlay,()=>{});assert.equal(s.game.guided,true);
 let guard=0;while(!s.outcome&&guard++<2000){s.time+=0.05;const tg=s.game.guidedTarget();s.game.elapsedMs=Math.round(s.time*1000);if(tg?.action==='rotate')s.game.rotate(tg.idx);else s.game.energize();if(s.game.phase==='lit')s.game.step(C.RULES.litMs+1);stepBlackout(s,{},0);}
 assert.equal(s.outcome,'assisted_completed');assert.equal(s.game.fuses,s.game.fusesMax,'no fuse lost on the guided route');
 t.runs.a.startedAt=Date.now()-Math.ceil(s.time*1000)-10;
 const v=await send(r,t,'a',s,'minigame.complete');assert.equal(v.status,200,v.error);assert.equal(t.runs.a.outcome,'assisted_completed');
});

test('partial and timed-out shifts at 300 seconds',async()=>{
 const {r,t}=await setup();
 for(const [id,districts,expected] of [['a',2,'partial'],['b',0,'timed_out']]){
  await start(r,t,id);const s=createBlackout(t.runs[id]);for(let d=0;d<districts;d++)clearDistrict(s);
  while(!s.outcome)stepBlackout(s,{},1);
  assert.equal(s.outcome,expected);assert.equal(s.time,300);
  t.runs[id].startedAt=Date.now()-301000;const v=await send(r,t,id,s,'minigame.complete');assert.equal(v.status,200,v.error);assert.equal(t.runs[id].outcome,expected);
 }
 assert.equal(t.stage,'finale');assert.match(blackoutScene(c,t,r.state.config.gateNames,r.members(t.id)).paragraphs[0],/Lights are coming back/);
});

test('deadline, absent players, teacher pause and teacher closure follow the shared crew window',async()=>{
 const {r,t}=await setup(),deadline=t.finaleDeadline;
 await cmd(r,'teacher.pause',{teacherKey:'teacher'});r.state.pausedAt-=20000;await cmd(r,'teacher.pause',{teacherKey:'teacher'});assert.ok(t.finaleDeadline>=deadline+19000);
 t.finaleDeadline=Date.now()-1;await r.alarm();assert.equal(t.stage,'finale');assert.ok(Object.values(t.runs).every(x=>x.outcome==='timed_out'));
 assert.match(blackoutScene(c,t,r.state.config.gateNames,r.members(t.id)).paragraphs[0],/could not hold/);
 const b=await setup();await cmd(b.r,'teacher.advanceFinale',{teacherKey:'teacher',teamId:b.t.id});assert.ok(Object.values(b.t.runs).every(x=>x.outcome==='teacher_advanced'));
});

test('adapter: tap coordinates map to tiles; keyboard edge-presses; snapshot is plain and small',()=>{
 const s=createBlackout({runId:'tap-test',loadout:[]}),n=s.game.board.n,w=336/n;
 const i=s.game.board.order.find(x=>!s.game.board.tiles[x].locked),x=i%n,y=Math.floor(i/n),before=s.game.board.tiles[i].rot;
 assert.equal(tapBlackout(s,12+x*w+w/2,12+y*w+w/2),true);assert.equal(s.game.board.tiles[i].rot,(before+1)%4);
 assert.equal(tapBlackout(s,600,300),false,'taps outside the board are ignored');
 stepBlackout(s,{energize:true},1/60);const f=s.game.fuses;stepBlackout(s,{energize:true},1/60);assert.equal(s.game.fuses,f,'holding Energize does not repeat');
 assert.ok(JSON.stringify(s).length<20000);assert.doesNotThrow(()=>structuredClone(s));
 assert.equal(A.hideMap,true);assert.equal(A.activeLimitSeconds,300);assert.deepEqual(A.controlProfile.right.map(x=>x[0]),['energize','scan']);
});
