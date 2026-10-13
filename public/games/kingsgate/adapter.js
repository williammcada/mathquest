// Kingsgate GameHost adapter (MathQuest cartridge game id: kingsgate-defense).
import * as Sim from './sim.js';
import {REVISION,VERSION,SPOTS,WAVE_TEXT,WAVE_COUNT,TOWERS,EQUIPMENT_IDS} from './config.js';
import {loadKingsgateArt,drawKingsgate,menuFor} from './render.js';
import {KingsgateSound} from './audio.js';
export {REVISION,VERSION};

export function createKingsgate(run={}){
 const loadout=[...(run.loadout||[])].filter(id=>EQUIPMENT_IDS.includes(id));
 const goldMode=run.goldMode||'mathquest';
 const s={revision:REVISION,runId:run.runId,route:run.route||'evacuate',threat:run.threat??1,loadout,mode:run.mode||'action',goldMode,time:0,outcome:null,events:[],guideStep:0,used:{},
  g:Sim.newState({goldMode,loadout,breaks:run.breaks,startWave:run.startWave||1,bonusGold:run.bonusGold||0}),ui:{sel:null,banner:null}};
 const old=run.snapshot;
 if(old?.revision===REVISION&&old.runId===s.runId&&old.goldMode===goldMode&&JSON.stringify(old.loadout)===JSON.stringify(loadout))Object.assign(s,structuredClone(old),{events:[]});
 return s;
}
export function stepKingsgate(s,input,dt){
 s.events=[];if(s.outcome)return;
 const g=s.g;
 if(g.mode==='break'&&s.skipBreaks)Sim.skipBreak(g);
 Sim.tick(g,dt);
 s.time=g.t;
 for(const e of g.events){
  if(e.type==='wave'){const w=e.wave;s.ui.banner={title:w===WAVE_COUNT?'Final wave · The Siege Ram':`Wave ${w}`,text:WAVE_TEXT[w-1],until:g.t+3.2,boss:w===WAVE_COUNT};}
  s.events.push({type:e.type});
 }
 const out=Sim.outcomeOf(g);if(out){s.outcome=out;s.ui.sel=null;}
}
// Taps on the 640×360 field: open a build spot, choose from its menu, or close.
export function tapKingsgate(s,x,y){
 if(s.outcome||s.g.mode==='result')return;
 const g=s.g,menu=menuFor(g,s.ui.sel);
 if(menu){
  const b=menu.buttons.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
  if(b){
   let error=null;
   if(b.act==='build')error=b.locked?'Earn this tower in preparation to unlock it.':Sim.place(g,menu.spot.id,b.type);
   else if(b.act==='upgrade')error=Sim.upgrade(g,menu.spot.id);
   else if(b.act==='sell')error=Sim.sell(g,menu.spot.id);
   if(error)s.message=error,s.messageAt=s.time;else{for(const e of g.events.splice(0))s.events.push({type:e.type});s.ui.sel=null;}
   return;
  }
  if(x>=menu.x&&x<=menu.x+menu.w&&y>=menu.y&&y<=menu.y+menu.h)return;
 }
 const spot=SPOTS.find(p=>Math.hypot(p.x-x,(p.y-y)*1.2)<=26||Sim.towerAt(g,p.id)&&Math.abs(p.x-x)<=22&&y<=p.y+14&&y>=p.y-52);
 s.ui.sel=spot&&s.ui.sel!==spot.id?spot.id:null;
}
class KingsgateAudio{
 constructor(){this.sound=new KingsgateSound();this.enabled=true;}
 async start(){await this.sound.unlock();return [];}
 async toggle(){this.enabled=!this.enabled;this.sound.music=this.sound.sfx=this.enabled;if(this.enabled)await this.sound.unlock();else this.sound.pause();}
 pause(paused){if(paused)this.sound.pause();else if(this.enabled)this.sound.unlock();}
 effect(e){if(this.enabled)this.sound.fx(e);}
 music(){} alarm(){}
 update(s){if(this.enabled)this.sound.update(s.g);}
 destroy(){this.sound.pause();this.sound.ctx?.close();}
}
const GUIDE=['Captain Aldren posts archers on the walls above the road.','Engineers wheel the ballistae into place beside the bridge.','Every bell in the city rings as the first warband reaches the river.','The defenders hold the bridge through the long middle of the night.','At dawn the Siege Ram reaches the last stretch of road.','The gate holds. The guided defense is complete.'];
export const kingsgateAdapter={
 id:'kingsgate-defense',title:`Kingsgate · Defense v${VERSION}`,revision:REVISION,activeLimitSeconds:300,noMap:true,
 kitText:'Archer Tower and Ballista · 180 gold · gate 20 health',
 canvasLabel:'The road to Kingsgate, with build spots, towers and orc warbands',
 controlProfile:{left:[],right:[],keys:{},help:'Tap a gold ring to build a tower. Tap a tower to upgrade or sell it. Orcs walk the road to the gate on the right; each one that reaches it damages the gate. Pause stops the battle; classroom crew time continues during local pauses.'},
 instructions:'Hold Kingsgate through twelve waves. Tap a gold ring to build a tower and spend gold on upgrades. Kill the Shamans first, use Ballistae and Catapults on Trolls, and save gold for the Siege Ram in wave 12. One classroom run; no restart. A guided defense is available separately.',
 resultLabels:{success:'Kingsgate held',lost:'The gate was broken',timed_out:'The defense window closed',assisted_completed:'Guided defense completed'},
 resultText:'Your defense result is separate from mathematics. Everyone still votes on the crew’s final decision.',
 create:createKingsgate,step:stepKingsgate,pointer:tapKingsgate,loadArt:loadKingsgateArt,createAudio:()=>new KingsgateAudio(),
 render(ctx,s,art){drawKingsgate(ctx,s,art);},
 hud:s=>`GATE ${s.g.gateHp}/${s.g.gateMax} · GOLD ${s.g.gold} · WAVE ${Math.max(1,s.g.wave)}/${WAVE_COUNT} · ${Math.ceil(300-s.time)}s`,
 objective:s=>{const g=s.g;if(g.mode==='break')return 'Question round: answer to earn gold.';if(g.wave===0)return `First warband arrives in ${Math.max(0,Math.ceil(g.nextWaveAt-g.t))}s. Build towers now.`;return WAVE_TEXT[Math.max(0,g.wave-1)]+(g.enemies.length?` · ${g.enemies.length} orcs on the road`:'');},
 progress:s=>Array.from({length:s.g.cleared},(_,i)=>`Wave ${i+1}`),
 assisted(s,root,progress){root.innerHTML='<h2>Guided defense</h2><p></p><button>Continue</button>';root.querySelector('p').textContent=GUIDE[s.guideStep]||'Guided defense complete. It is recorded separately from a defense result.';root.querySelector('button').onclick=()=>{s.guideStep=Math.min(GUIDE.length,s.guideStep+1);if(s.guideStep===GUIDE.length)s.outcome='assisted_completed';progress();};},
 towerTitles:Object.fromEntries(Object.entries(TOWERS).map(([k,v])=>[k,v.title]))
};
