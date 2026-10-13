import test from 'node:test';import assert from 'node:assert/strict';
import {CARTRIDGES,sceneFor,gateNames} from '../public/cartridges.js';
import {vault7Scene} from '../src/vault7.js';import {journeyScene} from '../src/cartridges/journey/server.js';
import {splitScene} from '../public/review-presentation.js';
const sentences=ps=>ps.flatMap(p=>p.split(/(?<=[.!?])\s+/)).sort();
test('separating every cartridge scene preserves every sentence exactly once',()=>{
 for(const c of CARTRIDGES)for(const count of [3,4,5]){
  const names=c.id==='vault-7'?['Perimeter Power','Biometric Checkpoint','Containment Laboratory','Archive Mainframe','Isolation Core'].slice(0,count):gateNames(c,count);
  for(const stage of ['briefing','gate','decision','market','minigame','finale','victory'])for(const gateIndex of stage==='gate'?Array.from({length:count},(_,i)=>i):[0]){
   const team={stage,gateIndex,route:c.routes?.[0]?.id,finalAction:c.choices?.[0]?.id,runs:{},cipher:{}},crew=[{alias:'Learner'}];
   const scene=c.id==='vault-7'?vault7Scene(team,crew,names):c.id==='journey-west'?journeyScene(team,crew,names):sceneFor(c,team,names,crew);
   if(!scene)continue;const parts=splitScene(scene,stage,c.id);
   assert.deepEqual(sentences([...parts.narrative,...parts.instructions]),sentences([...scene.paragraphs,...(scene.instructions||[])]),`${c.id} ${stage} ${gateIndex}`);
   if(Array.isArray(scene.instructions))assert.deepEqual(parts.instructions,scene.instructions,`${c.id} ${stage}: explicit instructions stay out of the story`);
  }
 }
});
test('explicit instructions remain separate and Blackline classroom procedure leaves the story',()=>{
 assert.deepEqual(splitScene({paragraphs:['The city sleeps.'],instructions:['Press Start.']},'briefing','new-game'),{narrative:['The city sleeps.'],instructions:['Press Start.']});
 const c=CARTRIDGES.find(c=>c.id==='blackline'),scene=sceneFor(c,{stage:'briefing'},gateNames(c,3),[{alias:'Learner'}]),parts=splitScene(scene,'briefing',c.id);
 assert.ok(parts.instructions.some(p=>p.includes('five-minute crew window')));assert.ok(!parts.narrative.some(p=>p.includes('five-minute crew window')));
});
