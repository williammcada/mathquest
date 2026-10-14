// Nightfall Art Direction v1.0.0 §4.5: furniture must never block play.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scenarios,topologies,flood,reached,reachableArea} from './support/reachability.mjs';
import {worldFor,doorRects,solid,seededEnemies} from '../public/games/nightfall/world.js';
import {interiorItems} from '../public/games/nightfall/interiors.js';
import {HAVEN_SWITCHES} from '../public/games/nightfall/false-haven-world.js';
import {createState} from '../public/games/nightfall/simulation.js';

const baseline=JSON.parse(readFileSync(new URL('./fixtures/nightfall-baseline-area.json',import.meta.url),'utf8'));
const withoutFurniture=s=>({...structuredClone({...s,enemies:[]}),seedWithoutFurniture:true});

function targets(s){
  const w=worldFor(s),list=[];
  for(const t of w.TASKS)list.push([`task ${t.id}`,t]);
  for(const p of w.PICKUPS)list.push([`pickup ${p.id}`,p]);
  if(s.scenario==='false-haven')for(const q of HAVEN_SWITCHES)list.push([`switch ${q.id}`,q]);
  for(const p of w.WINDOWS){list.push([`window ${p.id} outside`,{x:p.x<=w.BUILDINGS.find(b=>b.id===p.room).x?p.x-24:p.x+p.w+24,y:p.y+p.h/2}]);list.push([`window ${p.id} inside`,{x:p.x<=w.BUILDINGS.find(b=>b.id===p.room).x?p.x+p.w+24:p.x-24,y:p.y+p.h/2}]);}
  for(const d of doorRects(s)){list.push([`door ${d.id} outside`,{x:d.x+d.w/2,y:d.y+d.h+24}]);list.push([`door ${d.id} inside`,{x:d.x+d.w/2,y:d.y-24}]);}
  for(const e of s.enemies)list.push([`enemy home ${e.id}`,{x:e.homeX??e.x,y:e.homeY??e.y}]);
  return list;
}

for(const {id,make} of scenarios()){
  test(`${id}: furniture removes no reachable door, window, task, pickup, switch or spawn`,()=>{
    for(const [label,s] of topologies(id,make)){
      const before=flood(withoutFurniture(s),{x:s.x,y:s.y}),after=flood(s);
      assert.ok(!after.startBlocked,`${id}/${label}: start position is blocked`);
      for(const [name,p] of targets(s))if(reached(before,p))assert.ok(reached(after,p),`${id}/${label}: ${name} became unreachable`);
    }
  });
  test(`${id}: reachable floor area stays at least 97% of the pre-furniture baseline`,()=>{
    for(const [label,s] of topologies(id,make)){
      const area=reachableArea(flood(s)),base=baseline[id][label];
      assert.ok(area>=base*.97,`${id}/${label}: ${area} < 97% of ${base}`);
    }
  });
}

const zone=(x,y,w,h)=>({x,y,w,h});
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const hitCircle=(r,p,rad)=>{const nx=Math.max(r.x,Math.min(p.x,r.x+r.w)),ny=Math.max(r.y,Math.min(p.y,r.y+r.h));return (p.x-nx)**2+(p.y-ny)**2<rad*rad;};
for(const s of [createState([],'clinic',1),{...createState([],'clinic',1),scenario:'rescue',route:'clinic'},{...createState([],'clinic',1),scenario:'rescue',route:'depot'},createState([],'clinic',1,'false-haven')]){
  const name=s.scenario==='rescue'?`rescue-${s.route}`:s.scenario||'city';
  test(`${name}: every furniture piece hugs a wall, stays ≤48 px deep and outside keep-out zones`,()=>{
    const w=worldFor(s),solids=interiorItems(s).filter(i=>i.solid);
    assert.ok(solids.length>0,'room furniture present');
    for(const f of solids){
      const b=w.BUILDINGS.find(b=>f.x>=b.x+16&&f.y>=b.y+16&&f.x+f.w<=b.x+b.w-16&&f.y+f.h<=b.y+b.h-16);
      assert.ok(b,`${f.x},${f.y} must sit inside a room interior`);
      const gaps=[[f.x-(b.x+16),f.w],[f.y-(b.y+16),f.h],[(b.x+b.w-16)-(f.x+f.w),f.w],[(b.y+b.h-16)-(f.y+f.h),f.h]];
      assert.ok(gaps.some(([gap,depth])=>gap<=8&&depth<=48),`${b.id} ${f.x},${f.y}: must be flush to a wall and at most 48 px deep`);
      const door=doorRects(s).find(d=>d.id===b.id);
      if(door)assert.ok(!hit(f,zone(door.x,b.y+b.h-16-112,80,112)),`${b.id} ${f.x},${f.y}: blocks the door approach`);
      for(const p of w.WINDOWS.filter(p=>p.room===b.id))assert.ok(!hit(f,zone(p.x===b.x?b.x+16:p.x-64,p.y,64,p.h)),`${b.id} ${f.x},${f.y}: blocks window ${p.id}`);
      for(const t of w.TASKS)assert.ok(!hitCircle(f,t,['survivor','recruit'].includes(t.id)?64:48),`${b.id} ${f.x},${f.y}: crowds task ${t.id}`);
      for(const p of w.PICKUPS)assert.ok(!hitCircle(f,p,48),`${b.id} ${f.x},${f.y}: crowds pickup ${p.id}`);
      if(s.scenario==='false-haven')for(const q of HAVEN_SWITCHES)assert.ok(!hitCircle(f,q,48),`${f.x},${f.y}: crowds switch ${q.id}`);
    }
    for(const a of solids)for(const b of solids){if(a===b)continue;
      const xo=a.x<b.x+b.w&&a.x+a.w>b.x,yo=a.y<b.y+b.h&&a.y+a.h>b.y;
      assert.ok(!(xo&&yo),`furniture overlaps at ${a.x},${a.y}`);
      const gap=xo?Math.max(b.y-(a.y+a.h),a.y-(b.y+b.h)):yo?Math.max(b.x-(a.x+a.w),a.x-(b.x+b.w)):Infinity;
      if(gap!==Infinity)assert.ok(gap<=2||gap>=48,`corridor of ${gap} px between furniture at ${a.x},${a.y} and ${b.x},${b.y}`);
    }
  });
}

test('every seeded Chapter 1 enemy spawns in free space for every threat level',()=>{
  for(const threat of [0,1,2]){const s=createState([],'clinic',threat);for(const e of seededEnemies(threat))assert.equal(solid(s,e.x,e.y,10),false,`${e.id} at ${e.x},${e.y}`);}
});
