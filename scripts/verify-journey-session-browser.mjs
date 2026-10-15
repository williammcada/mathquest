// Local browser integration harness. Uses production BrawlRun and JourneyHost,
// with in-memory Durable Object storage and a Node ws bridge, NOT Cloudflare.
// JOURNEY_CHROMIUM=/path/chromium JOURNEY_WS_PACKAGE=/path/ws/index.js node scripts/verify-journey-browser.mjs
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import worker,{QuestSession} from '../src/worker.js';
import {BrawlRun} from '../src/cartridges/journey/durable-object.js';

const wsModule=await import(pathToFileURL(process.env.JOURNEY_WS_PACKAGE));
const WebSocketServer=wsModule.WebSocketServer || wsModule.default.WebSocketServer || wsModule.default.Server;
const rooms=new Map(),runs=new Map();
function context(){const data=new Map();return {storage:{get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),deleteAll:async()=>data.clear(),setAlarm:async()=>{},deleteAlarm:async()=>{}},blockConcurrencyWhile:fn=>fn(),waitUntil:p=>p.catch(()=>{}),getWebSockets:()=>[]};}
const env={SESSIONS:{idFromName:x=>x,get:id=>{if(!rooms.has(id))rooms.set(id,new QuestSession(context(),env));return rooms.get(id);}},BRAWLS:{idFromName:x=>x,get:id=>{if(!runs.has(id))runs.set(id,new BrawlRun(context(),env));return runs.get(id);}}};
let port;const root=path.resolve('public');
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,`http://127.0.0.1:${port}`);
 if(url.pathname.startsWith('/api/')){const chunks=[];for await(const c of req)chunks.push(c);const result=await worker.fetch(new Request(url,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})}),env);res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;}
 const file=path.resolve(root,'.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+'/'))throw Error('path');const body=await fs.readFile(file);res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.mp3':'audio/mpeg','.wav':'audio/wav'})[path.extname(file)]||'application/octet-stream');res.end(body);
 }catch(e){res.statusCode=404;res.end(e.message);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;env.COMBAT_PUBLIC_BASE=`http://127.0.0.1:${port}`;env.CORS_ALLOWED_ORIGINS=env.COMBAT_PUBLIC_BASE;
const wss=new WebSocketServer({server});wss.on('connection',(socket,req)=>{const id=req.url.match(/combat\/([^/]+)\/ws/)?.[1],run=runs.get(id);if(!run)return socket.close();socket.serializeAttachment=a=>socket.attachment=a;socket.on('message',m=>run.webSocketMessage(socket,m.toString()));socket.on('close',()=>run.webSocketClose(socket));});
const creation=await fetch(env.COMBAT_PUBLIC_BASE+'/api/sessions',{method:'POST',headers:{'content-type':'application/json','x-mathquest-teacher':process.env.MQ_TEACHER_PASSCODE||''},body:JSON.stringify({cartridgeId:'journey-west',teamNames:['Travelers'],gateCount:3,modules:[{id:'number.gcf',source:'preset',band:'beginner',itemCount:3}]})});assert.equal(creation.status,200);const credentials=await creation.json(),room=rooms.get(credentials.code);
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'journey-browser-'));
const chrome=spawn(process.env.JOURNEY_CHROMIUM,['--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+profile],{stdio:['ignore','ignore','pipe']});
let diagnostic='';const endpoint=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Chromium startup timeout: '+diagnostic)),15000);chrome.stderr.on('data',b=>{diagnostic+=b;const m=diagnostic.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}});chrome.on('error',reject);});
const browser=new WebSocket(endpoint);await new Promise((r,j)=>{browser.onopen=r;browser.onerror=j;});
let sequence=0;const pending=new Map(),errors=[];
browser.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(Error(JSON.stringify(m.error))):p?.resolve(m.result);}else if(m.method==='Page.javascriptDialogOpening'){call('Page.handleJavaScriptDialog',{accept:m.params.type==='confirm'&&m.params.message.startsWith('Launch the briefing')},m.sessionId);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
function call(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});browser.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});}
async function evaluate(sessionId,expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function until(fn,label){const limit=Date.now()+10000;while(Date.now()<limit){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout: '+label);}
const clients=[];
async function page(url){const {browserContextId}=await call('Target.createBrowserContext');const {targetId}=await call('Target.createTarget',{url:'about:blank',browserContextId});const {sessionId:s}=await call('Target.attachToTarget',{targetId,flatten:true});clients.push(s);await call('Runtime.enable',{},s);await call('Page.enable',{},s);await call('Emulation.setFocusEmulationEnabled',{enabled:true},s);await call('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true},s);await call('Page.navigate',{url},s);return s;}
async function click(s,selector){await until(()=>evaluate(s,`Boolean(document.querySelector(${JSON.stringify(selector)})&&!document.querySelector(${JSON.stringify(selector)}).disabled)`),selector);await evaluate(s,`document.querySelector(${JSON.stringify(selector)}).click()`);}
try{
 const teacher=await page(env.COMBAT_PUBLIC_BASE+`/?session=${credentials.code}&teacher=${credentials.teacherKey}`);
 const students=[];
 for(let i=0;i<2;i++){const s=await page(env.COMBAT_PUBLIC_BASE+`/?session=${credentials.code}&student=1`);students.push(s);await until(()=>evaluate(s,"Boolean(document.querySelector('#pin'))"),'join');await evaluate(s,`document.querySelector('#pin').value=${JSON.stringify(room.state.teams['team-1'].pin)}`);await click(s,'#join');await until(()=>Promise.resolve(Object.keys(room.state.students).length===i+1),'joined');}
 const ids=Object.keys(room.state.students);await click(teacher,'[data-teacher-command="start"]');
 for(const s of students)await click(s,'[data-action="briefing.ready"]');
 for(let gate=0;gate<3;gate++)for(let i=0;i<2;i++){
  const s=students[i],id=ids[i];await until(()=>evaluate(s,"Boolean(document.querySelector('[data-action=\"math.submit\"]'))"),'math keypad');
  const answer=String(room.state.students[id].currentItem.answer),before=room.state.attempts.length;
  for(const digit of answer)await click(s,`[data-answer-key="${digit}"]`);
  await click(s,'[data-action="math.submit"]');await until(()=>Promise.resolve(room.state.attempts.length>before),'answer recorded');
 }
 await until(()=>Promise.resolve(runs.size===1),'one combat run');const run=[...runs.values()][0];
 for(const s of students)await until(()=>evaluate(s,"Boolean(document.querySelector('.j-heroes'))"),'Journey handoff');
 await until(()=>Promise.resolve(run.sockets.size===2),'authenticated sockets');
 await click(students[0],'.j-extra');await until(()=>evaluate(students[0],"Boolean(document.querySelector('[data-answer-part]'))"),'optional math');
 const item=room.state.students[ids[0]].journeyPrep.current.item;
 await evaluate(students[0],`document.querySelector('[data-answer-part]').value=${JSON.stringify(String(item.answer))}`);await click(students[0],'.j-submit');await until(()=>Promise.resolve(room.state.students[ids[0]].journeyPrep.earned===2),'personal upgrade');
 for(let i=0;i<2;i++){await click(students[i],`[data-hero="${i?'bajie':'wukong'}"]`);await until(()=>Promise.resolve(run.model.player(ids[i]).hero),'hero');await click(students[i],'.j-ready');}
 await until(()=>Promise.resolve(run.model.s.phase==='running'),'all-ready launch');
 await click(teacher,'.j-teacher-controls button:nth-of-type(2)');await until(()=>Promise.resolve(run.model.paused),'teacher team pause');
 await click(teacher,'.j-teacher-controls button:nth-of-type(3)');await until(()=>Promise.resolve(!run.model.paused),'teacher team resume');
 const runId=run.model.s.runId;await call('Page.reload',{},students[0]);await until(()=>Promise.resolve(run.model.player(ids[0]).epoch===2),'reload reconnect');assert.equal(run.model.s.runId,runId);assert.equal(runs.size,1);
 const attempts=room.state.attempts.length,correct=room.state.students[ids[0]].firstAttemptCorrect;
 await click(teacher,'.j-teacher-controls button:nth-of-type(4)');await until(()=>Promise.resolve(Boolean(room.state.teams['team-1'].journeyResult)),'result return');
 assert.equal(room.state.attempts.length,attempts);assert.equal(room.state.students[ids[0]].firstAttemptCorrect,correct);assert.equal(room.report().gameplayEvidence.length,2);
 const report=await fetch(env.COMBAT_PUBLIC_BASE+`/api/sessions/${credentials.code}/report`,{headers:{authorization:'Bearer '+credentials.teacherKey}});assert.equal(report.status,200);assert.equal((await report.json()).gameplayEvidence.length,2);
 await until(()=>evaluate(students[0],"document.querySelector('.j-status')?.textContent.includes('Field record saved')"),'student result');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['HTTP session creation','teacher dashboard and launch','two isolated student browser contexts join with team PIN','six required answers through keypad','single normal-identity combat handoff','optional answer earns personal upgrade','unique hero selection and all-ready start','teacher team pause/resume/end through dashboard','student reload reconnects to same run','two gameplay records with unchanged academic evidence','authenticated JSON report','student terminal record'],limits:['in-memory storage and Node WebSocket upgrade bridge; not Cloudflare workerd','physical devices and school network not run','creation configuration supplied through API; teacher builder not exercised']}));
}catch(e){console.error(JSON.stringify({error:e.message,errors,status:room.state.status,stage:room.state.teams['team-1'].stage,pages:await Promise.all(clients.map(s=>evaluate(s,'document.body.innerText')))}));throw e;}finally{browser.close();chrome.kill();for(const run of runs.values())await run.purge();for(const socket of wss.clients)socket.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));}
