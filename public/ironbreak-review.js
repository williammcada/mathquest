import {reviewParagraphs} from './review-presentation.js';
import radio from './assets/ironbreak/radio.webp';
import market from './assets/ironbreak/market.webp';
import ending from './assets/ironbreak/ending.webp';
// Offline review uses the actual cartridge/session engine in memory. It is not a
// replacement backend or a classroom launcher; no network requests are issued.
import {QuestSession} from '../src/worker.js';
import {IronbreakHost} from './games/shooter/host.js';
import {IRONBREAK} from './cartridges/ironbreak.js';
import {openRuns} from '../src/cartridges/ironbreak/server.js';
import {createGame} from './games/shooter/simulation.js';
import {showDevPanel} from './engine/dev-playtest.js';
const VERSION='0.2.1';
import cover from './assets/ironbreak/cover.webp';
const root=document.querySelector('#review-body'),message=document.querySelector('#review-message'),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let room,state,host,working=false,credential=crypto.randomUUID();
const storage=()=>{const data=new Map();return {get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),deleteAll:async()=>data.clear(),setAlarm:async()=>{},deleteAlarm:async()=>{}};};
async function request(path,body,teacher=false){const r=await room.fetch(new Request('https://offline-review.invalid'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',authorization:'Bearer '+(teacher?'review-teacher':credential)},...(body?{body:JSON.stringify(body)}:{})}));const result=await r.json();if(!r.ok||result.error)throw Error(result.error||'Review failed.');return result;}
async function start(){
 if(host){const key=host.key;host.destroy();host=null;try{localStorage.removeItem(key);}catch{}}
 root.innerHTML='Preparing review…';room=new QuestSession({storage:storage(),blockConcurrencyWhile:f=>f()});
 const gates=Number(document.querySelector('#review-gates').value);
 await request('/init',{code:'REVIEW',teacherKey:'review-teacher',config:{cartridgeId:'ironbreak',gateCount:gates,teamNames:['Review crew'],modules:[{id:'number.gcf',itemCount:gates,band:'beginner'}]}},true);
 await request('/command',{type:'student.join',deviceId:'reviewer',teamPin:room.state.teams['team-1'].pin});
 await request('/command',{type:'teacher.start',teacherKey:'review-teacher'},true);
 await request('/command',{type:'teacher.setSupply',teacherKey:'review-teacher',teamId:'team-1',count:2,enabled:true,moduleIds:['number.gcf']},true);
 state=await request('/state?deviceId=reviewer');message.textContent='';render();
}
async function send(type,extra={}){
 const result=await request('/command',{type,deviceId:'reviewer',commandId:crypto.randomUUID(),...extra});state=result;
 if(type.startsWith('ironbreak.')){if(result.teams[0].stage!=='minigame')render();return result;}
 message.textContent=result.feedback?.message||'';render();return result;
}
async function action(type,extra={}){if(working)return;working=true;try{await send(type,extra);}catch(e){message.textContent=e.message;}finally{working=false;}}
function render(){
 const t=state.teams[0],s=state.student;
 if(host&&t.stage!=='minigame'){host.destroy();host=null;}
 if(t.stage==='minigame'){
  if(!host){root.innerHTML='<div id="review-game"></div>';host=new IronbreakHost(root.firstElementChild,{...t.finale,paused:state.paused,send,recovery:false});}
  else host.update(t.finale.run,state.paused,t.finale.deadline,t.finale);return;
 }
 if(state.paused){root.innerHTML='<section class="review-card"><h2>Teacher paused the review</h2><p>Use Teacher pause / resume to continue.</p></section>';return;}
 const scene=t.scene;let body=`<section class="review-card"><p class="review-label">${esc(t.stage)} · ${s.itemsCompleted}/${s.assignedTotal} questions completed</p><img class="review-cover" src="${esc((["finale","victory"].includes(t.stage)?ending:t.stage==="market"?market:["gate","decision"].includes(t.stage)?radio:cover))}" alt="${esc(scene.title)}"><h2>${esc(scene.title)}</h2>${reviewParagraphs(scene,t.stage,'ironbreak',esc)}</section>`;
 if(t.stage==='briefing')body+='<button data-do="briefing.ready">Accept mission</button>';
 if(t.stage==='gate'){
  const item=s.currentItem;body+=`<section class="review-card"><h2>${esc(item.prompt)}</h2><form id="review-answer"><label>Answer <input name="answer" inputmode="numeric" autocomplete="off" required></label> <button>Check answer</button></form><p>Correct answers complete the assigned work. First-attempt accuracy stays separate from equipment and gameplay.</p></section>`;
 }
 if(['decision','finale'].includes(t.stage)){
  const final=t.stage==='finale',opts=final?IRONBREAK.choices:IRONBREAK.routes,my=final?t.myFinalVote:t.myVote;
  body+=`<section class="review-card"><div class="review-choices">${opts.map(o=>`<button data-vote="${o.id}" aria-pressed="${my===o.id}"><b>${my===o.id?'✓ ':''}${esc(o.title)}</b><span>${esc(o.text)}</span></button>`).join('')}</div><p>You are the Event Lead in this one-person review.</p><button data-do="choice.resolve" ${my?'':'disabled'}>Confirm crew decision</button></section>`;
 }
 if(t.stage==='market'){
  const selected=(t.myMarketSelection||'').split('|').filter(Boolean);body+=`<section class="review-card"><h2>${t.equipmentSlots} equipment slot${t.equipmentSlots>1?'s':''}</h2><div class="review-choices">${IRONBREAK.items.map(i=>`<button data-item="${i.id}" aria-pressed="${selected.includes(i.id)}"><b>${selected.includes(i.id)?'✓ ':''}${i.title}</b><span>${i.text}</span></button>`).join('')}</div><p>Confirmed: ${t.inventory.join(' + ')||'None'}</p><button data-do="market.ready" ${selected.length===t.equipmentSlots?'':'disabled'}>My plan is ready</button><button data-do="market.commit" ${t.marketReadyCount?'':'disabled'}>Confirm equipment</button>${t.equipmentSlots<3?'<button data-do="equipment.extend">Answer 2 more questions for another slot</button>':''}<button data-do="market.continue" ${t.inventory.length===t.equipmentSlots?'':'disabled'}>Enter the foundry</button></section>`;
 }
 if(t.stage==='victory')body+=`<section class="review-card"><h2>Personal record</h2><p>${esc(IRONBREAK.personal[t.finale.run.outcome])}</p><p>First-attempt mathematics: ${s.firstAttemptCorrect}/${s.assignedTotal}. This result is unchanged by the action run.</p><button id="review-again">Review another path</button></section>`;
 root.innerHTML=body;
 root.querySelectorAll('[data-do]').forEach(b=>b.onclick=()=>action(b.dataset.do));root.querySelectorAll('[data-vote]').forEach(b=>b.onclick=()=>action('choice.vote',{choice:b.dataset.vote}));
 root.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{const selected=(t.myMarketSelection||'').split('|').filter(Boolean),id=b.dataset.item;const items=t.equipmentSlots===1?[id]:selected.includes(id)?selected.filter(x=>x!==id):[...selected,id];action('market.propose',{items});});
 root.querySelector('#review-answer')?.addEventListener('submit',e=>{e.preventDefault();action('math.submit',{answer:new FormData(e.target).get('answer')});});root.querySelector('#review-again')?.addEventListener('click',reset);
}
async function reset(){if(confirm('Discard this one offline review and start fresh? Its story, answers and suit run cannot be recovered. No classroom records are affected.'))try{await start();}catch(e){message.textContent=e.message;}}
document.querySelector('#review-reset').onclick=reset;
document.querySelector('#review-pause').onclick=async()=>{try{await request('/command',{type:'teacher.pause',teacherKey:'review-teacher'},true);state=await request('/state?deviceId=reviewer');render();}catch(e){message.textContent=e.message;}};
document.querySelector('#review-close').onclick=async()=>{try{await request('/command',{type:'teacher.advanceFinale',teacherKey:'review-teacher',teamId:'team-1'},true);state=await request('/state?deviceId=reviewer');render();}catch(e){message.textContent=e.message;}};
setInterval(async()=>{if(!room||working)return;try{await room.alarm();if(state?.teams[0].stage==='minigame'){state=await request('/state?deviceId=reviewer');render();}}catch(e){message.textContent=e.message;}},1000);
// DEV homepage shortcut (?dev=action): open the suit run directly, with no questions or upgrades.
// U-13 DEV playtest: choose power-ups and a checkpoint, then open the suit run directly.
async function devStart({items,start}){const team=room.state.teams['team-1'];team.route=IRONBREAK.routes[0].id;team.inventory=[...items];openRuns(room,team,room.members(team.id));
 for(const r of Object.values(team.runs)){r.snapshot=createGame({upgrades:r.loadout,checkpoint:start,timed:false});r.checkpoint=start;}
 state=await request('/state?deviceId=reviewer');message.innerHTML='';const back=document.createElement('button');back.textContent='Back to DEV setup';back.onclick=()=>location.reload();message.append(`DEV PLAYTEST · Ironbreak v${VERSION} · ${items.length?items.join(', '):'no power-ups'} · start ${start} `,back);render();}
start().then(()=>{if(new URLSearchParams(location.search).get('dev')!=='action')return;
 showDevPanel(root,{game:'Ironbreak',version:VERSION,items:IRONBREAK.items.map(i=>({id:i.id,title:i.title,detail:i.text})),starts:[['START','Level start'],['MID','Midpoint checkpoint'],['MID2','Second loop checkpoint'],['BOSS','Boss chamber']].map(([id,label])=>({id,label})),story:location.pathname.split('/').pop()},choice=>devStart(choice).catch(e=>message.textContent=e.message));}).catch(e=>message.textContent=e.message);
