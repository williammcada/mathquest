// Browser check for Blackout Protocol v0.2.1 (MathQuest 0.10.1): a real classroom session served locally
// (public/ + an in-memory QuestSession behind /api/sessions/BLACK/*), the shared-host change against
// other cartridges' practice pages, the DEV/preview page and the offline review bundle.
// Usage: PLAYWRIGHT_DIR=<dir with node_modules/playwright> [CHROME_PATH=<chromium>] node scripts/check-blackout-browser.mjs [outDir]
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {QuestSession} from '../test/authenticated-session.mjs';
import C from '../public/games/blackout/core.js';
import {BLACKOUT as c} from '../public/cartridges/blackout.js';
const require=createRequire(process.env.PLAYWRIGHT_DIR?join(process.env.PLAYWRIGHT_DIR,'x.js'):import.meta.url),{chromium}=require('playwright');
const root=resolve('public'),out=resolve(process.argv[2]||'docs/releases/blackout-protocol-v0.2.1-browser');await mkdir(out,{recursive:true});
const results=[],errors=[];const check=(name,ok,note='')=>{results.push({name,ok:!!ok,note});};

// ---- in-memory classroom room
const ctx=()=>{const data=new Map();return {storage:{get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),async setAlarm(){},async deleteAlarm(){},async deleteAll(){data.clear();}},blockConcurrencyWhile:fn=>fn()};};
async function call(r,path,body){const res=await r.fetch(new Request('https://test'+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{}));return {...await res.json(),status:res.status};}
const cmd=(r,type,extra={})=>call(r,'/command',{type,commandId:crypto.randomUUID(),...extra});
const r=new QuestSession(ctx());
await call(r,'/init',{code:'BLACK',teacherKey:'teacher',config:{engineVersion:'0.10.1',cartridgeId:c.id,gateCount:3,teamNames:['Night Shift'],modules:[{id:'number.gcf',itemCount:3,band:'beginner'}]}});
const t=r.state.teams['team-1'];for(const id of ['a','b'])await cmd(r,'student.join',{deviceId:id,alias:id==='a'?'Ada':'Ben',teamPin:t.pin});
await cmd(r,'teacher.start',{teacherKey:'teacher'});for(const id of ['a','b'])await cmd(r,'briefing.ready',{deviceId:id});
const lead=()=>r.members(t.id)[t.leadIndex%2].id;
const answerGate=async()=>{for(const s of r.members(t.id))while(!s.gateComplete){await call(r,'/state?deviceId='+s.id);await cmd(r,'math.submit',{deviceId:s.id,answer:s.currentItem.answer});}};
await answerGate();for(const s of r.members(t.id))await cmd(r,'choice.vote',{deviceId:s.id,choice:'hospital'});await cmd(r,'choice.resolve',{deviceId:lead()});
while(t.stage==='gate')await answerGate();
for(const s of r.members(t.id)){await cmd(r,'market.propose',{deviceId:s.id,items:['spare-fuse']});await cmd(r,'market.ready',{deviceId:s.id});}
await cmd(r,'market.commit',{deviceId:lead()});await cmd(r,'market.continue',{deviceId:lead()});
assert.equal(t.stage,'minigame');

// ---- static + API server
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/sessions/BLACK/')){const chunks=[];for await(const ch of req)chunks.push(ch);const body=Buffer.concat(chunks).toString();
  const result=await r.fetch(new Request('https://test'+url.pathname.replace('/api/sessions/BLACK','')+url.search,{method:req.method,headers:Object.fromEntries(Object.entries(req.headers).filter(([k])=>!['host','connection','content-length'].includes(k))),...(body?{body}:{})}));
  res.writeHead(result.status,{'content-type':result.headers.get('content-type')||'application/json'});res.end(await result.text());return;}
 if(url.pathname.startsWith('/api/')){const {default:worker}=await import('../src/worker.js');const result=await worker.fetch(new Request('https://test'+url.pathname+url.search),{});res.writeHead(result.status,{'content-type':'application/json'});res.end(await result.text());return;}
 const p=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!p.startsWith(root))throw Error('bad path');
 const data=await readFile(p);res.writeHead(200,{'content-type':TYPES[extname(p)]||'application/octet-stream'});res.end(data);
}catch(e){res.writeHead(404);res.end(String(e));}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--autoplay-policy=no-user-gesture-required']});
const newPage=async(viewport,touch,init)=>{const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch&&viewport.width<900});if(init)await context.addInitScript(init.fn,init.arg);const p=await context.newPage();p.on('pageerror',e=>errors.push(`${viewport.width}x${viewport.height}: ${e.message}`));return p;};
const studentInit=id=>({fn:({id,cred})=>{localStorage.setItem('mq-device-BLACK',id);localStorage.setItem('mq-student-BLACK',cred);},arg:{id,cred:r.state.students[id].credential}});

// ---- solve helpers (the board is rebuilt in Node from the run seed; taps happen in the browser)
// Map 640×360 game coordinates through the letterboxed canvas (object-fit: contain), as a person would see it.
const toScreen=(box,x,y)=>{const k=Math.min(box.width/640,box.height/360);return [box.x+(box.width-640*k)/2+x*k,box.y+(box.height-360*k)/2+y*k];};
async function tapTile(page,i,n){const box=await page.locator('.nf-screen canvas').boundingBox(),w=336/n,[x,y]=toScreen(box,12+(i%n+.5)*w,12+(Math.floor(i/n)+.5)*w);await page.touchscreen.tap(x,y);}
// Wait until the game's own active clock (HUD) has advanced by `secs` (headless frames are slow).
async function waitGameSeconds(page,secs){const left=async()=>Number((await page.textContent('.nf-hud')).match(/· (\d+)s ·/)?.[1]);const start=await left();await page.waitForFunction(([target])=>{const m=document.querySelector('.nf-hud')?.textContent.match(/· (\d+)s ·/);return m&&Number(m[1])<=target;},[start-Math.ceil(secs)],{timeout:60000});}
// A finger press held ~120 ms on a control (like a real touch), through Chrome's touch input.
async function holdTouch(page,selector){const b=await page.locator(selector).boundingBox(),cdp=await page.context().newCDPSession(page),pt={x:b.x+b.width/2,y:b.y+b.height/2,id:7};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt]});await page.waitForTimeout(120);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
async function solveDistrict(page,d,runId){const b=C.generateBoard(d,runId);for(const i of b.order){const tile=b.tiles[i];if(tile.locked)continue;let k=0;while(k<4&&C.rotMask(tile.base,tile.rot+k)!==tile.sol)k++;for(let j=0;j<k;j++){await tapTile(page,i,b.n);await page.waitForTimeout(30);}}}

try{
 // 1 · teacher dashboard
 const teacher=await newPage({width:1280,height:900},false);if(process.env.DEBUG_NET)teacher.on('response',x=>console.log('NET',x.status(),x.url().replace(base,'')));await teacher.goto(base+'/?session=BLACK&teacher=teacher');await teacher.waitForFunction(()=>/Night Shift/.test(document.body.textContent),null,{timeout:20000}).catch(()=>{});await teacher.waitForTimeout(500);
 const tText=await teacher.textContent('body');check('Teacher dashboard renders Blackout Protocol room',/Blackout Protocol/.test(tText)&&/Night Shift/.test(tText),tText.slice(0,120));
 const panel=await teacher.locator('.cartridge-audio h2').textContent().catch(()=>'');
 const fetched=teacher.waitForResponse(x=>x.url().includes('/assets/blackout/ambient.wav'),{timeout:15000}).then(x=>x.status()).catch(()=>0);
 await teacher.locator('#nf-audio').click();const status=await fetched;
 check('Teacher room soundtrack panel plays the Blackout room music',/Blackout Protocol room soundtrack/.test(panel)&&status>=200&&status<300,JSON.stringify({panel,status}));
 await teacher.screenshot({path:out+'/teacher-dashboard.png',fullPage:true});

 // 2 · student A on iPad landscape: start, blow a fuse, solve three districts with real taps
 const a=await newPage({width:1180,height:820},true,studentInit('a'));await a.goto(base+'/?session=BLACK&student=1');
 await a.locator('.nf-overlay button[data-start]').waitFor({timeout:15000});
 const overlayText=await a.textContent('.nf-overlay');check('Start screen shows the puzzle instructions and controls help',/Restore five districts/.test(overlayText)&&/Tap a tile/.test(overlayText));
 await a.screenshot({path:out+'/student-ipad-start.png'});
 await a.locator('.nf-overlay button[data-start]').click();await a.waitForTimeout(600);
 check('Run started on the server',t.runs.a.status==='active');
 const canvasTouch=await a.evaluate(()=>getComputedStyle(document.querySelector('.nf-screen canvas')).touchAction);check('U-10: canvas touch-action none',canvasTouch==='none',canvasTouch);
 await a.keyboard.press('Enter');await a.waitForTimeout(300);await a.screenshot({path:out+'/student-ipad-fuse.png'});
 await waitGameSeconds(a,2.5); // the 2 s lockout runs on game time
 const runId=t.runs.a.runId;
 for(let d=0;d<3;d++){
  await solveDistrict(a,d,runId);
  if(d===0)await holdTouch(a,'[data-game-key="energize"]');else await a.keyboard.press('Enter');
  await a.waitForTimeout(400);if(d===1)await a.screenshot({path:out+'/student-ipad-lit.png'});
  // Wait for the next district's task line (the interlude runs on game frames, which are slow in headless Chromium).
  await a.waitForFunction(next=>document.querySelector('.mq-objective')?.textContent.includes(next),['Two buildings','Three buildings','Storm tiles'][d],{timeout:30000}).catch(async e=>{await a.screenshot({path:out+`/timeout-d${d}.png`});console.log('OBJECTIVE',await a.textContent('.mq-objective'),'| HUD',await a.textContent('.nf-hud'),'| OVERLAY',await a.textContent('.nf-overlay'));throw e;});await a.waitForTimeout(200);
 }
 await a.screenshot({path:out+'/student-ipad-old-town.png'});
 await a.waitForTimeout(5600);
 const g=t.runs.a.snapshot?.game;
 check('Server accepted progress: 3 districts restored, boards re-checked',g?.restored?.length===3&&C.verifySolved(0,runId,g.solved[0])&&C.verifySolved(2,runId,g.solved[2]),JSON.stringify({restored:g?.restored,seq:t.runs.a.seq}));
 check('Server recorded the blown fuse (Spare Fuse: 4 → 3)',g?.fuses===3&&g?.fusesMax===4,JSON.stringify({fuses:g?.fuses}));
 const fits=await a.evaluate(()=>{const v=[innerWidth,innerHeight],bad=[...document.querySelectorAll('.nf-screen canvas,[data-game-key="energize"],[data-pause]')].filter(e=>{const r=e.getBoundingClientRect();return r.right>v[0]+1||r.bottom>v[1]+1||r.width===0;}).length;return {bad,h:document.documentElement.scrollWidth>innerWidth};});
 check('iPad landscape: board and controls on screen, no sideways scroll',!fits.bad&&!fits.h,JSON.stringify(fits));
 const ctxPrevented=await a.evaluate(()=>{const e=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});document.querySelector('.nf-screen canvas').dispatchEvent(e);return e.defaultPrevented;});await a.waitForTimeout(200);
 check('U-10: a native context menu on the board is suppressed and the run pauses safely',ctxPrevented&&/paused/i.test(await a.textContent('.nf-overlay')));

 // 3 · student B on a phone (landscape) and phone portrait rotate prompt
 const b=await newPage({width:844,height:390},true,studentInit('b'));await b.goto(base+'/?session=BLACK&student=1');await b.locator('.nf-overlay button[data-start]').waitFor({timeout:15000});await b.locator('.nf-overlay button[data-start]').click();await b.waitForTimeout(800);
 const fb=await b.evaluate(()=>({h:document.documentElement.scrollWidth>innerWidth,canvas:document.querySelector('.nf-screen canvas').getBoundingClientRect().width}));check('Phone landscape: board renders, no sideways scroll',!fb.h&&fb.canvas>200,JSON.stringify(fb));
 await b.screenshot({path:out+'/student-phone-landscape.png'});
 // Every tile must be reachable: at each tile centre of the bottom row and right column, the topmost element is the board canvas.
 const covered=await b.evaluate(()=>{const c=document.querySelector('.nf-screen canvas'),r=c.getBoundingClientRect(),k=Math.min(r.width/640,r.height/360),ox=r.left+(r.width-640*k)/2,oy=r.top+(r.height-360*k)/2,n=5,w=336/n,bad=[];
  for(let i=0;i<n;i++)for(const [cx,cy] of [[i,n-1],[n-1,i]]){const x=ox+(12+(cx+.5)*w)*k,y=oy+(12+(cy+.5)*w)*k;if(document.elementFromPoint(x,y)!==c)bad.push(`${cx},${cy}`);}return bad;});
 check('Phone landscape: no control covers any board tile',covered.length===0,covered.join(' '));
 await b.setViewportSize({width:390,height:844});await b.waitForTimeout(400);
 check('Phone portrait: platform rotate prompt shown',await b.locator('.mq-rotate').isVisible());
 await b.setViewportSize({width:844,height:390});

 // 4 · teacher closes the panels; vote in the UI; epilogue and personal record
 await cmd(r,'teacher.advanceFinale',{teacherKey:'teacher',teamId:t.id});check('Teacher closure ends both panels',Object.values(t.runs).every(x=>x.outcome==='teacher_advanced'));
 await a.waitForTimeout(3500);await a.reload();await a.locator('[data-exp-vote]').first().waitFor({timeout:15000});
 check('Finale vote shows the three LANTERN choices',await a.locator('[data-exp-vote]').count()===3);
 await a.screenshot({path:out+'/student-ipad-finale.png',fullPage:true});
 await a.locator('[data-exp-vote="microgrid"]').click();await cmd(r,'choice.vote',{deviceId:'b',choice:'microgrid'});await cmd(r,'choice.resolve',{deviceId:lead()});
 await a.waitForTimeout(3500);await a.reload();await a.waitForTimeout(1500);
 const v=await a.textContent('body');check('Epilogue and personal record shown',/A City of Small Lights/.test(v)&&/Mission control closed your panel/.test(v),v.slice(0,200));
 await a.screenshot({path:out+'/student-ipad-epilogue.png',fullPage:true});

 // 5 · other cartridges' practice pages still run on the shared host (tap hook is opt-in)
 for(const [page,name] of [['blackline-preview.html?dev=action','BLACKLINE'],['practice-false-haven.html','False Haven'],['practice-nightfall.html','Nightfall']]){
  const p=await newPage({width:1280,height:800},false);const before=errors.length;await p.goto(base+'/'+page);await p.waitForTimeout(1500);
  if(page.includes('dev=action'))await p.locator('[data-dev-go]').click();
  const start=p.locator('.nf-overlay button[data-start], button[data-start]').first();
  if(await start.count()){await start.waitFor({timeout:15000});for(let k=0;k<20&&await start.isDisabled();k++)await p.waitForTimeout(500);await start.click();await p.waitForTimeout(1200);}
  check(`${name} practice still starts and runs on the shared host without errors`,errors.length===before&&await p.locator('canvas').count()>0,errors.slice(before).join(' | '));
  await p.context().close();
 }

 // 6 · Blackout DEV playtest (U-13) and story preview
 const dev=await newPage({width:1180,height:820},true);await dev.goto(base+'/blackout-preview.html?dev=action');await dev.waitForTimeout(600);
 check('DEV banner text and version',(await dev.textContent('.mq-dev-banner')).trim()==='DEV PLAYTEST · Blackout Protocol v0.2.1 · no questions, no records');
 check('DEV lists all three power-ups and five districts',await dev.locator('[data-dev-item]').count()===3&&await dev.locator('[data-dev-start] option').count()===5);
 await dev.screenshot({path:out+'/dev-setup.png'});
 for(const box of await dev.locator('[data-dev-item]').all())await box.check();await dev.selectOption('[data-dev-start]','4');await dev.locator('[data-dev-go]').click();await dev.waitForTimeout(600);
 await dev.locator('.nf-overlay button[data-start]').click();await dev.waitForTimeout(500);
 const ds=await dev.evaluate(()=>{const s=window.__BP_PREVIEW.host.s;return {d:s.game.district,f:s.game.fuses,eq:s.game.equipment.length};});
 check('DEV starts at District 5 with all power-ups, banner during play',ds.d===4&&ds.f===4&&ds.eq===3&&await dev.locator('.mq-dev-banner').isVisible(),JSON.stringify(ds));
 const idx=await dev.evaluate(()=>{const g=window.__BP_PREVIEW.host.s.game;return g.board.order.find(i=>!g.board.tiles[i].locked);}),rot0=await dev.evaluate(i=>window.__BP_PREVIEW.host.s.game.board.tiles[i].rot,idx);
 const n=await dev.evaluate(()=>window.__BP_PREVIEW.host.s.game.board.n);const cbox=await dev.locator('.nf-screen canvas').boundingBox(),w=336/n;const [tx,ty]=toScreen(cbox,12+(idx%n+.5)*w,12+(Math.floor(idx/n)+.5)*w);await dev.touchscreen.tap(tx,ty);await dev.waitForTimeout(100);
 check('Touch tap on the canvas turns that tile (GameHost tap hook)',await dev.evaluate(i=>window.__BP_PREVIEW.host.s.game.board.tiles[i].rot,idx)===(rot0+1)%4);
 await dev.evaluate(()=>{const rot=(m,r)=>{for(let i=0;i<((r%4)+4)%4;i++)m=((m<<1)|(m>>3))&15;return m;};const g=window.__BP_PREVIEW.host.s.game;for(const i of g.board.order){const t=g.board.tiles[i];if(t.locked)continue;for(let k=0;k<4&&rot(t.base,t.rot)!==t.sol;k++)g.rotate(i);}g.energize();});
 await dev.waitForTimeout(300);await dev.screenshot({path:out+'/dev-substation-surge.png'});
 check('Surge appears after first Energize at the Substation',await dev.evaluate(()=>window.__BP_PREVIEW.host.s.game.surgeActive));
 const preview=await newPage({width:1280,height:900},false);await preview.goto(base+'/blackout-preview.html');await preview.waitForTimeout(800);
 check('Story preview: briefing with polygon art, Story and instructions panels',await preview.locator('.scene-grid img[src*="blackout/cover.svg"]').count()===1&&/Ninety-Second Protocol/.test(await preview.textContent('body')));
 await preview.screenshot({path:out+'/preview-briefing.png',fullPage:true});
 // 7 · offline review bundle
 const rv=await newPage({width:1180,height:820},false);const before=errors.length;await rv.goto(base+'/reviews/BlackoutProtocol-v0.2.1.html?dev=action');await rv.waitForTimeout(1200);
 check('Offline review bundle opens DEV with no errors',errors.length===before&&await rv.locator('[data-dev-go]').count()===1,errors.slice(before).join(' | '));
}finally{
 check('No page errors overall',errors.length===0,errors.join(' | '));
 await browser.close();server.close();
 const lines=results.map(x=>`${x.ok?'PASS':'FAIL'}  ${x.name}${x.ok||!x.note?'':'  — '+x.note}`);lines.push(`${results.filter(x=>!x.ok).length} failed of ${results.length}`);
 console.log(lines.join('\n'));await writeFile(out+'/browser-check.txt',lines.join('\n')+'\n');
}
