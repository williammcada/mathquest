import {havenWorld} from './false-haven-world.js?v=0.14.2';
import {rescueWorld} from './rescue-world.js?v=0.14.2';
import {CONFIG_REVISION,threatFor} from './config.js?v=0.14.2';
import {furnitureSolids} from './interiors.js?v=0.14.2';
export const REVISION=CONFIG_REVISION;
export const WORLD={width:2560,height:1280,tile:32,bus:{x:1168,y:1120}};
export const BUILDINGS=[
 {id:'maintenance',name:'MAINTENANCE',x:224,y:128,w:416,h:352,door:416,floor:3},
 {id:'dispatch',name:'DISPATCH',x:832,y:64,w:448,h:384,door:1056,floor:3},
 {id:'store',name:'SPORTING GOODS',x:1440,y:128,w:352,h:384,door:1600,floor:2},
 {id:'garage',name:'PARKING GARAGE',x:1888,y:608,w:512,h:448,door:2112,floor:4},
 {id:'substation',name:'SUBSTATION',x:224,y:768,w:448,h:320,door:416,floor:13}
];
export const TASKS=[
 {id:'fuse',label:'Search maintenance for the fuse',x:384,y:240,duration:3.5,prop:5},
 {id:'power',label:'Restore power and isolate fallen lines',x:448,y:896,duration:4,requires:['fuse'],prop:7},
 {id:'keys',label:'Search dispatch for the bus keys',x:1088,y:208,duration:3.5,prop:5},
 {id:'battery',label:'Lower and collect the garage battery',x:2208,y:752,duration:4,requires:['power'],prop:6},
 {id:'installed',label:'Install the battery at the bus',x:1168,y:1080,duration:4,requires:['battery'],prop:6},
 {id:'survivor',label:'Rescue another survivor in the sporting goods store',x:1632,y:240,duration:3,optional:true,prop:12},
 {id:'escape',label:'Start the bus',x:1168,y:1152,duration:2.5,requires:['installed','keys'],prop:0}
];
export const PICKUPS=[
 {id:'shotgun',x:1696,y:352,kind:'shotgun',amount:8},
 {id:'a1',x:544,y:320,kind:'ammo',amount:5},{id:'a2',x:960,y:304,kind:'ammo',amount:5},
 {id:'a3',x:576,y:992,kind:'ammo',amount:4},{id:'a4',x:2304,y:912,kind:'ammo',amount:6},
 {id:'cache1',x:2048,y:224,kind:'ammo',amount:10},{id:'cache2',x:1344,y:624,kind:'ammo',amount:10},
 {id:'heal1',x:928,y:368,kind:'health',amount:1},{id:'heal2',x:2016,y:864,kind:'health',amount:1}
];
export const PROPS=[
 {id:'wreck1',x:736,y:576,w:112,h:56,art:1},
 {id:'wreck2',x:1728,y:640,w:112,h:56,art:2},
 {id:'wreck3',x:1376,y:960,w:96,h:64,art:3},
 {id:'wreck4',x:1920,y:320,w:128,h:64,art:1},
 {id:'wreck5',x:64,y:640,w:128,h:64,art:2},
 {id:'wreck6',x:928,y:704,w:112,h:56,art:2},
 {id:'wreck7',x:1792,y:864,w:112,h:56,art:1},
 {id:'rubble1',x:672,y:176,w:64,h:80,art:11},
 {id:'rubble2',x:2048,y:416,w:80,h:64,art:11},
 {id:'lines',x:736,y:864,w:128,h:32,art:8,wire:true}
];
export const DISTRACTIONS=[
 {id:'alarm',kind:'alarm',propId:'wreck1',label:'Car alarm',x:792,y:604,duration:12,radius:1280},
 {id:'alarm2',kind:'alarm',propId:'wreck2',label:'Car alarm',x:1784,y:668,duration:12,radius:1280},
 {id:'alarm3',kind:'alarm',propId:'wreck6',label:'Car alarm',x:984,y:732,duration:12,radius:1280},
 {id:'barrel',kind:'barrel',label:'Fuel barrel · shoot from a distance',x:2000,y:1100,duration:8,radius:500},
 {id:'barrel2',kind:'barrel',label:'Fuel barrel · shoot from a distance',x:752,y:464,duration:8,radius:500},
 {id:'barrel3',kind:'barrel',label:'Fuel barrel · shoot from a distance',x:1376,y:704,duration:8,radius:500}
];
// Two 80-pixel glass openings per room. Broken panes are real gaps in the walls.
export const WINDOWS=BUILDINGS.flatMap(b=>[
 {id:b.id+'-west',room:b.id,x:b.x,y:b.y+96,w:16,h:80},
 {id:b.id+'-east',room:b.id,x:b.x+b.w-16,y:b.y+96,w:16,h:80}
]);
export const worldFor=s=>s?.scenario==='false-haven'?havenWorld(s):s?.scenario==='rescue'?rescueWorld(s.route):{WORLD,BUILDINGS,TASKS,PICKUPS,PROPS,DISTRACTIONS,WINDOWS,BARRIERS:[]};
export const doorRects=(s)=>worldFor(s).BUILDINGS.map(b=>({id:b.id,x:b.door,y:b.y+b.h-16,w:80,h:16,door:true}));
// Circular actors slide around real art footprints instead of oversized square corners.
const overlap=(x,y,r,b)=>{const nx=Math.max(b.x,Math.min(x,b.x+b.w)),ny=Math.max(b.y,Math.min(y,b.y+b.h));return (x-nx)**2+(y-ny)**2<r*r;};
function buildWalls(s,{ignoreDoors=false}={}){
 const {BUILDINGS,WINDOWS,BARRIERS}=worldFor(s);
 const list=[...BARRIERS];
 for(const b of BUILDINGS){
   list.push({x:b.x,y:b.y,w:b.w,h:16});
   if(!WINDOWS.some(w=>w.room===b.id))list.push({x:b.x,y:b.y,w:16,h:b.h},{x:b.x+b.w-16,y:b.y,w:16,h:b.h});
   for(const pane of WINDOWS.filter(w=>w.room===b.id)){
     list.push({x:pane.x,y:b.y,w:16,h:96},{x:pane.x,y:b.y+176,w:16,h:b.h-176});
     if(!s.windows?.[pane.id])list.push({...pane,window:true});
   }
   list.push({x:b.x,y:b.y+b.h-16,w:b.door-b.x,h:16},{x:b.door+80,y:b.y+b.h-16,w:b.x+b.w-b.door-80,h:16});
   if(b.id==='store'||b.id==='garage'&&!s.tasks.power&&!s.garageHordeTriggered)list.push({x:b.door,y:b.y+b.h-16,w:80,h:16,gate:true,kind:'gate'});
 }
 if(!ignoreDoors)for(const d of doorRects(s))if(s.doors?.[d.id]?.closed&&s.doors[d.id].hp>0)list.push(d);
 return list;
}
export const propBounds=b=>({...b,x:b.x+(b.art<=3?10:3),y:b.y+(b.art<=3?10:3),w:b.w-(b.art<=3?20:6),h:b.h-(b.art<=3?20:6)});
// Derived collision data never enters saved runs. Include values as well as the
// revision so restored/assisted states and direct test fixtures invalidate safely.
const geometryCache=new WeakMap();
export function collisionGeometry(s){
 const h=s.haven||{},t=s.tasks||{};
 const key=[s.scenario,s.route,s.doorRevision,!!t.power,!!s.garageHordeTriggered,
  !!t.passage_drained,!!t.service_shortcut,!!t.barrier_released,!!t.depot_shutter,
  !!h.trapClosed,h.trolleyProgress||0,
  ...Object.entries(s.windows||{}).map(([id,open])=>id+':'+!!open),
  ...Object.entries(s.doors||{}).map(([id,d])=>id+':'+(!!d.closed&&d.hp>0))].join('|');
 let g=geometryCache.get(s);if(g?.key===key)return g;
 const {WORLD,PROPS}=worldFor(s),openWalls=buildWalls(s,{ignoreDoors:true});
 const closed=doorRects(s).filter(d=>s.doors?.[d.id]?.closed&&s.doors[d.id].hp>0);
 const props=[...PROPS.filter(b=>!b.wire||!t.power).map(propBounds),...furnitureSolids(s)];
 g={key,world:WORLD,openWalls,walls:[...openWalls,...closed],doors:closed,
  openSolids:[...openWalls,...props],solids:[...openWalls,...closed,...props]};
 geometryCache.set(s,g);return g;
}
export function walls(s,{ignoreDoors=false}={}){const g=collisionGeometry(s);return ignoreDoors?g.openWalls:g.walls;}
export function solidInGeometry(g,x,y,r=10,ignoreDoors=false){
 if(x<r||y<r||x>g.world.width-r||y>g.world.height-r)return true;
 return (ignoreDoors?g.openSolids:g.solids).some(b=>overlap(x,y,r,b));
}
export function solid(s,x,y,r=10,ignoreDoors=false){return solidInGeometry(collisionGeometry(s),x,y,r,ignoreDoors);}
export function lineClear(s,a,b){const g=collisionGeometry(s),count=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8);for(let i=1;i<=count;i++)if(solidInGeometry(g,a.x+(b.x-a.x)*i/count,a.y+(b.y-a.y)*i/count,2))return false;return true;}
export function nextObjective(s){return worldFor(s).TASKS.find(t=>!t.optional&&!s.tasks[t.id]&&(t.requires||[]).every(id=>s.tasks[id]));}
export function seededEnemies(threat=1){
 const enemies=[];let seed=1733;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 // Seed against the pre-furniture layout so the authored RNG sequence and every
 // placement stay identical; only spawns that now sit inside furniture are nudged.
 const state={tasks:{},seedWithoutFurniture:true},real={tasks:{}};
 for(let i=0;i<threatFor(threat).placed;i++){
   let x,y,tries=0;do{x=48+rand()*2464;y=48+rand()*1184;tries++;}while(tries<200&&(solid(state,x,y,16)||Math.hypot(x-1168,y-1120)<260));
   const kind=i%11===0?'brute':i%5===0?'crawler':i%3===0?'runner':'shambler';
   enemies.push({id:`e${i}`,x,y,homeX:x,homeY:y,kind,hp:kind==='brute'?6:kind==='shambler'?2:1,phase:'wander',timer:0,angle:rand()*Math.PI*2,deathTime:0});
 }
 for(const e of enemies)if(solid(real,e.x,e.y,16)){const free=clearSpawn(real,e.x,e.y);e.x=e.homeX=free.x;e.y=e.homeY=free.y;}
 return [...enemies,...storeGuards()];
}

// Nearest free point on an expanding square ring, deterministic for a given layout.
export function clearSpawn(s,x,y,r=16){for(let d=8;d<=256;d+=8)for(let a=0;a<16;a++){const nx=x+Math.cos(a*Math.PI/8)*d,ny=y+Math.sin(a*Math.PI/8)*d;if(!solid(s,nx,ny,r))return {x:Math.round(nx),y:Math.round(ny)};}return {x,y};}
export function storeGuards(){return Array.from({length:8},(_,i)=>({id:`store-guard-${i}`,x:1516+(i%4)*56,y:552+Math.floor(i/4)*38,homeX:1516+(i%4)*56,homeY:552+Math.floor(i/4)*38,kind:'shambler',hp:2,phase:'wander',timer:0,angle:-Math.PI/2,storeGuard:true,deathTime:0}));}
