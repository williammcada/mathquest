// Coastal flight v0.4.0 (owner playtest, 13 Oct 2026). The approach is compressed
// from 225 s to 150 s (scroll and enemy speed ×1.5, same distance), so the boss
// gets 150 s instead of 75 s. Each attack is a mixed pattern: several enemy types
// arrive together, and every pattern is followed 2 s later by its mirror image.
const wave=(at,id,kind,xs,shape='line')=>({at,id,kind,xs,shape});
const supply=(at,id,x,pickup,opportunity)=>({at,id,kind:'supply',xs:[x],pickup,opportunity});
// One pattern = several simultaneous groups: [kind, xs, shape].
const pattern=(at,id,...groups)=>groups.map(([kind,xs,shape='line'],i)=>({...wave(at,`${id}${'abcd'[i]}`,kind,xs,shape),pattern:id}));
const V=[275,320,365],LEFT=[65,110,155],RIGHT=[485,530,575],FLANKS=[110,530];
export const MIDPOINT_SECONDS=100,BOSS_SECONDS=150;
const authored=[
 // Opening: fighters with weaving interceptors on the flanks.
 ...pattern(4,'p01',['fighter',V,'v'],['interceptor',FLANKS]),
 ...pattern(10,'p02',['fighter',LEFT,'stagger'],['fighter',RIGHT,'stagger'],['interceptor',[320]]),
 ...pattern(16,'p03',['ship',[530]],['fighter',[110,200],'stagger'],['interceptor',[400]]),
 ...pattern(22,'p04',['interceptor',[160,480]],['fighter',V,'v']),
 supply(26,'supply-spread',320,'spread','SPREAD-1'),
 // Heavy fans with aimed fire crossing them.
 ...pattern(29,'p05',['bomber',[320]],['interceptor',FLANKS],['fighter',[200,440],'stagger']),
 ...pattern(36,'p06',['ship',[110]],['ship',[530]],['fighter',[290,350]]),
 ...pattern(42,'p07',['fighter',RIGHT,'stagger'],['interceptor',[160,320]],['shore',[110]]),
 supply(46,'supply-repair-a',160,'repair','REPAIR-1'),
 ...pattern(49,'p08',['bomber',[180]],['bomber',[460]],['fighter',V,'v']),
 ...pattern(56,'p09',['shore',[530]],['interceptor',[110,320,480]],['fighter',LEFT,'stagger']),
 ...pattern(63,'p10',['fighter',V,'v'],['fighter',LEFT,'stagger'],['ship',[530]]),
 supply(67,'supply-rapid',320,'rapid','RAPID-1'),
 ...pattern(70,'p11',['bomber',[320]],['interceptor',FLANKS],['fighter',RIGHT,'stagger']),
 ...pattern(77,'p12',['interceptor',[110,320,530]],['ship',[110]],['fighter',[230,410]]),
 ...pattern(84,'p13',['shore',[530]],['ship',[110]],['fighter',V,'v'],['interceptor',[400]]),
 ...pattern(91,'p14',['bomber',[200]],['interceptor',[450,560]],['fighter',LEFT,'stagger']),
 {at:MIDPOINT_SECONDS,id:'checkpoint-mid',kind:'checkpoint',checkpoint:MIDPOINT_SECONDS},
 ...pattern(103,'p15',['fighter',V,'v'],['interceptor',FLANKS],['ship',[530]]),
 ...pattern(109,'p16',['ship',[110]],['bomber',[400]],['fighter',[230,560],'stagger']),
 supply(112,'supply-repair-b',320,'repair','REPAIR-2'),
 ...pattern(115,'p17',['interceptor',[110,320,530]],['fighter',LEFT,'stagger'],['fighter',RIGHT,'stagger']),
 ...pattern(121,'p18',['shore',[110]],['shore',[530]],['fighter',V,'v'],['interceptor',[320]]),
 ...pattern(127,'p19',['bomber',[160]],['bomber',[480]],['interceptor',[320]],['fighter',[250,390]]),
 {at:133,id:'coast-exit',kind:'scenery'},
 ...pattern(134,'p20',['fighter',LEFT,'stagger'],['fighter',RIGHT,'stagger'],['interceptor',[220,420]],['ship',[530]]),
 supply(138,'supply-wingman',320,'wingman','WINGMAN-1'),
 ...pattern(140,'p21',['ship',[110]],['interceptor',FLANKS],['fighter',V,'v']),
 {at:146,id:'boss-warning',kind:'warning'},{at:BOSS_SECONDS,id:'checkpoint-boss',kind:'boss',checkpoint:BOSS_SECONDS},
 // Boss escorts across the longer boss section.
 {...wave(163,'escorts-a','fighter',[240,400]),escort:true},supply(175,'supply-repair-c',240,'repair','REPAIR-3'),
 {...wave(195,'escorts-b','fighter',[240,400]),escort:true},
 {...wave(228,'escorts-c','interceptor',[200,440]),escort:true},
 {...wave(262,'escorts-d','fighter',[160,320,480],'v'),escort:true}
];
const mirror=xs=>xs.map(x=>640-x);
const MIRROR_DELAY=2;
export const LEVEL=Object.freeze(authored.flatMap(e=>e.pattern?[e,{...e,at:e.at+MIRROR_DELAY,id:e.id+'-mirror',xs:mirror(e.xs)}]:e.xs&&e.kind!=='supply'?[e,{...e,at:e.at+3,id:e.id+'-reinforcement',xs:mirror(e.xs)}]:[e]).sort((a,b)=>a.at-b.at).map(e=>Object.freeze({...e,tick:e.at*60})));
export const OPPORTUNITIES=Object.freeze(LEVEL.filter(e=>e.opportunity).map(e=>e.opportunity));
export const CHECKPOINTS=Object.freeze([0,MIDPOINT_SECONDS,BOSS_SECONDS]);
export const sceneryAt=seconds=>seconds<50?'ocean':seconds<100?'islands':seconds<133?'harbor':'harbor-mouth';
