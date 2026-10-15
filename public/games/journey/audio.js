// Original procedural score/effects; no samples, external requests or library.
// 48-second stage theme / 36-second boss theme, eight bars each at 80/106.67 bpm.
export class JourneyAudio {
  constructor(){this.music=true;this.effects=true;this.lastEvent=0;this.voices=new Set();this.step=0;this.next=0;this.lastFx=new Map();}
  async unlock(){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return;this.ctx??=new AC();if(!this.out){/* v0.13.0: Journey's synth is quiet on iPad speakers: 3× master volume through a limiter. A host that already boosts (destination is a GainNode) is left alone. */const d=this.ctx.destination;if(typeof GainNode!=='undefined'&&d instanceof GainNode)this.out=d;else{const g=this.ctx.createGain(),l=this.ctx.createDynamicsCompressor();g.gain.value=3;l.threshold.value=-6;l.knee.value=6;l.ratio.value=12;l.attack.value=.003;l.release.value=.15;g.connect(l);l.connect(d);this.out=g;}}if(this.ctx.state==='suspended')await this.ctx.resume();this.timer??=setInterval(()=>this.tick(),50);}
  tone(hz,time,duration,gain=.035,type='triangle'){
    if(!this.ctx||this.voices.size>=32)return;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(hz,time);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(gain,time+.008);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g);g.connect(this.out);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};o.start(time);o.stop(time+duration+.01);
  }
  // Short original Foley layers. Noise buffers are reused, while each voice
  // owns its own filter/envelope and disconnects when finished.
  noise(time,duration,gain,frequency=1200,q=.7){
    if(!this.ctx||this.voices.size>=32)return;
    if(!this.noiseBuffer){this.noiseBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);const data=this.noiseBuffer.getChannelData(0);let seed=7919;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741823.5-1;}}
    const src=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),g=this.ctx.createGain();
    src.buffer=this.noiseBuffer;filter.type='bandpass';filter.frequency.setValueAtTime(frequency,time);filter.Q.value=q;
    g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(gain,time+.006);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
    src.connect(filter);filter.connect(g);g.connect(this.out);this.voices.add(src);
    src.onended=()=>{this.voices.delete(src);src.disconnect();filter.disconnect();g.disconnect();};src.start(time,(this.variant||0)*.043%Math.max(.1,1-duration));src.stop(time+duration+.01);
  }
  sweep(from,to,time,duration,gain,type='sine'){
    if(!this.ctx||this.voices.size>=32)return;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(from,time);o.frequency.exponentialRampToValueAtTime(to,time+duration);
    g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(gain,time+.008);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
    o.connect(g);g.connect(this.out);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};o.start(time);o.stop(time+duration+.01);
  }
  silence(){for(const v of this.voices)try{v.stop();}catch{}this.voices.clear();this.next=0;}
  sync(s){const stopped=s.paused||!['running','launch'].includes(s.phase)||document.hidden;
    const theme=s.level?.stage===4?'boss':'stage';if(stopped!==this.stopped||theme!==this.theme){this.silence();this.step=0;}this.stopped=stopped;this.theme=theme;
    for(const e of s.events||[]){if(e.id<=this.lastEvent)continue;this.lastEvent=e.id;if(!stopped||e.type==='result')this.fx(e.type,e.hero,e.outcome);}
  }
  fx(type,hero,outcome){if(!this.ctx||!this.effects||document.hidden)return;const t=this.ctx.currentTime;if(t-(this.lastFx.get(type)??-1)<.075)return;this.lastFx.set(type,t);
    const v=1+([-.04,.02,0,.04,-.02][(this.variant=(this.variant||0)+1)%5]);
    if(type==='attack'){
      const weight={wukong:1,bajie:.66,wujing:.85,tang:1.6,prince:1.25}[hero]||1;
      this.noise(t,.16,.16,1900*weight*v,.6);this.sweep(330*weight*v,95*weight,t,.12,.055,'triangle');
      if(hero==='tang'||hero==='prince')this.tone(1300*weight*v,t+.025,.12,.018,'sine');return;
    }
    if(type==='jump'){this.noise(t,.12,.075,2100,.5);this.sweep(180*v,650*v,t,.19,.065,'sine');return;}
    if(type==='propHit'){
      this.noise(t,.075,.24,1150*v,1.2);this.sweep(210*v,92,t,.095,.13,'triangle');this.tone(410*v,t+.012,.065,.035,'sine');return;
    }
    if(type==='break'){
      this.noise(t,.16,.22,780*v,.9);this.sweep(145*v,48,t,.20,.09);
      for(let i=0;i<3;i++)this.noise(t+.045+i*.05,.065,.09/(1+i*.25),1700+i*750,1.3);return;
    }
    if(type==='hurt'){this.noise(t,.12,.18,650*v,.65);this.sweep(155*v,42,t,.22,.16);this.sweep(320,130,t+.012,.10,.035,'triangle');return;}
    if(type==='hit'){this.noise(t,.07,.14,1100*v,.8);this.sweep(180*v,60,t,.10,.09);return;}
    const notes={attack:[180,90],enemyAttack:[120,65],jump:[330,660],hit:[160,70],hurt:[100,55],break:[95,50],pickup:[660,880,1320],bossWarning:[220,233,220],bossTelegraph:[330,220],stage:[392,523,784],special:[{wukong:440,bajie:98,wujing:294,tang:660,prince:523}[hero]||440,784,1047],result:outcome==='victory'?[523,659,784,1047]:outcome==='defeat'?[220,196,147]:[392,330,294],ui:[660]}[type];
    notes?.forEach((n,i)=>this.tone(n,t+i*.07,.13,.045,type==='break'||type==='hurt'?'sawtooth':'triangle'));
  }
  tick(){if(!this.ctx||this.ctx.state!=='running'||!this.music||this.stopped||document.hidden)return;const now=this.ctx.currentTime,beat=this.theme==='boss'?.28125:.375;
    if(this.next<now)this.next=now;
    while(this.next<now+.12){const k=this.step%128,scale=this.theme==='boss'?[0,3,5,7,10]:[0,2,4,7,9],pattern=[0,2,3,1,4,3,2,1,0,1,3,4,2,3,1,0],base=this.theme==='boss'?146.83:196;
      const note=base*2**(scale[pattern[(k+Math.floor(k/16)*3)%16]]/12);
      if(k%4!==3)this.tone(note*2,this.next,.20,.027,'triangle'); // plucked melody
      if(k%8===0)this.tone(base/2,this.next,beat*3,.035,'sine');
      if(k%16===8)this.tone(note*4,this.next,beat*4,.012,'sine'); // flute-like answer
      if(k%4===0)this.tone(60,this.next,.12,.055,'sine');
      if(k%4===2){this.tone(190,this.next,.045,.025,'square');this.tone(287,this.next,.08,.012,'triangle');}
      this.step++;this.next+=beat;
    }
  }
  destroy(){clearInterval(this.timer);this.silence();this.ctx?.close();}
}
