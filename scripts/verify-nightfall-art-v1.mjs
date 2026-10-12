// Nightfall Art Direction v1.0.0 browser verification (Chromium, headless).
// Usage: node scripts/verify-nightfall-art-v1.mjs [publicRoot] [outDir]
// Requires Playwright; set PLAYWRIGHT_MODULE to its directory when not installed locally.
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(process.argv[2]||'public'),out=resolve(process.argv[3]||'docs/releases/evidence/nightfall-art-v1.0.0');
await mkdir(out,{recursive:true});
const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));assert.ok(p.startsWith(root+'/'));res.setHeader('content-type',types[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[],record=(check,status,detail='')=>{results.push({check,status,detail});console.log(status.padEnd(7),check,detail);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function frameStats(page,seconds=3){return page.evaluate(sec=>new Promise(done=>{const t=[];let last=performance.now();const end=last+sec*1000;function f(now){t.push(now-last);last=now;if(now<end)requestAnimationFrame(f);else{t.sort((a,b)=>a-b);done({frames:t.length,median:t[t.length>>1],p95:t[Math.floor(t.length*.95)]});}}requestAnimationFrame(f);}),seconds);}
try{
 // ---------- False Haven ----------
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'practice-false-haven.html');
 assert.match(await page.title(),/v0\.4\.0/);record('False Haven page shows v0.4.0','Passed',await page.title());
 await page.locator('[data-start]').waitFor({timeout:30000});
 const sheets=await page.evaluate(()=>Object.fromEntries(Object.entries(window.falseHaven.art).map(([k,v])=>[k,v.width])));
 for(const k of ['interactables','furniture','decals','roofs','machinery'])assert.ok(sheets[k]>0,`sheet ${k} decoded`);
 record('All five new sprite sheets decode in the browser','Passed',JSON.stringify(sheets));
 await page.locator('[data-start]').click();await sleep(400);
 const s=()=>page.evaluate(()=>{const s=window.falseHaven.s;return {x:s.x,y:s.y,time:s.time,tasks:{...s.tasks},trap:s.haven.trapClosed,outcome:s.outcome,prompt:s.prompt,haven:Object.keys(s.haven)};});
 const put=(x,y,angle=-Math.PI/2)=>page.evaluate(([x,y,a])=>{const s=window.falseHaven.s;s.x=x;s.y=y;s.angle=a;s.checkpoint={x,y};},[x,y,angle]);
 const shot=async name=>{await sleep(450);await page.locator('#game canvas').first().screenshot({path:`${out}/${name}.png`});};
 // Movement through the shelter door and around furniture.
 await put(552,840);await page.keyboard.down('KeyW');await sleep(1600);await page.keyboard.up('KeyW');
 const moved=await s();assert.ok(moved.y<760,`walked into Shelter 04 (y=${moved.y.toFixed(0)})`);record('Player walks through the Shelter 04 door','Passed',`y ${840}→${moved.y.toFixed(0)}`);
 await shot('fh-shelter-live');
 assert.ok(!moved.haven.includes('barricadeA')&&!moved.haven.includes('barricadeB'));
 await put(1472,900);await sleep(300);const old=await s();assert.ok(!/barricade/i.test(old.prompt||''));record('No barricade switch at the former shelter barricade','Passed',old.prompt||'no prompt');
 // Guided machinery route with combat removed: proves furniture/sprites block no interaction.
 await page.evaluate(()=>{window.falseHaven.s.enemies=[];});
 const steps=[['generator_online',1696,600,3.4],['power_pump',1856,600,1.4],['service_shortcut',2720,1460,2],['power_depot',1856,600,1.4],['trolley_parked',3240,960,2.4],['depot_shutter',3360,930,2.4],['gate_unlocked',3328,580,3.4],['barrier_released',2720,1530,2.4]];
 for(const [id,x,y,hold] of steps){
  if(id==='service_shortcut'){await page.waitForFunction(()=>window.falseHaven.s.tasks.passage_drained,null,{timeout:12000});await shot('fh-passage-drained');}
  if(id==='depot_shutter')await page.waitForFunction(()=>window.falseHaven.s.tasks.trolley_parked,null,{timeout:8000});
  await put(x,y);await sleep(150);await page.keyboard.down('KeyE');await sleep(hold*1000);await page.keyboard.up('KeyE');await sleep(200);
  const st=await s();assert.ok(st.tasks[id]||id==='trolley_parked',`${id} completed (prompt: ${st.prompt})`);
  if(id==='generator_online')await shot('fh-generator-on');if(id==='trolley_parked')await shot('fh-trolley');if(id==='barrier_released')await shot('fh-barrier-up');
 }
 record('Every machinery objective completes in order in real time','Passed',steps.map(s=>s[0]).join(' → '));
 // Inspection gate: speaker and trap toggle, refused when occupied.
 await put(2048,1090);await sleep(150);await page.keyboard.press('KeyE');await sleep(300);const trap=await s();assert.equal(trap.trap,true);await shot('fh-trap-closed');
 await page.keyboard.press('KeyE');await sleep(300);assert.equal((await s()).trap,false);record('Inspection gate closes and reopens from its console','Passed');
 await put(1872,920);await sleep(150);await page.keyboard.press('KeyE');await sleep(300);await shot('fh-speaker-active');
 // Pause / reload / resume restores progress.
 await page.keyboard.press('Escape');await sleep(300);const before=await s();
 await page.reload();await page.locator('#resume').click().catch(()=>{});await page.waitForFunction(()=>window.falseHaven?.s,null,{timeout:20000});
 const after=await s();assert.equal(after.tasks.barrier_released,true);assert.ok(Math.abs(after.time-before.time)<1.5);record('Reload resumes the saved run with all progress','Passed',`time ${before.time.toFixed(1)}→${after.time.toFixed(1)}`);
 // Escape at the bus.
 await page.locator('[data-start]').click().catch(()=>{});await sleep(300);await page.evaluate(()=>{window.falseHaven.s.enemies=[];});
 await put(640,1700);await sleep(150);await page.keyboard.down('KeyE');await sleep(2600);await page.keyboard.up('KeyE');await sleep(300);
 assert.equal((await s()).outcome,'success');record('Escape completes at the bus','Passed');
 record('False Haven console and page errors',errors.length?'Failed':'Passed',errors.join(' | ')||'none');
 await page.close();

 // ---------- Frame-time profile in the inspection lane with enemies ----------
 for(const [label,url] of [['candidate',base+'practice-false-haven.html'],...(process.env.BASELINE_BASE?[['baseline v0.3.0',process.env.BASELINE_BASE+'practice-false-haven.html']]:[])]){
  const p=await browser.newPage({viewport:{width:1280,height:800}});await p.goto(url);await p.evaluate(()=>{try{localStorage.clear();}catch{}});await p.reload();
  await p.locator('[data-start]').waitFor({timeout:30000});await p.locator('[data-start]').click();await sleep(300);
  await p.evaluate(()=>{const s=window.falseHaven.s;s.x=1700;s.y=700;s.immune=1e9;});await sleep(800);
  const st=await frameStats(p,4);record(`Frame time (${label}), utility yard/shelter, live enemies`,'Measured',`median ${st.median.toFixed(1)} ms, p95 ${st.p95.toFixed(1)} ms over ${st.frames} frames`);
  results.at(-1).profile=st;await p.close();
 }

 // ---------- Chapter 1: First Response and Last Bus Out ----------
 for(const chapter of ['rescue','city']){
  const p=await browser.newPage({viewport:{width:1280,height:800}}),errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto(base+'practice-nightfall.html');assert.match(await p.title(),/v1\.1\.0/);
  if(chapter==='city')await p.selectOption('#chapter',{index:0}).catch(()=>{});
  const options=await p.locator('#chapter option').evaluateAll(o=>o.map(x=>x.value));
  await p.selectOption('#chapter',chapter==='rescue'?'rescue':options.find(v=>v!=='rescue'));
  await p.locator('[data-start]').waitFor({timeout:30000});await p.locator('[data-start]').click();await sleep(500);
  await p.keyboard.down('KeyW');await sleep(1200);await p.keyboard.up('KeyW');await p.keyboard.down('KeyD');await sleep(500);await p.keyboard.up('KeyD');await p.keyboard.down('KeyW');await sleep(800);await p.keyboard.up('KeyW');
  await sleep(400);await p.locator('#game canvas').first().screenshot({path:`${out}/${chapter}-live.png`});
  record(`${chapter==='rescue'?'First Response':'Last Bus Out'} starts and plays in real time without errors`,errs.length?'Failed':'Passed',errs.join(' | ')||'none');
  await p.close();
 }
}catch(e){record('Verification aborted','Failed',e.stack||String(e));process.exitCode=1;}
finally{await browser.close();server.close();await writeFile(out+'/browser-results.json',JSON.stringify(results,null,2));}
