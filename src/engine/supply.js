import {extendAssignments,extensionPreview} from './extensions.js';
export function configureSupply(room,input){
 const t=room.state.teams[input.teamId];if(!t)return {error:'Team not found.'};
 if(t.supply?.started||['minigame','finale','victory','brawl'].includes(t.stage))return {error:'This crew has already committed its supply plan.'};
 const count=Number(input.count??3);if(!Number.isInteger(count)||count<1||count>20)return {error:'Choose 1–20 questions per student.'};
 const modules=room.state.config.modules.filter(m=>!input.moduleIds?.length||input.moduleIds.includes(m.id));
 const allowed=modules.filter(m=>(m.source==='engine'||m.source==='preset')||input.allowReuse===true);
 if(input.enabled&&!allowed.length)return {error:'Choose preset questions, or explicitly allow imported question reuse.'};
 t.supply={enabled:!!input.enabled,count,moduleIds:allowed.map(m=>m.id),allowReuse:!!input.allowReuse,started:false,earned:0,correct:0,cap:20};
 room.addEvent('supply-offered',`Supply contract ${t.supply.enabled?'enabled':'disabled'}: ${count} questions per student; another equipment slot on completion`,t.id);room.bump();return room.snapshot({teacherKey:input.teacherKey});
}
export function startSupply(room,student){
 const t=room.teamFor(student),offer=t.supply;
 if(t.stage!=='market'||!offer?.enabled||offer.started||!room.isLead(student,t))return {error:'Only the Event Lead can accept an available supply contract at the market.'};
 const input={count:offer.count,placement:'last',policy:'keep',studentIds:room.members(t.id).map(s=>s.id),moduleIds:offer.moduleIds,allowReuse:offer.allowReuse,expectedRevision:room.state.revision};
 const preview=extensionPreview(room,input);if(preview.error)return preview;
 const result=extendAssignments(room,input);if(result.error)return result;
 offer.started=true;offer.total=preview.targets.length*offer.count;offer.batchId=room.state.extensions.at(-1).id;
 room.state.extensions.at(-1).purpose='supply-contract';room.bump();return room.snapshot({deviceId:student.id});
}
export function awardSupply(room,team,item){
 const offer=team.supply;if(!offer?.started||item.extensionBatchId!==offer.batchId||item.attempts!==1)return;
 offer.correct++;const earned=Math.min(20,Math.floor(20*offer.correct/offer.total));
 team.currency+=earned-offer.earned;offer.earned=earned;
}
