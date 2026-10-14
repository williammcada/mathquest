// Room dressing and roofs for Nightfall Art Direction v1.0.0.
// Furniture (solid:true) hugs walls, at most 48 px deep, and stays outside every
// door approach, window, task, pickup and survivor keep-out zone. Decals have no
// collision. Layout is pure data so the server, tests and renderer share it.
const F=(c,x,y,w,h,rot=0)=>({sheet:'furniture',cell:c,x,y,w,h,rot,solid:true});
const P=(c,x,y,w,h,rot=0)=>({sheet:'props',cell:c,x,y,w,h,rot,solid:true}); // existing prop atlas
const D=(c,x,y,w,h,rot=0)=>({sheet:'decals',cell:c,x,y,w,h,rot,solid:false});
// Furniture cells: 0 cot,1 bunk,2 lockers,3 shelving,4 workbench,5 tool rack,6 radio,7 map board,
// 8 canteen table,9 serving counter,10 vending,11 screen,12 med cabinet,13 battery rack,14 cable drum,15 desk.
// Decal cells: 0 rug,1 hazard,2 papers,3 tarp,4 oil,5 puddle,6 boxes,7 blankets,8 trays,9 arrow,10 cross,11 bay line,12 sports gear,13 crack,14 drain,15 litter.
// Prop atlas cells reused: 5 desk, 6 crates, 7 electrical cabinet, 9 hospital bed, 10 ammo case, 15 filing cabinet.

const CITY={
 maintenance:[F(5,248,144,80,36),F(4,456,144,104,48),P(15,244,408,44,52),F(2,576,380,44,80,1),D(4,300,330,64,48),D(1,404,436,104,24)],
 dispatch:[F(6,880,80,104,48),F(7,1160,80,96,40),F(2,1220,256,44,64,1),D(0,940,150,80,56),D(2,1000,140,40,32)],
 store:[F(3,1460,144,96,48),F(3,1704,144,68,48),F(15,1460,444,104,48),P(10,1724,420,48,52),D(12,1500,330,64,56)],
 garage:[F(13,2264,624,96,48),F(5,1920,624,88,36),F(4,1908,940,48,96,3),F(14,2332,988,48,48),D(11,2000,700,72,72),D(4,2080,960,64,48)],
 substation:[P(7,256,784,44,48),P(7,520,784,44,48),F(14,300,784,48,48),D(1,300,1000,96,24)]
};
const RESCUE={
 clinic:[P(9,1660,144,72,48,1),F(11,1880,144,80,48),F(3,1652,412,88,48),F(12,1924,340,40,60,1),D(10,1676,320,48,48),D(7,1880,400,56,48)],
 depot:[F(4,1660,144,96,48),F(5,1880,144,80,36),P(6,1652,412,64,48),F(14,1916,360,48,52),D(4,1660,250,56,44),D(11,1880,380,64,64)]
};
const HAVEN={
 dorm:[F(0,288,272,72,48,1),F(0,360,272,72,48,1),F(0,432,272,72,48,1),F(0,504,272,72,48,1),F(1,576,272,80,48,1),F(1,656,272,80,48,1),
  F(2,772,450,44,88,1),F(0,276,460,48,72),F(0,276,532,48,72),D(0,420,420,96,72),D(7,620,400,56,48),D(6,700,660,56,48)],
 canteen:[F(9,420,976,128,48),F(8,600,976,112,48),F(10,760,976,48,64),F(8,404,1216,112,44),F(8,690,1216,112,44),D(8,520,1080,56,48),D(5,700,1100,64,48)],
 medical:[P(9,1088,144,72,48,1),P(9,1160,144,72,48,1),F(11,1232,144,72,44),F(12,1372,144,48,48),F(15,1076,384,104,48),D(10,1300,340,44,44),D(2,1110,330,48,36)],
 supply:[F(3,1076,784,96,48),F(3,1172,784,96,48),P(10,1340,784,72,48),P(6,1076,1020,64,48),D(3,1120,900,64,56),D(6,1340,1000,56,48)],
 booth:[F(6,3136,368,104,48),F(7,3400,368,96,40),P(5,3124,480,48,64),P(7,3488,456,44,64),D(9,3300,700,80,40),D(2,3180,600,48,36)]
};

// Sign placement where the default (beside the door) collides with machinery or props.
export const SIGN_SIDE={booth:'top',garage:'right'};
export function interiorItems(s){
 if(s?.scenario==='false-haven')return Object.values(HAVEN).flat();
 if(s?.scenario==='rescue')return RESCUE[s.route==='depot'?'depot':'clinic'];
 return Object.values(CITY).flat();
}
export const furnitureSolids=s=>s?.seedWithoutFurniture?[]:interiorItems(s).filter(i=>i.solid).map(({x,y,w,h})=>({x,y,w,h,furniture:true}));

// Roof material and rooftop clutter per building. Positions are fractions of the
// roof so the same recipe works for any footprint.
const ROOF_CLUTTER=[[6,.18,.2,52,44],[7,.7,.25,40,36],[8,.45,.55,60,36],[9,.78,.62,48,56],[10,.25,.7,40,52],[11,.5,.18,72,28],[5,.62,.78,40,40],[14,.12,.48,52,52],[12,.86,.4,52,44],[13,.35,.38,48,40]];
function recipe(id,count){let h=0;for(const ch of id)h=(h*31+ch.charCodeAt(0))>>>0;const out=[];for(let i=0;i<count;i++)out.push(ROOF_CLUTTER[(h+i*3)%ROOF_CLUTTER.length]);return out;}
export function roofFor(s,b,{block=false}={}){
 const haven=s?.scenario==='false-haven';
 // Materials chosen for contrast: light concrete/corrugated against dark asphalt and gravel.
 const material=haven?(b.id==='dorm'||b.id==='canteen'?1:2):block?((b.x+b.y)%3===0?0:2):(b.id==='garage'||b.id==='store'?1:2);
 const count=block?Math.min(8,Math.max(3,Math.round(b.w*b.h/60000))):Math.max(2,Math.min(4,Math.round(b.w*b.h/60000)));
 return {material,clutter:recipe(b.id||`${b.x},${b.y}`,count)};
}
