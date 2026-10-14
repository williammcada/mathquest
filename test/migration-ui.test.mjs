import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import worker, { QuestSession } from '../src/worker.js';
import { HOSTING } from '../public/hosting-config.js';

const page = 'https://williammcada.github.io/mathquest/';
const origin = new URL(page).origin;
const rooms = new Map();
const env = { SESSIONS: { idFromName: x => x, get(code) {
  if (!rooms.has(code)) {
    const data = new Map();
    rooms.set(code, new QuestSession({ blockConcurrencyWhile: fn => fn(), storage: {
      get: async k => structuredClone(data.get(k)), put: async (k, v) => data.set(k, structuredClone(v))
    } }));
  }
  return rooms.get(code);
} } };
async function drain(until) {
  for (let i = 0; i < 80; i++) { if (until()) return; await new Promise(r => setTimeout(r, 2)); }
  assert.ok(until(), 'UI did not settle');
}
async function mount(href, entry = 'app.js', fail = false, identity = null) {
  const win = new Window({ url: href, settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  const timers = [], alerts = [], requests = [], rectangles = [];
  const code=new URL(href).searchParams.get('session');
  if(identity){win.localStorage.setItem(`mq-device-${code}`,identity);win.localStorage.setItem(`mq-student-${code}`,rooms.get(code).state.students[identity].credential);}
  if(code&&!new URL(href).searchParams.has('student'))win.localStorage.setItem(`mq-teacher-${code}`,rooms.get(code)?.state.teacherKey||'');
  const saved = new Map();
  function set(name, value) { saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { value, writable: true, configurable: true }); }
  for (const name of ['window', 'document', 'location', 'history', 'localStorage', 'Image', 'Audio']) set(name, name === 'window' ? win : win[name]);
  set('matchMedia', win.matchMedia.bind(win));
  set('confirm', () => true); set('alert', x => alerts.push(x));
  set('requestAnimationFrame', () => 1); set('cancelAnimationFrame', () => {});
  set('setInterval', fn => { timers.push(fn); return timers.length; }); set('clearInterval', () => {});
  win.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (_, key) => key === 'fillRect' ? (...args) => rectangles.push(args) : () => {}, set: () => true });
  set('fetch', async (url, init = {}) => {
    requests.push(String(url));
    assert.ok(String(url).startsWith(HOSTING.relayApiBase));
    assert.equal(init.credentials, 'omit');
    if (fail) return new Response('Not Found', { status: 404 });
    return worker.fetch(new Request(url, { ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), origin } }), env);
  });
  if (entry === 'app.js') {
    win.document.body.innerHTML = '<main id="app"></main>';
    const qr = await readFile(new URL('../public/qrcode.js', import.meta.url), 'utf8');
    vm.runInNewContext(qr, { window: win });
  } else {
    const html = await readFile(new URL('../public/connection-test.html', import.meta.url), 'utf8');
    win.document.body.innerHTML = html.slice(html.indexOf('<main>'), html.indexOf('</main>') + 7);
  }
  await import(`../public/${entry}?test=${crypto.randomUUID()}`);
  return { win, timers, alerts, requests, rectangles, async close() {
    await win.happyDOM.abort();
    for (const [name, descriptor] of saved) if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
  } };
}

test('neutral builder requires an explicit cartridge and switches metadata without changing the platform brand',async()=>{
 const ui=await mount(page),doc=ui.win.document;
 try{
  assert.equal(doc.title,'MathQuest 0.12.0');assert.equal(doc.querySelector('#create').disabled,true);assert.equal(doc.querySelector('.hero .mq-mark').textContent,'MQ');assert.equal(doc.querySelector('.game-card'),null);
  for(const [id,title] of [['vault-7','Vault 7'],['nightfall','Nightfall: Last Bus Out'],['','']]){
   const select=doc.querySelector('#cartridge-select');select.value=id;select.dispatchEvent(new ui.win.Event('change'));
   assert.equal(doc.title,'MathQuest 0.12.0');assert.equal(doc.querySelector('.hero .mq-mark').textContent,'MQ');assert.equal(doc.querySelector('#create').disabled,!id);
   if(id)assert.equal(doc.querySelector('.game-card b').textContent,title);else assert.equal(doc.querySelector('.game-card'),null);
  }
 }finally{await ui.close();}
});

test('Nightfall teacher setup accepts the current cartridge revision and creates a session',async()=>{
 const ui=await mount(page);
 try{const select=ui.win.document.querySelector('#cartridge-select');select.value='nightfall';select.dispatchEvent(new ui.win.Event('change'));ui.win.document.querySelector('#create').click();await drain(()=>ui.win.location.search.includes('session='));const code=new URL(ui.win.location.href).searchParams.get('session');assert.equal(rooms.get(code).state.config.cartridgeRevision,'nightfall-city-6');assert.equal(ui.alerts.length,0);}finally{await ui.close();}
});
test('teacher creation opens the GitHub project dashboard; its QR contains the student link', async () => {
  const setup = await mount(page);
  let teacherUrl;
  try {
    const select=setup.win.document.querySelector('#cartridge-select');select.value='vault-7';select.dispatchEvent(new setup.win.Event('change'));
    setup.win.document.querySelector('#create').click();
    await drain(() => setup.win.location.search.includes('session='));
    teacherUrl = setup.win.location.href;
    assert.ok(teacherUrl.startsWith(`${page}?session=`));
    assert.equal(setup.alerts.length, 0);
  } finally { await setup.close(); }
  const teacher = await mount(teacherUrl);
  try {
    await drain(() => teacher.win.document.querySelector('.join-panel .url'));
    const link = teacher.win.document.querySelector('.join-panel .url').textContent;
    assert.ok(link.startsWith(`${page}?session=`)); assert.match(link, /&student=1$/);
    assert.equal(link.includes('teacher='), false);
    assert.equal(teacher.win.document.querySelector('#qr-error').hidden, true);
    assert.ok(teacher.rectangles.length > 100);
  } finally { await teacher.close(); }
});

test('join fields retain focus and text across a GitHub-hosted polling refresh', async () => {
  const response = await worker.fetch(new Request('https://relay/api/sessions', { method: 'POST', body: JSON.stringify({ teamNames: ['One'] }) }), env);
  const created = await response.json();
  const ui = await mount(`${page}?session=${created.code}&student=1`);
  try {
    await drain(() => ui.win.document.querySelector('#pin'));
    const field = ui.win.document.querySelector('#pin');
    field.focus(); field.value = 'ABCD'; field.dispatchEvent(new ui.win.Event('input', { bubbles: true }));
    // Force a state revision while a player is still typing.
    rooms.get(created.code).state.revision += 1;
    await ui.timers[0]();
    assert.equal(ui.win.document.querySelector('#pin'), field);
    assert.equal(ui.win.document.activeElement, field);
    assert.equal(field.value, 'ABCD');
    assert.equal(ui.alerts.length, 0);
  } finally { await ui.close(); }
});

test('Nightfall join starts neutral, resolves while typing, and clears cartridge identity on expiry',async()=>{
 const created=await (await worker.fetch(new Request('https://relay/api/sessions',{method:'POST',body:JSON.stringify({cartridgeId:'nightfall',teamNames:['Crew']})}),env)).json();
 const ui=await mount(`${page}?session=${created.code}&student=1`),doc=ui.win.document;
 try{
  assert.doesNotMatch(doc.body.textContent,/VII|Vault 7/);
  const pin=doc.querySelector('#pin');pin.focus();pin.value='ABCD';
  await ui.timers[0]();
  assert.equal(doc.querySelector('#pin'),pin);assert.equal(pin.value,'ABCD');assert.equal(doc.querySelector('#join').disabled,false);
  assert.equal(doc.querySelector('[data-join-title]').textContent,'Nightfall: Last Bus Out');assert.equal(doc.title,'MathQuest 0.12.0 — Nightfall: Last Bus Out');assert.equal(doc.querySelector('.mq-mark').textContent,'NF');
  ui.win.dispatchEvent(new ui.win.CustomEvent('mq-session-gone',{detail:{code:created.code}}));
  assert.equal(doc.title,'MathQuest 0.12.0');assert.equal(doc.documentElement.dataset.theme,'mathquest');assert.doesNotMatch(doc.body.textContent,/Nightfall|VII|Vault 7/);assert.match(doc.body.textContent,/Session closed/);
 }finally{await ui.close();}
});

test('failed session lookup displays the connection error without a cartridge fallback',async()=>{
 const ui=await mount(`${page}?session=BAD123&student=1`,'app.js',true);
 try{await ui.timers[0]();assert.match(ui.win.document.body.textContent,/HTTP 404/);assert.doesNotMatch(ui.win.document.body.textContent,/Vault 7|VII|Nightfall/);assert.equal(ui.win.document.title,'MathQuest 0.12.0');}finally{await ui.close();}
});

test('connection page completes both checks and exposes the game link only on success', async () => {
  const ui = await mount(`${page}connection-test.html`, 'connection-test.js');
  const count = rooms.size;
  try {
    assert.equal(ui.win.document.querySelector('#open-game').hidden, true);
    ui.win.document.querySelector('#run-test').click();
    await drain(() => !ui.win.document.querySelector('#run-test').disabled);
    assert.equal(ui.win.document.querySelector('#read-status').className, 'pass');
    assert.equal(ui.win.document.querySelector('#write-status').className, 'pass');
    assert.equal(ui.win.document.querySelector('#open-game').hidden, false);
    assert.equal(rooms.size, count);
  } finally { await ui.close(); }
});

test('a missing relay produces an actionable failure and allows another test', async () => {
  const ui = await mount(`${page}connection-test.html`, 'connection-test.js', true);
  try {
    ui.win.document.querySelector('#run-test').click();
    await drain(() => !ui.win.document.querySelector('#run-test').disabled);
    assert.match(ui.win.document.querySelector('#result').textContent, /HTTP 404/);
    assert.equal(ui.win.document.querySelector('#open-game').hidden, true);
    assert.equal(ui.win.document.querySelector('#read-status').className, 'fail');
  } finally { await ui.close(); }
});

test('Nightfall rendered student flow reaches a personalized ending with no legacy market renderer',async()=>{
 const created=await (await worker.fetch(new Request('https://relay/api/sessions',{method:'POST',body:JSON.stringify({cartridgeId:'nightfall',teamNames:['Crew'],gateCount:3,modules:[{source:'custom',title:'Checks',items:[1,2,3].map(i=>({prompt:`Enter one ${i}`,answer_type:'integer',answer:'1'}))}]})}),env)).json();
 const room=rooms.get(created.code),deviceId='nf-ui',studentCredential=crypto.randomUUID();
 const cmd=async(type,extra={})=>room.fetch(new Request('https://room/command',{method:'POST',headers:{authorization:'Bearer '+(extra.teacherKey||studentCredential)},body:JSON.stringify({type,deviceId,commandId:crypto.randomUUID(),...extra})}));
 await cmd('student.join',{alias:'Falcon',teamPin:room.state.teams['team-1'].pin});await cmd('teacher.start',{teacherKey:created.teacherKey});
 const ui=await mount(`${page}?session=${created.code}&student=1`,'app.js',false,deviceId);
 const click=async(selector,until)=>{await drain(()=>ui.win.document.querySelector(selector));ui.win.document.querySelector(selector).click();await drain(until);};
 const has=q=>()=>!!ui.win.document.querySelector(q);
 try{
  await click('[data-action="briefing.ready"]',has('[data-answer-key="1"]'));
  const solve=async()=>{const before=room.state.students[deviceId].itemsCompleted;ui.win.document.querySelector('[data-answer-key="1"]').click();await click('[data-action="math.submit"]',()=>room.state.students[deviceId].itemsCompleted>before);await new Promise(r=>setTimeout(r,10));};
  await solve();await click('[data-exp-vote="clinic"]',()=>room.state.teams['team-1'].votes[deviceId]==='clinic');await drain(()=>!ui.win.document.querySelector('[data-action="choice.resolve"]').disabled);await click('[data-action="choice.resolve"]',has('[data-assist]'));
  ui.win.document.querySelector('[data-assist]').click();await click('[data-start]',has('[data-next]'));
  for(let i=0;i<4;i++)await click('[data-next]',()=>room.state.teams['team-1'].rescue.runs[deviceId].snapshot.assistedStep===i+1);
  await click('[data-continue]',has('[data-next]'));await click('[data-next]',has('[data-answer-key="1"]'));
  await solve();await drain(has('[data-answer-key="1"]'));await solve();await drain(has('[data-equipment]'));
  await click('[data-equipment=vest]',()=>Object.hasOwn(room.state.teams['team-1'].marketSelections,deviceId));await drain(()=>!ui.win.document.querySelector('[data-action="market.ready"]').disabled);await click('[data-action="market.ready"]',()=>room.state.teams['team-1'].marketReady[deviceId]);await drain(()=>!ui.win.document.querySelector('[data-action="market.commit"]').disabled);await click('[data-action="market.commit"]',()=>room.state.teams['team-1'].inventory.length===1);await click('[data-action="market.continue"]',has('[data-assist]'));

  ui.win.document.querySelector('[data-assist]').click();await click('[data-start]',has('[data-safe]'));for(let i=0;i<6;i++)ui.win.document.querySelector('[data-safe]').click();await drain(has('[data-exp-vote="depart"]'));await click('[data-exp-vote="depart"]',()=>room.state.teams['team-1'].finalVotes[deviceId]==='depart');await drain(()=>!ui.win.document.querySelector('[data-action="choice.resolve"]').disabled);await click('[data-action="choice.resolve"]',()=>ui.win.document.body.textContent.includes('personal record'));assert.match(ui.win.document.body.textContent,/The Lights Behind Us/);assert.equal(ui.alerts.length,0);
 }finally{await ui.close();}
});
