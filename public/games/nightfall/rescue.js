import {createState,step,move,dist,breakWindow,triggerDistraction} from './simulation.js?v=0.12.0';
import {solid} from './world.js?v=0.12.0';
import {RESCUE_REVISION,RESCUE_START,TERMINAL,rescueEnemies,rescueCaller} from './rescue-world.js?v=0.12.0';

export function createRescue(route='clinic'){
 const s=createState([],route,1);
 Object.assign(s,{scenario:'rescue',revision:RESCUE_REVISION,ammo:15,noiseRadius:0,enemies:rescueEnemies(),doors:{store:{closed:true,hp:100}},checkpoint:{...RESCUE_START},follower:null,trail:[],dialogue:false,assistedStep:0,message:`Sol: Reach ${rescueCaller(route)} and bring them back to the station. Keep moving; you don’t need to clear the streets.`});
 return s;
}
export function restoreRescue(raw,route){
 if(!raw||raw.revision!==RESCUE_REVISION||raw.route!==route)return createRescue(route);
 // Live snapshots are accepted by the phase-specific server envelope. Transient
 // controls, bullets and audio never survive a reconnect.
 return {...structuredClone(raw),events:[],bullets:[],prevInteract:false,prevWeapon:false,interact:0};
}
export const rescueComplete=s=>!!s.tasks.recruit&&!!s.follower&&s.health>0&&dist(s,TERMINAL)<=TERMINAL.r&&dist(s.follower,TERMINAL)<=TERMINAL.r;
export function recruit(s){
 if(s.follower)return;
 s.tasks.recruit=true;s.follower={x:s.x,y:s.y,angle:s.angle};s.trail=[{x:s.x,y:s.y}];s.dialogue=true;s.checkpoint={x:s.x,y:s.y};
 s.message=s.route==='depot'?"Tomas: I’ve got the tools. Get me to the station. We’ll still need that replacement battery.":"Imani: You answered. I’ll follow you back. The other shelter is still waiting.";
 s.messageAt=s.time;
}
export function stepRescue(s,input,dt){
 if(s.dialogue||s.outcome)return s;
 step(s,input,dt);
 if(s.tasks.recruit&&!s.follower)recruit(s);
 if(s.follower&&!s.outcome){
  const last=s.trail.at(-1)||s.follower;
  if(dist(last,s)>4)s.trail.push({x:s.x,y:s.y});
  // Follow the player's actual traversed breadcrumb path, through either
  // broken window and alley turns. The non-solid NPC never intercepts combat.
  while(s.trail.length>1&&dist(s.follower,s.trail[0])<4)s.trail.shift();
  if(s.trail.length&&dist(s,s.follower)>28){
   const target=s.trail[0],d=dist(s.follower,target),travel=Math.min(d,170*dt);
   if(d>0){s.follower.angle=Math.atan2(target.y-s.follower.y,target.x-s.follower.x);move(s,s.follower,(target.x-s.follower.x)/d*travel,(target.y-s.follower.y)/d*travel);}
  }
 }
 if(rescueComplete(s)){s.tasks.return=true;s.outcome='success';s.message='Sol: You’re back. Now check the repair plan. We still need to get this bus running.';s.messageAt=s.time;}
 else delete s.tasks.return;
 if(s.outcome==='lost')s.message='Try again — the rescue timer is still running.';
 return s;
}
export function checkpointFor(s){
 const copy=structuredClone(s);copy.health=3;copy.outcome=null;copy.dialogue=false;copy.bullets=[];copy.events=[];copy.immune=2;copy.interact=0;copy.prevInteract=false;
 return copy;
}
export function assistedRescue(s){
 const actions=[
  ()=>{s.x=816;s.y=1008;},
  ()=>{triggerDistraction(s,'rescue-alarm');s.x=1536;s.y=560;},
  ()=>{breakWindow(s,'store-west');s.x=1696;s.y=264;},
  ()=>{s.x=1792;s.y=256;recruit(s);},
  ()=>{s.dialogue=false;s.x=TERMINAL.x;s.y=TERMINAL.y;s.follower={x:TERMINAL.x-28,y:TERMINAL.y,angle:0};s.trail=[];s.tasks.return=true;s.outcome='success';}
 ];
 if(s.outcome)return;
 const index=s.assistedStep||0;actions[index]?.();s.assistedStep=Math.min(5,index+1);
}
export function validRescuePoint(s,p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&!solid(s,p.x,p.y,8);}
