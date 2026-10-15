import {CONTROL_PROFILES,controlMarkup,bindGameInput,crispCanvas} from './engine/controls.js?v=0.14.0';
import {drawHardware} from './vault-art.js?v=0.14.0';
import {registerRecord} from './privacy.js?v=0.14.0';
import { fetchApi } from './hosting.js?v=0.14.0';
import { StealthSimulation, RULES, REVISION, EQUIPMENT, angleAt, sensorActive, conePolygon, CHECKPOINTS } from './stealth-core.js?v=0.14.0';
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>crypto.randomUUID();
const ranks=[null,'A','B','C'];
export function mergeRecovery(server={},local={}){
  if(server.status==='terminal')return {...server};
  const checkpoint=ranks[Math.max(ranks.indexOf(server.checkpoint??null),ranks.indexOf(local.checkpoint??null))];
  const detections=Math.min(3,Math.max(server.detections||0,local.detections||0));
  return {...server,...local,checkpoint,detections,integrityRemaining:3-detections,activeElapsedMs:Math.min(180000,Math.max(server.activeElapsedMs||0,local.activeElapsedMs||0)),cloakUsed:!!(server.cloakUsed||local.cloakUsed),fallbackUsed:!!(server.fallbackUsed||local.fallbackUsed),fallbackStep:Math.max(server.fallbackStep||0,local.fallbackStep||0),jams:[...new Set([...(server.jams||[]),...(local.jams||[])])],objectives:{panel:!!(server.objectives?.panel||local.objectives?.panel),card:!!(server.objectives?.card||local.objectives?.card)}};
}

export function fallbackScene(route,step,equipment,adverse=0){
  const offset=(route==='shaft'?1:0)+Math.min(adverse,3),lit=(offset+step)%3,safeIndex=(lit+1)%3;
  if(step===0)return {title:'1 · Cross the search sector',text:`The ${route==='shaft'?'ventilation gallery':'security corridor'} has three hiding positions. The beam will finish at position ${lit+1}. Only position ${safeIndex+1} is completely behind a steel wall; the third position is an open railing.`,options:['Position 1','Position 2','Position 3'],correct:safeIndex,explanation:'The solid wall blocks the beam. The open railing does not.',forecast:`In two seconds, the beam points at position ${lit+1}.`};
  if(step===1){const active=offset%2===0;return{title:'2 · Bypass the sensor',text:`The vertical sensor is ${active?'ON for one more second, then OFF for two seconds':'OFF for two more seconds'}. Cover ends immediately before the beam; the ceiling is too low to jump over it.`,options:['Cross now','Wait for the OFF window','Jump through the beam'],correct:active?1:0,explanation:'A vertical beam must be crossed while it is off. Jumping through it still triggers the sensor.',toolkit:(Array.isArray(equipment)?equipment:[equipment]).includes('toolkit')};}
  return {title:'3 · Board the elevator',text:`Three windows remain. During window ${lit+1}, a spotlight crosses the elevator. During window ${safeIndex+1}, the light points away and the doors are open. The remaining window has closed doors. Choose a window, then hold Confirm to board.`,options:['Window 1','Window 2','Window 3'],correct:safeIndex,explanation:'You entered while the spotlight faced away and the elevator doors were open.',forecast:`The clear approach is window ${safeIndex+1}.`};
}

export class StealthRuntime{
  constructor(root,options){
    this.root=root;this.options=options;this.team=options.team;this.ex=this.team.extraction;this.paused=!!options.paused;
    this.key=`mq-v09-extraction-${options.session}-${options.studentId}-${this.ex.stageEnteredAt}`;
    registerRecord(options.session,this.key);
    let saved;try{saved=JSON.parse(localStorage.getItem(this.key)||'null');}catch{}
    this.recovery=mergeRecovery(this.ex.result,saved?.summary);this.queue=saved?.queue||[];
    this.sim=new StealthSimulation(this.ex,this.recovery);if(this.recovery.outcome&&this.recovery.status==='terminal'){this.sim.state='terminal';this.sim.outcome=this.recovery.outcome;}this.fallback=!!this.recovery.fallbackUsed;this.fallbackStep=this.recovery.fallbackStep||0;this.eliminated=saved?.eliminated||{};
    this.lastContact=Date.now();this.networkPaused=false;this.localPaused=false;this.started=false;this.destroyed=false;this.flushing=false;this.input={};this.pointers=new Map();this.lastFrame=0;this.accumulator=0;this.overlayKey='';this.lastHUD=0;
    this.abort=new AbortController();this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.contrast=false;this.sound=true;this.music=new window.Audio('./assets/vault7/audio/vault7-finale.mp3');this.music.loop=true;this.music.volume=.22;
    this.mount();this.bind();this.update(this.team,this.paused);
    this.loop=this.loop.bind(this);this.frame=requestAnimationFrame(this.loop);
    this.timer=setInterval(()=>{if(this.started&&!this.fallback&&this.sim.state!=='terminal')this.enqueue('heartbeat');this.flush();this.checkConnection();},15000);
    this.retry=setInterval(()=>{this.flush();this.checkConnection();},5000);
    if(this.queue.length)this.flush();
  }
  summary(){return {...this.sim.summary(),fallbackUsed:this.fallback,fallbackStep:this.fallbackStep,...(this.sim.state==='terminal'?{outcome:this.sim.outcome}:{}),status:this.sim.state==='terminal'?'terminal':this.started?'active':'not_started'};}
  save(){try{localStorage.setItem(this.key,JSON.stringify({summary:this.summary(),queue:this.queue,eliminated:this.eliminated}));}catch{this.connection.textContent='Device storage unavailable. Keep this page open until your result is saved.';}}
  mount(){
    const equip={name:(this.ex.loadout||[this.ex.equipment]).map(id=>EQUIPMENT[id]?.name).filter(Boolean).join(' + '),effect:(this.ex.loadout||[this.ex.equipment]).map(id=>EQUIPMENT[id]?.effect).filter(Boolean).join(' ')};
    this.root.innerHTML=`<section class="stealth-shell"><div class="mq-rotate" role="status">Rotate your phone to landscape to play. Your run is paused.</div><div class="stealth-brief"><p class="transmission">${this.ex.route==='shaft'?'VENTILATION SHAFT':'SECURITY CORRIDOR'} · ${this.ex.adverseCount?'ALERT '+this.ex.adverseCount:'QUIET FACILITY'}</p><h2>Your crew made its choice. Now get out.</h2><p>${this.team.finalAction==='release'?'Asterion is already beyond containment.':this.team.finalAction==='destroy'?'The core is collapsing behind you.':this.team.finalAction==='copy'?'The copied archive pulses inside your jacket.':'Containment doors seal behind you.'} The core has accepted your command. Alarms sound and containment shutters begin to close. Disable the security panel, cross the search sector, collect the access card, and reach the surface elevator.</p><p class="equipment-effect"><b>${equip?.name||'No extraction equipment'}</b> · ${equip?.effect||'Every route can be completed at standard speed.'}</p></div>
      <div class="stealth-hud" aria-label="Extraction status"><span>Integrity <b data-hud="integrity">● ● ●</b></span><span>Visibility <meter data-hud="visibility" min="0" max="100" value="0"></meter></span><span>Run <b data-hud="time">3:00</b></span><span>Checkpoint <b data-hud="checkpoint">—</b></span></div>
      <div class="stealth-stage"><canvas width="320" height="180" tabindex="0" aria-label="Side-view escape: avoid spotlights, jump sensors, reach the elevator. Accessible extraction is available below."></canvas><div class="stealth-overlay" hidden></div></div>
      <p class="mq-objective" role="status"></p><div class="stealth-touch">${controlMarkup(CONTROL_PROFILES.vault)}</div>
      <p class="stealth-instructions">${CONTROL_PROFILES.vault.help}</p>
      <div class="stealth-options"><button data-run="view">Expand game</button><button data-run="pause">Pause run</button><button data-run="help">Controls</button><button data-run="reset-input">Reset controls</button><button data-run="fallback">Use accessible extraction</button><label><input type="checkbox" data-option="contrast"> High contrast</label><label><input type="checkbox" data-option="reduced" ${this.reduced?'checked':''}> Reduced motion</label><label><input type="checkbox" data-option="sound" checked> Music + effects</label></div>
      <section class="stealth-fallback" hidden></section><p class="stealth-connection" role="status">Your result will be saved to mission control.</p><p class="stealth-progress"></p>
    </section>`;
    this.canvas=this.root.querySelector('canvas');this.ctx=this.canvas.getContext('2d',{alpha:false});if(this.ctx)this.ctx.imageSmoothingEnabled=false;else this.fallback=true;this.sprite=new Image();this.sprite.src='./assets/vault7/sprites/agent-16x24.png';
    this.root.querySelector('.stealth-shell').prepend(this.root.querySelector('.stealth-options'));
    this.overlay=this.root.querySelector('.stealth-overlay');this.fallbackRoot=this.root.querySelector('.stealth-fallback');this.connection=this.root.querySelector('.stealth-connection');this.hud=Object.fromEntries([...this.root.querySelectorAll('[data-hud]')].map(e=>[e.dataset.hud,e]));
  }
  bind(){
    const signal=this.abort.signal;
    this.inputBinding=bindGameInput(this.root,CONTROL_PROFILES.vault,{signal,onChange:v=>this.input=v,blocked:()=>this.fallback||!this.started||this.blocked()||this.sim.state!=='playing',onPause:()=>{if(this.started&&this.sim.state!=='terminal'){this.localPaused=true;this.showOverlay();if(this.fallback)this.showFallback();this.save();}}});
    const reset=()=>this.inputBinding.clear();this.resetInput=reset;
    window.addEventListener('online',()=>this.flush(),{signal});
    this.root.addEventListener('click',e=>{const action=e.target.closest('[data-run]')?.dataset.run;if(!action)return;
      if(action==='view'){this.root.classList.toggle('mq-focus');e.target.textContent=this.root.classList.contains('mq-focus')?'Window view':'Expand game';reset();}
      if(action==='help'){this.help=true;this.localPaused=true;reset();this.overlayKey='';this.showOverlay();}
      if(action==='reset-input'){reset();this.localPaused=true;this.showOverlay();}if(action==='start')this.start();if(action==='resume'){this.help=false;this.localPaused=false;this.networkPaused=false;this.lastFrame=0;this.showOverlay();if(this.fallback)this.showFallback();else this.canvas.focus({preventScroll:true});}
      if(action==='pause'){this.help=false;this.localPaused=!this.localPaused;reset();this.showOverlay();if(this.fallback)this.showFallback();}
      if(action==='fallback')this.switchFallback();
      if(action==='confirm-choice')this.confirmFallback();
      if(action==='cloak-scene'&&(this.ex.loadout||[this.ex.equipment]).includes('cloak')&&!this.sim.cloakUsed&&!this.blocked()){this.sim.cloakUsed=true;this.enqueue('heartbeat');this.choice=fallbackScene(this.ex.route,this.fallbackStep,this.ex.loadout||this.ex.equipment,this.ex.adverseCount).correct;this.confirmFallback();}
      if(action==='next-scene'){this.choice=null;this.sceneFeedback='';this.showFallback();}
    },{signal});
    this.root.addEventListener('change',e=>{const key=e.target.dataset.option;if(!key)return;this[key]=e.target.checked;if(key==='sound'){if(this.sound)this.enableSound();else this.music.pause();}this.root.classList.toggle('high-contrast',this.contrast);},{signal});
  }
  start(){if(this.started||this.paused)return;this.started=true;this.enableSound();if(!this.fallback)this.root.classList.add('mq-focus');this.root.querySelector('[data-run="view"]').textContent='Window view';this.sim.start();this.localPaused=false;this.enqueue('start',{mapRevision:REVISION});if(this.fallback)this.enqueue('switchFallback');this.showOverlay();if(this.fallback)this.showFallback();else this.canvas.focus({preventScroll:true});}
  blocked(){return this.paused||this.localPaused||this.networkPaused||document.hidden||!!globalThis.matchMedia?.('(orientation: portrait) and (max-width: 700px)').matches;}
  switchFallback(){
    if(this.sim.state==='terminal'||this.paused)return;
    if(!this.started)this.start();this.fallback=true;this.root.classList.remove('mq-focus');this.fallbackStep=Math.max(this.fallbackStep,Math.min(2,ranks.indexOf(this.sim.checkpoint)));this.resetInput();this.enqueue('switchFallback');this.showFallback();this.showOverlay();
  }
  update(team,paused){
    if(this.destroyed)return;this.lastContact=Date.now();this.connection.textContent=this.queue.length?`Saving ${this.queue.length} update${this.queue.length===1?'':'s'}…`:'Connected · progress saved';
    const previousMode=`${this.paused}-${this.networkPaused}-${this.localPaused}-${this.sim.state}`;
    this.team=team;this.ex=team.extraction;this.sim.level.loadout=[...(this.ex.loadout||[this.ex.equipment].filter(Boolean))];const r=this.ex.result;
    if(this.paused!==paused){this.paused=paused;this.resetInput();this.lastFrame=0;}
    if(this.networkPaused){this.networkPaused=false;this.localPaused=true;}
    if(r?.status==='terminal'){
      this.sim.state='terminal';this.sim.outcome=r.outcome;this.sim.checkpoint=r.checkpoint;this.sim.panel=!!r.objectives?.panel||['A','B','C'].includes(r.checkpoint);this.sim.card=!!r.objectives?.card||r.checkpoint==='C';this.sim.detections=r.detections;this.sim.integrity=r.integrityRemaining;this.sim.elapsed=r.activeElapsedMs/1000;this.queue=[];this.fallback=!!r.fallbackUsed;this.fallbackStep=r.fallbackStep||0;
    }else if(r){
      if(r.detections>this.sim.detections){this.sim.detections=r.detections;this.sim.integrity=3-r.detections;}
      this.sim.cloakUsed=!!(this.sim.cloakUsed||r.cloakUsed);this.sim.jams=[...new Set([...this.sim.jams,...(r.jams||[])])];
      if(r.activeElapsedMs>this.sim.elapsed*1000)this.sim.elapsed=r.activeElapsedMs/1000;
      if(ranks.indexOf(r.checkpoint)>ranks.indexOf(this.sim.checkpoint)){this.sim.checkpoint=r.checkpoint;this.sim.panel=['A','B','C'].includes(r.checkpoint);this.sim.card=r.checkpoint==='C';Object.assign(this.sim.player,CHECKPOINTS[r.checkpoint],{vx:0,vy:0});}
      if(r.fallbackUsed&&!this.fallback){this.fallback=true;this.fallbackStep=r.fallbackStep;this.started=true;this.resetInput();this.showFallback();}
    }
    this.root.querySelector('.stealth-progress').textContent=`${this.ex.completedCount} of ${this.ex.rosterCount} crew members finished. Mission control can close extraction for anyone still away.`;
    this.showOverlay();if(this.fallback&&previousMode!==`${this.paused}-${this.networkPaused}-${this.localPaused}-${this.sim.state}`)this.showFallback();this.updateHUD();this.save();
  }
  connectionLost(){this.connection.textContent='Connection interrupted. Your progress is stored on this device.';this.checkConnection();}
  checkConnection(){if(this.options.developerMode)return;if(Date.now()-this.lastContact>30000&&this.sim.state!=='terminal'){this.networkPaused=true;this.resetInput();this.showOverlay();if(this.fallback)this.showFallback();}}
  enqueue(type,extra={}){
    if(this.options.developerMode){this.lastContact=Date.now();this.connection.textContent='DEVELOPER PRACTICE · no room or academic results are changed';return;}
    const payload={...this.summary(),...extra,type:`extraction.${type}`,commandId:id(),deviceId:this.options.deviceId};
    delete payload.status;
    if(type==='heartbeat'){const old=this.queue.findIndex((v,i)=>i>0&&v.type==='extraction.heartbeat');if(old>=0)this.queue.splice(old,1);}
    this.queue.push(payload);this.save();queueMicrotask(()=>this.flush());
  }
  async flush(){
    if(this.flushing||this.destroyed||!this.queue.length)return;this.flushing=true;
    try{while(this.queue.length&&!this.destroyed){
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);let response;
      try{response=await fetchApi(this.options.endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(this.queue[0]),signal:controller.signal});}finally{clearTimeout(timeout);}
      const raw=await response.text();let incoming;try{incoming=JSON.parse(raw);}catch{throw Error('Mission control returned an incomplete response. Your run is saved here.');}
      if(!response.ok){if(response.status===409&&/Stale/.test(incoming.error)){this.queue.shift();continue;}throw Error(incoming.error||'Unable to save yet.');}
      this.queue.shift();this.lastContact=Date.now();const team=incoming.teams?.[0];if(team?.extraction)this.update(team,incoming.paused);this.options.onState(incoming);this.save();
    }}catch(error){this.connection.textContent=`${error.name==='AbortError'?'Mission control is taking longer than expected.':error.message} Reconnecting automatically…`;this.checkConnection();}finally{this.flushing=false;}
  }
  showOverlay(){
    const terminal=this.sim.state==='terminal',mode=terminal?'terminal':this.paused?'teacher-pause':this.networkPaused?'network':this.localPaused?'paused':!this.started?'ready':this.sim.state==='detected'||this.sim.state==='respawning'?'detected':'';
    const key=`${mode}-${this.sim.integrity}-${this.queue.length===0}-${!!this.help}`;if(key===this.overlayKey)return;this.overlayKey=key;
    this.overlay.hidden=!mode||this.fallback&&mode==='detected';this.root.querySelector('.stealth-touch').hidden=this.fallback||terminal;
    if(!mode)return;
    const title=mode==='terminal'?({extracted:'Elevator reached',fallback_extracted:'Extraction complete',captured:'Signal lost · captured',timeout:'Extraction window closed',advanced:'Mission control closed the run'})[this.sim.outcome]:mode==='teacher-pause'?'Mission paused by your teacher':mode==='network'?'Waiting for mission control':mode==='paused'?'Run paused':mode==='detected'?'Detected!':'Extraction ready';
    const body=mode==='terminal'?`${this.options.developerMode?'Practice finished. Use Restart practice above to try another loadout.':`${this.queue.length?'Saving your result…':'Your result is recorded.'} Wait for the crew’s epilogue. Your mathematics record is unchanged.`}`:mode==='ready'?'Avoid the yellow searchlights. Jump low sensors and wait for vertical beams to switch off. At the elevator, hold E or ELEVATOR.':mode==='detected'?`${this.sim.integrity} integrity remaining. Returning to your checkpoint.`:mode==='network'?'Progress is safe on this device. Reconnect to continue.':'Physics and the run timer are frozen.';
    this.overlay.innerHTML=`<div role="status"><h2>${title}</h2><p>${this.help||mode==='ready'?safe(CONTROL_PROFILES.vault.help):body}</p>${mode==='ready'?'<button data-run="start">Start extraction</button><button data-run="fallback">Use accessible extraction</button>':mode==='paused'?'<button data-run="resume">Resume run</button>':mode==='detected'&&this.sim.integrity>0?'<button data-run="fallback">Switch to accessible extraction</button>':''}</div>`;
  }
  showFallback(){
    this.fallbackRoot.hidden=false;this.root.querySelector('.stealth-stage').hidden=true;this.root.querySelector('.stealth-touch').hidden=true;this.root.querySelector('.stealth-instructions').hidden=true;
    if(this.sim.state==='terminal'){this.fallbackRoot.innerHTML=`<h2>${this.sim.outcome==='captured'?'Captured · signal lost':'Extraction complete'}</h2><p>Your run has been recorded. Waiting for the crew’s epilogue.</p>`;return;}
    if(this.blocked()){this.fallbackRoot.innerHTML=`<h2>Extraction paused</h2><p>${this.paused?'Mission control has paused the session.':'Resume when you are ready.'}</p>${!this.paused&&!this.networkPaused?'<button data-run="resume">Resume run</button>':''}`;return;}
    const scene=fallbackScene(this.ex.route,this.fallbackStep,this.ex.loadout||this.ex.equipment,this.ex.adverseCount),removed=this.eliminated[this.fallbackStep]||[];
    if(scene.toolkit&&!this.sceneFeedback&&!this.sim.jams.includes(this.sim.checkpoint||'start')){this.choice=scene.correct;this.sceneFeedback='Your Silent Toolkit disables this sensor. This sector is clear.';this.sim.jams=[...new Set([...this.sim.jams,this.sim.checkpoint||'start'])];this.fallbackStep++;this.sim.checkpoint='B';this.sim.panel=true;this.enqueue('checkpoint');}
    const displayed=scene;
    this.fallbackRoot.innerHTML=`<p class="transmission">ACCESSIBLE EXTRACTION · ${Math.min(this.fallbackStep+1,3)} / 3</p><h2>${displayed.title}</h2><p>${displayed.text}</p>${(this.ex.loadout||[this.ex.equipment]).includes('cloak')&&!this.sim.cloakUsed&&(!this.sceneFeedback||this.sceneFeedback.startsWith('Detected'))?'<button data-run="cloak-scene">Use one-use Cloak · cross this sector safely</button>':''}<div class="fallback-choices">${scene.options.map((o,i)=>`<button data-fallback-choice="${i}" aria-pressed="${this.choice===i}" ${removed.includes(i)||this.sceneFeedback&&!this.sceneFeedback.startsWith('Detected')?'disabled':''}>${safe(o)}${removed.includes(i)?' · unsafe':''}${this.choice===i?' ✓':''}</button>`).join('')}</div>${this.sceneFeedback?`<p class="fallback-feedback" role="status">${safe(this.sceneFeedback)}</p>`:''}${this.sceneFeedback&&!this.sceneFeedback.startsWith('Detected')?'<button data-run="next-scene">Continue to next sector</button>':`<button class="fallback-confirm" data-run="${this.fallbackStep===2?'hold-final':'confirm-choice'}" ${this.choice==null?'disabled':''}>${this.fallbackStep===2?'Hold Confirm · 0.6 seconds':'Confirm choice'}</button>`}<p class="fine">Read at your own pace. The teacher controls the shared extraction window.</p>`;
    for(const b of this.fallbackRoot.querySelectorAll('[data-fallback-choice]'))b.onclick=()=>{this.choice=Number(b.dataset.fallbackChoice);this.showFallback();};
    const hold=this.fallbackRoot.querySelector('[data-run="hold-final"]');
    if(hold){let timer;const start=e=>{if(this.blocked())return;if(e.type==='keydown'&&![' ','Enter'].includes(e.key))return;e.preventDefault();if(timer)return;hold.classList.add('holding');timer=setTimeout(()=>{timer=null;this.confirmFallback();},600);};const stop=()=>{clearTimeout(timer);timer=null;hold.classList.remove('holding');};hold.onpointerdown=start;hold.onpointerup=stop;hold.onpointercancel=stop;hold.onpointerleave=stop;hold.onkeydown=start;hold.onkeyup=stop;hold.onblur=stop;}
  }
  confirmFallback(){
    if(this.blocked()||this.choice==null||this.sim.state==='terminal')return;
    const scene=fallbackScene(this.ex.route,this.fallbackStep,this.ex.loadout||this.ex.equipment,this.ex.adverseCount);
    if(this.choice!==scene.correct){this.sim.detections++;this.sim.integrity--;this.eliminated[this.fallbackStep]||=[];this.eliminated[this.fallbackStep].push(this.choice);this.choice=null;this.sceneFeedback=`Detected. ${scene.explanation} ${this.sim.integrity} integrity remains.`;this.enqueue('detected');if(!this.sim.integrity){this.sim.complete('captured');this.sim.events=[];this.enqueue('complete',{outcome:'captured'});}}
    else{this.sceneFeedback=scene.explanation;this.fallbackStep++;this.sim.checkpoint=['A','B','C'][this.fallbackStep-1];this.sim.panel=true;this.sim.card=this.fallbackStep===3;this.enqueue('checkpoint');if(this.fallbackStep===3){this.sim.complete('fallback_extracted');this.sim.events=[];this.enqueue('complete',{outcome:'fallback_extracted'});}}
    this.updateHUD();this.showFallback();this.save();
  }
  updateHUD(){
    this.hud.integrity.textContent='● '.repeat(this.sim.integrity)+'○ '.repeat(3-this.sim.integrity);this.hud.visibility.value=this.sim.visibility;
    const left=Math.max(0,Math.ceil(180-this.sim.elapsed));this.hud.time.textContent=this.fallback?'No speed timer':Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
    this.hud.checkpoint.textContent=this.sim.checkpoint||'Start';
    const ids=this.ex.loadout||[this.ex.equipment],s=this.sim,remaining=Math.max(0,s.cloakUntil-s.elapsed),jam=Math.max(0,s.jamUntil-s.elapsed);
    const loadout=ids.map(id=>id==='cloak'?'CLOAK: '+(remaining>0?remaining.toFixed(1)+'s ACTIVE':s.cloakUsed?'USED':'READY · R'):id==='toolkit'?'SILENT TOOLKIT: '+(jam>0?jam.toFixed(1)+'s ACTIVE':s.jams.includes(s.checkpoint||'start')?'USED here':'READY · Q'):id==='scanner'?'CODE SCANNER: cipher insurance':'').filter(Boolean).join(' · ')||'NO EQUIPMENT';
    this.root.querySelector('.mq-objective').textContent=loadout+' · '+s.objective()+' · '+s.alert;
    for(const key of ['jam','cloak']){const button=this.root.querySelector('[data-game-key="'+key+'"]');button.hidden=!ids.includes(key==='jam'?'toolkit':'cloak');button.disabled=key==='cloak'?s.cloakUsed:s.jams.includes(s.checkpoint||'start');}
  }
  async enableSound(){try{this.audioContext||=new (window.AudioContext||window.webkitAudioContext)();await this.audioContext.resume();if(this.started&&!this.blocked())await this.music.play();this.beep('preview');}catch{this.connection.textContent='Sound could not start. Tap Music + effects again to retry.';}}
  beep(kind){if(!this.sound)return;try{this.audioContext||=new (window.AudioContext||window.webkitAudioContext)();if(this.audioContext.state!=='running')return;const a=this.audioContext,o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.value=kind==='detected'?130:kind==='complete'?520:380;g.gain.setValueAtTime(.06,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.15);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.16);}catch{}}
  loop(stamp){
    if(this.destroyed)return;
    if(this.sound&&this.started&&!this.blocked()&&this.sim.state!=='terminal'){if(this.music.paused&&!this.musicPending){this.musicPending=true;this.music.play().catch(()=>{this.sound=false;this.connection.textContent='Tap Music + effects to enable audio.';}).finally(()=>this.musicPending=false);}}else if(!this.music.paused)this.music.pause();
    this.inputBinding.poll();const dt=this.lastFrame?Math.min(.1,(stamp-this.lastFrame)/1000):0;this.lastFrame=stamp;
    if(this.started&&!this.blocked()&&!this.fallback&&this.sim.state!=='terminal'){
      this.accumulator+=dt;let n=0;while(this.accumulator>=RULES.step&&n<5){this.sim.step(this.input);this.accumulator-=RULES.step;n++;}if(n===5)this.accumulator=0;
      for(const event of this.sim.events.splice(0)){if(['detected','respawn','complete'].includes(event.type))this.resetInput();this.enqueue(event.type,event);this.beep(event.type);}this.showOverlay();
    }else this.accumulator=0;
    if(!this.fallback)this.draw();
    if(stamp-this.lastHUD>100){this.updateHUD();this.lastHUD=stamp;}
    this.frame=requestAnimationFrame(this.loop);
  }
  draw(){
    if(!this.ctx)return;this.ctx=crispCanvas(this.canvas,320,180);const c=this.ctx,s=this.sim,l=s.level,t=s.elapsed,cam=Math.max(0,Math.min(704,Math.round(s.player.x-112)));c.fillStyle='#09131e';c.fillRect(0,0,320,180);c.save();c.translate(-cam,0);
    // Pixel geometry remains readable if optional texture assets fail to load.
    for(let x=Math.floor(cam/64)*64;x<cam+384;x+=64){c.fillStyle='#102433';c.fillRect(x+8,24,46,124);c.fillStyle='#214253';c.fillRect(x+13,32,3,105);c.fillStyle='#1c3443';for(let y=48;y<130;y+=24)c.fillRect(x+20,y,24,9);c.fillStyle='#2c6370';c.fillRect(x+20,38,14,2);}
    c.fillStyle='#193543';c.fillRect(cam,4,320,4);
    for(const e of l.emitters){
      if(!e.disabled){const pts=conePolygon(l,e,t);c.beginPath();c.moveTo(pts[0].x,pts[0].y);for(const p of pts.slice(1))c.lineTo(p.x,p.y);c.closePath();c.fillStyle=this.contrast?'#fff59d80':'#f4cf493f';c.fill();c.strokeStyle='#f3d574';c.lineWidth=.6;c.stroke();}
      c.fillStyle=e.disabled?'#426a67':'#cad4cc';c.fillRect(e.x-4,e.y-5,8,6);c.fillStyle=e.disabled?'#66bc99':'#f9d872';c.fillRect(e.x-2,e.y+1,4,3);
    }
    for(let y=0;y<11;y++)for(let x=Math.max(0,Math.floor(cam/16));x<=Math.min(63,Math.ceil((cam+320)/16));x++){const tile=l.grid[y][x];if(!tile)continue;c.fillStyle=tile===2?'#567482':'#29434c';c.fillRect(x*16,y*16,16,tile===2?4:16);c.fillStyle=tile===2?'#a6d1d2':'#5e7c81';c.fillRect(x*16,y*16,16,2);if(tile===1){c.fillStyle='#183037';c.fillRect(x*16+2,y*16+4,12,10);c.fillStyle='#314e57';c.fillRect(x*16+4,y*16+6,8,6);}}
    for(const sensor of l.sensors){
      const on=sensorActive(sensor,t)&&t>=s.jamUntil;
      c.fillStyle=on?'#ff5f79':'#28465b';c.fillRect(sensor.x,sensor.y,sensor.w,sensor.h);
      c.fillStyle='#829aaa';c.fillRect(sensor.x-3,sensor.y-5,8,5);c.fillRect(sensor.x-3,sensor.y+sensor.h,8,5);
      c.fillStyle=on?'#ff9fb0':'#77efd0';c.beginPath();c.arc(sensor.x+1,sensor.y-2,1.4,0,Math.PI*2);c.fill();
      const phase=(t+sensor.phase)%(sensor.on+sensor.off),remaining=on?sensor.on-phase:sensor.on+sensor.off-phase;
      c.font='bold 6px system-ui';c.fillStyle='#ecf4f9';c.fillText(sensor.off===0?'JUMP':(on?'ON ':'OFF ')+Math.max(0,remaining).toFixed(1)+'s',sensor.x-8,sensor.y-9);
    }


    c.fillStyle='#133f43';c.fillRect(964,92,40,68);c.strokeStyle='#74f4dd';c.strokeRect(964,92,40,68);c.fillStyle='#529386';c.fillRect(982,94,2,64);c.font='6px monospace';c.fillStyle='#bcffef';if(s.player.x>934){c.fillStyle='#7ef8d4';c.fillRect(967,153,34*Math.min(1,s.exitHold/.6),3);}



    drawHardware(c,s,t);
    if(s.alert==='Lockdown'){c.fillStyle='#f5685266';c.fillRect(cam,0,320,4);}
    const p=s.player,x=Math.round(p.x),y=Math.round(p.y);c.globalAlpha=s.elapsed<s.cloakUntil?.3:s.immunity>0&&!this.reduced?.65:1;
    // Original code-drawn 16×24 agent sprite, with a restrained walk cycle.
    if(this.sprite.complete&&this.sprite.naturalWidth){const frame=!this.reduced&&Math.abs(p.vx)>1&&p.grounded?[0,1,0,2][Math.floor(t/.14)%4]:0;c.drawImage(this.sprite,p.facing>0?48:16,frame*24,16,24,x,y,16,24);}else{
    const walk=!this.reduced&&Math.abs(p.vx)>1&&p.grounded?Math.floor(t*10)%2:0;c.fillStyle='#070e19';c.fillRect(x+2,y+3,12,19);c.fillStyle='#a2d5cc';c.fillRect(x+5,y+1,7,6);c.fillStyle='#172d44';c.fillRect(x+4,y+7,9,10);c.fillStyle='#69d9df';c.fillRect(x+(p.facing>0?9:3),y+3,5,2);c.fillStyle='#45798a';c.fillRect(x+4,y+9,7,5);c.fillStyle='#273c54';c.fillRect(x+3-walk,y+17,4,7);c.fillRect(x+9+walk,y+17,4,7);c.fillStyle='#9cb3b2';c.fillRect(x+2,y+10,2,6);}
    c.globalAlpha=1;
    c.restore();c.fillStyle='#060e17';c.fillRect(0,176,320,4);
  }
  destroy(){if(this.destroyed)return;this.save();this.destroyed=true;this.root.classList.remove('mq-focus');this.abort.abort();cancelAnimationFrame(this.frame);clearInterval(this.timer);clearInterval(this.retry);this.resetInput();this.music.pause();this.music.src='';this.audioContext?.close();}
}
