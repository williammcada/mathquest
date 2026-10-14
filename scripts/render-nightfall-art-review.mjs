import {createRequire} from 'node:module';
// Usage: CANVAS_MODULE=<dir containing @napi-rs/canvas> node scripts/render-nightfall-art-review.mjs <outDir>
const require=createRequire(process.env.CANVAS_MODULE?process.env.CANVAS_MODULE.replace(/\/?$/,'/'):import.meta.url);
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const R=new URL('../public/',import.meta.url).pathname;
const {render,MEDIA}=await import(R+'games/nightfall/renderer.js?v=0.9.8');
const {createState,completeTask}=await import(R+'games/nightfall/simulation.js?v=0.9.8');
const {createRescue}=await import(R+'games/nightfall/rescue.js?v=0.9.8');
const OUT=process.argv[2];
async function art(tiles){const a={};for(const k of ['actors','tiles','props','interactables','furniture','decals','roofs','machinery'])a[k]=await loadImage(R+(k==='tiles'&&tiles?tiles:MEDIA[k]).replace('./',''));return a;}
const cityArt=await art(),havenArt=await art('assets/false-haven/tiles-v3.webp');
const shots=[];
const add=(name,s,a,x,y,setup)=>shots.push({name,s,a,x,y,setup});
const fh=()=>createState([],'clinic',1,'false-haven');
add('fh-shelter-inside',fh(),havenArt,540,520);
add('fh-shelter-outside',fh(),havenArt,560,880);
add('fh-inspection-lane',fh(),havenArt,2000,900,s=>{s.time=5;s.haven.speakerUntil=10;});
add('fh-inspection-trap-closed',fh(),havenArt,2000,900,s=>{s.haven.trapClosed=true;s.doorRevision++;});
add('fh-utility-yard',fh(),havenArt,1780,640,s=>{s.tasks.generator_online=true;});
add('fh-flood',fh(),havenArt,2560,1200,s=>{s.tasks.generator_online=s.tasks.power_pump=true;s.haven.drainStarted=0;s.time=3;});
add('fh-drained-barrier',fh(),havenArt,2620,1500,s=>{for(const t of ['generator_online','power_pump','passage_drained'])s.tasks[t]=true;});
add('fh-barrier-released',fh(),havenArt,2620,1640,s=>{for(const t of ['generator_online','power_pump','passage_drained','service_shortcut','power_depot','trolley_parked','depot_shutter','gate_unlocked','barrier_released'])s.tasks[t]=true;s.haven.trolleyProgress=1;s.doorRevision++;});
add('fh-depot',fh(),havenArt,3330,860,s=>{s.tasks.power_depot=true;});
add('fh-booth-inside',fh(),havenArt,3330,600,s=>{for(const t of ['generator_online','power_pump','passage_drained','service_shortcut','power_depot','trolley_parked','depot_shutter'])s.tasks[t]=true;s.haven.trolleyProgress=1;s.doorRevision++;});
add('fh-medical-inside',fh(),havenArt,1250,300);
add('fh-supply-inside',fh(),havenArt,1250,930);
add('fh-canteen-inside',fh(),havenArt,610,1120);
add('fh-arrival',fh(),havenArt,700,1660);
const city=()=>createState([],'clinic',1);
add('city-overview',city(),cityArt,1200,560);
add('city-store-inside',city(),cityArt,1620,320);
add('city-maintenance-inside',city(),cityArt,430,300);
add('city-dispatch-inside',city(),cityArt,1050,300);
add('city-garage-inside',city(),cityArt,2150,850,s=>{s.tasks.power=true;s.doorRevision++;});
add('city-garage-locked',city(),cityArt,2150,1150);
add('city-substation-inside',city(),cityArt,440,950);
add('city-closed-door',city(),cityArt,1100,560,s=>{s.doors.dispatch.closed=true;s.doors.dispatch.hp=55;});
add('rescue-clinic-inside',createRescue('clinic'),cityArt,1800,300);
add('rescue-depot-inside',createRescue('depot'),cityArt,1800,300);
add('rescue-street',createRescue('clinic'),cityArt,1168,560);
for(const {name,s,a,x,y,setup} of shots){setup?.(s);s.x=x;s.y=y;s.enemies=s.enemies.filter(e=>Math.hypot(e.x-x,e.y-y)<260).slice(0,3);
 const cv=createCanvas(1280,720),c=cv.getContext('2d');c.scale(2,2);
 // Render twice so the roof fade state settles for the current position.
 render(c,s,a,{map:false,reducedMotion:true});c.setTransform(1,0,0,1,0,0);c.scale(2,2);render(c,s,a,{map:false,reducedMotion:true});
 const fs=await import('node:fs');fs.writeFileSync(`${OUT}/${name}.png`,await cv.encode('png'));}
console.log('rendered',shots.length);
