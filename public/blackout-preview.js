// Blackout Protocol owner story preview, practice entry and U-13 DEV playtest (?dev=action).
// Runs the same adapter and puzzle core as the classroom cartridge, in practice mode: no server, no records.
import {reviewParagraphs} from './review-presentation.js?v=u11';
import {BLACKOUT as c,blackoutScene,BLACKOUT_PERSONAL} from './cartridges/blackout.js?v=0.2.1';
import {GameHost} from './engine/game-host.js?v=0.14.2';
import {blackoutAdapter} from './games/blackout/adapter.js?v=0.2.1';
import C from './games/blackout/core.js';
import {showDevPanel,devBanner,DEV_STYLE} from './engine/dev-playtest.js';
const gateNames=(c,n)=>[...c.gates.slice(0,2),...c.inserts.slice(0,n-3),c.gates[2]];
const DEV=new URLSearchParams(location.search).get('dev')==='action',VERSION='0.2.1';
const root=document.querySelector('#story'),crew=[{alias:'Alex'},{alias:'Rowan'}];let gates=3,names=gateNames(c,gates),team={stage:'briefing',gateIndex:0,inventory:[],runs:{}},host;
const audio=new Audio(c.assets.ambient);audio.loop=true;audio.volume=.25;let musicOn=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function music(){if(musicOn){try{await audio.play();}catch{document.querySelector('#music').textContent='Retry music';}}else audio.pause();}
document.querySelector('#music').onclick=()=>{musicOn=!musicOn;document.querySelector('#music').textContent=musicOn?'Pause music':'Play music';music();};
document.querySelector('#reset').onclick=()=>{if(!confirm('Restart this preview? Your current preview choices will be cleared. No classroom records are affected.'))return;host?.destroy();host=null;team={stage:'briefing',gateIndex:0,inventory:[],runs:{}};render();};
const ALT={briefing:'The darkened Port Calder skyline from the roof of Substation 9',gate:'The manual switchyard at Substation 9',decision:"LANTERN's core",market:'The workbench with spare fuses, a grid scanner and a surge stabilizer',finale:"LANTERN's core",victory:'Dawn over Port Calder with the lights back on'};
function render(){
 const scene=blackoutScene(c,team,names,crew);let controls='';
 if(team.stage==='briefing')controls='<label>Story gates <select id="gates"><option>3</option><option>4</option><option>5</option></select></label><button class="primary" id="next">Enter Substation 9</button>';
 if(team.stage==='gate')controls='<p class="preview-note">In the classroom, each student answers Math Engine questions assigned by the teacher here. This owner preview skips them and records nothing.</p><button class="primary" id="next">Review next scene</button>';
 if(['decision','finale'].includes(team.stage))controls='<div class="choices">'+(team.stage==='decision'?c.routes:c.choices).map(o=>`<button data-choice="${o.id}"><b>${esc(o.title)}</b><small>${esc(o.text)}</small></button>`).join('')+'</div>';
 if(team.stage==='market')controls='<p class="preview-note">Preview switches show all three power-ups. Classroom equipment is earned through completed mathematics.</p><div class="choices">'+c.items.map(o=>`<label><input type="checkbox" value="${o.id}"> <b>${esc(o.title)}</b><br><small>${esc(o.text)}</small></label>`).join('')+'</div><div class="actions"><button class="primary" id="play">Play the district panels</button><button id="skip">Review final decision without playing</button></div>';
 if(team.stage==='victory')controls=`<p class="preview-note">${esc(BLACKOUT_PERSONAL[team.runs.preview?.outcome]||'Story review only; no panel result recorded.')}</p><button id="endings">Review another ending</button>`;
 root.innerHTML=`<div class="scene-grid"><img src="${scene.image}" alt="${esc(ALT[team.stage]||'Port Calder')}"><section><div class="eyebrow">${scene.eyebrow}</div><h1>${esc(scene.title)}</h1>${reviewParagraphs(scene,team.stage,c.id,esc)}<div class="student-task" aria-label="Preview controls">${controls}</div></section></div>`;
 if(team.stage==='briefing'){root.querySelector('#gates').value=gates;root.querySelector('#gates').onchange=e=>{gates=Number(e.target.value);names=gateNames(c,gates);};}
 root.querySelector('#next')?.addEventListener('click',()=>{if(team.stage==='briefing')team.stage='gate';else if(team.gateIndex===0)team.stage='decision';else if(team.gateIndex===gates-1)team.stage='market';else team.gateIndex++;render();});
 root.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(team.stage==='decision'){team.route=b.dataset.choice;team.gateIndex=1;team.stage='gate';}else{team.finalAction=b.dataset.choice;team.stage='victory';}render();});
 root.querySelector('#skip')?.addEventListener('click',()=>{team.stage='finale';render();});root.querySelector('#endings')?.addEventListener('click',()=>{team.stage='finale';render();});root.querySelector('#play')?.addEventListener('click',()=>play());
 const next=['finale','victory'].includes(team.stage)?c.assets.finale:c.assets.ambient;if(!audio.src.endsWith(next.slice(1))){audio.src=next;}music();window.scrollTo(0,0);
}
function play(dev=null){
 team.inventory=dev?dev.items:[...root.querySelectorAll('input:checked')].map(i=>i.value);audio.pause();
 if(dev&&!document.getElementById('mq-dev-style')){const st=document.createElement('style');st.id='mq-dev-style';st.textContent=DEV_STYLE;document.head.append(st);}
 root.innerHTML=(dev?`<div class="mq-dev" style="max-width:none;margin:0 0 12px;padding:0 0 4px">${devBanner('Blackout Protocol',VERSION)}</div>`:'')+'<div id="preview-game"></div>'+(dev?'<button id="story-return">Back to DEV setup</button>':'<button id="story-return">Continue to the final story decision</button>');
 const run={runId:'preview-'+crypto.randomUUID(),configRevision:c.revision,loadout:team.inventory,route:team.route,status:'not_started',mode:'action',seq:0,startDistrict:dev?Number(dev.start)||0:0};
 host=new GameHost(root.querySelector('#preview-game'),{adapter:blackoutAdapter,items:c.items,run,practice:true,send:async()=>{}});
 host.root.querySelector('[data-restart]')?.remove();
 if(dev){root.querySelector('#story-return').onclick=()=>{host.destroy();host=null;devSetup();};return;}
 root.querySelector('#story-return').onclick=()=>{team.runs.preview={outcome:host.s.outcome||'skipped'};host.destroy();host=null;team.stage='finale';render();};
}
// DEV playtest (U-13): every power-up selectable, any starting district, no questions, no records.
function devSetup(){team.route=c.routes[0].id;showDevPanel(root,{game:'Blackout Protocol',version:VERSION,items:c.items.map(i=>({id:i.id,title:i.title,detail:i.text})),starts:C.DISTRICTS.map((d,i)=>({id:String(i),label:`District ${i+1} · ${d.name}`})),story:location.pathname.split('/').pop()},choice=>play(choice));}
if(DEV)devSetup();else render();
window.__BP_PREVIEW={get host(){return host;}};
