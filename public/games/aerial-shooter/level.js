// Five-minute coastal flight v0.3.0. Each combat formation arrives four times:
// original, mirrored +3 s, original +6 s, mirrored +9 s. 128 regular enemies,
// one boss, six supply carriers.
const wave=(at,id,kind,xs,shape='line')=>({at,id,kind,xs,shape});
const supply=(at,id,x,pickup,opportunity)=>({at,id,kind:'supply',xs:[x],pickup,opportunity});
export const MIDPOINT_SECONDS=150,BOSS_SECONDS=225;
const authored=[
 wave(7,'f01','fighter',[275,320,365],'v'),wave(22,'f02','fighter',[65,110,155],'stagger'),
 wave(35,'f03','fighter',[485,530,575],'stagger'),supply(42,'supply-spread',320,'spread','SPREAD-1'),
 wave(52,'i01','interceptor',[110,530]),wave(65,'f04','fighter',[275,320,365],'v'),
 supply(75,'supply-repair-a',160,'repair','REPAIR-1'),wave(83,'t01','ship',[530]),wave(95,'t02','ship',[110]),
 supply(108,'supply-rapid',320,'rapid','RAPID-1'),wave(118,'b01','bomber',[320]),wave(128,'f05','fighter',[110,530]),
 wave(140,'i02','interceptor',[110,530]),{at:MIDPOINT_SECONDS,id:'checkpoint-mid',kind:'checkpoint',checkpoint:MIDPOINT_SECONDS},
 wave(155,'t03','shore',[110]),supply(167,'supply-repair-b',320,'repair','REPAIR-2'),
 wave(175,'i03','interceptor',[160,480]),wave(187,'t04','shore',[530]),wave(193,'f06','fighter',[275,320,365],'v'),
 {at:200,id:'coast-exit',kind:'scenery'},supply(208,'supply-wingman',320,'wingman','WINGMAN-1'),
 {at:220,id:'boss-warning',kind:'warning'},{at:BOSS_SECONDS,id:'checkpoint-boss',kind:'boss',checkpoint:BOSS_SECONDS},
 {...wave(238,'escorts-a','fighter',[240,400]),escort:true},supply(250,'supply-repair-c',240,'repair','REPAIR-3'),
 {...wave(272,'escorts-b','fighter',[240,400]),escort:true}
];
const mirror=xs=>xs.map(x=>640-x);
export const LEVEL=Object.freeze(authored.flatMap(e=>e.xs&&e.kind!=='supply'?[e,{...e,at:e.at+3,id:e.id+'-reinforcement',xs:mirror(e.xs)},{...e,at:e.at+6,id:e.id+'-second'},{...e,at:e.at+9,id:e.id+'-second-reinforcement',xs:mirror(e.xs)}]:[e]).sort((a,b)=>a.at-b.at).map(e=>Object.freeze({...e,tick:e.at*60})));
export const OPPORTUNITIES=Object.freeze(LEVEL.filter(e=>e.opportunity).map(e=>e.opportunity));
export const CHECKPOINTS=Object.freeze([0,MIDPOINT_SECONDS,BOSS_SECONDS]);
export const sceneryAt=seconds=>seconds<75?'ocean':seconds<150?'islands':seconds<200?'harbor':'harbor-mouth';
