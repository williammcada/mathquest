// Kingsgate owner DEV playtest (handbook U-13). Same game code as the classroom run; no questions, no records.
import {GameHost} from './engine/game-host.js?v=0.12.0';
import {showDevPanel,devBanner} from './engine/dev-playtest.js';
import {kingsgateAdapter,VERSION} from './games/kingsgate/adapter.js?v=0.1.0';
import {EQUIPMENT,WAVE_COUNT} from './games/kingsgate/config.js?v=0.1.0';
const q=s=>document.querySelector(s);let host;
function setup(){
 host?.destroy();host=null;q('#game').innerHTML='';
 showDevPanel(q('#dev'),{game:'Kingsgate',version:VERSION,items:EQUIPMENT.map(e=>({id:e.id,title:e.title,detail:e.text})),starts:Array.from({length:WAVE_COUNT},(_,i)=>({id:String(i+1),label:i?`Wave ${i+1}`:'Wave 1 (start of the defense)'})),start:'1'},launch);
 const extra=document.createElement('div');extra.className='kg-extra';extra.innerHTML='<label>Gold rules <select id="gold-mode"><option value="mathquest">MathQuest cartridge (180 gold, no question rounds)</option><option value="arcade">Math Arcade (120 gold; question rounds skipped in DEV)</option></select></label><p>Starting later than wave 1 adds 60 gold per skipped wave so the defense is playable.</p>';
 q('#dev').append(extra);
}
function launch({items,start}){
 const goldMode=q('#gold-mode').value,startWave=Number(start)||1;
 q('#dev').innerHTML=devBanner('Kingsgate',VERSION)+'<button id="restart-dev">Restart (back to setup)</button>';q('#dev').className='mq-dev';
 q('#restart-dev').onclick=()=>{q('#dev').className='';setup();};
 host=new GameHost(q('#game'),{adapter:kingsgateAdapter,items:EQUIPMENT,practice:true,run:{runId:crypto.randomUUID(),loadout:goldMode==='arcade'?[]:items,goldMode,startWave,bonusGold:(startWave-1)*60,mode:'action',status:'not_started',seq:0}});
 host.s.skipBreaks=true;window.kingsgate=host;
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)host?.pause();});
setup();
