import {RescueHost} from './games/nightfall/rescue-host.js?v=0.14.2';
import {RESCUE_REVISION,RESCUE_WINDOW_MS} from './games/nightfall/rescue-world.js?v=0.14.2';
import {createState,completeTask} from './games/nightfall/simulation.js?v=0.14.2';
import {FinaleHost} from './finale-host.js?v=0.14.2';
import {NIGHTFALL} from './cartridges.js?v=0.14.2';
document.querySelector('#items').innerHTML=NIGHTFALL.items.map(i=>`<label><input type="checkbox" value="${i.id}">${i.title}</label>`).join('');
let runtime;
document.querySelector('#restart').onclick=()=>{runtime?.destroy();if(document.querySelector('#chapter').value==='rescue'){const route=document.querySelector('#route').value;runtime=new RescueHost(document.querySelector('#game'),{practice:true,route,deadline:Date.now()+RESCUE_WINDOW_MS,run:{phase:'early-rescue',route,runId:crypto.randomUUID(),attemptId:crypto.randomUUID(),configRevision:RESCUE_REVISION,status:'not_started',mode:'action',loadout:[],seq:0}});runtime.s.debug=document.querySelector('#debug').checked;return;}const loadout=[...document.querySelectorAll('#items input:checked')].map(i=>i.value),threat=Number(document.querySelector('#threat').value),snapshot=createState(loadout,document.querySelector('#route').value,threat);const checkpoint=document.querySelector('#checkpoint').value;if(checkpoint)for(const id of checkpoint==='power'?['fuse','power']:['fuse','power','keys','battery','installed'])completeTask(snapshot,id);if(document.querySelector('#survivor').checked)completeTask(snapshot,'survivor');runtime=new FinaleHost(document.querySelector('#game'),{practice:true,run:{runId:`practice-${crypto.randomUUID()}`,configRevision:NIGHTFALL.revision,status:'not_started',loadout,threat,snapshot,seq:0},route:document.querySelector('#route').value});runtime.s.debug=document.querySelector('#debug').checked;};
document.querySelector('#restart').click();

document.querySelector('#debug').onchange=e=>{if(runtime)runtime.s.debug=e.target.checked;};

document.querySelector('#chapter').onchange=()=>{const rescue=document.querySelector('#chapter').value==='rescue';for(const el of document.querySelectorAll('#threat,#checkpoint,#survivor,#items input'))el.disabled=rescue;document.querySelector('#restart').click();};
// Deep link: practice-nightfall.html#rescue (or #city) opens that chapter directly.
const openChapterFromHash=()=>{const want=location.hash.slice(1),sel=document.querySelector('#chapter');if([...sel.options].some(o=>o.value===want)&&sel.value!==want){sel.value=want;sel.onchange();}};
openChapterFromHash();addEventListener('hashchange',openChapterFromHash);
