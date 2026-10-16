import {HAVEN_SWITCHES,trolleyRect,TROLLEY_START,TROLLEY_END} from './false-haven-world.js?v=0.14.2';
import {sprite,strip,CELL} from './sprites.js?v=0.14.2';
// False Haven environment drawing. Every object comes from a sprite sheet
// (NF-ART-01); text appears only on sprite sign boards and short prompts.

// Ground: plain yard gravel with a marked evacuation route instead of the
// Chapter 1 city-block grid. Returns [tile, quarterTurns].
const ROUTE=[{x:352,y:1632,w:3264,h:32},{x:1504,y:480,w:32,h:1152},{x:1504,y:480,w:1024,h:32},{x:3584,y:928,w:32,h:704}];
const MUD=[{x:2400,y:1056,w:320,h:288},{x:2688,y:1344,w:160,h:128}];
const inside=(r,x,y)=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h;
export function havenGroundTile(x,y){
 for(const r of ROUTE)if(inside(r,x,y))return [1,r.h>r.w?1:0];
 if(MUD.some(r=>inside(r,x,y)))return [14,0];
 return [0,0];
}

export function signBoard(c,art,text,cx,cy,{min=120}={}){
 c.save();c.font='bold 12px system-ui';const w=Math.max(min,c.measureText(text).width+44),h=34;
 sprite(c,art,'interactables',CELL.sign,cx-w/2,cy-h/2,w,h);
 c.fillStyle='#ece8d2';c.textAlign='center';c.textBaseline='middle';c.fillText(text,cx,cy+1);c.restore();
}

const MACHINE={
 generator_online:(s)=>[s.tasks.generator_online?CELL.generatorOn:CELL.generator,64,56],
 power_pump:()=>[CELL.selector,48,60],
 passage_drained:(s)=>[s.haven.drainStarted!==null&&!s.tasks.passage_drained?CELL.pumpOn:CELL.pump,64,56],
 service_shortcut:(s)=>[s.tasks.service_shortcut?CELL.hatchOpen:CELL.hatchClosed,56,56],
 trolley_parked:()=>[CELL.gateConsole,60,44],
 depot_shutter:()=>[CELL.selector,44,54],
 gate_unlocked:()=>[CELL.gateConsole,64,48],
 barrier_released:()=>[CELL.selector,44,54]
};
// Machinery replaces the generic task prop. power_depot shares the selector.
export function drawHavenTask(c,s,art,t){
 const m=MACHINE[t.id];if(!m)return false;const [cell,w,h]=m(s);
 sprite(c,art,'machinery',cell,t.x-w/2,t.y-h/2,w,h);return true;
}

// Fixed and stateful barriers. Returns true when the wall was drawn here.
export function drawHavenWall(c,art,w){
 if(w.kind==='fence'){strip(c,art,'interactables',CELL.fence,w,{thickness:30,segment:48});return true;}
 if(w.kind==='water'||w.kind==='trolley')return true;
 if(w.kind==='shortcut'||w.kind==='trap'){
  const cell=w.kind==='trap'?CELL.trapClosed:CELL.rollGate,vertical=w.h>w.w,len=vertical?w.h:w.w,n=Math.max(1,Math.round(len/64)),seg=len/n;
  for(let i=0;i<n;i++)vertical?sprite(c,art,'interactables',cell,w.x+w.w/2-22,w.y+i*seg,44,seg,{rot:1}):sprite(c,art,'interactables',cell,w.x+i*seg,w.y+w.h/2-22,seg,44);
  return true;
 }
 if(w.kind==='vehicle'){const half=w.h/2;sprite(c,art,'machinery',CELL.barrierDown,w.x+w.w/2-22,w.y,44,half,{rot:1});sprite(c,art,'machinery',CELL.barrierDown,w.x+w.w/2-22,w.y+half,44,half,{rot:3});return true;}
 if(w.kind==='shutter'){sprite(c,art,'machinery',CELL.shutter,w.x-4,w.y-20,w.w+8,56);return true;}
 return false;
}

// Under actors: water, rails, trolley, opened barriers, conduit, switches, signs.
export function drawHavenUnder(c,s,art){
 const h=s.haven;
 // Flooded passage: real water tiles drain downward; a waterline marks the surface.
 const P={x:2480,y:1088,w:176,h:192};
 if(!s.tasks.passage_drained){
  const level=h.drainStarted===null?1:Math.max(0,1-(s.time-h.drainStarted)/6),top=P.y+P.h*(1-level);
  if(level>0){c.save();c.beginPath();c.rect(P.x,top,P.w,P.h*level);c.clip();
   const sw=art.tiles.width/4,sh=art.tiles.height/4;for(let y=P.y;y<P.y+P.h;y+=32)for(let x=P.x;x<P.x+P.w;x+=32)c.drawImage(art.tiles,3*sw,3*sh,sw,sh,x,y,32,32);
   c.restore();strip(c,art,'machinery',CELL.waterline,{x:P.x,y:top-10,w:P.w,h:20},{thickness:20,segment:44});}
  sprite(c,art,'machinery',CELL.waterDrain,P.x+P.w/2-28,P.y+P.h-64,56,52,{alpha:Math.min(1,.35+(1-level))});
 }else sprite(c,art,'decals',CELL.drain,P.x+P.w/2-26,P.y+P.h/2-26,52,52);
 // Cargo rail with buffer stops, then the trolley at its current position.
 const railY=TROLLEY_START.y+TROLLEY_START.h/2;
 strip(c,art,'interactables',CELL.rail,{x:TROLLEY_START.x-8,y:railY-14,w:TROLLEY_END.x+TROLLEY_END.w-TROLLEY_START.x+16,h:28},{thickness:28,segment:50});
 sprite(c,art,'interactables',CELL.railEnd,TROLLEY_START.x-34,railY-16,30,32,{rot:3});
 sprite(c,art,'interactables',CELL.railEnd,TROLLEY_END.x+TROLLEY_END.w+4,railY-16,30,32,{rot:1});
 const t=trolleyRect(s);sprite(c,art,'interactables',CELL.trolley,t.x-4,t.y-8,t.w+8,t.h+16);
 // Power conduit from generator to selector to pump.
 for(const r of [{x:1696,y:536,w:160,h:16},{x:1848,y:544,w:16,h:608},{x:1856,y:1144,w:576,h:16}])strip(c,art,'machinery',CELL.conduit,r,{thickness:16,segment:42});
 // Opened states of the stateful barriers.
 if(h.trapClosed===false)sprite(c,art,'interactables',CELL.trapOpen,2096-40,976-44,40,52);
 if(s.tasks.barrier_released){sprite(c,art,'machinery',CELL.barrierUp,2568-24,1568-62,40,60);sprite(c,art,'machinery',CELL.barrierUp,2568-24,1792-2,40,60);}
 // Switches.
 for(const q of HAVEN_SWITCHES){
  if(q.id==='speaker')sprite(c,art,'interactables',h.speakerUntil>s.time?CELL.speakerActive:CELL.speaker,q.x-24,q.y-52,48,70);
  else sprite(c,art,'machinery',CELL.gateConsole,q.x-26,q.y-20,52,40);
 }
 signBoard(c,art,'POWER: '+h.powerCircuit.toUpperCase(),1860,492,{min:160});
 signBoard(c,art,s.tasks.passage_drained?'PASSAGE DRAINED':'FLOODED PASSAGE',2568,1060,{min:150});
 for(const [label,x,y] of [['ARRIVAL / BUS',512,1508],['UTILITY YARD',1616,252],['INSPECTION LANE',1984,676],['LOADING DEPOT',3072,220],['VEHICLE EXIT',2656,1836]])signBoard(c,art,label,x+60,y-6,{min:140});
}

// Over everything: short prompts and the evacuation call.
export function drawHavenOver(c,s,art){
 const h=s.haven;
 if(s.tasks.depot_shutter)sprite(c,art,'machinery',CELL.shutterUp,3196,764,88,40);
 c.save();
 for(const q of HAVEN_SWITCHES){c.fillStyle='#e8e6cf';c.font='bold 11px system-ui';c.textAlign='center';c.fillText(q.id==='speaker'?'BROADCAST':'GATE',q.x,q.y-58);}
 c.strokeStyle='#badfb0';c.lineWidth=3;c.beginPath();c.arc(640,1696,64,0,Math.PI*2);c.stroke();
 if(h.finaleAt!==null){c.fillStyle='#fa8765';c.fillRect(2688,1516,8,8);c.font='bold 13px system-ui';c.textAlign='left';c.fillText('EVACUATE → BUS',2704,1530);}
 c.restore();
}
