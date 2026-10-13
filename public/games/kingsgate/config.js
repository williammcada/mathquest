// Kingsgate tower defense — tuning and map data (Kingsgate v0.1 change spec).
// Distances are in canvas pixels on the 640×360 logical field; 1 tile = 32 px.
export const REVISION='kingsgate-defense-0.1.0';
export const VERSION='0.1.0';
export const TILE=32;
export const W=640,H=360;
export const ACTIVE_LIMIT=300;
export const WAVE_COUNT=12;

export const TOWERS={
 archer:{id:'archer',title:'Archer Tower',cost:50,upgrade:40,damage:[6,9],rate:1.2,range:3,note:'Single target'},
 ballista:{id:'ballista',title:'Ballista',cost:90,upgrade:70,damage:[18,28],rate:.4,range:4.5,pierce:true,note:'Bolt pierces a line'},
 mage:{id:'mage',title:'Mage Tower',cost:80,upgrade:60,damage:[3,5],rate:1,range:2.5,slow:.4,slowFor:1.5,splash:.75,note:'Slows 40%'},
 catapult:{id:'catapult',title:'Catapult',cost:120,upgrade:90,damage:[20,30],rate:.25,range:5.5,minRange:1.5,splash:1,flight:.9,note:'Area blast'}
};
export const TOWER_ORDER=['archer','ballista','mage','catapult'];

export const ENEMIES={
 raider:{id:'raider',title:'Raider',hp:30,speed:1,armor:0,gate:1,bounty:4,size:30},
 wolf:{id:'wolf',title:'Wolf Rider',hp:22,speed:1.9,armor:0,gate:1,bounty:5,size:36},
 troll:{id:'troll',title:'Troll',hp:140,speed:.6,armor:4,gate:3,bounty:15,size:42},
 shaman:{id:'shaman',title:'Shaman',hp:40,speed:.9,armor:0,gate:1,bounty:10,size:32,heal:4,healRange:1.5},
 ram:{id:'ram',title:'Siege Ram',hp:900,speed:.45,armor:6,gate:10,bounty:0,size:62}
};
export const MAX_BOUNTY=15;

// Spawn groups per wave: [type, count]. Groups spawn in order, one orc per interval.
export const WAVES=[
 [['raider',6]],
 [['raider',8]],
 [['raider',6],['wolf',4]],
 [['raider',10],['shaman',1]],
 [['wolf',8]],
 [['raider',8],['troll',1]],
 [['raider',10],['shaman',2],['wolf',4]],
 [['troll',2],['raider',6]],
 [['wolf',12],['shaman',1]],
 [['troll',3],['shaman',2],['raider',8]],
 [['raider',14],['wolf',6],['troll',2],['shaman',2]],
 [['ram',1],['raider',8],['shaman',2]]
];
export const SPAWN_GAP={raider:.9,wolf:.6,troll:2,shaman:1.2,ram:2.5};
// MathQuest mode: wave n starts at its scheduled time or 3 s after the previous wave clears, whichever comes first.
export const FIRST_WAVE_AT=8;
export const WAVE_SPACING=19.5;
export const CLEAR_DELAY=3;

export const GOLD={
 mathquest:{start:180,warChest:80,mathBreaks:false},
 arcade:{start:120,warChest:0,mathBreaks:true,perCorrect:30,questionsPerBreak:3}
};
export const GATE_HP=20,REINFORCED_BONUS=5;

// MathQuest team equipment. Archer and Ballista are always available.
export const EQUIPMENT=[
 {id:'mage-circle',title:'Mage Circle',text:'Unlocks the Mage Tower: violet frost that slows every orc it touches.'},
 {id:'siege-yard',title:'Siege Yard',text:'Unlocks the Catapult: long-range boulders that hit whole crowds.'},
 {id:'war-chest',title:'War Chest',text:'Start the defense with 80 extra gold.'},
 {id:'reinforced-gate',title:'Reinforced Gate',text:'The gate starts with 25 health instead of 20.'}
];
export const EQUIPMENT_IDS=EQUIPMENT.map(e=>e.id);

// The road, from the mountain pass (left) to the gate (right).
export const PATH=[[-24,72],[60,68],[112,84],[130,124],[118,172],[112,222],[138,268],[198,292],[262,282],[306,248],[334,198],[366,160],[420,140],[486,142],[536,166],[574,196],[612,200]];
export const GATE_X=612;
export const SPOTS=[
 {id:'s1',x:58,y:116},{id:'s2',x:178,y:110},{id:'s3',x:70,y:212},{id:'s4',x:176,y:224},{id:'s5',x:214,y:340},
 {id:'s6',x:282,y:194},{id:'s7',x:330,y:304},{id:'s8',x:404,y:94},{id:'s9',x:452,y:200},{id:'s10',x:546,y:250}
];

// Precomputed path geometry.
const segs=[];let total=0;
for(let i=0;i<PATH.length-1;i++){const [ax,ay]=PATH[i],[bx,by]=PATH[i+1],len=Math.hypot(bx-ax,by-ay);segs.push({ax,ay,bx,by,len,start:total});total+=len;}
export const PATH_LENGTH=total;
export function pointAt(d){
 if(d<=0)return {x:PATH[0][0],y:PATH[0][1],dx:1,dy:0};
 for(const s of segs)if(d<=s.start+s.len){const k=(d-s.start)/s.len;return {x:s.ax+(s.bx-s.ax)*k,y:s.ay+(s.by-s.ay)*k,dx:(s.bx-s.ax)/s.len,dy:(s.by-s.ay)/s.len};}
 const s=segs.at(-1);return {x:s.bx,y:s.by,dx:(s.bx-s.ax)/s.len,dy:(s.by-s.ay)/s.len};
}
export function distanceToPath(x,y){
 let best=Infinity;
 for(const s of segs){const vx=s.bx-s.ax,vy=s.by-s.ay,k=Math.max(0,Math.min(1,((x-s.ax)*vx+(y-s.ay)*vy)/(s.len*s.len)));best=Math.min(best,Math.hypot(s.ax+vx*k-x,s.ay+vy*k-y));}
 return best;
}
export const waveTotal=i=>WAVES[i].reduce((n,[,c])=>n+c,0);
export const WAVE_TEXT=[
 'Raiders are coming down the pass.',
 'A larger band of Raiders.',
 'Wolf Riders are fast. Catch them before they slip past.',
 'A Shaman heals the orcs around it. Kill it first.',
 'A pack of Wolf Riders.',
 'A Troll. Arrows barely scratch its armor.',
 'Raiders, Shamans and Wolf Riders together.',
 'Two Trolls lead the charge.',
 'Twelve Wolf Riders and a Shaman.',
 'Three Trolls with Shamans behind them.',
 'The largest warband yet.',
 'The Siege Ram. Stop it before it reaches the gate.'
];
