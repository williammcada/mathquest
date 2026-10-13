import {bindGameInput,controlMarkup,crispCanvas} from './controls.js?v=0.9.7';
import {registerRecord} from '../privacy.js?v=0.9.7';
import {GameAudio} from './game-audio.js?v=0.9.7';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class GameHost {
  constructor(root,{adapter,items=[],run,route,deadline,send,practice=false,paused=false,serverNow,pausedAt}){
    this.adapter=adapter;this.items=items;this.art=null;this.gameAudio=this.adapter.createAudio?.()||new GameAudio(this.adapter.media);this.root=root;this.run=run;this.send=send;this.practice=practice;this.deadline=deadline;this.clockOffset=Number.isFinite(serverNow)?serverNow-Date.now():0;this.pauseClock=pausedAt;this.paused=paused;this.input={tank:true};this.localPaused=false;this.mode=run.mode||'action';this.started=run.status==='active';this.seq=run.seq||0;this.pending=null;this.sending=false;this.lastSent=0;this.dead=false;this.ac=new AbortController();
    if(!this.practice)registerRecord(new URLSearchParams(globalThis.location?.search||'').get('session'),`mq-v09-finale-${run.runId}`);
    let saved;try{if(!this.practice)saved=JSON.parse(localStorage.getItem(`mq-v09-finale-${run.runId}`));}catch{}
    if(this.adapter.commandPrefix==='rescue'&&saved?.attemptId!==run.attemptId)saved=null;
    if(saved?.seq>=this.seq){this.seq=saved.seq;this.mode=saved.mode||this.mode;}
    this.s=this.adapter.create({...run,mode:this.mode,route,snapshot:saved?.seq>=run.seq?saved.snapshot:run.snapshot});
    this.render();this.adapter.loadArt().then(art=>{if(!this.dead){this.art=art;this.showOverlay();}}).catch(e=>{if(!this.dead){this.status.textContent='Artwork unavailable. Check the connection and restart practice, or choose the assisted route.';this.artError=e.message;this.showOverlay();}});this.last=performance.now();this.accumulator=0;this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  render(){
    this.root.innerHTML=`<section class="nf-game"><div class="mq-rotate" role="status">Rotate your phone to landscape to play. Your run is paused.</div><div class="nf-toolbar"><b>${esc(this.adapter.title)}</b><button data-view>Expand game</button><button data-pause>Pause</button><button data-help>Controls</button><button data-map>Map</button><button data-sound>Sound off</button><button data-assist>Assisted route</button><button data-reset>Reset controls</button>${this.practice?'<button data-restart>Restart practice</button>':''}</div><p class="nf-equipment">${this.run.loadout.length?this.run.loadout.map(id=>esc(this.items.find(i=>i.id===id)?.title||id)).join(' + '):esc(this.adapter.kitText||'Standard kit: 12 rounds, 3 health')}</p><div class="nf-screen"><canvas width="640" height="360" aria-label="${esc(this.adapter.canvasLabel)}"></canvas><div class="nf-overlay"></div></div><div class="nf-hud" aria-live="off"></div><p class="mq-objective"></p>${controlMarkup(this.adapter.controlProfile)}<p class="nf-status" role="status"></p></section>`;
    if(this.adapter.id==='blackline-racer'||this.adapter.noMap)this.root.querySelector('[data-map]').hidden=true;
    if(!this.adapter.controlProfile.left.length&&!this.adapter.controlProfile.right.length){const thumbs=this.root.querySelector('.mq-thumb-controls');if(thumbs)thumbs.style.display='none';this.root.querySelector('[data-reset]').hidden=true;}
    this.canvas=this.root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');if(!this.ctx)this.mode='assisted';this.overlay=this.root.querySelector('.nf-overlay');this.hud=this.root.querySelector('.nf-hud');this.status=this.root.querySelector('.nf-status');
    const on=(el,event,fn)=>el.addEventListener(event,fn,{signal:this.ac.signal});
    this.inputBinding=bindGameInput(this.root,this.adapter.controlProfile,{signal:this.ac.signal,onChange:value=>this.input=value,blocked:()=>!this.started||this.localPaused||this.paused||!!this.s.outcome||!!this.s.dialogue,onPause:()=>{this.localPaused=true;this.gameAudio.pause(true);this.persist();this.showOverlay();},onMap:()=>this.s.map=!this.s.map});
    // Tap-to-act games (Kingsgate) receive taps in 640×360 field coordinates.
    if(this.adapter.pointer)on(this.canvas,'pointerdown',e=>{if(!this.started||this.localPaused||this.paused||this.s.outcome||this.mode!=='action')return;e.preventDefault();const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.adapter.pointer(this.s,(e.clientX-r.left)/r.width*640,(e.clientY-r.top)/r.height*360);for(const event of this.s.events)this.beep(event);this.s.events=[];this.persist();});
    on(this.root.querySelector('[data-help]'),'click',()=>{this.help=true;this.localPaused=true;this.clear();this.gameAudio.pause(true);this.showOverlay();});
    on(this.root.querySelector('[data-view]'),'click',e=>{this.root.classList.toggle('mq-focus');e.target.textContent=this.root.classList.contains('mq-focus')?'Window view':'Expand game';this.clear();});
    on(this.root.querySelector('[data-map]'),'click',()=>this.s.map=!this.s.map);
    on(this.root.querySelector('[data-reset]'),'click',()=>this.clear());
    on(this.root.querySelector('[data-pause]'),'click',()=>{this.help=false;this.localPaused=!this.localPaused;this.gameAudio.pause(this.localPaused||this.paused);this.clear();this.showOverlay();});
    on(this.root.querySelector('[data-sound]'),'click',async e=>{try{await this.gameAudio.toggle();this.sound=this.gameAudio.enabled;e.target.textContent=this.sound?'Sound on':'Sound off';if(this.sound)this.beep('key');}catch{this.status.textContent='Sound unavailable; the mission can continue.';}});
    on(this.root.querySelector('[data-assist]'),'click',async()=>{if(this.s.outcome)return;this.clear();if(this.started&&!this.practice){const result=await this.transmit('minigame.assist');if(!result)return;}this.mode='assisted';this.s.mode=this.mode;this.gameAudio.pause(true);this.root.classList.remove('mq-focus');this.persist();this.showOverlay();});
    this.root.querySelector('[data-restart]')?.addEventListener('click',()=>document.querySelector('#restart')?.click(),{signal:this.ac.signal});
    this.showOverlay();
  }
  clear(){this.inputBinding?.clear();this.input={};}
  async transmit(type,extra={}){
    if(this.practice)return true;
    try{await this.send(type,{runId:this.run.runId,configRevision:this.run.configRevision,...extra});return true;}catch(e){if(!this.dead)this.status.textContent=`Connection interrupted: ${e.message}. Your run is retained on this device.`;return false;}
  }
  async start(){
    if(this.starting||this.paused)return;this.starting=true;this.localPaused=false;this.help=false;this.gameAudio.start().then(failed=>{if(this.dead)return;this.root.querySelector('[data-sound]').textContent=this.gameAudio.enabled?'Sound on':'Sound off';if(failed.length)this.status.textContent='Some audio could not load: '+failed.join('; ');}).catch(()=>{if(!this.dead)this.status.textContent="Audio unavailable.";});
    const ok=await this.transmit('minigame.start',{mode:this.mode,threat:this.run.threat??1});this.starting=false;
    if(ok){this.started=true;this.clear();if(this.mode==='action')this.root.classList.add('mq-focus');this.root.querySelector('[data-view]').textContent='Window view';this.showOverlay();}
  }
  pause(){this.localPaused=true;this.clear();this.gameAudio.pause(true);this.showOverlay();}
  resume(){this.localPaused=false;this.gameAudio.pause(this.paused);this.showOverlay();}
  snapshot(){return structuredClone(this.s);}
  restore(value){this.s=this.adapter.create({...this.run,snapshot:value,route:this.s.route});this.showOverlay();}
  showOverlay(){
    if(this.dead)return;
    this.root.querySelector('[data-view]').textContent=this.root.classList.contains('mq-focus')?'Window view':'Expand game';
    this.overlay.hidden=false;
    if(!this.started){this.overlay.innerHTML=`<h2>${esc(this.adapter.title)}</h2><p>${this.adapter.instructions}</p><p>${esc(this.adapter.controlProfile.help)}</p><button data-start ${this.mode==='action'&&!this.art?'disabled':''}>${this.art||this.mode==='assisted'?'Start mission':'Loading artwork…'}</button>`;this.overlay.querySelector('button').onclick=()=>this.start();}
    else if(this.s.outcome){this.overlay.innerHTML=`<h2>${esc(this.adapter.resultLabels[this.s.outcome]||'Run recorded')}</h2><p>${this.practice?'Practice result only. No classroom evidence is sent.':this.adapter.resultText}</p>`;}
    else if(this.help){this.overlay.innerHTML=`<h2>Controls</h2><p>${esc(this.adapter.controlProfile.help)}</p><p>Progress is paused. Use Pause to resume.</p>`;}
    else if(this.paused||this.localPaused){this.overlay.innerHTML=`<h2>${this.paused?'Teacher paused the mission':'Crossing paused'}</h2><p>Use Pause again to resume.</p>`;}
    else if(this.mode==='assisted')this.assisted();
    else this.overlay.hidden=true;
  }
  assisted(){this.adapter.assisted(this.s,this.overlay,()=>{this.persist();if(this.s.outcome)this.finish();else this.assisted();});}
  update(run,paused,deadline,projection={}){if(Number.isFinite(projection.serverNow))this.clockOffset=projection.serverNow-Date.now();if(paused!==this.paused){this.clear();this.gameAudio.pause(paused||this.localPaused);}if(paused&&!this.paused)this.pauseClock=projection.pausedAt||Date.now()+this.clockOffset;if(!paused)this.pauseClock=null;this.paused=paused;this.deadline=deadline;if(run?.threat!==undefined&&run.threat!==this.run.threat&&!this.started){this.run=run;this.s=this.adapter.create({...run,route:this.s.route});}
    if(run?.status==='terminal'){this.s.outcome=run.outcome;this.pending=null;this.finished=true;}if(run?.seq>this.seq)this.seq=run.seq;this.showOverlay();}
  persist(){if(this.practice)return;try{localStorage.setItem(`mq-v09-finale-${this.run.runId}`,JSON.stringify({attemptId:this.run.attemptId,seq:this.seq,mode:this.mode,snapshot:this.s}));}catch{if(this.status)this.status.textContent='Local recovery storage unavailable. Keep this tab open.';}}
  queue(terminal=false){
    this.seq++;this.pending={type:terminal?'minigame.complete':'minigame.progress',commandId:crypto.randomUUID(),seq:this.seq,activeElapsedMs:Math.round(this.s.time*1000),snapshot:structuredClone(this.s),...(terminal?{outcome:this.s.outcome}:{})};this.persist();this.flush();
  }
  async flush(){
    if(this.sending||!this.pending||this.dead||this.practice)return;
    this.sending=true;const p=this.pending;const {type,...body}=p;const ok=await this.transmit(type,body);this.sending=false;
    if(ok&&this.pending===p){this.pending=null;if(!this.dead)this.status.textContent=p.outcome?'Result recorded. Waiting for the rest of your crew.':'Progress saved.';}
  }
  finish(){if(this.finished)return;this.finished=true;this.gameAudio.alarm(false);this.clear();this.queue(true);this.showOverlay();}
  tick(now){
    if(this.dead)return;this.inputBinding.poll();const dt=Math.min(.1,(now-this.last)/1000);this.last=now;
    if(this.started&&!this.paused&&!this.localPaused&&!document.hidden&&!globalThis.matchMedia?.('(orientation: portrait) and (max-width: 700px)').matches&&!this.s.outcome){
      if(this.mode==='action'&&this.art){this.accumulator+=dt;while(this.accumulator>=1/60){this.adapter.step(this.s,{...this.input,tank:true},1/60);for(const event of this.s.events){if(['death','detected','respawn','retry','life_lost'].includes(event.type))this.clear();this.beep(event);}this.accumulator-=1/60;}}
      else if(this.mode==='assisted')this.s.time+=dt;
      this.gameAudio.music(this.adapter.music?.(this.s)||'ambient');
      if(this.mode==='action')this.gameAudio.update?.(this.s);
      if(this.adapter.activeLimitSeconds)this.s.time=Math.min(this.s.time,this.adapter.activeLimitSeconds);
      if(this.s.time>=(this.adapter.activeLimitSeconds||7195)&&!this.s.outcome)this.s.outcome='timed_out';
      if(this.s.outcome)this.finish();
    }
    if(this.started&&!this.practice&&!this.paused&&!this.localPaused&&now-this.lastSent>5000){this.lastSent=now;if(!this.s.outcome)this.queue();else{if(!this.finished)this.finish();this.flush();}}
    this.gameAudio.alarm(this.started&&!this.s.outcome&&!!this.adapter.alarm?.(this.s));
    this.draw();this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  beep(event){this.gameAudio.effect(event.type||event);}
  draw(){if(this.ctx&&this.art){this.ctx=crispCanvas(this.canvas,640,360);this.adapter.render(this.ctx,this.s,this.art);}const hud=this.adapter.hud(this.s)+(this.deadline&&!this.practice?' · CREW WINDOW '+Math.max(0,Math.ceil((this.deadline-(this.paused?(this.pauseClock||Date.now()+this.clockOffset):Date.now()+this.clockOffset))/1000))+'s · local pause does not extend it':'');if(this.hud.textContent!==hud)this.hud.textContent=hud;const objective=this.root.querySelector('.mq-objective'),text=this.adapter.objective(this.s)+(this.s.message&&this.s.time-this.s.messageAt<6?' · '+this.s.message:'');if(objective.textContent!==text)objective.textContent=text;}
  destroy(){this.dead=true;this.root.classList.remove('mq-focus');this.persist();cancelAnimationFrame(this.frame);this.ac.abort();this.clear();this.gameAudio.destroy();}
}
