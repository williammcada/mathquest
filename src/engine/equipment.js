// Authoritative equipment entitlement: completion rewards never modify mastery.
import {extendAssignments} from './extensions.js';
import {cartridgeFor} from '../../public/cartridges.js';
export const vaultItems=[{id:'scanner',title:'Code Scanner',text:'Restores corrupted cipher information.'},{id:'toolkit',title:'Silent Toolkit',text:'Jam security for three seconds at each checkpoint.'},{id:'cloak',title:'Cloak',text:'Five seconds of stealth, once per run.'}];
export const equipmentItems=room=>cartridgeFor(room.state.config.cartridgeId)?.items||vaultItems;
export const equipmentSlots=t=>Math.min(3,1+(t.equipmentBlocks||[]).length);
export function equipmentCommand(room,student,input){
 const t=room.teamFor(student),members=room.members(t.id),items=equipmentItems(room),ids=items.map(i=>i.id);
 const fail=error=>({error});
 if(t.stage!=='market')return fail('Equipment preparation is not open.');
 const reply=()=>{room.bump();return room.snapshot({deviceId:student.id});};
 if(input.type==='market.select'||input.type==='market.propose'){
  const selected=input.items||[input.item];
  if(!Array.isArray(selected)||selected.length>equipmentSlots(t)||new Set(selected).size!==selected.length||selected.some(id=>!ids.includes(id)))return fail(`Choose ${equipmentSlots(t)} distinct resources.`);
  t.marketSelections[student.id]=[...selected].sort().join('|');delete t.marketReady[student.id];
  room.addEvent('equipment-recommendation',`${student.alias}: ${t.marketSelections[student.id]}`,t.id,student.id);return reply();
 }
 if(input.type==='market.ready'){
  if(!t.marketSelections[student.id]||t.marketSelections[student.id].split('|').length!==equipmentSlots(t))return fail('Choose your equipment first.');
  t.marketReady[student.id]=true;return reply();
 }
 if(input.type==='equipment.extend'||input.type==='supply.start'){
  if(!room.isLead(student,t))return fail('Only the Event Lead can request extra preparation.');
  if(room.state.config.cartridgeId==='coastal-escape'&&!t.supply?.count)return fail('Gate sizes differ. Ask your teacher to set the extra preparation question count.');
  if(equipmentSlots(t)>=3)return fail('All three equipment slots are unlocked.');
  const moduleIds=t.supply?.moduleIds||room.state.config.modules.filter(m=>(m.source==='engine'||m.source==='preset')).map(m=>m.id);
  if(!moduleIds.length&&!t.supply?.allowReuse)return fail('Ask the teacher to enable reuse of imported questions for extra preparation.');
  const result=extendAssignments(room,{count:t.supply?.count||3,placement:'last',policy:'keep',studentIds:members.map(s=>s.id),moduleIds,allowReuse:!!t.supply?.allowReuse,expectedRevision:room.state.revision,equipmentPreparation:true});
  if(result.error)return result;
  const batch=room.state.extensions.at(-1);batch.purpose='equipment';t.pendingEquipmentBatch=batch.id;
  room.addEvent('equipment-review-started',`Extra preparation: ${batch.id}`,t.id);return reply();
 }
 if(input.type==='market.commit'||input.type==='market.buy'){
  if(!room.isLead(student,t))return fail('Only the Event Lead can confirm team equipment.');
  if(!members.every(m=>t.marketReady[m.id]))return fail('Every member must mark the plan ready.');
  const votes={};for(const m of members)votes[t.marketSelections[m.id]]=(votes[t.marketSelections[m.id]]||0)+1;
  const high=Math.max(...Object.values(votes)),tied=Object.keys(votes).filter(k=>votes[k]===high).sort();
  const choice=tied.includes(t.marketSelections[student.id])?t.marketSelections[student.id]:tied[0];
  const selected=choice.split('|');if(selected.length!==equipmentSlots(t)||selected.some(id=>!ids.includes(id)))return fail('The equipment entitlement changed. Choose again.');
  const before=[...t.inventory];t.inventory=selected;
  room.addEvent('equipment-confirmed',`${before.join('|')||'empty'} -> ${selected.join('|')}; ${equipmentSlots(t)} earned slots`,t.id,student.id);return reply();
 }
 return null;
}
export function completeEquipmentBlock(room,t,item){
 if(!item.extensionBatchId||t.pendingEquipmentBatch!==item.extensionBatchId)return;
 const batch=room.state.extensions.find(b=>b.id===item.extensionBatchId);if(!batch)return;
 const complete=batch.targets.filter(x=>x.teamId===t.id).every(target=>room.state.attempts.filter(a=>a.studentId===target.studentId&&a.extensionBatchId===batch.id&&a.correct).length>=batch.count);
 if(!complete)return;
 t.equipmentBlocks||=[];if(!t.equipmentBlocks.includes(batch.id))t.equipmentBlocks.push(batch.id);
 t.pendingEquipmentBatch=null;t.marketSelections={};t.marketReady={};
 room.addEvent('equipment-slot-earned',`Preparation complete: ${equipmentSlots(t)} slots`,t.id);
}
export function readyToLeave(room,t){return t.inventory.length===equipmentSlots(t)&&new Set(t.inventory).size===t.inventory.length;}
