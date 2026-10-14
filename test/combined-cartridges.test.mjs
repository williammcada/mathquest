import {BLACKLINE_PERSONAL} from '../public/cartridges/blackline.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {QuestSession} from './authenticated-session.mjs';
import {CARTRIDGES} from '../public/cartridges.js';
import {BRAND} from '../public/brand.js';
import {COASTAL_PERSONAL} from '../public/cartridges/coastal-escape.js';
import {HAVEN_PERSONAL} from '../public/cartridges/false-haven.js';

async function setup(id){
 const data=new Map(),ctx={storage:{get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),setAlarm:async()=>{}},blockConcurrencyWhile:fn=>fn()};
 const r=new QuestSession(ctx);
 const call=async(path,body)=>{const out=await r.fetch(new Request('https://test'+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{}));return {status:out.status,...await out.json()};};
 await call('/init',{code:'COMBINED',teacherKey:'teacher',config:{cartridgeId:id,gateCount:3,teamNames:['Crew'],modules:[{id:'number.gcf',itemCount:3,band:'beginner'}]}});
 const t=r.state.teams['team-1'];
 await call('/command',{type:'student.join',deviceId:'s0',alias:'Pilot',teamPin:t.pin});
 await call('/command',{type:'teacher.start',teacherKey:'teacher'});
 await call('/command',{type:'briefing.ready',deviceId:'s0'});
 return {r,t,ctx,call};
}

test('one backend catalog exposes all eight cartridge revisions and matching frontend version',async()=>{
 const out=await worker.fetch(new Request('https://test/api/catalog'),{});
 assert.equal(out.status,200);const catalog=await out.json();
 assert.equal(catalog.version,BRAND.engineVersion);
 assert.deepEqual(catalog.cartridges.map(c=>c.id).sort(),['blackline','blackout-protocol','coastal-escape','ironbreak','journey-west','kingsgate','nightfall','nightfall-false-haven','vault-7']);
 for(const c of CARTRIDGES)assert.equal(catalog.cartridges.find(x=>x.id===c.id).revision,c.revision);
});

test('other cartridges cannot consume Ironbreak, Coastal or rescue commands',async()=>{
 for(const c of CARTRIDGES){
  const {r,t,call}=await setup(c.id),before=structuredClone(r.state.attempts);
  for(const type of ['ironbreak.start','aerial.start','rescue.start']){
   if(type.startsWith('ironbreak.')&&c.id==='ironbreak'||type.startsWith('aerial.')&&c.id==='coastal-escape'||type.startsWith('rescue.')&&c.id==='nightfall')continue;
   const out=await call('/command',{type,deviceId:'s0',commandId:crypto.randomUUID()});assert.ok(out.status>=400,`${c.id} accepted ${type}`);
   assert.equal(t.stage,'gate');assert.deepEqual(r.state.attempts,before);
  }
 }
});

test('existing supported room versions reload without losing their issued configuration',async()=>{
 for(const version of ['0.9.2','0.9.4','0.9.5','0.9.6']){
  const {r,ctx}=await setup('nightfall');r.state.config.engineVersion=version;await r.save();
  const restored=new QuestSession(ctx);await restored.ready;
  const out=await restored.fetch(new Request('https://test/state?deviceId=s0'));
  assert.equal(out.status,200);assert.equal(restored.state.config.engineVersion,version);assert.equal(restored.state.teams['team-1'].stage,'gate');
 }
});

test('combined reports retain cartridge-specific assisted and terminal labels',async()=>{
 for(const [id,labels] of [['blackline',BLACKLINE_PERSONAL],['coastal-escape',COASTAL_PERSONAL],['nightfall-false-haven',HAVEN_PERSONAL]]){
  const {r,t}=await setup(id);
  for(const [outcome,label] of Object.entries(labels)){
   t.runs={s0:{runId:'test',status:'terminal',outcome,mode:'assisted',loadout:[],activeElapsedMs:0}};
   assert.equal(r.fateFor(r.state.students.s0).label,label);
  }
  if(id==='coastal-escape')assert.match(r.reportCsv(),/COASTAL ESCAPE · ENGAGEMENT ONLY/);
 }
});
