import Sim from './sim.js';
import {Renderer} from './render.js';
import {Sound} from './audio.js';
export const REVISION='blackline-racer-0.3.2';
export const EQUIPMENT=['impact-plating','boost-capacitor','repair-reserve'];
export function createBlackline(run={}){
 const race=Sim.newState();race.mode='running';
 const s={revision:REVISION,runId:run.runId,route:run.route||'register',threat:run.threat??1,loadout:[...(run.loadout||[])],mode:run.mode||'action',time:0,outcome:null,events:[],guideStep:0,used:{},race};
 const old=run.snapshot;
 if(old?.revision===REVISION&&old.runId===s.runId&&old.route===s.route&&JSON.stringify(old.loadout)===JSON.stringify(s.loadout))Object.assign(s,structuredClone(old),{events:[]});
 return s;
}
export function stepBlackline(s,input,dt){
 s.events=[];if(s.outcome)return;
 const r=s.race,hp=r.hp,hits=r.collisions;
 r.events=[];Sim.tick(r,dt,{steer:Number(!!input.right)-Number(!!input.left),brake:input.brake,boost:input.boost});
 if(r.collisions>hits&&s.loadout.includes('impact-plating')&&!s.used['impact-plating']){r.hp=hp;s.used['impact-plating']=true;r.notice='IMPACT PLATING ABSORBED HIT';r.noticeUntil=r.t+3;}
 for(const [id,z] of [['boost-capacitor',1900],['repair-reserve',6800]])if(s.loadout.includes(id)&&!s.used[id]&&r.z>=z){s.used[id]=true;if(id==='boost-capacitor')r.boost=Math.min(1,r.boost+.25);else r.hp=Math.min(100,r.hp+10);r.events.push('repair');}
 s.time=r.t;s.events=r.events.map(type=>({type}));
 if(r.mode==='result')s.outcome=r.reason==='escaped'?'success':r.reason==='timeout'?'timed_out':'lost';
}
class RacerAudio{
 constructor(){this.sound=new Sound();this.enabled=true;}
 async start(){await this.sound.unlock();return [];}
 async toggle(){this.enabled=!this.enabled;this.sound.music=this.sound.sfx=this.enabled;if(this.enabled)await this.sound.unlock();else this.sound.pause();}
 pause(paused){if(paused)this.sound.pause();else if(this.enabled)this.sound.unlock();}
 effect(e){if(this.enabled)this.sound.fx(e);}
 music(){} alarm(){}
 update(s){if(this.enabled)this.sound.update(s.race);}
 destroy(){this.sound.pause();this.sound.ctx?.close();}
}
const renderers=new WeakMap();
export const blacklineAdapter={
 id:'blackline-racer',title:'BLACKLINE: Last Exit · Cartridge v0.3.2',revision:REVISION,activeLimitSeconds:300,kitText:'Standard interceptor · 100 integrity · rechargeable boost',
 canvasLabel:'Industrial highway with pursuing interceptors and armored rammers',
 controlProfile:{left:[['left','◀ Steer'],['right','Steer ▶']],right:[['brake','Brake / drift'],['boost','Boost']],keys:{a:'left',arrowleft:'left',d:'right',arrowright:'right',s:'brake',arrowdown:'brake',' ':'boost'},help:'Auto acceleration. A/D or arrows: steer. S/Down: brake before tight bends. Space: boost. Centre on ramps and boost: every gap needs more speed than the engine alone gives (watch for the green ramp). Incoming shells land on the red zone three seconds after they appear: steer out, boost past it or brake short. Escape pauses. Five active minutes; classroom crew time continues during local pauses.'},
 instructions:'Escape along 14.5 km of industrial highway. Steer clear of road barricades and crates. When a shell appears on the horizon, its red target zone marks the road ahead: steer out, boost past it or brake short before impact. Save boost for the three gaps, which cannot be cleared without it. Evade armored rams. Boost and centre on all three ramps. One classroom run; no restart. Guided completion is available separately.',
 resultLabels:{success:'You crossed the BLACKLINE',lost:'Your interceptor did not reach the exit',timed_out:'The escape window closed',assisted_completed:'Guided escape completed'},
 resultText:'Your driving result is separate from mathematics. Everyone still votes on the crew’s final decision.',
 create:createBlackline,step:stepBlackline,loadArt:async()=>({}),createAudio:()=>new RacerAudio(),
 render(ctx,s){let renderer=renderers.get(ctx.canvas);if(!renderer){renderer=new Renderer(ctx.canvas);renderers.set(ctx.canvas,renderer);}ctx.save();ctx.scale(640/480,360/270);renderer.draw(s.race,s.time);ctx.restore();},
 hud:s=>`INTEGRITY ${Math.ceil(s.race.hp)}% · ${Math.round(s.race.v*3.6)} km/h · BOOST ${Math.round(s.race.boost*100)}% · ${Math.floor(s.race.z)}/14500 m · ${Math.ceil(300-s.time)}s · JUMPS ${s.race.landings}/3`,
 objective:s=>Sim.zone(s.race.z)+(s.race.noticeUntil>s.race.t?' · '+s.race.notice:''),
 progress:s=>Sim.SECTIONS.filter(x=>s.race.z>=x.start).map(x=>x.short),
 assisted(s,root,progress){const stages=['Wait for the patrol to pass Lockdown Avenue.','Take the sheltered maintenance lane through the Foundry.','Cross the broken skyway on the inspection carrier.','Follow the freight convoy through the Underpass.','Use the service spiral beneath the surveillance towers.','Reach the outer checkpoint with the convoy.'];root.innerHTML='<h2>Guided escape</h2><p></p><button>Continue along the covered route</button>';root.querySelector('p').textContent=stages[s.guideStep]||'Route complete. Guided completion is separate from a driving success.';root.querySelector('button').onclick=()=>{s.guideStep=Math.min(6,s.guideStep+1);if(s.guideStep===6)s.outcome='assisted_completed';progress();};}
};
