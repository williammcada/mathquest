import {reviewParagraphs} from './review-presentation.js?v=u11';
import {FALSE_HAVEN as c,havenScene,HAVEN_PERSONAL} from './cartridges/false-haven.js?v=0.13.0';
const gateNames=(c,n)=>[...c.gates.slice(0,2),...c.inserts.slice(0,n-3),c.gates[2]];
import {GameHost} from './engine/game-host.js?v=0.13.0';
import {falseHavenAdapter} from './games/nightfall/false-haven-adapter.js?v=0.13.0';
const root=document.querySelector('#story'),crew=[{alias:'Alex'},{alias:'Rowan'}];let gates=3,names=gateNames(c,gates),team={stage:'briefing',gateIndex:0,inventory:[],runs:{}},host,css,returnButton;
const audio=new Audio(c.assets.ambient);audio.loop=true;audio.volume=.2;let musicOn=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function music(){if(musicOn){try{await audio.play();}catch{document.querySelector('#music').textContent='Retry music';}}else audio.pause();}
document.querySelector('#music').onclick=()=>{musicOn=!musicOn;document.querySelector('#music').textContent=musicOn?'Pause music':'Play music';music();};
document.querySelector('#reset').onclick=()=>{if(!confirm('Restart this preview? Your current preview choices will be cleared. No classroom records are affected.'))return;host?.destroy();host=null;css?.remove();returnButton?.remove();root.style.cssText='';team={stage:'briefing',gateIndex:0,inventory:[],runs:{}};render();};
function render(){
 const scene=havenScene(c,team,names,crew);let controls='';
 if(team.stage==='briefing')controls='<label>Story gates <select id="gates"><option>3</option><option>4</option><option>5</option></select></label><button class="primary" id="next">Enter the compound</button>';
 if(team.stage==='gate')controls='<p class="preview-note">In the classroom, each student completes the teacher-assigned mathematics here. This owner preview lets you review the story without producing academic evidence.</p><button class="primary" id="next">Review next scene</button>';
 if(['decision','finale'].includes(team.stage))controls='<div class="choices">'+(team.stage==='decision'?c.routes:c.choices).map(o=>`<button data-choice="${o.id}"><b>${esc(o.title)}</b><small>${esc(o.text)}</small></button>`).join('')+'</div>';
 if(team.stage==='market')controls='<p class="preview-note">Preview switches show all three upgrades. Classroom equipment is earned through completed mathematics.</p><div class="choices">'+c.items.map(o=>`<label><input type="checkbox" value="${o.id}"> <b>${esc(o.title)}</b><br><small>${esc(o.text)}</small></label>`).join('')+'</div><div class="actions"><button class="primary" id="fly">Play the escape mission</button><button id="skip">Review final decision without playing</button></div>';
 if(team.stage==='victory')controls=`<p class="preview-note">${esc(HAVEN_PERSONAL[team.runs.preview?.outcome]||'Story review only; no field outcome recorded.')}</p><button id="endings">Review another ending</button>`;
 root.innerHTML=`<div class="scene-grid"><img src="${scene.image}" alt="${team.stage==='victory'||team.stage==='finale'?'The evacuation route':team.stage==='briefing'?'The survivors’ bus':team.stage==='market'?'Emergency supplies':'The emergency radio'}"><section><div class="eyebrow">${scene.eyebrow}</div><h1>${esc(scene.title)}</h1>${reviewParagraphs(scene,team.stage,'haven',esc)}<div class="student-task" aria-label="Preview controls">${controls}</div></section></div>`;
 if(team.stage==='briefing'){root.querySelector('#gates').value=gates;root.querySelector('#gates').onchange=e=>{gates=Number(e.target.value);names=gateNames(c,gates);};}
 root.querySelector('#next')?.addEventListener('click',()=>{if(team.stage==='briefing')team.stage='gate';else if(team.gateIndex===0)team.stage='decision';else if(team.gateIndex===gates-1)team.stage='market';else team.gateIndex++;render();});
 root.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(team.stage==='decision'){team.route=b.dataset.choice;team.gateIndex=1;team.stage='gate';}else{team.finalAction=b.dataset.choice;team.stage='victory';}render();});
 root.querySelector('#skip')?.addEventListener('click',()=>{team.stage='finale';render();});root.querySelector('#endings')?.addEventListener('click',()=>{team.stage='finale';render();});root.querySelector('#fly')?.addEventListener('click',fly);
 const next=['finale','victory'].includes(team.stage)?c.assets.finale:c.assets.ambient;if(!audio.src.endsWith(next.slice(1))){audio.src=next;music();}window.scrollTo(0,0);
}
function fly(){
 team.inventory=[...root.querySelectorAll('input:checked')].map(i=>i.value);audio.pause();
 root.innerHTML='<div id="preview-game"></div><button id="story-return">Continue to the final story decision</button>';
 const run={runId:crypto.randomUUID(),configRevision:c.revision,loadout:team.inventory,route:team.route,threat:1,status:'not_started',mode:'action',seq:0};
 host=new GameHost(root.querySelector('#preview-game'),{adapter:falseHavenAdapter,items:c.items,run,practice:true,send:async()=>{}});
 host.root.querySelector('[data-restart]')?.remove();
 root.querySelector('#story-return').onclick=()=>{team.runs.preview={outcome:host.s.outcome||'skipped'};host.destroy();host=null;team.stage='finale';render();};
}
render();
