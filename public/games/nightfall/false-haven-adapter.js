import {createState,step,completeTask,nextObjective,dist} from './simulation.js?v=0.12.0';
import {render,loadArt,MEDIA} from './renderer.js?v=0.12.0';
import {CONTROL_PROFILES} from '../../engine/controls.js?v=0.12.0';
import {HAVEN_REVISION,HAVEN_TASKS,havenEnvironment,havenFinale,havenTick} from './false-haven-world.js?v=0.12.0';
import {solid,worldFor} from './world.js?v=0.12.0';
export function createHaven(run={}){
 const s=createState(run.loadout||[], 'clinic',run.threat??1,'false-haven'),raw=run.snapshot;
 s.runId=run.runId;s.route=run.route||'shelter';s.mode=run.mode||'action';
 if(!raw||raw.revision!==HAVEN_REVISION||raw.runId!==run.runId)return s;
 const finite=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
 for(const k of ['shots','hits','blocks','heals','doorUses','doorsBroken','distractionsUsed','shotgunShots','doorRevision'])s[k]=Math.floor(finite(raw[k],0,100000,0));
 s.immune=finite(raw.immune,0,1.4,0);s.cooldown=finite(raw.cooldown,0,2,0);
 s.time=finite(raw.time,0,300,0);s.health=finite(raw.health,0,3,3);s.ammo=finite(raw.ammo,0,s.loadout.includes('ammo-pouch')?84:60,12);s.vest=finite(raw.vest,0,s.vest,0);
 s.tasks=Object.fromEntries(HAVEN_TASKS.filter(t=>raw.tasks?.[t.id]===true).map(t=>[t.id,true]));
 // Reject out-of-order progress rather than accidentally granting inaccessible objectives.
 for(const t of HAVEN_TASKS)if(s.tasks[t.id]&&!(t.requires||[]).every(id=>s.tasks[id]))delete s.tasks[t.id];
 const h=raw.haven||{};s.haven=havenEnvironment();
 s.haven.trapClosed=h.trapClosed===true;
 Object.assign(s.haven,{powerCircuit:s.tasks.power_depot?'depot':s.tasks.power_pump?'pump':'off',drainStarted:s.tasks.power_pump?finite(h.drainStarted,0,s.time,s.time):null,trolleyProgress:s.tasks.trolley_parked?1:finite(h.trolleyProgress,0,.999,0),trolleyMoving:!!h.trolleyMoving&&!!s.tasks.power_depot&&!s.tasks.trolley_parked,speakerUntil:finite(h.speakerUntil,0,s.time+12,0),speakerReady:finite(h.speakerReady,0,s.time+27,0),finaleAt:s.tasks.gate_unlocked?finite(h.finaleAt,0,s.time+3,s.time):null,finaleSpawned:!!s.tasks.gate_unlocked&&h.finaleSpawned===true});
 if(s.haven.finaleSpawned)s.enemies.push(...havenFinale());
 const old=new Map((Array.isArray(raw.enemies)?raw.enemies:[]).map(e=>[e.id,e]));
 for(const e of s.enemies){const o=old.get(e.id);if(!o)continue;e.hp=finite(o.hp,0,e.hp,e.hp);e.x=finite(o.x,16,3824,e.x);e.y=finite(o.y,16,1904,e.y);e.phase=e.hp?'return':'dead';e.target={x:e.homeX,y:e.homeY};if(solid(s,e.x,e.y)){e.x=e.homeX;e.y=e.homeY;}}
 const w=worldFor(s);s.picked=(Array.isArray(raw.picked)?raw.picked:[]).filter(id=>w.PICKUPS.some(p=>p.id===id));s.shotgun=s.picked.includes('shotgun');s.shells=s.shotgun?finite(raw.shells,0,8,0):0;s.weapon=s.shotgun&&raw.weapon==='shotgun'?'shotgun':'primary';
 for(const id of Object.keys(s.doors)){const d=raw.doors?.[id];if(d)s.doors[id]={closed:!!d.closed,hp:finite(d.hp,0,100,100)};}
 s.windows=Object.fromEntries(w.WINDOWS.filter(p=>raw.windows?.[p.id]===true).map(p=>[p.id,true]));
 s.distractions={};for(const d of w.DISTRACTIONS){const v=raw.distractions?.[d.id];if(v)s.distractions[d.id]={started:finite(v.started,0,s.time,0),ignitesAt:finite(v.ignitesAt,0,s.time+1.2,0),until:finite(v.until,0,s.time+d.duration+1.2,0)};}
 s.x=finite(raw.x,16,3824,640);s.y=finite(raw.y,16,1904,1728);s.angle=finite(raw.angle,-10000,10000,-Math.PI/2);
 if(solid(s,s.x,s.y)){s.x=640;s.y=1728;}s.checkpoint={x:s.x,y:s.y};
 s.outcome=['success','lost','timed_out','assisted_completed'].includes(raw.outcome)?raw.outcome:null;
 if(!s.outcome&&s.health<=0)s.outcome='lost';if(!s.outcome&&s.time>=300)s.outcome='timed_out';s.mode=raw.mode==='assisted'?'assisted':s.mode;return s;
}
const profile={...CONTROL_PROFILES.nightfall,help:CONTROL_PROFILES.nightfall.help.replace('One live run; no restart after defeat.','Five active minutes. In a classroom, the shared five-minute window continues during local pauses.')};
export const falseHavenAdapter={
 id:'false-haven',title:'Nightfall II · False Haven · v0.4.0',activeLimitSeconds:300,revision:HAVEN_REVISION,media:MEDIA,controlProfile:profile,canvasLabel:'Explore the evacuation compound, restore machinery and escape in the bus',
 resultLabels:{success:'You escaped False Haven',lost:'Your radio fell silent',timed_out:'Escape incomplete — time expired',assisted_completed:'Guided escape completed'},
 resultText:'Your individual field result is recorded separately from mathematics. Every crew member still participates in the final decision.',
 create:createHaven,step,render,loadArt:()=>loadArt({...MEDIA,tiles:'./assets/false-haven/tiles-v3.webp'}),
 music:s=>s.outcome?'ending':s.haven.finaleAt!==null||s.enemies.some(e=>e.hp>0&&e.phase==='chase')?'danger':'ambient',
 alarm:s=>s.haven.speakerUntil>s.time&&!s.outcome,
 instructions:'Camp authorities withdrew after an intake breach, diverted the transports and left civilians behind a locked exit. Infected are already inside the outer compound. Start the utility generator, drain the passage, and open its shortcut. Return to the power selector, power the depot, move the cargo trolley and unlock the vehicle exit. Then release the barrier and reach the bus. Follow the amber marker; M shows the map. Broadcasts and doors buy time. The shotgun is in Supply. Five active minutes; pauses stop the clock.',
 hud:s=>{const t=Math.max(0,300-Math.floor(s.time));return `HEALTH ${s.health}/3 · ${s.weapon==='shotgun'?'SHOTGUN '+s.shells:(s.damage===2?'CARBINE ':'PISTOL ')+s.ammo} · ${Math.floor(t/60)}:${String(t%60).padStart(2,'0')} · POWER ${s.haven.powerCircuit.toUpperCase()}`;},
 objective:s=>(nextObjective(s)?.label||'Escape complete')+(s.prompt?' · '+s.prompt:''),progress:s=>HAVEN_TASKS.filter(t=>s.tasks[t.id]).map(t=>t.id),
 assisted(s,root,onProgress){const t=nextObjective(s);if(!t)return;root.innerHTML='<h2></h2><p>The guided route follows the same machinery sequence without reflex combat. It is recorded separately from action success.</p><button>Complete this step using the covered route</button>';root.querySelector('h2').textContent=t.label;root.querySelector('button').onclick=()=>{if(t.id==='passage_drained'){s.haven.drainStarted=s.time-6;havenTick(s,0);}else if(t.id==='trolley_parked'){s.tasks.trolley_parked=true;s.haven.trolleyProgress=1;}else completeTask(s,t.id);if(s.outcome==='success')s.outcome='assisted_completed';onProgress();};}
};
