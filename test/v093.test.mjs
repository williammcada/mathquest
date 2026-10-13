import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {BRAND,cartridgeCard,presentationFor,setBrandContext} from '../public/brand.js';
import {alarmLight,drawCar} from '../public/games/nightfall/hardware.js';
import {PROPS,propBounds} from '../public/games/nightfall/world.js';
import {createState,triggerDistraction,restoreState} from '../public/games/nightfall/simulation.js';
import {hostingFor} from '../public/hosting.js';

test('third cartridge metadata renders without a title-specific branch; unknowns stay neutral',()=>{
 const fixture=[{id:'fixture',title:'Orbital <Lab>',presentation:{emblem:'OL',theme:'orbital',cover:'./fixture.png',coverAlt:'An orbital lab',summary:'Explore a new mission.'}}];
 const doc=new Window().document;
 assert.equal(presentationFor('unknown'),null);
 assert.match(cartridgeCard('unknown'),/Choose a cartridge/);
 assert.doesNotMatch(cartridgeCard('unknown'),/VII|vault7/);
 assert.match(cartridgeCard('fixture',fixture),/Orbital &lt;Lab&gt;/);
 setBrandContext(doc,'fixture',fixture);assert.equal(doc.title,'MathQuest 0.10.1 — Orbital <Lab>');assert.equal(doc.documentElement.dataset.theme,'orbital');
 setBrandContext(doc,'unknown',fixture);assert.equal(doc.title,`${BRAND.name} ${BRAND.version}`);assert.equal(doc.documentElement.dataset.theme,'mathquest');
 setBrandContext(doc,'vault-7');assert.equal(doc.title,'MathQuest 0.10.0 — Vault 7');
 setBrandContext(doc,'nightfall');assert.equal(doc.title,'MathQuest 0.10.0 — Nightfall: Last Bus Out');
 setBrandContext(doc,null);assert.equal(doc.title,'MathQuest 0.10.0');assert.equal(doc.documentElement.dataset.cartridge,'');
});

test('alarm light rendering is read-only, localized and uses persisted ready/active/spent state',()=>{
 const car=PROPS.find(p=>p.id==='wreck1'),ordinary=PROPS.find(p=>p.id==='wreck3'),s=createState();
 const before=structuredClone(s),rects=[];
 const c=new Proxy({fillRect:(...args)=>rects.push(args)},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 drawCar(c,ordinary,s,{width:256,height:256});assert.equal(rects.length,0);assert.equal(alarmLight(ordinary,s),null);
 drawCar(c,car,s,{width:256,height:256});assert.deepEqual(s,before);assert.equal(alarmLight(car,s).state,'ready');assert.equal(alarmLight(car,s).bright,true);
 const b=propBounds(car);for(const [x,y,w,h] of rects){assert.ok(x>=b.x&&x+w<=b.x+b.w&&y>=b.y&&y+h<=b.y+b.h,'beacon lies on the vehicle');}
 s.time=1;assert.equal(alarmLight(car,s).bright,false);assert.equal(alarmLight(car,s,true).bright,true);
 triggerDistraction(s,'alarm');const activeTime=s.time;assert.equal(alarmLight(car,s).state,'active');
 s.time=activeTime+11.99;assert.equal(alarmLight(car,s).state,'active');assert.equal(alarmLight(car,s,true).bright,true);
 s.time=activeTime+12;assert.deepEqual(alarmLight(car,s),{state:'spent',bright:false});
 const restored=restoreState(s);assert.equal(alarmLight(car,restored).state,'spent');assert.equal(triggerDistraction(restored,'alarm'),false);
});

test('root entry shims preserve query and fragment and always select canonical public pages',async()=>{
 for(const file of ['index.html','connection-test.html','dev-extraction.html','practice-nightfall.html']){
   const html=await readFile(new URL('../'+file,import.meta.url),'utf8');
   for(const base of ['Math-Quest---Vault-7-','mathquest']){
    const location=new URL(`https://williammcada.github.io/${base}/${file}?session=TEST&student=1#help`);let target;
    vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{URL,window:{location:{href:location.href,search:location.search,hash:location.hash,replace:url=>target=new URL(url)}}});
    assert.equal(target.search,location.search);assert.equal(target.hash,location.hash);assert.equal(target.pathname,`/${base}/public/${file==='index.html'?'':file}`);
   }
 }
});

test('proposed address profile preserves new-path joins and keeps teacher credentials out of student links',async()=>{
 const profile=JSON.parse(await readFile(new URL('../config/migrations/v093-hosting.proposed.json',import.meta.url),'utf8'));
 const config=profile.hosting;
 for(const path of ['/mathquest/','/mathquest/public/']){
  const h=hostingFor('https://williammcada.github.io'+path+'?teacher=private&session=OLD#old',config);
  assert.equal(h.apiBase,'https://mcada-mathquest.netlify.app/api/');
  const link=new URL(h.sessionLink('NEXT',{student:true,teacherKey:'private'}));assert.equal(link.pathname,path);assert.equal(link.search,'?session=NEXT&student=1');assert.equal(link.hash,'');
 }
 assert.equal(hostingFor('https://mcada-mathquest.netlify.app/public/',config).apiBase,'https://mcada-mathquest.netlify.app/api/');
 assert.equal(profile.workerName,'mathquest-prototype');assert.ok(!profile.allowedOrigins.includes('*'));
});
