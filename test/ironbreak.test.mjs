import test from 'node:test';
import assert from 'node:assert/strict';
import {QuestSession} from './authenticated-session.mjs';
import {step,damage} from '../public/games/shooter/simulation.js';
import {WORLD} from '../public/games/shooter/world.js';
const LOOP=WORLD.boss.entryX-5376;
import {IRONBREAK,GUIDED,ironbreakScene} from '../public/cartridges/ironbreak.js';
import {cartridgeFor,gateNames} from '../public/cartridges.js';
import {fixture,call,cmd,runCmd,progress} from './ironbreak-fixture.mjs';
test('Ironbreak 3/4/5 gates, both priorities and every ending retain complete story and separate math evidence',async()=>{
 for(const gates of [3,4,5])for(const route of ['pumps','workers'])for(const choice of ['isolate','restore','share']){
  const {r,t,lead}=await fixture({gates,route});const mathBefore=structuredClone(r.state.attempts);
  for(const id of ['s0','s1']){assert.equal((await runCmd(r,t,'start',{mode:'assisted'},id)).http,200);for(let n=0;n<3;n++){const out=await runCmd(r,t,'guide',{step:n,choice:GUIDED[n].answer},id);assert.equal(out.http,200,out.error);}}
  assert.equal(t.stage,'finale');for(const id of ['s0','s1'])await cmd(r,'choice.vote',{deviceId:id,choice});await cmd(r,'choice.resolve',{deviceId:lead()});assert.equal(t.stage,'victory');assert.deepEqual(r.state.attempts,mathBefore);assert.equal(r.report().gameplayEvidence.length,2);assert.match(r.reportCsv(),/IRONBREAK · ENGAGEMENT ONLY/);assert.ok(!r.reportCsv().includes('NIGHTFALL · ENGAGEMENT ONLY'));assert.equal(t.finalAction,choice);
  const scene=ironbreakScene(t,gateNames(IRONBREAK,gates),r.members(t.id));assert.ok(scene.paragraphs.length>=3);assert.ok(scene.paragraphs.every(p=>typeof p==='string'));
 }
});
test('extra mathematics alone unlocks multiple distinct frozen upgrades; loadout tampering is rejected',async()=>{
 const {r,t}=await fixture({prepare:2});assert.equal(t.equipmentBlocks.length,2);assert.deepEqual(t.runs.s0.loadout,['agility','armor','spread']);assert.equal(t.runs.s0.snapshot.player.hp,4);assert.equal(r.state.students.s0.itemsCompleted,7);
 await runCmd(r,t,'start',{mode:'action'});const s=structuredClone(t.runs.s0.snapshot);s.upgrades=[];assert.equal((await progress(r,t,s)).http,400);
 const base=await fixture();assert.equal(base.t.inventory.length,1);assert.equal(base.t.runs.s0.snapshot.player.hp,3);assert.equal((await cmd(base.r,'market.propose',{deviceId:'s0',items:['spread','armor']})).http,400);
});
test('server alarm closes unstarted/disconnected suits; teacher pause shifts deadline once and stale starts cannot reopen',async()=>{
 const real=Date.now;let now=real();Date.now=()=>now;
 try{const {r,t,ctx}=await fixture();const deadline=t.finaleDeadline;assert.equal(ctx.storage.alarmAt,deadline);
  now+=1000;await cmd(r,'teacher.pause',{teacherKey:'teacher'});now+=400000;await r.alarm();assert.equal(t.stage,'minigame');await cmd(r,'teacher.pause',{teacherKey:'teacher'});assert.equal(t.finaleDeadline,deadline+400000);
  await runCmd(r,t,'start',{mode:'action'});now=t.finaleDeadline+1;await r.alarm();assert.equal(t.stage,'finale');assert.equal(t.runs.s0.outcome,'time_window_closed');assert.equal(t.runs.s1.outcome,'not_started');await runCmd(r,t,'start',{mode:'action'});assert.equal(t.stage,'finale');assert.equal(ctx.storage.alarmAt,r.state.expiresAt);
  const restored=new QuestSession(ctx);await restored.ready;assert.equal(restored.state.teams[t.id].runs.s0.outcome,'time_window_closed');
 }finally{Date.now=real;}
});
test('three lives, authoritative retries, new attempt identities and idempotency preserve equipment and elapsed time',async()=>{
 const {r,t}=await fixture();await runCmd(r,t,'start',{mode:'action'});const deadline=t.finaleDeadline;
 for(let death=0;death<3;death++){
  const s=structuredClone(t.runs.s0.snapshot);while(s.player.hp){s.player.immunity=0;damage(s);}const out=await progress(r,t,s);assert.equal(out.http,200,out.error);assert.equal(t.runs.s0.lives,2-death);
  if(death<2){const prior=structuredClone(t.runs.s0);assert.equal((await runCmd(r,t,'retry')).http,200);assert.notEqual(t.runs.s0.attemptId,prior.attemptId);assert.equal(t.runs.s0.snapshot.player.hp,3);assert.equal(t.runs.s0.attempt,death+2);assert.equal(t.finaleDeadline,deadline);
   const stale=await cmd(r,'ironbreak.progress',{deviceId:'s0',runId:prior.runId,phaseId:prior.phaseId,attemptId:prior.attemptId,configRevision:prior.configRevision,seq:99,activeElapsedMs:0,snapshot:s});assert.match(stale.error,/stale/);
  }
 }
 assert.equal(t.runs.s0.outcome,'defeated');await runCmd(r,t,'retry');assert.equal(t.runs.s0.lives,0);assert.equal(t.stage,'minigame');await cmd(r,'teacher.advanceFinale',{teacherKey:'teacher',teamId:t.id});assert.equal(t.stage,'finale');assert.equal(t.runs.s0.outcome,'defeated');assert.equal(t.runs.s1.outcome,'teacher_advanced');
});
test('real simulation progress persists and restores without refilling; known identities and bounded state reject tampering',async()=>{
 const real=Date.now;let now=real();Date.now=()=>now;
 try{const {r,t,ctx}=await fixture();await runCmd(r,t,'start',{mode:'action'});const s=structuredClone(t.runs.s0.snapshot);
  for(let k=0;k<4;k++){for(let i=0;i<60;i++)step(s,{x:1,fire:true},1/60);now+=1000;const out=await progress(r,t,s);assert.equal(out.http,200,out.error);}
  const restored=new QuestSession(ctx);await restored.ready;assert.equal(restored.state.teams[t.id].runs.s0.snapshot.player.hp,s.player.hp);assert.equal(restored.state.teams[t.id].runs.s0.activeElapsedMs,4000);
  const base=structuredClone(t.runs.s0.snapshot);
  for(const edit of [x=>x.player.hp=4,x=>x.lives=4,x=>x.attempt=2,x=>x.checkpoint='BOSS',x=>x.enemies[0].hp=999,x=>x.player.immunity=100,x=>x.activeTime=-1,x=>x.enemies[0]=null,x=>x.bullets=Array(501).fill({}),x=>{x.status='terminal';x.outcome='success';}]){const bad=structuredClone(base);edit(bad);assert.equal((await progress(r,t,bad)).http,400);}
 }finally{Date.now=real;}
});
test('guided wrong responses preserve steps; switch is irreversible; student sees only own run; deletion removes saved server state',async()=>{
 const {r,t}=await fixture();await runCmd(r,t,'start',{mode:'action'});await runCmd(r,t,'assist');const bad=await runCmd(r,t,'guide',{step:0,choice:'rush'});assert.ok(bad.guideFeedback);assert.equal(t.runs.s0.guidedStep,0);await runCmd(r,t,'start',{mode:'action'});assert.equal(t.runs.s0.mode,'assisted');assert.equal((await progress(r,t,t.runs.s0.snapshot)).http,400);
 const student=await call(r,'/state?deviceId=s0');assert.equal(student.teams[0].finale.results,undefined);assert.equal(student.teams[0].finale.run.runId,t.runs.s0.runId);
 const replayId=crypto.randomUUID(),extra={commandId:replayId,step:0,choice:'wait'};await runCmd(r,t,'guide',extra);await runCmd(r,t,'guide',extra);assert.equal(t.runs.s0.guidedStep,1);
 const response=await r.fetch(new Request('https://test/delete?teacherKey=teacher',{method:'POST',body:'{}'}));assert.equal(response.status,200);assert.equal((await call(r,'/state?deviceId=s0')).http,410);
});

test('real boss fight snapshots pass the live validator through success; checkpoint retries reset only the issued section',async()=>{
 const {createGame}=await import('../public/games/shooter/simulation.js');const real=Date.now;let now=real();Date.now=()=>now;
 try{const {r,t}=await fixture();await runCmd(r,t,'start',{mode:'action'});const a=t.runs.s0;
 // Isolated boss-checkpoint fixture, followed exclusively by ordinary simulation input.
 a.snapshot=createGame({upgrades:a.loadout,checkpoint:'BOSS',timed:false});a.checkpoint='BOSS';let s=structuredClone(a.snapshot);
 let seconds=0;
 for(let n=0;n<12000&&s.status==='active';n++){
  const p=s.player,b=s.enemies.find(e=>e.type==='boss');let x=p.x<(5840+LOOP)?1:p.x>(6040+LOOP)?-1:0,y=0,jump=p.vy<0;
  if(s.bossActive){if(s.bullets.some(a=>a.side==='enemy'&&a.vx<0&&a.y>322&&a.x-p.x<75&&a.x>p.x-20)&&p.grounded)jump=true;if(s.bullets.some(a=>a.side==='enemy'&&a.vx<0&&a.y>300&&a.y<320&&a.x-p.x<180&&a.x>p.x-20)&&p.grounded)y=1;if(b.attack==='overhead'&&(b.state==='warning'||b.state==='attack')&&Math.abs(p.x-b.targetX)<55)x=b.targetX<(5920+LOOP)?1:-1;else if(x===0&&p.facing<0)x=1;if(b.mortarTargets&&(b.state==='warning'||b.state==='attack')){const m=b.mortarTargets.find(t=>Math.abs(p.x-t)<36);if(m!==undefined)x=p.x<m?-1:1;}}
  step(s,{x,y,jump,fire:true});now+=1000/60;
  if(n%60===59||s.status!=='active'){const result=await progress(r,t,s);assert.equal(result.http,200,result.error);seconds++;}
 }
 assert.equal(a.outcome,'success');assert.ok(seconds>=20);assert.equal(a.snapshot.enemies.find(e=>e.type==='boss').hp,0);
 const other=await fixture();await runCmd(other.r,other.t,'start',{mode:'action'});const run=other.t.runs.s0;run.snapshot=createGame({upgrades:run.loadout,checkpoint:'MID',timed:false});run.checkpoint='MID';const down=structuredClone(run.snapshot);while(down.player.hp){down.player.immunity=0;damage(down);}assert.equal((await progress(other.r,other.t,down)).http,200);await runCmd(other.r,other.t,'retry');assert.equal(run.snapshot.enemies.find(e=>e.id==='H01').hp,0);assert.equal(run.checkpoint,'MID');assert.equal(run.snapshot.player.hp,3);
 }finally{Date.now=real;}
});
test('swimming in floor water for several seconds keeps passing the live validator',async()=>{
 const real=Date.now;let now=real();Date.now=()=>now;
 try{const {r,t}=await fixture();await runCmd(r,t,'start',{mode:'action'});const s=structuredClone(t.runs.s0.snapshot);
  const water=WORLD.layers.Water[0];Object.assign(s.player,{x:water.x+200,y:water.surface_y-40,vy:0,grounded:false});
  for(const e of s.enemies)e.hp=e.hp;for(const h of s.hazards)h.armed=false;
  for(let k=0;k<6;k++){for(let i=0;i<60;i++){s.player.immunity=Math.min(s.player.immunity,1.5);step(s,{x:k%2?1:-1},1/60);}now+=1000;assert.ok(s.player.swimming||k===0);const out=await progress(r,t,s);assert.equal(out.http,200,`${k}: ${out.error}`);}
 }finally{Date.now=real;}
});
