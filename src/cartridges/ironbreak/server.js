import {IRONBREAK,GUIDED,ironbreakScene} from '../../../public/cartridges/ironbreak.js';
import {createGame,retry,clearInput} from '../../../public/games/shooter/simulation.js';
import {WORLD} from '../../../public/games/shooter/world.js';
import {readyToLeave} from '../../engine/equipment.js';
const fail=error=>({error}),copy=structuredClone,rank={START:0,MID:1,MID2:2,BOSS:3},WIDTH=WORLD.world.width,GUARDS=WORLD.layers.Gates.filter(g=>g.type==='enemy_gate'),REACH=Object.fromEntries(WORLD.layers.Checkpoints.map(c=>[c.id,c.id==='BOSS'?WORLD.boss.entryX+24:c.spawn_x-440]));
const stamp=()=>new Date().toISOString();
export function advanceIronbreak(room,t){
 if(!room.members(t.id).every(m=>m.gateComplete))return;
 room.addEvent('gate-completed',`${t.name}: ${room.state.config.gateNames[t.gateIndex]}`,t.id);
 if(t.gateIndex===0)t.stage='decision';else if(t.gateIndex===room.state.config.gateCount-1)t.stage='market';else room.openGate(t,t.gateIndex+1);
}
export function settleIronbreak(room,forceTeam,outcome='teacher_advanced'){
 if(room.state.config.cartridgeId!=='ironbreak')return false;
 let changed=false;
 for(const t of Object.values(room.state.teams)){
  if(t.stage!=='minigame')continue;
  const force=forceTeam==='*'||forceTeam===t.id;
  if(force||!room.state.paused&&Date.now()>=t.finaleDeadline){
   for(const r of Object.values(t.runs||{}))if(r.status!=='terminal'){
    r.outcome=force?outcome:r.status==='not_started'?'not_started':'time_window_closed';
    r.closureReason=force?'teacher_closed':'time_window_closed';r.status='terminal';r.completedAt=stamp();changed=true;
   }
  }
  if(Object.values(t.runs||{}).length&&Object.values(t.runs).every(r=>r.status==='terminal')){t.stage='finale';t.actionCompletedAt=stamp();room.addEvent('field-records-complete',`${t.name}: Ironbreak final decision open`,t.id);changed=true;}
 }
 if(changed)room.bump();return changed;
}
function winner(votes,members,lead){
 if(!members.every(m=>Object.hasOwn(votes,m.id)))return null;
 const counts={};for(const m of members)counts[votes[m.id]]=(counts[votes[m.id]]||0)+1;
 const high=Math.max(...Object.values(counts)),ties=Object.keys(counts).filter(k=>counts[k]===high).sort();return ties.includes(votes[lead])?votes[lead]:ties[0];
}
export function openRuns(room,t,members){
 t.stage='minigame';t.finaleDeadline=Date.now()+300000;t.runs={};t.phaseId=crypto.randomUUID();
 for(const m of members){const s=createGame({upgrades:t.inventory,timed:false});t.runs[m.id]={runId:crypto.randomUUID(),attemptId:crypto.randomUUID(),phaseId:t.phaseId,configRevision:IRONBREAK.revision,mapRevision:WORLD.revision,engineVersion:room.state.config.engineVersion,status:'not_started',mode:'action',seq:0,activeElapsedMs:0,attempt:1,loadout:[...t.inventory],checkpoint:'START',lives:3,snapshot:s,guidedStep:0,createdAt:Date.now(),validation:'client-reported; server-validated envelope'};}
 room.addEvent('ironbreak-opened',`${t.name}: five-minute suit operation`,t.id);
}
function finiteTree(value,depth=0){if(depth>12)return false;if(typeof value==='number')return Number.isFinite(value)&&Math.abs(value)<=1e8;if(value===null||['string','boolean'].includes(typeof value))return true;if(Array.isArray(value))return value.length<=500&&value.every(x=>finiteTree(x,depth+1));if(typeof value==='object')return Object.keys(value).length<=100&&Object.values(value).every(x=>finiteTree(x,depth+1));return false;}
export function validateSnapshot(r,s,elapsed,now=Date.now()){
 const old=r.snapshot;
 if(!s||typeof s!=='object'||JSON.stringify(s).length>60000||!finiteTree(s))return 'Invalid or oversized suit snapshot.';
 if(s.revision!==r.mapRevision||s.timed!==false||s.deadline!==null||JSON.stringify(s.upgrades)!==JSON.stringify(r.loadout))return 'Suit configuration cannot change.';
 if(!Number.isFinite(elapsed)||elapsed<r.activeElapsedMs||elapsed>300000||elapsed>now-r.startedAt+2000||Math.abs(s.activeTime*1000-elapsed)>2||s.t<s.activeTime-.01)return 'Invalid cumulative run timing.';
 if(s.attempt!==r.attempt||s.activeTime<old.activeTime||s.t<old.t)return 'Attempt or clock cannot reset.';
 if(!['active','downed','terminal'].includes(s.status)||!Object.hasOwn(rank,s.checkpoint)||rank[s.checkpoint]<rank[r.checkpoint])return 'Invalid run state or checkpoint.';
 const p=s.player,capacity=r.loadout.includes('armor')?4:3;
 if(!p||['x','y','vx','vy','h','facing','aimX','aimY','hp','maxHP','immunity','shot','coyote','jumpBuffer','jumps','dropUntil'].some(k=>!Number.isFinite(p[k]))||['grounded','swimming'].some(k=>typeof p[k]!=='boolean')||!p.safe||!Number.isFinite(p.safe.x)||!Number.isFinite(p.safe.y))return 'Invalid suit fields.';
 if(!p||!Number.isInteger(p.hp)||p.hp<0||p.hp>capacity||p.maxHP!==capacity||p.x<0||p.x>WIDTH||p.y<0||p.y>700||Math.abs(p.vx)>500||Math.abs(p.vy)>1200||p.immunity<0||p.immunity>1.51||![10,16,22,28].includes(p.h))return 'Invalid suit health or position.';
 if(!['stand','crouch','prone'].includes(p.stance)||p.climbing!==null&&!WORLD.layers.Ladders.some(l=>l.id===p.climbing)||!p.safe||p.safe.x<0||p.safe.x>WIDTH||p.safe.y<0||p.safe.y>640||p.shot<0||p.shot>.17||p.jumps<0||p.jumps>2||p.dropUntil>s.t+.4)return 'Invalid suit movement state.';
 for(const k of ['damage','kills','volley'])if(!Number.isInteger(s[k])||s[k]<old[k]||s[k]>100000)return 'Counters cannot reset.';
 const dead=p.hp===0;
 if(s.lives!==r.lives-(dead?1:0)||s.status==='downed'&&(!dead||s.lives<1)||dead&&s.lives>0&&s.status!=='downed'||dead&&!s.lives&&(s.status!=='terminal'||s.outcome!=='defeated')||!dead&&s.lives<1)return 'Invalid life transition.';
 if(!Array.isArray(s.enemies)||s.enemies.length!==old.enemies.length||s.enemies.some((e,i)=>!e||e.id!==old.enemies[i].id||e.type!==old.enemies[i].type||!Number.isInteger(e.hp)||e.hp<0||e.hp>old.enemies[i].hp||e.maxHP!==old.enemies[i].maxHP||e.x<0||e.x>WIDTH||e.y<0||e.y>700||e.clock< -300||e.clock>1000))return 'Invalid robot state.';
 if(!Array.isArray(s.pickups)||s.pickups.length!==old.pickups.length||s.pickups.some((p,i)=>p.id!==old.pickups[i].id||typeof p.collected!=='boolean'||old.pickups[i].collected&&!p.collected))return 'Invalid repair history.';
 const repairs=s.pickups.filter((p,i)=>p.collected&&!old.pickups[i].collected).length;
 if(p.hp>old.player.hp+repairs-(s.damage-old.damage)||s.damage-old.damage<old.player.hp+repairs-p.hp&&repairs===0)return 'Health requires a repair or recorded damage.';
 if(!Array.isArray(s.hazards)||s.hazards.length!==old.hazards.length||s.hazards.some((h,i)=>h.id!==old.hazards[i].id||!['idle','warning','active'].includes(h.state)||h.clock<0||h.clock>1000))return 'Invalid hazard state.';
 for(const [layer,key]of [['Enemies','enemies'],['Hazards','hazards'],['Pickups','pickups']])for(const v of s[key]){const authored=WORLD.layers[layer].find(a=>a.id===v.id);if(!authored||Object.entries(authored).some(([k,val])=>!['hp','x','y'].includes(k)&&JSON.stringify(v[k])!==JSON.stringify(val))||key!=='enemies'&&(v.x!==authored.x||v.y!==authored.y))return 'Authored entity configuration cannot change.';}
 if(!Array.isArray(s.bullets)||s.bullets.length>150||!Array.isArray(s.effects)||s.effects.length>80)return 'Invalid transient state.';
 for(const gate of GUARDS){const cp=WORLD.layers.Checkpoints.find(c=>c.requires_enemy_defeated===gate.enemy);if(rank[s.checkpoint]>=rank[cp.id]&&s.enemies.find(e=>e.id===gate.enemy).hp!==0)return 'The transfer guard still blocks the checkpoint.';}
 if(rank[s.checkpoint]>rank[r.checkpoint]&&p.x<REACH[s.checkpoint])return 'Reach the checkpoint before recording it.';
 if(s.outcome==='success'&&(s.enemies.find(e=>e.type==='boss').hp!==0||s.checkpoint!=='BOSS'||dead||s.status!=='terminal'))return 'Disable the security robot before recording success.';
 if(s.outcome!==null&&!['success','defeated'].includes(s.outcome)||s.status==='terminal'&&!s.outcome||s.status!=='terminal'&&s.outcome)return 'Invalid action outcome.';
 return null;
}
// Keep authored geometry/identity server-owned. Discard only transient projectiles on
// recovery; this never restores supplies, lives or timers.
function sanitizedSnapshot(s){
 const out=copy(s);for(const [layer,key]of [['Enemies','enemies'],['Hazards','hazards'],['Pickups','pickups']])out[key]=out[key].map(v=>({...v,...copy(WORLD.layers[layer].find(x=>x.id===v.id)),...(key==='enemies'?{x:v.x,y:v.y,hp:v.hp}: {})}));
 out.bullets=[];out.effects=[];out.events=[];out.prev={};out.lastDown=-10;return out;
}
export function ironbreakCommand(room,student,input){
 const t=room.teamFor(student),members=room.members(t.id),type=input.type;
 const reply=()=>{room.bump();return room.snapshot({deviceId:student.id});};
 if(type==='choice.vote'){
  if(!['decision','finale'].includes(t.stage))return fail('Voting is not open.');
  if(!(t.stage==='decision'?IRONBREAK.routes:IRONBREAK.choices).some(o=>o.id===input.choice))return fail('Choose an available option.');
  (t.stage==='decision'?t.votes:t.finalVotes)[student.id]=input.choice;return reply();
 }
 if(type==='choice.resolve'){
  if(!['decision','finale'].includes(t.stage)||!room.isLead(student,t))return fail('Only the Event Lead can resolve the open vote.');
  const result=winner(t.stage==='decision'?t.votes:t.finalVotes,members,student.id);if(result===null)return fail('Every crew member must vote.');
  if(t.stage==='decision'){t.route=result;room.openGate(t,1);}else{t.finalAction=result;t.stage='victory';t.completedAt=stamp();}
  t.leadIndex=(t.leadIndex+1)%members.length;room.addEvent('choice-resolved',`${t.name}: ${result}`,t.id);return reply();
 }
 if(type==='market.continue'){
  if(t.stage!=='market'||!room.isLead(student,t)||!readyToLeave(room,t)||t.inventory.some(id=>!IRONBREAK.items.some(i=>i.id===id)))return fail('Confirm all earned equipment first.');
  openRuns(room,t,members);return reply();
 }
 if(!type.startsWith('ironbreak.'))return fail('This action is not available in Ironbreak.');
 const r=t.runs?.[student.id];
 if(!r||r.runId!==input.runId||r.phaseId!==input.phaseId||r.configRevision!==input.configRevision)return fail('Run configuration does not match.');
 if(r.status==='terminal')return room.snapshot({deviceId:student.id});
 if(t.stage!=='minigame')return fail('The operation is closed.');
 if(r.attemptId!==input.attemptId)return fail('This attempt is stale. Reload the current suit state.');
 if(type==='ironbreak.start'){
  if(!['action','assisted'].includes(input.mode))return fail('Choose action or guided play.');
  if(r.status==='not_started'){r.status='active';r.startedAt=Date.now();r.mode=input.mode;}
  return reply();
 }
 if(type==='ironbreak.assist'){
  if(!['active','downed'].includes(r.status))return fail('Start the operation first.');
  r.mode='assisted';r.status='active';clearInput(r.snapshot);return reply();
 }
 if(type==='ironbreak.guide'){
  if(r.mode!=='assisted'||r.status!=='active'||input.step!==r.guidedStep)return fail('This guided step is no longer current.');
  const task=GUIDED[r.guidedStep];if(!task?.options.some(([id])=>id===input.choice))return fail('Choose a displayed response.');
  if(input.choice!==task.answer)return {...reply(),guideFeedback:task.explanation};
  r.guidedStep++;if(r.guidedStep===GUIDED.length){r.status='terminal';r.outcome='assisted_success';r.completedAt=stamp();r.validation='server-recorded tactical choices';settleIronbreak(room);}return reply();
 }
 if(type==='ironbreak.retry'){
  if(r.mode!=='action'||r.status!=='downed'||r.lives<1)return fail('A retry requires a downed suit and remaining lives.');
  if(!retry(r.snapshot))return fail('This suit cannot retry.');
  r.attemptId=crypto.randomUUID();r.attempt=r.snapshot.attempt;r.status='active';r.seq=0;return reply();
 }
 if(type==='ironbreak.progress'){
  if(r.mode!=='action'||r.status!=='active')return fail('An active action run is required.');
  if(!Number.isInteger(input.seq)||input.seq<=r.seq)return fail('Stale run sequence.');
  const error=validateSnapshot(r,input.snapshot,input.activeElapsedMs);if(error)return fail(error);
  const s=input.snapshot;r.snapshot=sanitizedSnapshot(s);r.seq=input.seq;r.activeElapsedMs=input.activeElapsedMs;r.lives=s.lives;r.checkpoint=s.checkpoint;r.status=s.status;
  if(s.status==='terminal'){r.outcome=s.outcome;r.completedAt=stamp();room.addEvent('minigame-complete',`${student.alias}: ${r.outcome}`,t.id,student.id);settleIronbreak(room);}return reply();
 }
 return fail('Unknown Ironbreak command.');
}
export function ironbreakProjection(room,t,teacher,viewer,base){
 const mine=viewer?.teamId===t.id,members=room.members(t.id),tally=values=>Object.values(values).reduce((a,k)=>(a[k]=(a[k]||0)+1,a),{});
 return {...base,scene:ironbreakScene(t,room.state.config.gateNames,members),voteTotals:teacher||members.every(m=>t.votes[m.id])?tally(t.votes):undefined,finalVoteTotals:teacher||members.every(m=>t.finalVotes[m.id])?tally(t.finalVotes):undefined,
 finale:teacher||mine?{deadline:t.finaleDeadline,serverNow:Date.now(),pausedAt:room.state.pausedAt,run:mine?t.runs?.[viewer.id]:undefined,results:teacher?members.map(m=>({studentId:m.id,alias:m.alias,...t.runs?.[m.id]})):undefined}:null,
 members:base.members?.map((m,i)=>({...m,minigameComplete:t.runs?.[members[i].id]?.status==='terminal'}))};
}
