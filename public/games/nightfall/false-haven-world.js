// False Haven data and environmental state; shared Nightfall combat owns actors.
export const HAVEN_REVISION='false-haven-0.4.0';
export const HAVEN_WORLD={width:3840,height:1920,tile:32,bus:{x:640,y:1640}};
export const HAVEN_TASKS=[
 {id:'generator_online',label:'Start the utility generator',x:1696,y:544,duration:3,prop:7},
 {id:'power_pump',label:'Route power to the drainage pump',x:1856,y:544,duration:1,requires:['generator_online'],prop:7},
 {id:'passage_drained',label:'Wait for the service passage to drain',x:2432,y:1152,duration:6,requires:['power_pump'],automatic:true,prop:7},
 {id:'service_shortcut',label:'Open the manual service shortcut',x:2720,y:1408,duration:1.5,requires:['passage_drained'],prop:7},
 {id:'power_depot',label:'Return to the selector: power the depot',x:1856,y:544,duration:1,requires:['service_shortcut'],prop:7},
 {id:'trolley_parked',label:'Move the cargo trolley along its track',x:3240,y:912,duration:2,requires:['power_depot'],prop:6},
 {id:'depot_shutter',label:'Raise the depot shutter',x:3360,y:880,duration:2,requires:['trolley_parked'],prop:7},
 {id:'gate_unlocked',label:'Unlock the evacuation gate in the booth',x:3328,y:512,duration:3,requires:['depot_shutter'],prop:7},
 {id:'barrier_released',label:'Release the vehicle barrier',x:2720,y:1584,duration:2,requires:['gate_unlocked'],prop:7},
 {id:'escape',label:'Return to the bus and escape',x:640,y:1696,duration:2,requires:['barrier_released'],prop:0}
];
export const HAVEN_BUILDINGS=[
 {id:'dorm',name:'SHELTER 04',x:256,y:256,w:576,h:512,door:512,floor:3},
 {id:'canteen',name:'ABANDONED CANTEEN',x:384,y:960,w:448,h:320,door:576,floor:3},
 {id:'medical',name:'INTAKE / MEDICAL',x:1056,y:128,w:384,h:320,door:1216,floor:3},
 {id:'supply',name:'SUPPLY / SHOTGUN',x:1056,y:768,w:384,h:320,door:1216,floor:2},
 {id:'booth',name:'EVACUATION CONTROL',x:3104,y:352,w:448,h:448,door:3200,floor:4}
];
export const HAVEN_WINDOWS=HAVEN_BUILDINGS.filter(b=>b.id!=='booth').flatMap(b=>[
 {id:b.id+'-west',room:b.id,x:b.x,y:b.y+96,w:16,h:80},
 {id:b.id+'-east',room:b.id,x:b.x+b.w-16,y:b.y+96,w:16,h:80}
]);
const fence=(x,y,w,h,kind='fence')=>({x,y,w,h,gate:true,kind});
export const FIXED_FENCES=[fence(2560,0,16,1088),fence(2560,1280,16,64),fence(2560,1472,16,96),fence(2560,1792,16,128),
 fence(1952,704,448,16),fence(1952,704,16,288),fence(2384,704,16,288),fence(1952,976,144,16),fence(2224,976,176,16)];
export const TROLLEY_START={x:3196,y:808,w:88,h:32},TROLLEY_END={x:3456,y:808,w:88,h:32};
export function trolleyRect(s){const t=s.haven?.trolleyProgress||0;return {...TROLLEY_START,x:TROLLEY_START.x+(TROLLEY_END.x-TROLLEY_START.x)*t};}
export function havenBarriers(s){const h=s.haven||{};return [...FIXED_FENCES,
 ...(!s.tasks.passage_drained?[{...fence(2560,1088,16,192,'water'),water:true}]:[]),
 ...(!s.tasks.service_shortcut?[fence(2560,1344,16,128,'shortcut')]:[]),
 ...(!s.tasks.barrier_released?[fence(2560,1568,16,224,'vehicle')]:[]),
 ...(!s.tasks.depot_shutter?[fence(3200,784,80,16,'shutter')]:[]),
 ...(h.trapClosed?[fence(2096,976,128,16,'trap')]:[]),
 {...trolleyRect(s),kind:'trolley'}];}
const PROPS=[{id:'alarm-car-a',x:896,y:1280,w:112,h:56,art:1},{id:'alarm-car-b',x:2944,y:1536,w:112,h:56,art:2},
 {id:'crates',x:2944,y:256,w:96,h:64,art:11}];
const PICKUPS=[{id:'shotgun',kind:'shotgun',amount:8,x:1312,y:896},...[[704,576],[1376,1152],[1728,704],[2752,1184],[3456,1024],[3056,1664]].map(([x,y],i)=>({id:'ha'+i,kind:'ammo',amount:6,x,y})),...[[608,576],[1952,1248],[3456,672]].map(([x,y],i)=>({id:'hh'+i,kind:'health',amount:1,x,y}))];
const DISTRACTIONS=[{id:'haven-alarm-a',kind:'alarm',propId:'alarm-car-a',label:'Car alarm',x:952,y:1308,duration:12,radius:640},{id:'haven-alarm-b',kind:'alarm',propId:'alarm-car-b',label:'Car alarm',x:3000,y:1564,duration:12,radius:640},
 {id:'haven-barrel-a',kind:'barrel',label:'Fuel barrel',x:1584,y:1088,duration:8,radius:500},{id:'haven-barrel-b',kind:'barrel',label:'Fuel barrel',x:3072,y:1312,duration:8,radius:500}];
export function havenWorld(s){return {WORLD:HAVEN_WORLD,BUILDINGS:HAVEN_BUILDINGS,TASKS:HAVEN_TASKS,PICKUPS,PROPS,DISTRACTIONS,WINDOWS:HAVEN_WINDOWS,BARRIERS:havenBarriers(s)};}
export function havenEnvironment(){return {powerCircuit:'off',drainStarted:null,trapClosed:false,speakerUntil:0,speakerReady:0,trolleyProgress:0,trolleyMoving:false,finaleAt:null,finaleSpawned:false};}
export function havenEnemies(){const list=[];const clusters=[[1056,544,8],[1728,352,8],[2176,1120,8],[2816,480,7],[3008,1152,8],[3392,1568,7]];
 for(const [x,y,n] of clusters)for(let j=0;j<n;j++){const i=list.length,kind=i%11===0?'brute':i%5===0?'crawler':i%3===0?'runner':'shambler',px=x+(j%4)*56,py=y+Math.floor(j/4)*72;list.push({id:'fh-'+i,x:px,y:py,homeX:px,homeY:py,kind,hp:kind==='brute'?6:kind==='shambler'?2:1,phase:'wander',timer:0,angle:Math.PI,deathTime:0});}return list;}
export function havenFinale(){return Array.from({length:8},(_,i)=>{const x=(i<4?2640:2368)+(i%2)*48,y=1648+Math.floor((i%4)/2)*64;return {id:'fh-finale-'+i,x,y,homeX:x,homeY:y,kind:i%3===0?'runner':'shambler',hp:i%3===0?1:2,phase:'investigate',target:{x:2720,y:1584},memory:90,timer:0,angle:Math.PI,deathTime:0,finale:true};});}
export const HAVEN_SWITCHES=[{id:'speaker',x:1872,y:864,label:'Broadcast to the inspection lane'}, {id:'trap',x:2048,y:1040,label:'Inspection gate'}];
export const overlaps=(a,b,r=16)=>a.x>b.x-r&&a.x<b.x+b.w+r&&a.y>b.y-r&&a.y<b.y+b.h+r;
export function havenComplete(s,id){const h=s.haven,t=HAVEN_TASKS.find(t=>t.id===id);if(!t||s.tasks[id]||!(t.requires||[]).every(k=>s.tasks[k]))return false;
 if(id==='trolley_parked'){if(s.enemies.some(e=>e.hp>0&&overlaps(e,{x:3196,y:800,w:348,h:72}))||overlaps(s,{x:3196,y:800,w:348,h:72})){s.message='Track occupied. Clear the marked trolley track.';s.messageAt=s.time;return false;}h.trolleyMoving=true;return true;}
 s.tasks[id]=true;s.doorRevision++;s.checkpoint={x:s.x,y:s.y};
 if(id==='power_pump'){h.powerCircuit='pump';h.drainStarted=s.time;}
 if(id==='power_depot')h.powerCircuit='depot';
 if(id==='gate_unlocked'){h.finaleAt=s.time+3;s.message='EVACUATION ALARM — a breach is imminent! Release the barrier, then reach the bus.';}
 else s.message=t.label+' · complete';s.messageAt=s.time;
 if(id==='escape')s.outcome='success';s.events.push({type:id==='escape'?'engine':'power',text:s.message});return true;}
export function havenTick(s,dt){const h=s.haven;
 if(h.drainStarted!==null&&!s.tasks.passage_drained&&s.time-h.drainStarted>=6)havenComplete(s,'passage_drained');
 if(h.trolleyMoving){const track={x:3196,y:800,w:348,h:72};if(![s,...s.enemies.filter(e=>e.hp>0)].some(a=>overlaps(a,track))){h.trolleyProgress=Math.min(1,h.trolleyProgress+dt/2);s.doorRevision++;if(h.trolleyProgress===1){h.trolleyMoving=false;s.tasks.trolley_parked=true;s.message='Cargo trolley parked. Raise the shutter.';s.messageAt=s.time;}}}
 if(h.finaleAt!==null&&!h.finaleSpawned&&s.time>=h.finaleAt){h.finaleSpawned=true;s.enemies.push(...havenFinale());s.events.push({type:'breach',text:'Perimeter breached!'});}
 if(s.time>=300&&!s.outcome)s.outcome='timed_out';
}
export function havenSwitch(s,id){const h=s.haven;let rect;
 if(id==='speaker'){if(s.time<h.speakerReady){s.message='Speaker recharging';s.messageAt=s.time;return false;}h.speakerUntil=s.time+12;h.speakerReady=s.time+27;s.events.push({type:'alarm'});s.message='Broadcast active · lure enemies into the inspection lane.';}
 else {if(id==='trap')rect={x:2096,y:976,w:128,h:16};else return false;
 if([s,...s.enemies.filter(e=>e.hp>0)].some(a=>overlaps(a,rect))){s.message='Occupied. Wait until everyone is clear.';s.messageAt=s.time;return false;}
 h.trapClosed=!h.trapClosed;s.doorRevision++;s.message=h.trapClosed?'Inspection gate closed':'Inspection gate open';}
 s.messageAt=s.time;return true;}
