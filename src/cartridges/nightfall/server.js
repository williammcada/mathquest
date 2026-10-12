import {validateBlackline} from '../blackline/validation.js';
import {validateHaven} from '../false-haven/validation.js';

import {ironbreakCommand,ironbreakProjection,settleIronbreak} from '../ironbreak/server.js';
import {openRescue,rescueCommand,rescueProjection} from './rescue-server.js';
import {readyToLeave} from '../../engine/equipment.js';
import { cartridgeFor, sceneFor } from '../../../public/cartridges.js';
import {threatFor} from '../../../public/games/nightfall/config.js';
import {PICKUPS,doorRects,DISTRACTIONS,WINDOWS,seededEnemies} from '../../../public/games/nightfall/world.js';
import {dispatchHorde} from '../../../public/games/nightfall/simulation.js';
import {startSupply} from '../../engine/supply.js';
export const expansionFor = room => {
  const c=cartridgeFor(room.state.config.cartridgeId);
  return ['nightfall','nightfall-false-haven','ironbreak','coastal-escape','blackline'].includes(c?.id) && c.contract ? c : null;
};
const fail=error=>({error});
const key=items=>[...items].sort().join('|');
function winner(votes, members, leadId) {
  if(!members.every(m=>Object.hasOwn(votes,m.id)))return null;
  const counts={}; for(const m of members)counts[votes[m.id]]=(counts[votes[m.id]]||0)+1;
  const top=Math.max(...Object.values(counts));
  const tied=Object.keys(counts).filter(k=>counts[k]===top).sort();
  return tied.includes(votes[leadId])?votes[leadId]:tied[0];
}
export function advanceExpansion(room, team) {
  if(!room.members(team.id).every(m=>m.gateComplete))return;
  room.addEvent('gate-completed',`${team.name} secured ${room.state.config.gateNames[team.gateIndex]}`,team.id);
  if(team.gateIndex===0)team.stage='decision';
  else if(team.gateIndex===room.state.config.gateCount-1){team.currency=expansionFor(room).budget;team.stage='market';}
  else room.openGate(team,team.gateIndex+1);
}
export function settleRuns(room, forceTeam, outcome='teacher_advanced') {
  if(room.state.config.cartridgeId==='ironbreak')return settleIronbreak(room,forceTeam,outcome);
  let changed=false;
  for(const t of Object.values(room.state.teams)){
    if(t.stage!=='minigame')continue;
    const force=forceTeam==='*'||forceTeam===t.id;
    if(force||(!room.state.paused&&t.finaleDeadline&&Date.now()>=t.finaleDeadline)){
      for(const r of Object.values(t.runs))if(r.status!=='terminal')Object.assign(r,{status:'terminal',outcome:force?outcome:'timed_out',completedAt:new Date().toISOString()});
      changed=true;
    }
    if(Object.values(t.runs).length&&Object.values(t.runs).every(r=>r.status==='terminal')){t.stage='finale';t.actionCompletedAt=new Date().toISOString();room.addEvent('field-records-complete',`${t.name}: all field records are in; final decision open`,t.id);changed=true;}
  }
  if(changed)room.bump();
  return changed;
}
export function expansionCommand(room, student, input) {
  if(room.state.config.cartridgeId==='ironbreak')return ironbreakCommand(room,student,input);
  const c=expansionFor(room),t=room.teamFor(student),members=room.members(t.id),type=input.type;
  const respond=()=>{room.bump();return room.snapshot({deviceId:student.id});};
  if(type.startsWith('rescue.')&&c.id!=='nightfall')return fail('This chapter has no early rescue phase.');
  if(type.startsWith('rescue.'))return rescueCommand(room,student,input);
  if(type==='supply.start')return startSupply(room,student);
  if(type==='choice.vote'){
    if(!['decision','finale'].includes(t.stage))return fail('Voting is not open.');
    const choices=t.stage==='decision'?c.routes:c.choices;
    if(!choices.some(x=>x.id===input.choice))return fail('Choose an available option.');
    (t.stage==='decision'?t.votes:t.finalVotes)[student.id]=input.choice;
  }else if(type==='choice.resolve'){
    if(!['decision','finale'].includes(t.stage)||!room.isLead(student,t))return fail('Only the current Event Lead can resolve an open choice.');
    const selected=winner(t.stage==='decision'?t.votes:t.finalVotes,members,student.id);
    if(selected===null)return fail('Every crew member must vote first.');
    if(t.stage==='decision'){t.route=selected;if(c.id==='nightfall'&&['0.9.4','0.9.5','0.9.6','0.9.7','0.9.8'].includes(room.state.config.engineVersion))openRescue(room,t);else room.openGate(t,1);}
    else{
      t.finalAction=selected;t.stage='victory';t.completedAt=new Date().toISOString();
    }
    room.addEvent('choice-resolved',`${t.name} chose ${selected}`,t.id,student.id);
    t.leadIndex=(t.leadIndex+1)%members.length;
  }else if(type==='market.propose'){
    if(t.stage!=='market')return fail('The market is closed.');
    if(!Array.isArray(input.items)||input.items.length>2||new Set(input.items).size!==input.items.length)return fail('Choose at most two distinct items.');
    const prices=input.items.map(id=>c.items.find(x=>x.id===id));
    if(prices.some(x=>!x)||prices.reduce((s,x)=>s+x.cost,0)>t.currency)return fail('That basket exceeds the budget or contains an unavailable item.');
    t.marketSelections[student.id]=key(input.items);delete t.marketReady[student.id];
  }else if(type==='market.ready'){
    if(t.stage!=='market'||!Object.hasOwn(t.marketSelections,student.id))return fail('Choose a basket or save all credits first.');
    t.marketReady[student.id]=true;
  }else if(type==='market.continue'){
    if(t.stage!=='market'||!room.isLead(student,t)||!readyToLeave(room,t))return fail('The Event Lead must confirm all earned equipment before starting.');
    t.stage='minigame';t.leadIndex=(t.leadIndex+1)%members.length;
    t.finaleDeadline=c.teamWindowMs?Date.now()+c.teamWindowMs:null;t.runs={};t.threat??=1;
    for(const m of members)t.runs[m.id]={runId:crypto.randomUUID(),configRevision:c.revision,engineVersion:room.state.config.engineVersion,mapRevision:c.mapRevision||c.revision,assetRevision:c.assetRevision||'nightfall-art-2',threat:t.threat,status:'not_started',mode:'action',seq:0,activeElapsedMs:0,loadout:[...t.inventory],route:t.route,createdAt:Date.now()};
    room.addEvent('market-committed',`${t.name} equipped ${t.inventory.join('|')}`,t.id,student.id);
  }else if(type.startsWith('minigame.')){
    const r=t.runs?.[student.id];
    if(!r||r.runId!==input.runId||r.configRevision!==input.configRevision)return fail('This run does not match the issued configuration.');
    if(r.status==='terminal')return room.snapshot({deviceId:student.id});
    if(t.stage!=='minigame')return fail('The finale is closed.');
    if(type==='minigame.start'){
      if(!['action','assisted'].includes(input.mode))return fail('Choose action or assisted mode.');
      if(input.threat!==undefined&&input.threat!==r.threat)return fail('Mission conditions changed. Wait for the updated briefing, then start again.');
      if(r.status==='not_started'){t.threatLocked=true;r.status='active';r.startedAt=Date.now();r.mode=input.mode;t.frozenConfig||={threat:t.threat,route:t.route,loadout:[...t.inventory],roster:members.map(m=>m.id),revision:c.revision};}
    }else if(type==='minigame.assist'){
      r.mode='assisted';
    }else if(type==='minigame.progress'||type==='minigame.complete'){
      if(r.status!=='active')return fail('Start the run first.');
      const elapsed=input.activeElapsedMs;
      if(!Number.isFinite(elapsed)||elapsed<r.activeElapsedMs||elapsed>c.activeLimitMs||elapsed>Date.now()-r.startedAt+2000)return fail('Invalid run timing.');
      if(!Number.isInteger(input.seq)||input.seq<=r.seq)return fail('Stale run update.');
      if(!input.snapshot||typeof input.snapshot!=='object')return fail('A run snapshot is required.');
      if(JSON.stringify(input.snapshot).length>60000)return fail('Run snapshot is too large.');
      if(c.id==='blackline'){const error=validateBlackline(r,input);if(error)return fail(error);}
      else if(c.id==='nightfall-false-haven'){const error=validateHaven(r,input);if(error)return fail(error);}
      else if(input.snapshot){
        const s=input.snapshot,old=r.snapshot;
        if(s.threat!==r.threat)return fail('Threat conditions cannot change during a run.');
        const allowedEnemies=[...seededEnemies(r.threat),...(s.hordeTriggered?dispatchHorde():[])];
        if(!Array.isArray(s.enemies)||s.enemies.length!==allowedEnemies.length||new Set(s.enemies.map(e=>e.id)).size!==s.enemies.length||s.enemies.some(e=>{const original=allowedEnemies.find(a=>a.id===e.id),prior=old?.enemies?.find(a=>a.id===e.id);return !original||e.kind!==original.kind||!Number.isFinite(e.hp)||e.hp<0||e.hp>(prior?.hp??original.hp);}))return fail('Invalid enemy state.');
        if(!!s.garageHordeTriggered!==!!s.tasks?.battery||!!s.hordeTriggered!==!!s.garageHordeTriggered||old?.hordeTriggered&&!s.hordeTriggered)return fail('The garage horde cannot reset.');
        if(Object.entries(s.windows||{}).some(([id,broken])=>!WINDOWS.some(w=>w.id===id)||broken!==true)||Object.keys(old?.windows||{}).some(id=>!s.windows?.[id]))return fail('Broken windows cannot reset.');
        if(!Array.isArray(s.picked)||new Set(s.picked).size!==s.picked.length||s.picked.some(id=>!PICKUPS.some(p=>p.id===id))||old?.picked?.some(id=>!s.picked.includes(id)))return fail('Invalid pickup history.');
        for(const field of ['shots','hits','blocks','heals','doorUses','doorsBroken','distractionsUsed','shotgunShots'])if(!Number.isInteger(s[field])||s[field]<0||s[field]<(old?.[field]||0)||s[field]>100000)return fail('Invalid gameplay counters.');
        const newAmmo=PICKUPS.filter(p=>p.kind==='ammo'&&s.picked.includes(p.id)&&!old?.picked?.includes(p.id)).reduce((n,p)=>n+p.amount+threatFor(r.threat).pickupBonus,0);
        if(typeof s.shotgun!=='boolean'||s.shotgun!==s.picked.includes('shotgun')||!Number.isInteger(s.shells)||s.shells<0||s.shells>8||!['primary','shotgun'].includes(s.weapon)||s.weapon==='shotgun'&&!s.shotgun||s.shotgunShots>s.shots)return fail('Invalid shotgun state.');
        if(s.shells>(old?.shells||0)+(s.shotgun&&!old?.shotgun?8:0)-(s.shotgunShots-(old?.shotgunShots||0)))return fail('Shotgun shells cannot refill.');
        if(s.doors?.store?.closed!==true||s.doors?.store?.hp!==100)return fail('The storefront remains locked.');
        const initialAmmo=12+(r.loadout.includes('ammo-pouch')?24:0);
        if(s.ammo>(old?.ammo??initialAmmo)+newAmmo-((s.shots-s.shotgunShots)-((old?.shots||0)-(old?.shotgunShots||0))))return fail('Ammunition cannot be created without a pickup.');
        if(!s.doors||Object.keys(s.doors).some(id=>!doorRects().some(d=>d.id===id))||doorRects().some(d=>!s.doors[d.id]||!Number.isFinite(s.doors[d.id].hp)||s.doors[d.id].hp<0||s.doors[d.id].hp>100||typeof s.doors[d.id].closed!=='boolean'||s.doors[d.id].hp>(old?.doors?.[d.id]?.hp??100)))return fail('Invalid door state.');
        if(!s.distractions||Object.keys(s.distractions).some(id=>!DISTRACTIONS.some(d=>d.id===id))||Object.keys(old?.distractions||{}).some(id=>!s.distractions[id]))return fail('Invalid distraction history.');
        const vest=r.loadout.includes('vest')?2:0,medkit=r.loadout.includes('medkit')?1:0;
        if(s.revision!==r.configRevision||!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<0||s.x>2560||s.y<0||s.y>1280)return fail('Invalid snapshot configuration or position.');
        const dependencies={power:['fuse'],battery:['power'],installed:['battery'],escape:['installed','keys']};
        if(!s.tasks||Object.keys(s.tasks).some(k=>!['fuse','power','keys','battery','installed','escape','survivor'].includes(k)))return fail('Invalid objective state.');
        for(const [id,requires] of Object.entries(dependencies))if(s.tasks[id]&&!requires.every(k=>s.tasks[k]))return fail('Objective prerequisites are missing.');
        if(old?.tasks&&Object.keys(old.tasks).some(k=>old.tasks[k]&&!s.tasks[k]))return fail('Completed objectives cannot be removed.');
        if(input.outcome==='success'&&(!s.tasks.escape||s.health<=0))return fail('Repair the bus and reach it alive before completing the run.');
        if(['lost','setback'].includes(input.outcome)&&s.health!==0)return fail('A lost field record requires zero health.');
        if(input.outcome==='timed_out'&&elapsed<7190000)return fail('The review envelope has not elapsed.');
        for(const [field,max] of [['health',3],['ammo',r.loadout.includes('ammo-pouch')?84:60],['vest',vest],['medkit',medkit]])if(!Number.isInteger(s[field]*(field==='health'?2:1))||s[field]<0||s[field]>max)return fail('Invalid equipment or health state.');
        if(s.damage!==(r.loadout.includes('carbine')?2:1)||old&&(s.vest>old.vest||s.medkit>old.medkit))return fail('Equipment cannot recharge during a run.');
      }
      if(!['nightfall-false-haven','blackline'].includes(c.id)&&type==='minigame.complete'&&!['success','lost','setback','timed_out'].includes(input.outcome))return fail('Invalid finale outcome.');
      r.seq=input.seq;r.activeElapsedMs=elapsed;
      if(input.snapshot)r.snapshot=input.snapshot;
      if(type==='minigame.complete'){
        r.status='terminal';r.outcome=input.outcome;r.completedAt=new Date().toISOString();
        r.validation='client-reported; server-validated envelope';
        room.addEvent('minigame-complete',`${student.alias}: ${r.outcome}`,t.id,student.id);settleRuns(room);
      }
    }else return fail('Unknown finale command.');
  }else return fail('This action is not available in this cartridge.');
  return respond();
}
export function expansionProjection(room, team, teacher, viewer, base) {
  if(room.state.config.cartridgeId==='ironbreak')return ironbreakProjection(room,team,teacher,viewer,base);
  const c=expansionFor(room),members=room.members(team.id),mine=viewer?.teamId===team.id;
  const tally=values=>Object.values(values).reduce((r,v)=>(r[v]=(r[v]||0)+1,r),{});
  const runs=team.runs||{};
  return {...base,rescue:rescueProjection(room,team,teacher,viewer),scene:sceneFor(c,team,room.state.config.gateNames,members),
    ...(teacher?{threat:team.threat??1,threatLocked:!!team.threatLocked}:{}),
    supply:teacher||mine?team.supply||null:null,
    voteTotals:tally(team.votes),finalVoteTotals:tally(team.finalVotes),marketSelectionTotals:tally(team.marketSelections),
    myMarketSelection:mine?(team.marketSelections[viewer.id]??null):undefined,
    finale:teacher||mine?{deadline:team.finaleDeadline,serverNow:Date.now(),pausedAt:room.state.pausedAt,run:mine?runs[viewer.id]:undefined,results:teacher?members.map(m=>({studentId:m.id,alias:m.alias,...runs[m.id]})):undefined}:null,
    members:base.members?.map((m,i)=>({...m,minigameComplete:runs[members[i].id]?.status==='terminal'}))};
}
