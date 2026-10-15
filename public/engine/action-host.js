// Opt-in adapter host for free-movement games. Legacy GameHost remains unchanged.
import {bindDirectionalInput} from './directional-input.js';
import {crispCanvas} from './controls.js';
import {padHtml} from './pad.js?v=1';
import {GameAudio} from './game-audio.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=t=>`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
export class ActionHost {
 constructor(root,{adapter,config,snapshot,onSave=()=>{},onRestart=()=>{},development=false}){
  this.root=root;this.adapter=adapter;this.onSave=onSave;this.onRestart=onRestart;this.development=development;this.ac=new AbortController();this.state=adapter.create(config,snapshot);this.input={};this.started=false;this.paused=true;this.accumulator=0;this.last=performance.now();this.lastSave=this.last;this.audio=new GameAudio(adapter.media);this.audio.volume=.22;this.message='Loading flight artwork…';this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.renderShell();this.fit();
  adapter.loadArt().then(art=>{if(this.dead)return;this.art=art;this.message='Flight ready';this.overlay();}).catch(e=>{if(this.dead)return;this.artError=e.message;this.message='Artwork unavailable. Retry loading or choose assisted play.';this.overlay();});
  this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 renderShell(){
  this.root.innerHTML=`<section class="flight-shell"><header class="flight-top"><a href="./index.html">MATHQUEST</a><span>COASTAL ESCAPE <small>v${esc(this.adapter.buildVersion)} · Practice</small></span><button data-settings>Loadout / saved work</button></header><div class="flight-layout"><aside class="flight-rail"><p>FLIGHT CONTROL</p>${padHtml('eight',{label:'8-direction movement pad',attrs:'data-dpad'})}<p>ARROWS / W A S D<br>AUTOMATIC FIRE</p></aside><div class="flight-main"><div class="flight-hud"><span>HULL <meter min="0" max="100" value="100" aria-label="Hull health"></meter><b data-health></b></span><span data-lives></span><strong data-time></strong><span data-bonus></span></div><div class="flight-stage"><canvas width="640" height="360" aria-label="Aerial battlefield. Guided assisted play is available."></canvas><div class="flight-overlay"></div></div><div class="flight-objective" role="status"></div></div></div><footer class="flight-toolbar"><button data-pause>Pause</button><button data-sound>Sound on</button><button data-help>Controls</button><button data-assist>Assisted play</button><button data-reset>Reset controls</button><button data-restart>Restart</button><span class="flight-status" role="status"></span></footer></section>`;
  const q=s=>this.root.querySelector(s);this.canvas=q('canvas');this.ctx=this.canvas.getContext('2d');this.panel=q('.flight-overlay');this.stage=q('.flight-stage');this.main=q('.flight-main');
  const on=(el,type,fn)=>el.addEventListener(type,fn,{signal:this.ac.signal});
  this.binding=bindDirectionalInput(this.root,{signal:this.ac.signal,onChange:v=>this.input=v,blocked:()=>this.blocked(),onPause:()=>this.pause()});
  on(q('[data-pause]'),'click',()=>this.paused?this.resume():this.pause());
  on(q('[data-help]'),'click',()=>{this.pause();this.help=true;this.overlay();});
  on(q('[data-reset]'),'click',()=>{this.binding.clear();this.message='Controls released';});
  on(q('[data-sound]'),'click',async()=>{try{await this.audio.toggle();this.updateSound();}catch{this.message='Audio unavailable; flight and visual cues still work.';}});
  on(q('[data-assist]'),'click',()=>{if(this.state.outcome)return;this.pause();this.confirmAssist=true;this.overlay();});
  on(q('[data-restart]'),'click',()=>{this.pause();this.onRestart();});on(q('[data-settings]'),'click',()=>{this.pause();this.onRestart('settings');});
  const scheduleFit=()=>{cancelAnimationFrame(this.fitFrame);this.fitFrame=requestAnimationFrame(()=>this.fit());};
  on(window,'resize',scheduleFit);on(window,'orientationchange',scheduleFit);
  if(window.visualViewport)on(window.visualViewport,'resize',scheduleFit);
  on(window,'pagehide',()=>this.save());
  if(!this.ctx){this.adapter.enterAssisted(this.state);this.message='Canvas unavailable. Guided assisted play is ready.';}
  this.overlay();
 }
 blocked(){return !this.started||this.paused||this.tooSmall||document.hidden||this.state.outcome||this.state.mode!=='action'||!this.art;}
 fit(){
  // Mobile browser bars change the visible height independently of orientation.
  const viewport=window.visualViewport,viewWidth=viewport?.width||innerWidth,viewHeight=viewport?.height||innerHeight;
  this.root.style.setProperty('--flight-width',`${viewWidth}px`);this.root.style.setProperty('--flight-height',`${viewHeight}px`);
  const was=this.tooSmall;this.tooSmall=viewHeight>viewWidth;
  this.root.classList.toggle('flight-portrait',this.tooSmall);this.root.classList.toggle('flight-compact',viewHeight<350);
  const [w,h]=this.adapter.dimensions,rect=this.main.getBoundingClientRect();
  const chrome=this.main.querySelector('.flight-hud').getBoundingClientRect().height+this.main.querySelector('.flight-objective').getBoundingClientRect().height;
  const width=Math.min(rect.width,Math.max(0,rect.height-chrome)*w/h);
  this.stage.style.width=`${Math.floor(width)}px`;this.stage.style.height=`${Math.floor(width*h/w)}px`;
  if(this.tooSmall&&!was)this.pause('Rotate to landscape. Your flight is paused.');this.overlay();
 }
 async start(){if(this.state.outcome||this.tooSmall&&this.state.mode==='action'||!this.art&&this.state.mode==='action')return;this.started=true;this.paused=false;this.help=false;this.last=performance.now();this.accumulator=0;this.binding.clear();this.audio.pause(false);this.overlay();this.save();
  try{const failures=await this.audio.start();if(this.dead)return;if(failures.length)this.message='Some audio could not load; visual cues remain available.';this.audio.pause(this.paused);this.updateSound();}catch{this.message='Audio unavailable; visual cues remain available.';}
 }
 updateSound(){this.root.querySelector('[data-sound]').textContent=this.audio.enabled?'Sound on':'Sound off';}
 pause(reason){if(this.dead)return;this.paused=true;this.accumulator=0;this.binding?.clear();this.audio.pause(true);if(reason)this.message=reason;this.save();this.overlay();}
 resume(){this.help=false;if(this.tooSmall&&this.state.mode==='action')return;if(!this.started){this.start();return;}this.paused=false;this.last=performance.now();this.accumulator=0;this.binding.clear();this.audio.pause(false);this.overlay();}
 overlay(){
  if(this.dead||!this.panel)return;const s=this.state;this.panel.hidden=false;
  const set=html=>this.panel.innerHTML=`<div class="overlay-card">${html}</div>`;
  if(s.outcome){set(`<span class="eyebrow">FLIGHT COMPLETE</span><h1>${esc(this.adapter.resultLabels[s.outcome])}</h1><p>${s.outcome==='success'?'Both wing guns and the bomber’s core are destroyed.':s.outcome==='escape_lesser'?'You survived the active time limit. The enemy bomber remains.':s.outcome==='defeat'?'All three aircraft were lost.':'The guided route is complete.'}</p><p>Practice only — no classroom evidence.</p><button data-again>Review loadout / new flight</button>`);this.panel.querySelector('[data-again]').onclick=()=>this.onRestart();}
  else if(this.confirmAssist){set('<h2>Switch to guided play?</h2><p>Make three tactical choices without reflex controls. This flight cannot return to action mode. Its time, upgrades, and identity remain attached to the run.</p><button data-confirm>Switch to assisted play</button><button data-cancel>Cancel</button>');this.panel.querySelector('[data-confirm]').onclick=()=>{this.confirmAssist=false;this.adapter.enterAssisted(s);this.started=true;this.paused=false;this.save();this.overlay();};this.panel.querySelector('[data-cancel]').onclick=()=>{this.confirmAssist=false;this.overlay();};}
  else if(s.mode==='assisted'&&this.started&&!this.paused)this.assisted();
  else if(this.tooSmall&&s.mode==='action'){set('<h2>Turn to landscape</h2><p>Your flight is paused. Rotate your phone so it is wider than it is tall. Assisted play also works in portrait.</p><button data-guide>Use assisted play</button>');this.panel.querySelector('[data-guide]').onclick=()=>{this.confirmAssist=true;this.overlay();};}
  else if(this.help){set(`<h2>Flight controls</h2><p>${esc(this.adapter.help)}</p><p>Loss of a life returns to the latest checkpoint. It does not restore the five-minute clock.</p><button data-resume>Resume flight</button>`);this.panel.querySelector('[data-resume]').onclick=()=>this.resume();}
  else if(!this.started){set(`<span class="eyebrow">MATHQUEST · AERIAL SHOOTER</span><h1>${esc(this.adapter.title)}</h1><p>${esc(this.adapter.instructions)}</p><p class="loadout-label">${s.config.loadout.length?s.config.loadout.map(esc).join(' · '):'Standard aircraft · no upgrades'}</p><button class="primary" data-start ${(!this.art&&s.mode==='action')?'disabled':''}>${s.tick?'Resume saved flight':this.art||s.mode==='assisted'?'Start flight':'Loading artwork…'}</button>${this.artError?'<p>Artwork could not load. Use Assisted play below, or reload to retry.</p>':''}`);this.panel.querySelector('[data-start]').onclick=()=>this.start();}
  else if(this.paused){set(`<h2>Flight paused</h2><p>${esc(this.message.startsWith('Performance')?this.message:'Your active clock is stopped. Resume when you are ready.')}</p><button class="primary" data-resume>Resume flight</button>`);this.panel.querySelector('[data-resume]').onclick=()=>this.resume();}
  else this.panel.hidden=true;
  this.root.querySelector('[data-pause]').textContent=this.paused?'Resume':'Pause';
 }
 assisted(){
  const a=this.adapter.assisted[this.state.assistedStep];
  const figures={route:'<rect x="116" y="4" width="210" height="62" fill="#833e31"/><path d="M56 59V13 M166 59V13 M276 59V13" stroke="#e6ead4" stroke-width="4"/><path d="M47 23L56 12L65 23" stroke="#9fefc5" fill="none"/>',gap:'<g fill="#ffc666"><circle cx="56" cy="30" r="8"/><circle cx="95" cy="45" r="8"/><circle cx="245" cy="45" r="8"/><circle cx="284" cy="30" r="8"/></g><path d="M170 62V13" stroke="#9fefc5" stroke-width="8"/>',boss:'<path d="M35 28H305M170 6V62" stroke="#943d44" stroke-width="20"/><circle cx="45" cy="35" r="14" fill="#ffc666"/><circle cx="295" cy="35" r="14" fill="#ffc666"/><rect x="158" y="33" width="24" height="26" fill="#8b9dac"/>'};
  this.panel.innerHTML=`<div class="overlay-card assisted-card"><span class="eyebrow">GUIDED ROUTE · ${this.state.assistedStep+1} / 3</span><h2>${a.title}</h2><svg viewBox="0 0 340 70" role="img" aria-label="${esc(a.description)}">${figures[a.figure]}</svg><p>${a.description}</p><div class="assisted-choices">${a.choices.map((text,i)=>`<button data-choice="${i}">${text}</button>`).join('')}</div><p data-feedback role="status"></p></div>`;
  this.panel.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const ok=this.adapter.chooseAssisted(this.state,Number(b.dataset.choice));if(ok){this.save();if(this.state.outcome)this.finish();else this.overlay();}else this.panel.querySelector('[data-feedback]').textContent=a.feedback+' Try again.';});
 }
 save(){if(!this.dead)this.onSave(this.adapter.snapshot(this.state));}
 finish(){if(this.finished)return;this.finished=true;this.binding.clear();this.audio.music('ending');this.audio.effect(this.state.outcome==='success'?'victory':this.state.outcome==='escape_lesser'?'escape':this.state.outcome==='defeat'?'defeat':'bonus');this.save();this.overlay();}
 tick(now){
  if(this.dead)return;this.binding.poll();const elapsed=(now-this.last)/1000;this.last=now;
  if(!this.blocked()){
   if(elapsed>.2)this.pause('Performance pause: the browser stalled. Resume when it is ready.');
   else {this.accumulator+=elapsed;while(this.accumulator>=1/60&&!this.state.outcome){this.adapter.step(this.state,this.input,1/60);this.accumulator-=1/60;if(this.state.events.some(e=>e.type==='life_lost'))this.binding.clear();for(const e of this.state.events)this.audio.effect(e.type);if(this.state.events.some(e=>['checkpoint','life_lost','pickup','complete'].includes(e.type)))this.save();}this.audio.music(this.adapter.music(this.state));if(this.state.outcome)this.finish();}
  }else this.accumulator=0;
  if(now-this.lastSave>5000){this.lastSave=now;if(this.started)this.save();}
  this.draw();this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 draw(){const s=this.state;if(this.art&&this.ctx){const ctx=crispCanvas(this.canvas,...this.adapter.dimensions);this.adapter.render(ctx,s,this.art,{colliders:this.development&&this.colliders,reducedMotion:this.reducedMotion});}
  const q=s=>this.root.querySelector(s),meter=q('meter');meter.max=s.maxHealth;meter.value=s.health;q('[data-health]').textContent=`${s.health}/${s.maxHealth}`;q('[data-lives]').textContent=`${s.lives} LIVES`;q('[data-time]').textContent=time(Math.max(0,this.adapter.durationSeconds-Math.floor(s.tick/60)));q('[data-bonus]').textContent=s.bonus?`${s.bonus.kind.toUpperCase()} ${Math.ceil(s.bonus.ticks/60)}s`:'AUTO FIRE';
  q('.flight-objective').textContent=s.boss?`Wing guns: ${s.boss.guns[0]}/240 · ${s.boss.guns[1]}/240 | Core: ${s.boss.phase==='core'?s.boss.core+'/600':'protected'}`:s.tick-s.messageTick<300?s.message:this.adapter.objective(s);q('.flight-status').textContent=this.message;
 }
 destroy(){if(this.dead)return;this.save();this.dead=true;cancelAnimationFrame(this.frame);cancelAnimationFrame(this.fitFrame);this.ac.abort();this.binding.clear();this.audio.destroy();}
}
