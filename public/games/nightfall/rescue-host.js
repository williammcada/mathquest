import {GameHost} from '../../engine/game-host.js?v=0.12.0';
import {rescueAdapter} from './rescue-adapter.js?v=0.12.0';
import {createRescue,checkpointFor} from './rescue.js?v=0.12.0';
import {RESCUE_WINDOW_MS} from './rescue-world.js?v=0.12.0';

export class RescueHost extends GameHost{
 constructor(root,options){
  super(root,{...options,adapter:rescueAdapter});
  this.clockOffset=(options.serverNow||Date.now())-Date.now();this.pausedAt=options.pausedAt;
  if(this.practice&&!this.deadline)this.deadline=Date.now()+RESCUE_WINDOW_MS;
  this.root.querySelector('.mq-rotate').textContent='Rotate your phone to landscape. Local gameplay pauses; the rescue timer continues.';
  this.showOverlay();
 }
 remaining(){return Math.max(0,(this.deadline||0)-(this.paused?(this.pausedAt||Date.now()+(this.clockOffset||0)):Date.now()+(this.clockOffset||0)));}
 async transmit(type,extra={}){
  if(this.practice)return true;
  try{
   const incoming=await this.send(type.replace('minigame.','rescue.'),{runId:this.run.runId,configRevision:this.run.configRevision,phaseId:this.run.phaseId,attemptId:this.run.attemptId,...extra});
   const team=incoming.teams?.find(t=>t.rescue?.phaseId===this.run.phaseId),view=team?.rescue;
   if(view&&!this.dead)this.update(view.run,incoming.paused,view.deadline,view);
   return true;
  }catch(e){if(!this.dead)this.status.textContent=`Connection interrupted: ${e.message}. The rescue clock continues.`;return false;}
 }
 async start(){if(this.remaining()<=0||this.run.status==='terminal')return;await super.start();}
 showOverlay(){
  if(this.dead||!this.overlay)return;
  if(this.run.status==='terminal'||this.expired){
   this.overlay.hidden=false;this.overlay.innerHTML='<h2>Rescue record closed</h2><p>Your next task is to check the repair plan. Waiting for the crew’s Gate 2 transition.</p>';return;
  }
  if(this.paused){this.overlay.hidden=false;this.overlay.innerHTML='<h2>Teacher paused the rescue</h2><p>The shared rescue timer is paused. Wait for your teacher to resume.</p>';return;}
  if(this.s.outcome==='lost'){
   this.overlay.hidden=false;this.overlay.innerHTML='<h2>Try again — timer still running</h2><p>Your character is safe in the story. A retry keeps the same rescue deadline.</p><button data-retry>Retry from checkpoint</button>';
   const b=this.overlay.querySelector('[data-retry]');b.disabled=!!this.retrying||(!this.practice&&this.run.status!=='downed');b.onclick=()=>this.retry();return;
  }
  if(this.s.dialogue&&!this.localPaused){
   this.overlay.hidden=false;this.overlay.innerHTML='<h2>Survivor reached</h2><p data-dialogue></p><p>The rescue timer is still running.</p><button data-continue>Escort back to the terminal</button>';
   this.overlay.querySelector('[data-dialogue]').textContent=this.s.message;
   const b=this.overlay.querySelector('button');b.onclick=async()=>{b.disabled=true;await this.saveNow();if(this.dead||this.expired||this.paused)return;if(!this.practice&&this.pending){b.disabled=false;return;}this.s.dialogue=false;this.clear();this.showOverlay();};return;
  }
  super.showOverlay();
 }
 async saveNow(){
  if(this.practice){if(this.s.tasks.recruit&&!this.practiceCheckpoint)this.practiceCheckpoint=checkpointFor(this.s);return;}
  this.queue();await this.flush();
  if(this.sending)await this.inFlight;
 }
 async retry(){
  if(this.retrying||this.paused||this.remaining()<=0)return;this.retrying=true;
  if(this.practice){this.s=this.practiceCheckpoint?structuredClone(this.practiceCheckpoint):createRescue(this.s.route);this.s.immune=2;this.finished=false;this.expired=false;}
  else await this.transmit('rescue.retry');
  this.retrying=false;this.clear();this.showOverlay();
 }
 update(run,paused,deadline,view={}){
  if(view.serverNow)this.clockOffset=view.serverNow-Date.now();
  this.pausedAt=view.pausedAt;this.deadline=deadline;
  const changed=run&&run.attemptId!==this.run.attemptId;
  if(changed){this.run=run;this.s=rescueAdapter.create(run);this.seq=run.seq;this.finished=false;this.pending=null;this.started=true;this.mode=run.mode;this.expired=false;this.lastSent=performance.now();this.clear();}
  else if(run){this.run=run;if(run.status==='active')this.started=true;}
  super.update(run,paused,deadline);
  if(this.run.status==='terminal'){this.clear();this.gameAudio.pause(true);}
 }
 async flush(){
  if(this.sending||!this.pending||this.dead||this.practice)return;
  this.sending=true;const p=this.pending,{type,...body}=p;
  this.inFlight=this.transmit(type,body);const ok=await this.inFlight;this.sending=false;
  if(ok&&this.pending===p){this.pending=null;if(!this.dead)this.status.textContent=p.outcome==='lost'?'Retry is ready. The shared timer continues.':p.outcome?'Rescue recorded. Wait for your crew.':'Rescue progress saved.';}
  if(ok&&this.pending&&this.pending!==p)await this.flush();
  this.showOverlay();
 }
 assisted(){
  rescueAdapter.assisted(this.s,this.overlay,async()=>{if(this.s.outcome)this.finish();else{await this.saveNow();this.showOverlay();}});
 }
 tick(now){
  if(this.dead)return;
  if(this.deadline&&this.remaining()<=0&&!this.paused){
   this.expired=true;this.s.outcome||='time_window_closed';this.clear();this.gameAudio.pause(true);this.showOverlay();
   this.draw();this.frame=requestAnimationFrame(t=>this.tick(t));return;
  }
  const hadFollower=!!this.s.follower;
  super.tick(now);
  if(!hadFollower&&this.s.follower){if(this.practice)this.practiceCheckpoint=checkpointFor(this.s);else this.queue();this.clear();this.showOverlay();}
 }
 draw(){
  super.draw();
  const secs=Math.ceil(this.remaining()/1000),clock=`Rescue time left: ${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}`;
  this.hud.dataset.rescueTimer='';this.hud.textContent=`${clock} · ${this.paused?'Teacher paused · ':''}HEALTH ${this.s.health}/3 · PISTOL ${this.s.ammo}`;
  this.root.querySelector('.mq-rotate').textContent=`Rotate to landscape. Local gameplay pauses; the rescue timer continues. ${clock}`;
 }
}
