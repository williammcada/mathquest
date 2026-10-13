import {BUILD,CONFIG as C} from './games/shooter/config.js';
import {createGame,step,retry,expire,clearInput} from './games/shooter/simulation.js';
import {render} from './games/shooter/renderer.js';
import {bindInput} from './games/shooter/input.js';
import {ShooterAudio} from './games/shooter/audio.js';

const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d'),overlay=$('#overlay'),audio=new ShooterAudio();
let game=null,paused=true,fire=true,last=performance.now(),acc=0,lastHUD=0,modal='setup',settings={upgrades:[],checkpoint:'START',timed:true};
const portrait=()=>matchMedia('(orientation: portrait)').matches;
$('#identity').innerHTML=`<a href="https://github.com/williammcada/Math-Quest---Vault-7-/tree/design/industrial-shooter-v0.1" target="_blank" rel="noopener">Ironbreak v0.2.0 · ${BUILD}</a>`;
const input=bindInput({pad:$('#pad'),jump:$('#jump'),blocked:()=>!game||paused||game.status!=='active'||portrait(),onPause:forced=>{if(!game)return;if(forced)pause();else togglePause();},onFire:toggleFire});
function resetInput(){input.clear();if(game)clearInput(game);acc=0;}
function setModal(name,html){modal=name;overlay.innerHTML=`<div class="card">${html}</div>`;overlay.hidden=false;overlay.querySelector('button')?.focus({preventScroll:true});}
function closeModal(){modal='';overlay.hidden=true;}
function setup(){
  paused=true;audio.pause(true);resetInput();$('#rotate').hidden=true;
  setModal('setup',`<p class="eyebrow">MATHQUEST · IRONBREAK v0.2.0 · PRACTICE</p><h1 id="overlay-title">Ironbreak</h1><p>Cross the factory. Choose the upper gantries, fight through the middle, or swim along the surface. Disable the guard and the security robot.</p>
    <div class="settings"><label>Launch from <select id="launch"><option value="START">Level start</option><option value="MID">Midpoint checkpoint</option><option value="MID2">Second loop checkpoint</option><option value="BOSS">Boss checkpoint</option></select></label><label>Practice rules <select id="policy"><option value="timed">3 lives · 5-minute window</option><option value="untimed">3 lives · no time limit</option></select></label></div>
    <div class="upgrades"><label class="upgrade"><input type="checkbox" value="spread">Spread blaster</label><label class="upgrade"><input type="checkbox" value="armor">4-health suit</label><label class="upgrade"><input type="checkbox" value="agility">Agility</label></div>
    <details><summary>What do these settings change?</summary><p>Agility adds 10% movement speed and a double jump. Leave all upgrades unchecked for the baseline. Checkpoint launches and any upgrade combination are available here for review. In MathQuest, additional upgrades will require additional question blocks. Practice sends no classroom results.</p><p>The five-minute clock continues during pause or backgrounding. Retries retain equipment and restore health. This practice tab does not save run progress; reloading starts fresh.</p></details>
    <p>Continuous fire starts ON. Move/aim with the pad; tap Jump. Keyboard: arrows or WASD, Space, F, Esc.</p><div class="actions"><button class="primary" id="start">Start practice</button><button id="setup-help">Controls</button></div>`);
  $('#launch').value=settings.checkpoint;$('#policy').value=settings.timed?'timed':'untimed';for(const el of overlay.querySelectorAll('input'))el.checked=settings.upgrades.includes(el.value);
  $('#start').onclick=start;$('#setup-help').onclick=()=>help(true);
}
async function start(){
  settings={upgrades:[...overlay.querySelectorAll('input:checked')].map(e=>e.value),checkpoint:$('#launch').value,timed:$('#policy').value==='timed'};
  if(portrait()){$('#status').textContent='Rotate to landscape, then tap Start practice.';return;}
  try{game=createGame(settings);}catch(e){$('#status').textContent=e.message;return;}
  $('#status').textContent='';fire=true;$('#fire').textContent='Fire ON';$('#fire').setAttribute('aria-pressed','true');audio.music('level');
  paused=false;closeModal();resetInput();last=performance.now();updateHUD();
  try{await audio.start();}catch{$('#status').textContent='Sound unavailable. You can keep playing muted.';}
  $('#sound').textContent=audio.enabled?'Sound on':'Sound off';
}
function pause(){if(!game||game.status!=='active'||modal==='setup'||modal==='restart')return;paused=true;resetInput();audio.pause(true);setModal('pause',`<p class="eyebrow">PRACTICE PAUSED</p><h2 id="overlay-title">Ready when you are</h2><p>${game.timed?'The five-minute clock continues while paused.':'Untimed practice.'}</p><div class="actions"><button class="primary" id="resume">Resume</button><button id="pause-help">Controls</button></div>`);$('#resume').onclick=resume;$('#pause-help').onclick=()=>help(false);}
function resume(){if(!game||game.status!=='active'||portrait())return;paused=false;resetInput();closeModal();audio.pause(false);last=performance.now();}
function togglePause(){if(paused)resume();else pause();}
function toggleFire(){fire=!fire;$('#fire').textContent=fire?'Fire ON':'Fire OFF';$('#fire').setAttribute('aria-pressed',String(fire));}
function help(fromSetup=false){
  paused=true;resetInput();audio.pause(true);setModal('help',`<p class="eyebrow">CONTROLS</p><h2 id="overlay-title">One thumb moves and aims</h2><ul class="help-list"><li>Slide around the pad for eight directions. Diagonal Up aims at 45° while running.</li><li>Down: crouch. Two separate Down taps: lie prone. Left/Right or Up: stand.</li><li>Jump: hold for a full jump. Down + Jump: drop through a thin platform.</li><li>Up/Down near a ladder: climb. Jump leaves the ladder.</li><li>Water supports surface swimming and firing. Jump or climb to a bank.</li><li>Agility: release and press Jump again for a double jump.</li><li>Keyboard: arrows/WASD, Space jump, C prone, F fire toggle, Esc pause.</li></ul><p>Watch amber warnings. Duck the boss’s high volley, jump its floor sweep, and leave the marked overhead strike area.</p><div class="actions"><button class="primary" id="help-back">${fromSetup?'Back to setup':'Resume'}</button></div>`);$('#help-back').onclick=fromSetup?setup:resume;
}
function confirmRestart(){
  if(!game){setup();return;}paused=true;resetInput();audio.pause(true);setModal('restart',`<h2 id="overlay-title">Restart practice?</h2><p>This discards the one practice run in this tab, including its position, health, and result. It cannot be recovered. No classroom records are affected.</p><div class="actions"><button id="cancel-restart">Cancel</button><button id="confirm-restart">Discard run and return to setup</button></div>`);
  $('#cancel-restart').onclick=()=>{modal='';if(game.status==='active')pause();else terminal();};$('#confirm-restart').onclick=()=>{game=null;setup();};
}
function terminal(){
  paused=true;resetInput();audio.music('silent');const dead=game.status==='downed',success=game.outcome==='success';
  setModal(dead?'downed':'result',`<p class="eyebrow">PRACTICE ${dead?'CHECKPOINT':'RESULT'}</p><h2 id="overlay-title">${dead?'Suit disabled':success?'Security robot disabled':game.outcome==='defeated'?'Three lives used':'Time window closed'}</h2><p>${dead?`${game.lives} ${game.lives===1?'life remains':'lives remain'}. Retry at ${game.checkpoint} with full health and the same equipment.`:success?'Factory crossing complete.':`You reached ${game.checkpoint}. Try another route or upgrade combination.`}</p><p>${Math.round(game.activeTime)} seconds active · ${game.kills} robot defeats · ${game.damage} hits taken</p><div class="actions">${dead?'<button class="primary" id="retry">Retry checkpoint</button>':''}<button id="result-restart">New practice run</button></div>`);
  if(dead)$('#retry').onclick=()=>{if(retry(game)){paused=false;resetInput();closeModal();audio.music('level');audio.pause(false);audio.effect('respawn');}else terminal();};
  $('#result-restart').onclick=()=>{game=null;setup();};
}
function updateHUD(){
  if(!game)return;const p=game.player;$('#health').textContent='Health '+Array.from({length:p.maxHP},(_,i)=>i<p.hp?'●':'○').join(' ');$('#lives').textContent=`Lives ${game.lives}`;
  const remaining=game.timed?Math.max(0,Math.ceil((game.deadline-Date.now())/1000)):null;$('#clock').textContent=remaining===null?'Untimed':`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
  $('#checkpoint').textContent=game.checkpoint;$('#gear').textContent=game.upgrades.length?game.upgrades.map(x=>({spread:'Spread',armor:'Armor',agility:'Agility'}[x])).join(' · '):'Standard suit';$('#pause').textContent=paused?'Resume':'Pause';
}
function frame(now){
  const dt=Math.min(.1,(now-last)/1000);last=now;
  if(game){
    if(expire(game)){terminal();audio.pause(false);audio.effect('time-closed');}
    if(game.status==='active'&&!paused&&!document.hidden&&!portrait()){
      acc+=dt;while(acc>=C.step&&game.status==='active'){step(game,{...input.value(),fire},C.step);for(const e of game.events)audio.effect(e.type);acc-=C.step;}
      audio.music(game.bossActive?'boss':'level');if(game.status!=='active')terminal();
    }
    render(ctx,game);if(now-lastHUD>100){updateHUD();lastHUD=now;}
  }
  requestAnimationFrame(frame);
}
$('#pause').onclick=togglePause;$('#help').onclick=()=>help(!game);$('#fire').onclick=toggleFire;$('#restart').onclick=confirmRestart;
$('#sound').onclick=async()=>{try{if(!audio.ctx)await audio.start();await audio.toggle();if(paused)audio.pause(true);$('#sound').textContent=audio.enabled?'Sound on':'Sound off';}catch{$('#status').textContent='Sound unavailable in this browser.';}};
window.addEventListener('resize',()=>{if(game&&portrait()){pause();$('#rotate').hidden=false;}else $('#rotate').hidden=true;});
window.addEventListener('pagehide',()=>audio.pause(true));
if(!ctx){$('#status').textContent='This browser could not create the game canvas.';}else{setup();requestAnimationFrame(frame);}
