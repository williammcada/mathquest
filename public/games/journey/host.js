import {answerInput,readAnswer} from './math-input.js?v=0.14.0';
import {HEROES,UPGRADES,JOURNEY_BUILD,PROTOCOL,LIMITS} from './config.js';
import {JourneyRenderer} from './renderer.js?v=art1';
import {bindJourneyInput} from './input.js';
import {padHtml} from '../../engine/pad.js?v=1';
import {JourneyAudio} from './audio.js';
import {JOURNEY_STORY} from './story.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class JourneyHost {
  constructor(root,{state,send}){this.root=root;this.send=send;this.id=state.student.id;this.runId=state.teams[0].journey.runId;this.state=state;this.controller=new AbortController();this.keys={x:0,y:0,attack:false,jump:false,magic:false};this.edges={jump:false,magic:false};this.seq=0;this.epoch=0;this.connected=false;this.destroyed=false;this.upgrades=new Set();this.connectionMessage='Connecting…';
    if(!document.querySelector('[data-journey-css]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./journey.css?v=art1',import.meta.url).href;link.dataset.journeyCss='1';document.head.append(link);}
    root.innerHTML='<section class="journey-host"><header class="j-heading"><div><small>MATHQUEST · '+JOURNEY_BUILD+'</small><h1>Journey to the West</h1></div><span class="j-connection" role="status">Connecting…</span></header><div class="j-status" role="status"></div><div class="j-hud"></div><div class="j-stage"><canvas aria-label="Shared Journey combat scene"></canvas><div class="j-overlay"></div></div><section class="j-prep"><div class="j-heroes"></div><div class="j-upgrades"></div><button class="j-ready">Ready</button><section class="j-optional"></section></section><div class="j-controls">'+padHtml('eight',{label:'8-direction movement pad',attrs:'data-dpad'})+'<div class="j-actions"><button data-jkey="attack">Attack<small>J</small></button><button data-jkey="jump">Jump<small>K / Space</small></button><button data-jkey="magic">Magic<small>L</small></button></div></div><div class="j-tools"><button class="j-clear">Reset controls</button><button class="j-help">Controls</button><span>Development scene · five hero animation sets; Stage 9 playtest candidate.</span></div><p class="j-message" role="status"></p></section>';
    root.querySelector('.j-tools span').textContent='Play-test candidate · A WILLIAM MCADA PRODUCT';
    this.audio=new JourneyAudio();
    const audioPanel=document.createElement('div');audioPanel.className='j-audio';root.querySelector('.j-tools').after(audioPanel);
    for(const [key,label] of [['music','Music'],['effects','Sound effects']]){const b=document.createElement('button');b.textContent=label+': on';b.setAttribute('aria-pressed','true');this.on(b,'click',()=>{this.audio.unlock().catch(()=>{});this.audio[key]=!this.audio[key];this.audio.silence();b.textContent=label+': '+(this.audio[key]?'on':'off');b.setAttribute('aria-pressed',String(this.audio[key]));});audioPanel.append(b);}
    const story=document.createElement('section');story.className='j-story';root.querySelector('.j-prep').prepend(story);story.innerHTML='<h2>'+esc(JOURNEY_STORY.opening[1].title)+'</h2><p>'+esc(JOURNEY_STORY.opening[1].text)+'</p>';
    const ending=document.createElement('p');ending.className='j-ending';ending.hidden=true;root.querySelector('.j-stage').after(ending);
    this.renderer=new JourneyRenderer(root.querySelector('canvas'));
    this.input=bindJourneyInput(root,next=>{this.edges.jump||=next.jump&&!this.keys.jump;this.edges.magic||=next.magic&&!this.keys.magic;this.keys=next;},{signal:this.controller.signal,blocked:()=>this.inputBlocked(),onReset:()=>this.resetInput(),onInterrupt:()=>{this.helpOpen=true;this.resetInput();this.message('Controls paused on this device. Tap Controls to resume; the team continues.');}});
    this.on(root.querySelector('.j-clear'),'click',()=>{this.resetInput();this.message('Controls released. Press a direction or action to continue.');});
    this.on(root.querySelector('.j-help'),'click',()=>{this.helpOpen=!this.helpOpen;this.resetInput();this.message(this.helpOpen?'Move: D-pad or arrows/WASD. Attack: J/Z. Jump: K/Space/X. Magic: L/C. Hold Attack for combos. Close Controls to resume your input; the team continues.':'');});
    this.on(root.querySelector('.j-ready'),'click',()=>{this.audio.unlock().catch(()=>this.message('Audio unavailable; gameplay remains usable muted.'));this.action('journey.ready',{upgrades:[...this.upgrades]});});
    this.on(document,'visibilitychange',()=>this.setAvailable(!document.hidden));this.on(window,'pagehide',()=>this.setAvailable(false));this.on(window,'focus',()=>this.setAvailable(!document.hidden));this.on(window,'blur',()=>this.setAvailable(false));
    this.interval=setInterval(()=>this.flushInput(),50);this.ping=setInterval(()=>{this.wsSend({type:'ping',at:Date.now()});if(this.connected&&Date.now()-(this.lastReceived||0)>5000){this.socket?.close();}},1000);
    const frame=()=>{if(this.destroyed)return;this.renderer.draw();this.updateClock();this.raf=requestAnimationFrame(frame);};frame();this.update(state);this.connect();
  }
  on(el,type,fn){el.addEventListener(type,fn,{signal:this.controller.signal});}
  message(text){this.root.querySelector('.j-message').textContent=text;}
  async action(type,data={}){try{const state=await this.send(type,data);this.update(state);if(state.feedback)this.message(state.feedback.message);return state;}catch(e){this.message(e.message);return null;}}
  async connect(){if(this.destroyed||this.connecting)return;this.connecting=true;
    try{const state=await this.send('journey.connect',{});if(this.destroyed)return;this.update(state);const conn=state.combatConnection;if(!conn)throw Error('No combat connection ticket returned.');
      const socket=new WebSocket(conn.url);this.socket=socket;
      socket.onopen=()=>socket.send(JSON.stringify({type:'authenticate',ticket:conn.ticket,protocol:PROTOCOL,build:JOURNEY_BUILD}));
      socket.onmessage=e=>{if(this.destroyed||socket!==this.socket)return;this.lastReceived=Date.now();let m;try{m=JSON.parse(e.data);}catch{return;}
        if(m.type==='authenticated'){this.connected=true;this.epoch=m.epoch;this.seq=0;this.connectionMessage='Team connected';this.setAvailable(!document.hidden);}
        if(m.type==='snapshot')this.receive(m.snapshot);if(m.type==='error')this.message(m.message);if(m.type==='pong')this.connectionMessage='Team connected · '+Math.max(0,Date.now()-m.at)+' ms';};
      socket.onclose=e=>{if(socket!==this.socket||this.destroyed)return;this.connected=false;this.audio.stopped=true;this.audio.silence();this.resetInput();this.connectionMessage=e.code===4009?'This player is controlled on another connection.':'Reconnecting…';if(e.code!==4009&&e.code!==4004&&this.snap?.phase!=='terminal')this.retry=setTimeout(()=>this.connect(),1000);};
      socket.onerror=()=>{this.connectionMessage='Connection unavailable';};
    }catch(e){this.connectionMessage='Connection unavailable';this.message(e.message);if(!this.destroyed)this.retry=setTimeout(()=>this.connect(),3000);}
    finally{this.connecting=false;}
  }
  wsSend(message){if(this.connected&&this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({...message,runId:this.runId,epoch:this.epoch}));}
  setAvailable(value){this.resetInput();if(!value){this.audio.stopped=true;this.audio.silence();}this.wsSend({type:'availability',available:!!value});}
  inputBlocked(){const me=this.snap?.players.find(p=>p.id===this.id);return !this.connected||this.snap?.phase!=='running'||this.snap.paused||document.hidden||this.helpOpen||!me?.started||!me.lives||me.respawnMs>0;}
  resetInput(){this.input?.clear();this.edges={jump:false,magic:false};this.keys={x:0,y:0,attack:false,jump:false,magic:false};this.wsSend({type:'input',seq:++this.seq,...this.keys});}
  flushInput(){this.input?.poll();if(this.inputBlocked()){this.edges={jump:false,magic:false};return;}
    this.wsSend({type:'input',seq:++this.seq,x:this.keys.x,y:this.keys.y,attack:this.keys.attack,jump:this.edges.jump,magic:this.edges.magic});this.edges={jump:false,magic:false};}
  receive(snapshot){if(snapshot.runId!==this.runId)return;const previous=this.snap?.players.find(p=>p.id===this.id),next=snapshot.players.find(p=>p.id===this.id);const changed=this.snap?.phase!==snapshot.phase||this.snap?.paused!==snapshot.paused||previous?.lives!==next?.lives||Boolean(previous?.respawnMs)!==Boolean(next?.respawnMs);
    this.snap=snapshot;this.receivedAt=performance.now();this.renderer.set(snapshot);this.audio.sync(snapshot);const ending=this.root.querySelector('.j-ending');ending.hidden=snapshot.phase!=='terminal';ending.textContent=JOURNEY_STORY.endings[snapshot.result?.outcome]||'';if(changed){this.resetInput();this.edges={jump:false,magic:false};}
    this.renderPrep();this.renderHud();}
  update(state){this.state=state;const j=state.teams[0]?.journey;if(!j)return;if(j.snapshot&&(!this.snap||j.snapshot.revision>=this.snap.revision))this.receive(j.snapshot);this.renderOptional();}
  renderPrep(){const s=this.snap;if(!s)return;const me=s.players.find(p=>p.id===this.id);if(!me)return;
    this.root.querySelector('.journey-host').classList.toggle('j-match',s.phase!=='ready');
    const prep=this.root.querySelector('.j-prep');prep.hidden=s.phase!=='ready';const key=JSON.stringify(s.players.map(p=>[p.id,p.hero,p.ready,p.slots]));
    if(this.prepKey!==key){this.prepKey=key;const heroes=this.root.querySelector('.j-heroes');heroes.innerHTML=HEROES.map(h=>{const owner=s.players.find(p=>p.hero===h.id);return '<button data-hero="'+h.id+'" '+(me.ready||owner&&owner.id!==this.id?'disabled':'')+' class="'+(me.hero===h.id?'selected':'')+'"><b>'+esc(h.name)+'</b><small>'+esc(owner?.alias||h.special)+'</small></button>';}).join('');
      heroes.querySelectorAll('button').forEach(b=>b.onclick=()=>this.wsSend({type:'reserveHero',hero:b.dataset.hero}));
      this.renderUpgrades(me);}
    const ready=this.root.querySelector('.j-ready');ready.disabled=!this.connected||!me.hero||me.ready||s.paused;ready.textContent=me.ready?'Ready — waiting for team':'Ready';
    this.root.querySelector('.j-controls').classList.toggle('disabled',s.phase!=='running'||s.paused);}
  renderUpgrades(me){const box=this.root.querySelector('.j-upgrades');box.innerHTML='<h3>Choose up to '+me.slots+' personal upgrade'+(me.slots>1?'s':'')+'</h3>'+UPGRADES.map(u=>'<button data-upgrade="'+u.id+'" class="'+(this.upgrades.has(u.id)?'selected':'')+'" '+(me.ready?'disabled':'')+'><b>'+u.name+'</b><small>'+u.text+'</small></button>').join('');
    box.querySelectorAll('button').forEach(b=>b.onclick=()=>{const id=b.dataset.upgrade;if(this.upgrades.has(id))this.upgrades.delete(id);else if(this.upgrades.size<me.slots)this.upgrades.add(id);else return this.message('Complete another optional block to earn another choice.');this.renderUpgrades(me);});}
  renderOptional(){const j=this.state.teams[0]?.journey,o=j?.optional,box=this.root.querySelector('.j-optional');if(!o||!this.snap)return;
    const me=this.snap.players.find(p=>p.id===this.id),open=this.snap.phase==='ready'&&this.snap.readyMs>0&&!me?.ready;
    box.hidden=!open;if(!open)return;
    const key=JSON.stringify([o.item?.id,o.progress,o.earned,o.item?.attempts]);if(key===this.optionalKey)return;this.optionalKey=key;
    if(o.item){const i=o.item;box.innerHTML='<h3>Optional math · '+o.progress+'/'+o.total+'</h3><p class="j-question"></p><p class="j-form-hint"></p>'+'<div class="j-answer-fields">'+answerInput(i)+'</div>'+'<button class="j-submit">Submit answer</button><button class="j-stop">Stop optional questions</button>';
      if(i.promptMarkup)box.querySelector('.j-question').innerHTML=i.promptMarkup;else box.querySelector('.j-question').textContent=i.prompt;box.querySelector('.j-form-hint').textContent=i.expectedForm||'';
      const submit=()=>this.action('journey.optional.answer',{itemId:i.id,answer:readAnswer(box,i.answerType)});box.querySelector('.j-submit').onclick=submit;box.querySelectorAll('[data-answer-part]').forEach(field=>field.onkeydown=e=>{if(e.key==='Enter')submit();});box.querySelector('.j-stop').onclick=()=>this.action('journey.optional.stop');
    }else{box.innerHTML='<p>Only completed blocks earn upgrades. Your team starts when ready or when the minute ends.</p><button class="j-extra" '+(o.earned>=3?'disabled':'')+'>'+(o.earned>=3?'All upgrade choices earned':'Earn another upgrade with math')+'</button>';box.querySelector('.j-extra').onclick=()=>this.action('journey.optional.start');}}
  renderHud(){const s=this.snap;this.root.querySelector('.j-hud').innerHTML=s.players.filter(p=>p.started||s.phase==='ready').map(p=>'<div class="j-player '+(p.id===this.id?'mine':'')+'"><b>'+esc(p.alias)+'</b><span>'+esc(HEROES.find(h=>h.id===p.hero)?.name||'Choosing hero')+'</span><small>'+(p.started?'HP '+Math.ceil(p.hp)+' · Lives '+p.lives+' · Magic '+p.magic+'/'+p.capacity:p.ready?'Ready':'Preparing')+'</small></div>').join('');}
  updateClock(){this.root.querySelector('.j-connection').textContent=this.connectionMessage;const s=this.snap;if(!s)return;const elapsed=s.paused?0:Math.max(0,performance.now()-this.receivedAt),overlay=this.root.querySelector('.j-overlay');let status='',cover='';
    if(s.paused){status='Teacher paused the team';cover='Paused';}
    else if(s.phase==='ready')status=s.readyMs>0?'Starting with ready players in '+Math.max(0,Math.ceil((s.readyMs-elapsed)/1000))+'s':'Waiting for a ready player';
    else if(s.phase==='launch'){status='Get ready';cover=String(Math.max(1,Math.ceil((s.launchMs-elapsed)/1000)));}
    else if(s.phase==='recovery'){status='Team connection lost';cover='Reconnecting · '+Math.max(0,Math.ceil((s.recoveryMs-elapsed)/1000))+'s';}
    else if(s.phase==='running'){const left=Math.max(0,Math.ceil((LIMITS.active-s.activeMs-elapsed)/1000));status=Math.floor(left/60)+':'+String(left%60).padStart(2,'0')+' remaining';const me=s.players.find(p=>p.id===this.id);if(!me?.started)cover='Watching this run';else if(!me.lives)cover='Spectating';else if(me.respawnMs>0)cover='Returning…';}
    else if(s.phase==='terminal'){status='Field record saved · '+(s.result?.outcome||'ended');cover=(s.result?.outcome||'Complete').toUpperCase();}
    this.root.querySelector('.j-audio').hidden=s.phase!=='ready'&&!this.helpOpen;
    this.root.querySelector('.j-status').textContent=status;overlay.textContent=cover;overlay.hidden=!cover;}
  destroy(){this.destroyed=true;this.resetInput();this.audio.destroy();this.controller.abort();clearInterval(this.interval);clearInterval(this.ping);clearTimeout(this.retry);cancelAnimationFrame(this.raf);this.socket?.close();}
}
