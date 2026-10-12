// Shared flood-fill helpers for Nightfall reachability and collision-safety tests.
// The player can always open ordinary doors, so doors are treated as passable;
// every other solid (walls, gates, fences, props, furniture) blocks movement.
import {createState} from '../../public/games/nightfall/simulation.js';
import {createRescue} from '../../public/games/nightfall/rescue.js';
import {collisionGeometry,solidInGeometry,worldFor} from '../../public/games/nightfall/world.js';

export const STEP=8;
export const PLAYER_RADIUS=10;

export function scenarios(){
  return [
    {id:'rescue-clinic',make:()=>createRescue('clinic')},
    {id:'rescue-depot',make:()=>createRescue('depot')},
    {id:'city',make:()=>createState([],'clinic',1)},
    {id:'false-haven',make:()=>createState([],'clinic',1,'false-haven')},
  ];
}

// Topology variants each game can actually reach during play.
export function topologies(id,make){
  const all=s=>{const w=worldFor(s);s.windows=Object.fromEntries(w.WINDOWS.map(p=>[p.id,true]));return s;};
  if(id.startsWith('rescue'))return [['start',make()],['windows broken',all(make())]];
  if(id==='city'){
    const powered=s=>{s.tasks.fuse=true;s.tasks.power=true;return s;};
    return [['start',make()],['windows broken',all(make())],['power restored',powered(make())],['power + windows',all(powered(make()))]];
  }
  const order=['generator_online','power_pump','passage_drained','service_shortcut','power_depot','trolley_parked','depot_shutter','gate_unlocked','barrier_released'];
  const upTo=n=>{const s=make();for(const t of order.slice(0,n))s.tasks[t]=true;if(n>=6)s.haven.trolleyProgress=1;s.doorRevision++;return s;};
  const list=[['start',make()]];
  for(let n=1;n<=order.length;n++)list.push([order[n-1],upTo(n)]);
  const trap=upTo(order.length);trap.haven.trapClosed=true;trap.doorRevision++;list.push(['trap closed',trap]);
  list.push(['all + windows broken',all(upTo(order.length))]);
  return list;
}

export function flood(s,start={x:s.x,y:s.y}){
  const g=collisionGeometry(s),W=g.world,C=Math.ceil(W.width/STEP),R=Math.ceil(W.height/STEP);
  const seen=new Uint8Array(C*R),queue=[];
  const free=(cx,cy)=>!solidInGeometry(g,cx*STEP+STEP/2,cy*STEP+STEP/2,PLAYER_RADIUS,true);
  const sx=Math.floor(start.x/STEP),sy=Math.floor(start.y/STEP);
  if(!free(sx,sy))return {seen,C,R,count:0,startBlocked:true};
  seen[sy*C+sx]=1;queue.push(sy*C+sx);
  for(let i=0;i<queue.length;i++){
    const n=queue[i],x=n%C,y=(n-x)/C;
    for(const [a,b] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      if(a<0||b<0||a>=C||b>=R)continue;const k=b*C+a;
      if(seen[k]||!free(a,b))continue;seen[k]=1;queue.push(k);
    }
  }
  return {seen,C,R,count:queue.length};
}

// A point counts as reached when any flood cell within `radius` is reached.
export function reached(f,p,radius=40){
  const r=Math.ceil(radius/STEP),cx=Math.floor(p.x/STEP),cy=Math.floor(p.y/STEP);
  for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){
    if(x<0||y<0||x>=f.C||y>=f.R)continue;
    if(f.seen[y*f.C+x]&&Math.hypot((x-cx)*STEP,(y-cy)*STEP)<=radius)return true;
  }
  return false;
}

export const reachableArea=f=>f.count*STEP*STEP;
