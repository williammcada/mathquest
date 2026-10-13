// Kingsgate score and effects, generated in the browser with Web Audio. Original composition.
// A minor march: drums, a bowed bass and a horn melody. From wave 8 the tempo rises and a second drum joins.
const NOTE=n=>220*Math.pow(2,n/12); // n = semitones from A3
const MELODY=[0,null,3,5,7,null,5,3,2,null,3,2,0,null,-2,null, 0,null,3,5,7,null,8,7,5,null,3,5,7,null,null,null];
const BASS=[-24,-24,-17,-17,-21,-21,-19,-19];
export class KingsgateSound{
 constructor(){this.ctx=null;this.music=true;this.sfx=true;this.step=0;this.next=0;this.active=false;this.voices=new Set();this.intense=false;this.tailUntil=0;}
 async unlock(){try{if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.2;this.master.connect(this.ctx.destination);}await this.ctx.resume();}catch{}}
 tone(freq,time,len,gain,type='triangle',end,attack=.01){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);if(end)o.frequency.exponentialRampToValueAtTime(end,time+len);g.gain.setValueAtTime(.0001,time);g.gain.linearRampToValueAtTime(gain,time+attack);g.gain.exponentialRampToValueAtTime(.0008,time+len);o.connect(g);g.connect(this.master);this.voices.add(o);o.start(time);o.stop(time+len+.02);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};}
 noise(time,len,gain,freq=900){if(!this.ctx)return;const b=this.ctx.createBuffer(1,Math.max(1,Math.floor(this.ctx.sampleRate*len)),this.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const src=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();src.buffer=b;f.type='bandpass';f.frequency.value=freq;g.gain.value=gain;src.connect(f);f.connect(g);g.connect(this.master);src.start(time);src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};}
 update(g){
  if(!this.ctx)return;const playing=g.mode==='running';
  if(!playing){if(g.mode==='result'&&this.ctx.currentTime<this.tailUntil)return;this.pause();return;}
  if(this.ctx.state!=='running')return;const t=this.ctx.currentTime;if(!this.active){this.active=true;this.next=t;}
  this.intense=g.wave>=8;const beat=60/(this.intense?132:112)/2;
  if(this.music&&this.next<t+.15){
   const i=this.step%32,m=MELODY[i];
   if(m!==null)this.tone(NOTE(m+12),this.next,beat*1.8,.11,'sawtooth',null,.04);
   if(i%4===0)this.tone(NOTE(BASS[(i/4)%8]),this.next,beat*3.6,.22,'triangle');
   if(i%4===0)this.tone(110,this.next,.18,.45,'sine',40);
   if(i%8===6||this.intense&&i%4===2)this.noise(this.next,.09,.35,1800);
   if(this.intense&&i%2===1)this.noise(this.next,.03,.12,5000);
   if(g.wave===12&&i%16===0)this.tone(NOTE(-12),this.next,beat*7,.12,'sawtooth');
   this.step++;this.next+=beat;
  }else if(!this.music)this.next=t;
 }
 fx(e){
  if(!this.ctx||!this.sfx)return;const t=this.ctx.currentTime;
  switch(e){
   case 'bow':this.tone(900,t,.08,.08,'triangle',400);break;
   case 'bolt':this.tone(220,t,.18,.18,'sawtooth',90);this.noise(t,.08,.15,700);break;
   case 'frost':this.tone(1320,t,.25,.08,'sine',1760);this.tone(1980,t+.04,.2,.05,'sine');break;
   case 'throw':this.tone(160,t,.2,.14,'triangle',90);break;
   case 'boom':this.noise(t,.35,.5,260);this.tone(80,t,.3,.3,'sine',35);break;
   case 'kill':this.tone(330,t,.1,.08,'square',180);break;
   case 'boss_down':this.noise(t,.6,.5,200);this.tone(110,t,.8,.3,'sawtooth',40);break;
   case 'gate':this.tone(70,t,.35,.4,'square',45);this.noise(t,.25,.4,400);break;
   case 'build':this.tone(523,t,.1,.12,'triangle');this.tone(784,t+.08,.14,.12,'triangle');break;
   case 'upgrade':[523,659,784,1047].forEach((f,k)=>this.tone(f,t+k*.07,.15,.11,'triangle'));break;
   case 'sell':this.tone(784,t,.1,.1,'triangle');this.tone(523,t+.08,.14,.1,'triangle');break;
   case 'gold':[988,1319].forEach((f,k)=>this.tone(f,t+k*.08,.18,.1,'square'));break;
   case 'wave':this.tone(NOTE(-12),t,.9,.22,'sawtooth',null,.12);this.tone(NOTE(-5),t+.25,.9,.16,'sawtooth',null,.12);break;
   case 'boss':this.tone(NOTE(-24),t,1.6,.3,'sawtooth',null,.2);this.tone(NOTE(-23),t+.05,1.6,.2,'sawtooth',null,.2);break;
   case 'win':this.stopVoices();this.tailUntil=t+2.4;[0,4,7,12,7,12].forEach((n,k)=>this.tone(NOTE(n+3),t+k*.18,k===5?1.2:.3,.16,'sawtooth',null,.03));break;
   case 'fail':this.stopVoices();this.tailUntil=t+2.2;[7,5,3,-2].forEach((n,k)=>this.tone(NOTE(n),t+k*.35,k===3?1.4:.45,.16,'sawtooth',null,.05));break;
   case 'break':this.tone(NOTE(3),t,.4,.12,'triangle');this.tone(NOTE(10),t+.2,.6,.12,'triangle');break;
  }
 }
 stopVoices(){for(const o of this.voices)try{o.stop();}catch{}this.voices.clear();}
 pause(){if(!this.ctx)return;this.active=false;this.stopVoices();this.tailUntil=0;if(this.ctx.state==='running')this.ctx.suspend().catch(()=>{});}
}
