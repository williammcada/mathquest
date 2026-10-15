import {ironbreakAdapter as adapter} from './adapter.js';
import {bindInput} from './input.js';
import {padHtml} from '../../engine/pad.js?v=1';
import {clearInput} from './simulation.js';
import {ShooterAudio} from './audio.js';
import {IRONBREAK,GUIDED} from '../../cartridges/ironbreak.js';
import {registerRecord} from '../../privacy.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class IronbreakHost{
 constructor(root,{run,deadline,serverNow,pausedAt,paused=false,send,recovery=true}){
  this.root=root;this.recovery=recovery;this.run=run;this.send=send;this.deadline=deadline;this.teacherPaused=paused;this.pausedAt=pausedAt;this.offset=(serverNow||Date.now())-Date.now();this.s=adapter.create(run);this.seq=run.seq;this.paused=true;this.fire=true;this.acc=0;this.last=performance.now();this.lastSend=this.last;this.ac=new AbortController();this.audio=new ShooterAudio();this.key=`mq-ironbreak-${run.runId}`;
  try{if(this.recovery)registerRecord(new URLSearchParams(location.search).get('session'),this.key);}catch{}
  try{const p=this.recovery?JSON.parse(localStorage.getItem(this.key)):null;if(p?.attemptId===run.attemptId&&p.seq>run.seq&&run.status!=='terminal'){this.pending=p;this.s=adapter.create({...run,snapshot:p.snapshot});this.seq=p.seq;}}catch{}
  this.render();this.fit();this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 render(){
  this.root.innerHTML=`<section class="ib-host"><div class="ib-toolbar"><strong>IRONBREAK <small>v0.2.1 · cartridge candidate</small></strong><button data-pause>Resume</button><button data-help>Controls</button><button data-sound>Sound on</button><button data-fire>Fire ON</button><button data-assist>Guided play</button><button data-reset>Reset controls</button></div><div class="nf-hud"><span data-health></span><span data-lives></span><b data-clock></b><span data-gear></span></div><div class="ib-stage">${padHtml('eight',{label:'8-direction movement and aiming',cls:'ib-pad'})}<canvas width="640" height="360" aria-label="Ironbreak robot foundry"></canvas><button class="ib-jump">JUMP</button><div class="ib-overlay" role="dialog" aria-modal="true" aria-label="Ironbreak operation"></div></div><div class="ib-status mq-objective" role="status"></div><footer>A WILLIAM MCADA PRODUCT · Individual suit, shared crew clock</footer></section>`;
  const q=s=>this.root.querySelector(s);this.shell=q('.ib-host');this.panel=q('.ib-overlay');this.canvas=q('canvas');this.ctx=this.canvas.getContext('2d');this.status=q('.ib-status');
  this.binding=bindInput({root:this.shell,pad:q('.ib-pad'),jump:q('.ib-jump'),signal:this.ac.signal,blocked:()=>this.blocked(),onPause:()=>this.pause(),onFire:()=>this.toggleFire()});
  const on=(el,event,fn)=>el.addEventListener(event,fn,{signal:this.ac.signal});
  on(q('[data-pause]'),'click',()=>this.paused?this.resume():this.pause());on(q('[data-help]'),'click',()=>{this.pause();this.help=true;this.overlay();});on(q('[data-reset]'),'click',()=>this.clear());on(q('[data-fire]'),'click',()=>this.toggleFire());
  on(q('[data-assist]'),'click',()=>{this.pause();this.confirmAssist=true;this.overlay();});
  on(q('[data-sound]'),'click',async()=>{try{if(!this.audio.ctx)await this.audio.start();await this.audio.toggle();this.audio.pause(this.blocked());q('[data-sound]').textContent=this.audio.enabled?'Sound on':'Sound off';}catch{this.status.textContent='Sound unavailable. Visual warnings remain active.';}});
  on(window,'resize',()=>this.fit());on(window,'orientationchange',()=>this.fit());if(window.visualViewport)on(window.visualViewport,'resize',()=>this.fit());on(window,'pagehide',()=>this.pause());
  this.overlay();
 }
 clear(){this.binding?.clear();clearInput(this.s);this.acc=0;}
 fit(){const v=window.visualViewport;this.shell.style.setProperty('--ib-width',`${v?.width||innerWidth}px`);this.shell.style.setProperty('--ib-height',`${v?.height||innerHeight}px`);this.portrait=(v?.height||innerHeight)>(v?.width||innerWidth);this.clear();if(this.portrait)this.pause();else this.overlay();}
 blocked(){return this.dead||this.paused||this.teacherPaused||this.portrait||document.hidden||this.run.status!=='active'||this.s.status!=='active'||this.run.mode!=='action'||!this.ctx||!!this.pending&&this.networkError;}
 toggleFire(){this.fire=!this.fire;this.root.querySelector('[data-fire]').textContent=this.fire?'Fire ON':'Fire OFF';}
 pause(){if(this.dead)return;this.paused=true;this.clear();this.audio.pause(true);this.queue();this.overlay();}
 async audioStart(){try{await this.audio.start();this.audio.pause(this.blocked());}catch{this.status.textContent='Sound unavailable; you can continue.';}}
 async resume(){
  if(this.busy||this.teacherPaused||this.run.status==='terminal')return;
  if(this.pending&&this.rejected){this.pending=null;this.rejected=false;try{localStorage.removeItem(this.key);}catch{}this.s=adapter.create(this.run);this.seq=this.run.seq;this.clear();this.networkError=false;this.status.textContent='Restored your last saved position.';}
  if(this.pending&&!await this.flush())return;
  if(this.run.status==='not_started'){await this.act('start',{mode:this.ctx?'action':'assisted'});return;}
  if(this.run.mode==='action'&&this.portrait)return;
  this.help=false;this.confirmAssist=false;this.paused=false;this.clear();this.last=performance.now();await this.audioStart();this.overlay();
 }
 identity(){return {runId:this.run.runId,attemptId:this.run.attemptId,phaseId:this.run.phaseId,configRevision:this.run.configRevision};}
 accept(result,restore=false){
  const action=result.teams?.find(t=>t.finale?.run?.runId===this.run.runId)?.finale;
  if(!action)return;
  this.update(action.run,result.paused,action.deadline,action);
  if(restore){this.s=adapter.create(this.run);this.seq=this.run.seq;this.clear();}
 }
 async act(kind,extra={}){
  if(this.busy||this.dead||this.teacherPaused)return;this.busy=true;this.clear();
  try{
   if(this.pending&&!await this.flush())return;
   const result=await this.send('ironbreak.'+kind,{...this.identity(),commandId:crypto.randomUUID(),...extra});if(this.dead)return;
   this.accept(result,['start','retry','assist'].includes(kind));this.networkError=false;this.status.textContent=result.guideFeedback||'Progress recorded.';
   this.paused=!['start','retry','assist'].includes(kind);this.confirmAssist=false;this.help=false;
   if(!this.paused)await this.audioStart();this.overlay();
  }catch(e){this.networkError=true;this.paused=true;this.status.textContent=`Connection or validation interrupted: ${e.message}. Resume to reconnect.`;this.overlay();}finally{this.busy=false;}
 }
 queue(){
  if(this.pending||this.run.status!=='active'||this.run.mode!=='action')return;
  this.pending={...this.identity(),commandId:crypto.randomUUID(),seq:++this.seq,activeElapsedMs:Math.round(this.s.activeTime*1000),snapshot:adapter.snapshot(this.s)};
  try{if(this.recovery)localStorage.setItem(this.key,JSON.stringify(this.pending));}catch{this.status.textContent='Local recovery unavailable. Keep this tab open.';}
 }
 async flush(){
  if(this.sending)return false;if(!this.pending)return true;
  const pending=this.pending;this.sending=true;
  try{const result=await this.send('ironbreak.progress',pending);if(this.dead)return true;this.accept(result);if(this.pending===pending)this.pending=null;try{localStorage.removeItem(this.key);}catch{}this.networkError=false;return true;}
  catch(e){this.networkError=true;this.pause();
   // A reply that rejects the update will reject it again; Resume then restores the last accepted position.
   this.rejected=!/fetch|network|load failed|timeout|offline/i.test(`${e.name} ${e.message}`);
   this.status.textContent=this.rejected?`The last update was rejected: ${e.message}. Resume continues from your last saved position.`:`Connection interrupted: ${e.message}. Resume retries the saved update.`;return false;}
  finally{this.sending=false;}
 }
 update(run,paused,deadline,action={}){
  if(this.dead)return;
  if(Number.isFinite(action.serverNow))this.offset=action.serverNow-Date.now();
  this.deadline=deadline;this.pausedAt=action.pausedAt;
  if(paused!==this.teacherPaused){this.pause();this.teacherPaused=paused;}
  if(run){
   if(run.attemptId!==this.run.attemptId){this.pending=null;this.s=adapter.create(run);this.seq=run.seq;this.paused=true;this.clear();}
   this.run=run;
   if(run.status==='terminal'){this.pending=null;this.paused=true;this.audio.pause(true);this.clear();try{localStorage.removeItem(this.key);}catch{}}
  }
  this.overlay();
 }
 overlay(){
  if(this.dead)return;
  const r=this.run,button=(id,label)=>`<button data-${id}>${label}</button>`;let text='';
  if(r.status==='terminal')text=`<h2>Operation recorded</h2><p>${esc(IRONBREAK.personal[r.outcome]||'Your field record is complete.')}</p><p>Waiting for the crew’s final decision. Gameplay does not change your mathematics record.</p>`;
  else if(this.teacherPaused)text='<h2>Teacher paused the mission</h2><p>Your crew clock is frozen. Wait for the teacher to resume.</p>';
  else if(this.confirmAssist)text=`<h2>Switch to guided play?</h2><p>Complete three tactical choices without reflex controls. The crew clock continues. This run cannot switch back to action play; its result is recorded as assisted.</p>${button('confirm','Use guided play')}${button('cancel','Cancel')}`;
  else if(this.help)text=`<h2>Move and aim with one thumb</h2><p>Arrows/WASD or pad: run and aim in eight directions. Space/Jump: jump. Down: crouch; two Down taps: prone. C: prone on keyboard. Down + Jump: drop through a thin platform. Up/Down near a ladder: climb. Water supports surface swimming and firing. F: toggle automatic fire.</p><p>Duck high boss shots, jump floor sweeps, and move out of marked overhead strikes. Vector boots allow a second distinct Jump press. The crew clock continues during local pause.</p>${button('resume','Return')}`;
  else if(r.status==='not_started')text=`<h2>Break the lockdown</h2><p>Three lives. Midpoint and boss checkpoints. Your crew clock is already running. Equipment: ${esc(r.loadout.map(id=>IRONBREAK.items.find(i=>i.id===id)?.title).join(' + '))}.</p>${button('start','Start action run')}${button('guided','Start guided play')}`;
  else if(r.mode==='assisted'){
   const task=GUIDED[r.guidedStep];if(task)text=`<h2>${esc(task.title)}</h2><p>${esc(task.text)}</p>${task.options.map(([id,label])=>`<button data-choice="${id}">${esc(label)}</button>`).join('')}<p>Guided step ${r.guidedStep+1} of 3 · Crew clock continues</p>`;
  }else if(this.s.status==='downed'||this.s.status==='terminal')text=`<h2>${this.s.status==='downed'?'Suit disabled':'Recording your result'}</h2><p>${this.s.lives} lives remain. Checkpoint: ${this.s.checkpoint}. Retries preserve equipment and spent time.</p>${r.status==='downed'?button('retry','Retry checkpoint'):button('sync','Send saved result')}`;
  else if(this.portrait)text=`<h2>Rotate to landscape</h2><p>Action controls are paused. Your crew clock continues. Guided play is available in portrait.</p>${button('guided','Use guided play')}`;
  else if(this.paused)text=`<h2>Crossing paused</h2><p>The crew clock continues. Resume reconnects any pending update.</p>${button('resume','Resume')}`;
  if(this.lastOverlay===text)return;this.lastOverlay=text;this.panel.hidden=!text;this.panel.innerHTML=text?`<div class="ib-card">${text}</div>`:'';
  const click=(id,fn)=>{const b=this.panel.querySelector(`[data-${id}]`);if(b)b.onclick=fn;};
  click('start',()=>{if(!this.portrait)this.act('start',{mode:this.ctx?'action':'assisted'});else{this.status.textContent='Rotate to landscape or choose guided play.';}});click('guided',()=>this.act(r.status==='not_started'?'start':'assist',{mode:'assisted'}));click('confirm',()=>this.act(r.status==='not_started'?'start':'assist',{mode:'assisted'}));click('cancel',()=>{this.confirmAssist=false;this.overlay();});click('resume',()=>{this.help=false;this.resume();});click('retry',()=>this.act('retry'));click('sync',()=>{this.queue();this.flush();});
  this.panel.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>this.act('guide',{step:r.guidedStep,choice:b.dataset.choice}));
 }
 tick(now){
  if(this.dead)return;this.binding.poll();const dt=Math.min(.1,(now-this.last)/1000);this.last=now;
  const remaining=Math.max(0,Math.ceil((this.deadline-(this.teacherPaused?this.pausedAt:Date.now()+this.offset))/1000));
  if(!remaining&&!this.teacherPaused){this.paused=true;this.clear();this.audio.pause(true);this.status.textContent='Crew window closed. Waiting for mission control to confirm the result.';}
  if(!this.blocked()&&remaining){this.acc+=dt;while(this.acc>=adapter.stepSize&&this.s.status==='active'){adapter.step(this.s,{...this.binding.value(),fire:this.fire},adapter.stepSize);for(const e of this.s.events)this.audio.effect(e.type);this.acc-=adapter.stepSize;}this.audio.music(this.s.bossActive?'boss':'level');if(this.s.status!=='active'){this.pause();this.queue();this.flush();}}
  if(now-this.lastSend>4000){this.lastSend=now;if(!this.teacherPaused){if(!this.paused)this.queue();if(this.pending)this.flush();}}
  if(this.ctx)adapter.render(this.ctx,this.s);
  const q=x=>this.root.querySelector(x);q('[data-health]').textContent=`Health ${this.s.player.hp}/${this.s.player.maxHP}`;q('[data-lives]').textContent=`Lives ${this.s.lives} · ${this.s.checkpoint}`;q('[data-clock]').textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;q('[data-gear]').textContent=this.run.loadout.join(' · ');q('[data-pause]').textContent=this.paused?'Resume':'Pause';
  this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 destroy(){this.dead=true;this.ac.abort();this.clear();cancelAnimationFrame(this.frame);this.audio.destroy();}
}
