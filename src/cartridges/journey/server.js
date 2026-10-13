import {hashSeed} from '../../math.js';
import {checkAnswerFor} from '../../answer-check.js';
import {JOURNEY_BUILD,PROTOCOL} from '../../../public/games/journey/config.js';
import {ENVIRONMENTS} from '../../../public/games/journey/environment-art.js';
import {JOURNEY_STORY} from '../../../public/games/journey/story.js';

export const isJourney=room=>room.state.config.cartridgeId==='journey-west';
const error=message=>({error:message});
const stub=(room,runId)=>room.env.BRAWLS.get(room.env.BRAWLS.idFromName(runId));
export async function runCall(room,team,path,data){
  if(!room.env?.BRAWLS)throw Error('The Journey combat service is not configured.');
  const res=await stub(room,team.journey.runId).fetch(new Request('https://brawl'+path,{method:data===undefined?'GET':'POST',headers:{'content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})}));
  const result=await res.json();if(!res.ok||result.error)throw Error(result.error||'Combat service unavailable.');return result;
}
export function journeyScene(team,members,names){
  const gateArt=ENVIRONMENTS[Math.min(Math.max(team.gateIndex||0,0),3)];
  return {title:team.stage==='gate'?names[team.gateIndex]:team.stage==='victory'?'Journey field record':JOURNEY_STORY.title,eyebrow:'AN ORIGINAL JOURNEY ADVENTURE',paragraphs:team.stage==='briefing'?[JOURNEY_STORY.opening[0].text]:team.stage==='gate'?[JOURNEY_STORY.gates[Math.min(team.gateIndex,2)],'Every traveler completes their own questions before the team moves on.']:team.stage==='victory'?[JOURNEY_STORY.endings[team.journeyResult?.outcome]||JOURNEY_STORY.endings.interrupted]:[],artId:null,...(team.stage==='briefing'?{image:'./assets/journey/cast-concept.png',imageAlt:'The five travelers and Nezha'}:team.stage==='gate'?{image:'./assets/journey/'+gateArt.file,imageAlt:['Mountain path above the clouds','Lantern-lit cave approach','Ruined mountain shrine','Guardian courtyard'][Math.min(Math.max(team.gateIndex||0,0),3)]}:{})};
}
export const journeyServer={scene:journeyScene,advance(team){
  if(!this.members(team.id).every(s=>s.gateComplete))return;
  this.addEvent('gate-completed',team.name+' completed '+this.state.config.gateNames[team.gateIndex],team.id);
  if(team.gateIndex+1<this.state.config.gateCount){this.openGate(team,team.gateIndex+1);return;}
  team.stage='brawl';team.journey={runId:crypto.randomUUID(),resultKey:crypto.randomUUID(),initialized:false,snapshot:null};
  for(const p of this.members(team.id))p.journeyPrep={blocks:[],earned:1,current:null};
}};
export async function syncJourney(room){if(!isJourney(room))return;
  for(const t of Object.values(room.state.teams)){
    if(!t.journey||t.stage==='victory'&&t.journeyResult)continue;
    if(!t.journey.initialized){
      await runCall(room,t,'/init',{runId:t.journey.runId,resultKey:t.journey.resultKey,roomCode:room.state.code,teamId:t.id,expiresAt:room.state.expiresAt,paused:room.state.paused,members:room.members(t.id).map(p=>({id:p.id,alias:p.alias}))});
      t.journey.initialized=true;room.bump();
    }
    t.journey.snapshot=await runCall(room,t,'/state');
    if(t.journey.snapshot.result)commitJourneyResult(room,t,t.journey.snapshot.result);
  }
}
export function commitJourneyResult(room,team,result){
  if(team.journeyResult)return;
  if(result.runId!==team.journey?.runId||result.teamId!==team.id||result.build!==JOURNEY_BUILD)throw Error('Unexpected combat result.');
  team.journeyResult=result;team.stage='victory';team.completedAt=new Date().toISOString();
  team.runs=Object.fromEntries(result.players.map(p=>[p.studentId,{...p,runId:result.runId,status:'terminal',outcome:result.outcome,reason:result.reason,teamActiveElapsedMs:result.activeElapsedMs,completedAt:team.completedAt,clientBuild:JOURNEY_BUILD,validation:'authoritative combat service',sample:true}]));
  for(const p of room.members(team.id))if(p.journeyPrep)p.journeyPrep.current=null;
  room.addEvent('journey-complete',team.name+': '+result.outcome+' ('+result.reason+')',team.id);room.bump();
}
export async function acceptJourneyResult(room,data){
  const team=Object.values(room.state.teams).find(t=>t.journey?.runId===data.result?.runId);
  if(!team||!data.resultKey||team.journey.resultKey!==data.resultKey)return {error:'Invalid run result',status:403};
  commitJourneyResult(room,team,data.result);await room.save();return {ok:true};
}
export function journeyProjection(room,team,viewer){
  const s=team.journey?.snapshot;
  const prep=viewer&&viewer.teamId===team.id?viewer.journeyPrep:null;
  const current=prep?.current;
  const item=current?.item;
  return {runId:team.journey?.runId,snapshot:s||null,result:team.journeyResult||null,
    optional:prep?{earned:prep.earned,completed:prep.blocks.length,progress:current?.index||0,total:current?.assignments.length||0,
      item:item?{id:item.id,prompt:item.prompt,answerType:item.answerType,options:item.options||[],keys:item.keys||[],promptMarkup:item.promptMarkup||null,unit:item.unit||'',attempts:item.attempts||0,expectedForm:item.source==='math-engine'?null:['fraction','mixed'].includes(item.answerType)?'Give your answer in simplest form':item.expectedForm||null}:null}:null};
}
function availableModules(room,t){return room.state.config.modules.filter(m=>(!t.supply?.moduleIds?.length||t.supply.moduleIds.includes(m.id))&&((m.source==='engine'||m.source==='preset')||t.supply?.allowReuse));}
function optionalOpen(room,team,student){const s=team.journey.snapshot,p=s?.players.find(p=>p.id===student.id);
  return !room.state.paused&&s?.phase==='ready'&&!s.paused&&s.readyMs>0&&!p?.ready;
}
function optionalItem(room,student){const current=student.journeyPrep.current;if(!current)return null;if(!current.item&&current.index<current.assignments.length){current.item={...room.materializeAssignment(student,current.assignments[current.index]),attempts:0,extensionBatchId:current.id};}return current.item;}
export async function journeyCommand(room,student,input){const t=room.teamFor(student);if(!t.journey)return error('Complete the required gates first.');await syncJourney(room);
  if(input.type==='journey.connect'){
    const base=room.env.COMBAT_PUBLIC_BASE;
    if(!base)return error('The multiplayer endpoint has not been configured.');
    let url;try{url=new URL(base);}catch{return error('The multiplayer endpoint is not a valid URL.');}
    const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    // Owner-approved existing Worker; other workers.dev deployments remain excluded.
    const approvedWorker=url.hostname==='mathquest-prototype.willmcada-apps.workers.dev'&&!url.port;
    if((url.protocol!=='https:'&&!(local&&url.protocol==='http:'))||url.username||url.password||url.search||url.hash||url.pathname!=='/'||(url.hostname.endsWith('.workers.dev')&&!approvedWorker))return error('The multiplayer endpoint is not an approved secure host.');
    const ticket=await runCall(room,t,'/ticket',{studentId:student.id});url.pathname='/api/combat/'+t.journey.runId+'/ws';url.protocol=url.protocol==='https:'?'wss:':'ws:';
    return {...room.snapshot({deviceId:student.id}),combatConnection:{...ticket,url:url.href,runId:t.journey.runId}};
  }
  if(input.type==='journey.ready'){
    if(room.state.paused)return error('The teacher paused the session.');
    t.journey.snapshot=await runCall(room,t,'/ready',{studentId:student.id,upgrades:input.upgrades});student.journeyPrep.current=null;room.bump();return room.snapshot({deviceId:student.id});
  }
  if(!optionalOpen(room,t,student))return error('Optional preparation has closed. Choose your hero and press Ready.');
  const prep=student.journeyPrep;
  if(input.type==='journey.optional.stop'){prep.current=null;room.bump();return room.snapshot({deviceId:student.id});}
  if(input.type==='journey.optional.start'){
    if(prep.earned>=3)return error('You have earned all three upgrade choices.');
    if(!prep.current){const modules=availableModules(room,t);if(!modules.length)return error('Ask the teacher to permit extra preset questions or imported-question reuse.');
      const count=t.supply?.count||room.state.config.gateLoads.at(-1)||3,id=crypto.randomUUID();
      if((student.assignedTotal||0)+count>400)return error('The session question limit has been reached.');
      const assignments=Array.from({length:count},(_,i)=>{const m=modules[i%modules.length];return {source:m.source,moduleId:m.id,moduleTitle:m.title,band:m.band,itemIndex:m.source==='custom'?i%m.items.length:undefined,seed:hashSeed(room.state.code+':'+student.id+':'+id+':'+i),extensionBatchId:id};});
      prep.current={id,index:0,assignments,item:null};student.assignedTotal=(student.assignedTotal??room.state.config.totalQuestions)+count;
      (room.state.extensions||=[]).push({id,at:new Date().toISOString(),purpose:'journey-personal-preparation',count,policy:'keep',targets:[{studentId:student.id,alias:student.alias,count,total:student.assignedTotal,gateIndex:null}]});
    }
    optionalItem(room,student);room.bump();return room.snapshot({deviceId:student.id});
  }
  if(input.type==='journey.optional.answer'){
    const current=prep.current,item=optionalItem(room,student);if(!item)return error('Open an optional block first.');
    if(input.itemId!==item.id)return error('This question has changed.');
    const checked=checkAnswerFor(item,input.answer);if(!checked.valid)return error(checked.error);item.attempts++;
    room.state.attempts.push({at:new Date().toISOString(),studentId:student.id,alias:student.alias,teamId:t.id,gateIndex:t.gateIndex,gateName:'Optional personal preparation',moduleId:item.moduleId,moduleTitle:item.moduleTitle,itemId:item.id,prompt:item.prompt,answerType:item.answerType,disciplineId:item.disciplineId||'mathematics',courseBankId:item.courseBankId||'prealgebra',subskillId:item.subskillId||item.moduleId,source:item.source||'mathquest-preset',standards:item.standards||[],DOK:item.DOK||1,hintUsed:item.attempts>1&&!!item.hint,expected:item.answer,assignedDifficulty:item.assignedDifficulty||item.band||'teacher-authored',submitted:String(input.answer),normalized:checked.normalized,attempt:item.attempts,correct:checked.correct,answerPolicy:'MATH-FRAC-01',rejectionReason:checked.reason||null,firstAttempt:item.attempts===1,extensionBatchId:current.id,purpose:'journey-personal-preparation'});
    let message=checked.error||item.hint||'Check your work and try again.';
    if(checked.correct){student.correct++;student.itemsCompleted++;if(item.attempts===1)student.firstAttemptCorrect++;current.index++;current.item=null;message='Correct. Contribution recorded.';
      if(current.index===current.assignments.length){
        try{t.journey.snapshot=await runCall(room,t,'/grant',{studentId:student.id,slots:prep.earned+1});prep.earned++;prep.blocks.push(current.id);message='Block complete. You earned another personal upgrade.';}
        catch{message='Answer recorded. The preparation window closed before the block reward could be committed.';}
        prep.current=null;
      }else optionalItem(room,student);
    }
    room.bump();return {...room.snapshot({deviceId:student.id}),feedback:{correct:checked.correct,message}};
  }
  return error('Unknown Journey command.');
}
export async function journeyTeacher(room,input){
  if(!room.isTeacher(input.teacherKey))return {error:'Teacher access required',status:403};
  const action=input.type.split('.').at(-1);if(!['pause','resume','start','end'].includes(action))return error('Unknown team control.');
  const targets=Object.values(room.state.teams).filter(t=>t.journey&&(input.teamId==='*'||t.id===input.teamId));if(!targets.length)return error('No active Journey team selected.');
  for(const t of targets){t.journey.snapshot=await runCall(room,t,'/control',{action:action==='resume'?'pause':action,scope:'team',paused:action==='pause',reason:'teacher_ended'});if(t.journey.snapshot.result)commitJourneyResult(room,t,t.journey.snapshot.result);}
  room.bump();return room.snapshot({teacherKey:input.teacherKey});
}
export async function syncJourneyTeacher(room,input){if(!isJourney(room))return;
  if(!['teacher.pause','teacher.end'].includes(input.type))return;
  for(const t of Object.values(room.state.teams).filter(t=>t.journey)){
    t.journey.snapshot=await runCall(room,t,'/control',{action:input.type==='teacher.end'?'end':'pause',scope:'session',paused:room.state.paused,reason:'teacher_ended'});
    if(t.journey.snapshot.result)commitJourneyResult(room,t,t.journey.snapshot.result);
  }
}
export async function deleteJourneyRuns(room){for(const t of Object.values(room.state.teams||{}))if(t.journey)await runCall(room,t,'/delete',{});}
