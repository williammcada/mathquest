// First Response tuning is independent of the later city's threat presets.
export const RESCUE_REVISION='nightfall-rescue-2';
export const RESCUE_WINDOW_MS=300000;
export const TERMINAL={x:1168,y:1168,r:72};
export const RESCUE_START={x:1168,y:1200};
export const rescueCaller=route=>route==='depot'?'Tomas':'Imani';
export function rescueWorld(route='clinic'){
 const building={id:'store',name:route==='depot'?'DEPOT GARAGE':'IMANI’S CLINIC',x:1632,y:128,w:352,h:352,door:1760,floor:route==='depot'?4:2};
 return {
  WORLD:{width:2560,height:1280,tile:32,bus:TERMINAL},BUILDINGS:[building],
  TASKS:[{id:'recruit',label:`Enter and speak with ${rescueCaller(route)}`,x:1792,y:256,duration:2,prop:12},{id:'return',label:`Escort ${rescueCaller(route)} back to the terminal`,x:TERMINAL.x,y:TERMINAL.y,duration:1,requires:['recruit'],prop:0}],
  PICKUPS:[{id:'rescue-health',kind:'health',amount:1,x:816,y:800},{id:'rescue-ammo',kind:'ammo',amount:10,x:1344,y:528}],
  PROPS:[{id:'rescue-car',x:1184,y:544,w:112,h:56,art:1}],
  DISTRACTIONS:[{id:'rescue-alarm',kind:'alarm',propId:'rescue-car',label:'Car alarm',x:1240,y:572,duration:12,radius:3000},{id:'rescue-gas',kind:'barrel',label:'Gas tank · shoot from a distance',x:1008,y:1088,duration:8,radius:500}],
  WINDOWS:[{id:'store-west',room:'store',x:1632,y:224,w:16,h:80},{id:'store-east',room:'store',x:1968,y:224,w:16,h:80}],
  BARRIERS:[{x:0,y:640,w:736,h:320},{x:896,y:640,w:1664,h:320},{x:0,y:0,w:1440,h:480},{x:2080,y:0,w:480,h:480},{x:0,y:0,w:576,h:1280},{x:2240,y:0,w:320,h:1280}].map(b=>({...b,kind:'block'})),
 };
}
export function rescueEnemies(){
 const groups=[['south',5,688,1040,112],['north',10,1008,504,96],['entrance',5,1680,552,64]];
 return groups.flatMap(([zone,n,x,y,gap])=>Array.from({length:n},(_,i)=>({id:`rescue-${zone}-${i}`,zone,x:x+i*gap,y:y+(i%2)*(zone==='north'?112:48),homeX:x+i*gap,homeY:y+(i%2)*(zone==='north'?112:48),kind:'shambler',hp:2,phase:'wander',timer:0,angle:Math.PI/2,deathTime:0,storeGuard:zone==='entrance'})));
}
