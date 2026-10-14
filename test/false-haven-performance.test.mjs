import test from 'node:test';
import assert from 'node:assert/strict';
import {createHaven} from '../public/games/nightfall/false-haven-adapter.js';
import {collisionGeometry,solid} from '../public/games/nightfall/world.js';
import {navigationField,step} from '../public/games/nightfall/simulation.js';
import {FALSE_HAVEN as c,havenScene} from '../public/cartridges/false-haven.js';

test('geometry cache preserves collisions and invalidates restored door/window values',()=>{
 const s=createHaven({runId:'cache'}),g=collisionGeometry(s);
 assert.equal(collisionGeometry(s),g);
 assert.equal(solid(s,544,760),false);
 s.doors.dorm.closed=true;assert.equal(solid(s,544,760),true);
 assert.notEqual(collisionGeometry(s),g);
 s.doors.dorm.hp=0;assert.equal(solid(s,544,760),false);
 assert.equal(solid(s,264,392),true);
 s.windows['dorm-west']=true;assert.equal(solid(s,264,392),false);
 assert.equal(JSON.stringify(s).includes('openSolids'),false);
});
test('water, trolley and the inspection gate invalidate both geometry and navigation fields',()=>{
 const s=createHaven({runId:'topology'}),target={x:2800,y:1152};
 const first=navigationField(s,target);assert.equal(navigationField(s,target),first);
 assert.equal(solid(s,2568,1152),true);s.tasks.passage_drained=true;
 assert.equal(solid(s,2568,1152),false);assert.notEqual(navigationField(s,target),first);
 assert.equal(solid(s,3210,820),true);s.haven.trolleyProgress=1;
 assert.equal(solid(s,3210,820),false);assert.equal(solid(s,3470,820),true);
 // v0.4.0 removed the movable barricades: both former positions are open yard.
 assert.equal(solid(s,1560,940),false);assert.equal(solid(s,1560,812),false);assert.equal(solid(s,2900,1260),false);
 assert.ok(!('barricadeA' in s.haven)&&!('barricadeB' in s.haven));
 const before=collisionGeometry(s);s.haven.trapClosed=true;assert.notEqual(collisionGeometry(s),before);
 assert.equal(solid(s,2160,984),true);
 assert.ok(navigationField(s,{x:-32,y:500}).every(x=>x===Infinity));
});
test('combat and save restoration cannot serialize or reuse another run’s derived geometry',()=>{
 const a=createHaven({runId:'one'});a.x=1872;a.y=864;a.immune=999;
 for(let i=0;i<180;i++)step(a,{fire:i%30===0},1/60);
 const b=createHaven({runId:'one',snapshot:structuredClone(a)});
 assert.notEqual(collisionGeometry(a),collisionGeometry(b));
 assert.equal(b.ammo,a.ammo);assert.equal(b.time,a.time);
 assert.equal(b.enemies.length,a.enemies.length);
});
test('mandatory introduction explains the known breach and authority abandonment with distinct chapter art',()=>{
 const intro=havenScene(c,{stage:'briefing'},c.gates,[{alias:'Alex'}]).paragraphs.join(' ');
 assert.match(intro,/authorities withdrew the guards/);
 assert.match(intro,/diverted the remaining transports/);
 assert.match(intro,/vehicle gate locked/);
 assert.match(intro,/infected are already inside/i);
 const images=['briefing','gate','market','victory'].map(stage=>havenScene(c,{stage,gateIndex:0},c.gates,[]).image);
 assert.equal(new Set(images).size,4);assert.ok(images.every(path=>path.includes('/false-haven/')));
 assert.equal(c.revision,'false-haven-cartridge-0.2.0'); // unchanged session envelope
 assert.equal(c.presentationRevision,'false-haven-0.4.0');assert.equal(c.mapRevision,'false-haven-0.4.0');
});
