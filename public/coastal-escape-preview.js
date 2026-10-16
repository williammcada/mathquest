import {reviewParagraphs} from './review-presentation.js?v=u11';
import {COASTAL_ESCAPE as c,coastalScene,COASTAL_PERSONAL} from './cartridges/coastal-escape.js';
const gateNames=(c,n)=>[...c.gates.slice(0,2),...c.inserts.slice(0,n-3),c.gates[2]];
import {ActionHost} from './engine/action-host.js';
import {aerialAdapter} from './games/aerial-shooter/adapter.js?v=0.14.2';
const root=document.querySelector('#story'),crew=[{alias:'Your crew'}];let gates=3,names=gateNames(c,gates),team={stage:'briefing',gateIndex:0,inventory:[],runs:{}},host,css,returnButton;
const audio=new Audio(c.assets.ambient);audio.loop=true;audio.volume=.2;let musicOn=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function music(){if(musicOn){try{await audio.play();}catch{document.querySelector('#music').textContent='Retry music';}}else audio.pause();}
document.querySelector('#music').onclick=()=>{musicOn=!musicOn;document.querySelector('#music').textContent=musicOn?'Pause music':'Play music';music();};
document.querySelector('#reset').onclick=()=>{if(!confirm('Restart this preview? Your current preview choices will be cleared. No classroom records are affected.'))return;host?.destroy();host=null;css?.remove();returnButton?.remove();root.style.cssText='';team={stage:'briefing',gateIndex:0,inventory:[],runs:{}};render();};
function render(){
 const scene=coastalScene(c,team,names,crew);let controls='';
 if(team.stage==='briefing')controls='<label>Story gates <select id="gates"><option>3</option><option>4</option><option>5</option></select></label><button class="primary" id="next">Enter the hangar</button>';
 if(team.stage==='gate')controls='<p class="preview-note">In the classroom, each student completes the teacher-assigned mathematics here. This owner preview lets you review the story without producing academic evidence.</p><button class="primary" id="next">Review next scene</button>';
 if(['decision','finale'].includes(team.stage))controls='<div class="choices">'+(team.stage==='decision'?c.routes:c.choices).map(o=>`<button data-choice="${o.id}"><b>${esc(o.title)}</b><small>${esc(o.text)}</small></button>`).join('')+'</div>';
 if(team.stage==='market')controls='<p class="preview-note">Preview switches show all three upgrades. Classroom equipment is earned through completed mathematics.</p><div class="choices">'+c.items.map(o=>`<label><input type="checkbox" value="${o.id}"> <b>${esc(o.title)}</b><br><small>${esc(o.text)}</small></label>`).join('')+'</div><div class="actions"><button class="primary" id="fly">Fly the escort mission</button><button id="skip">Review final decision without flying</button></div>';
 if(team.stage==='victory')controls=`<p class="preview-note">${esc(COASTAL_PERSONAL[team.runs.preview?.outcome]||'Story review only; no flight outcome recorded.')}</p><button id="endings">Review another ending</button>`;
 root.innerHTML=`<div class="scene-grid"><img src="${scene.image}" alt="${team.stage==='victory'||team.stage==='finale'?'Dawn at the sheltered landing strip':team.stage==='briefing'||team.stage==='market'?'The prototype in the coastal hangar':'The lighthouse radio room'}"><section><div class="eyebrow">${scene.eyebrow}</div><h1>${esc(scene.title)}</h1>${reviewParagraphs(scene,team.stage,'coastal',esc)}<div class="student-task" aria-label="Preview controls">${controls}</div></section></div>`;
 if(team.stage==='briefing'){root.querySelector('#gates').value=gates;root.querySelector('#gates').onchange=e=>{gates=Number(e.target.value);names=gateNames(c,gates);};}
 root.querySelector('#next')?.addEventListener('click',()=>{if(team.stage==='briefing')team.stage='gate';else if(team.gateIndex===0)team.stage='decision';else if(team.gateIndex===gates-1)team.stage='market';else team.gateIndex++;render();});
 root.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(team.stage==='decision'){team.route=b.dataset.choice;team.gateIndex=1;team.stage='gate';}else{team.finalAction=b.dataset.choice;team.stage='victory';}render();});
 root.querySelector('#skip')?.addEventListener('click',()=>{team.stage='finale';render();});root.querySelector('#endings')?.addEventListener('click',()=>{team.stage='finale';render();});root.querySelector('#fly')?.addEventListener('click',fly);
 const next=['finale','victory'].includes(team.stage)?c.assets.finale:c.assets.ambient;if(!audio.src.endsWith(next.slice(1))){audio.src=next;music();}window.scrollTo(0,0);
}
function fly(){team.inventory=[...root.querySelectorAll('input:checked')].map(i=>i.value);audio.pause();css=document.createElement('link');css.rel='stylesheet';css.href='./games/aerial-shooter/practice.css';document.head.append(css);root.style.cssText='position:fixed;inset:0;z-index:40;max-width:none;padding:0;margin:0';
 returnButton=document.createElement('button');returnButton.className='flight-return';returnButton.textContent='Return to story preview';document.body.append(returnButton);
 const back=()=>{host?.destroy();host=null;css.remove();returnButton.remove();root.style.cssText='';team.stage='finale';render();};
 host=new ActionHost(root,{adapter:aerialAdapter,config:{runId:crypto.randomUUID(),seed:1942,loadout:team.inventory,mode:'action',phaseId:'story-preview',configRevision:'coastal-preview/1'},onSave:s=>{if(s.outcome){team.runs.preview={outcome:s.outcome};returnButton.textContent='Continue to the crew’s decision';}},onRestart:back});css.onload=()=>host?.fit();returnButton.onclick=back;
}
render();
