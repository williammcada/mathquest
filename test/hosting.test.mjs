import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import worker, { QuestSession } from '../src/worker.js';
import { hostingFor, fetchApi } from '../public/hosting.js';
import { HOSTING } from '../public/hosting-config.js';
import { SceneAssets } from '../public/vault7-assets.js';

const studentCredentials=new Map();
const origin = 'https://williammcada.github.io';
const page = `${origin}/mathquest/`;
const relay = new URL(HOSTING.relayApiBase).origin;
function environment() {
  const rooms = new Map();
  return { rooms, SESSIONS: {
    idFromName: name => name,
    get(name) {
      if (!rooms.has(name)) {
        const data = new Map();
        rooms.set(name, new QuestSession({ blockConcurrencyWhile: fn => fn(), storage: {
          async get(key) { return structuredClone(data.get(key)); },
          async put(key, value) { data.set(key, structuredClone(value)); }
        } }));
      }
      return rooms.get(name);
    }
  } };
}
function request(path, method = 'GET', body, requestOrigin = origin) {
  const query=new URL(path,'https://test/').searchParams,teacher=body?.teacherKey||query.get('teacherKey'),id=body?.deviceId||query.get('deviceId');if(id&&!studentCredentials.has(id))studentCredentials.set(id,crypto.randomUUID());const credential=teacher||(id&&studentCredentials.get(id));
  return new Request(`${relay}/api/${path}`, {
    method, headers: { ...(credential?{authorization:'Bearer '+credential}:{}), ...(requestOrigin ? { origin: requestOrigin } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}
function preflight(path, method = 'POST', headers = 'content-type', requestOrigin = origin) {
  return new Request(`${relay}/api/${path}`, { method: 'OPTIONS', headers: {
    origin: requestOrigin, 'access-control-request-method': method, 'access-control-request-headers': headers
  } });
}
function cors(response) {
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.match(response.headers.get('vary'), /Origin/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-mathquest-version'), '0.10.0-rc.5');
  assert.equal(response.headers.get('access-control-allow-credentials'), null);
}

test('GitHub navigation and QR links preserve the project directory and strip teacher credentials', () => {
  for (const href of [page, `${page}index.html?session=OLD&teacher=PRIVATE#secret`, `${page}?session=OLD&teacher=PRIVATE`]) {
    const hosting = hostingFor(href);
    assert.equal(hosting.sessionLink('ABC123', { student: true, teacherKey: 'PRIVATE' }), `${page}?session=ABC123&student=1`);
    assert.equal(hosting.sessionLink('ABC123', { teacherKey: 'a&b' }), `${page}?session=ABC123&teacher=a%26b`);
    assert.equal(hosting.api('sessions/ABC123/state?deviceId=ipad'), `${relay}/api/sessions/ABC123/state?deviceId=ipad`);
  }
  assert.equal(hostingFor(`${relay}/`).api('catalog'), `${relay}/api/catalog`);
  assert.equal(hostingFor('http://localhost:5173/').api('catalog'), 'http://localhost:5173/api/catalog');
  assert.throws(() => hostingFor(page).api('https://unexpected.test/'));
  assert.throws(() => hostingFor(page, { ...HOSTING, relayApiBase: 'http://insecure.test/api/' }));
});

test('GitHub paths resolve every scene, style, script, soundtrack, and sprite inside the repository', async () => {
  const base = new URL('../public/', import.meta.url);
  const index = await readFile(new URL('index.html', base), 'utf8');
  const references = [...index.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  for (const asset of Object.values(SceneAssets)) {
    references.push(asset.src, ...asset.srcset.split(',').map(s => s.trim().split(' ')[0]));
  }
  for (const sourceName of ['app.js', 'teacher-audio.js', 'stealth.js']) {
    const source = await readFile(new URL(sourceName, base), 'utf8');
    references.push(...[...source.matchAll(/['"](\.\/assets\/[^'"`]+)['"]/g)].map(m => m[1]));
  }
  assert.ok(references.length > 40);
  for (const ref of references) {
    const url = new URL(ref, page);
    assert.ok(url.href.startsWith(page), `Asset escaped the project folder: ${ref}`);
    assert.ok((await stat(new URL(ref.split('?')[0], base))).isFile(), ref);
  }
});

test('JSON preflight succeeds at the relay without touching session storage; other origins and headers fail', async () => {
  const env = environment();
  const ok = await worker.fetch(preflight('sessions'), env);
  assert.equal(ok.status, 204); cors(ok);
  assert.match(ok.headers.get('access-control-allow-methods'), /POST/);
  assert.match(ok.headers.get('access-control-allow-headers'), /content-type/);
  assert.equal(env.rooms.size, 0);
  for (const req of [preflight('sessions', 'DELETE'), preflight('sessions', 'POST', 'x-unapproved-header'), preflight('sessions', 'POST', 'content-type', 'https://williammcada.github.io.attacker.test')]) {
    assert.equal((await worker.fetch(req, env)).status, 403);
  }
  const denied = await worker.fetch(request('sessions', 'POST', {}, 'https://other.github.io'), env);
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
  assert.equal(env.rooms.size, 0);
});

test('cross-origin create, two-player join, launch, answers, polling, and teacher exports retain authorization', async () => {
  const env = environment();
  async function call(path, method = 'GET', body) {
    const response = await worker.fetch(request(path, method, body), env); cors(response); return response;
  }
  const catalog = await (await call('catalog')).json(); assert.equal(catalog.modules.length, 1763); assert.equal(Object.keys(catalog.legacyModules).length, 25); assert.match(catalog.engine.version, /^0\.34\.0/);
  const created = await call('sessions', 'POST', { teamNames: ['Cipher', 'Empty'], gateCount: 3,
    modules: [{ id: 'number.gcf', source: 'preset', band: 'beginner', itemCount: 3 }] });
  assert.equal(created.status, 200);
  const { code, teacherKey } = await created.json();
  const statePath = `sessions/${code}/state`;
  const commandPath = `sessions/${code}/command`;
  const before = await (await call(`${statePath}?teacherKey=${teacherKey}`)).json();
  const teamPin = before.teams[0].pin;
  async function command(type, extra) {
    return call(commandPath, 'POST', { type, commandId: crypto.randomUUID(), ...extra });
  }
  for (const id of ['ipad-a', 'ipad-b']) {
    const joined = await command('student.join', { deviceId: id, alias: id, teamPin });
    assert.equal(joined.status, 200);
  }
  assert.equal((await command('teacher.start', { teacherKey: 'wrong' })).status, 403);
  const launched = await (await command('teacher.start', { teacherKey })).json();
  assert.equal(launched.teams.length, 1); assert.equal(launched.status, 'active');
  for (const id of ['ipad-a', 'ipad-b']) {
    assert.equal((await command('briefing.ready', { deviceId: id })).status, 200);
  }
  for (const id of ['ipad-a', 'ipad-b']) {
    await call(`${statePath}?deviceId=${id}`);
    const answer = env.rooms.get(code).state.students[id].currentItem.answer;
    const result = await (await command('math.submit', { deviceId: id, answer })).json();
    assert.equal(result.feedback.correct, true);
  }
  const student = await (await call(`${statePath}?deviceId=ipad-a`)).json();
  assert.equal(student.teams[0].stage, 'decision');
  assert.equal(JSON.stringify(student).includes(teacherKey), false);
  assert.equal((await call(`sessions/${code}/report?teacherKey=wrong`)).status, 403);
  for (const format of ['report', 'report.csv']) {
    const response = await call(`sessions/${code}/${format}?teacherKey=${teacherKey}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition'), /attachment/);
    assert.match(response.headers.get('access-control-expose-headers'), /Content-Disposition/);
    assert.ok((await response.text()).length > 100);
  }
  const missing = await call('unknown'); assert.equal(missing.status, 404);
});

test('legacy Netlify and no-Origin requests remain compatible; health check never creates a room', async () => {
  const env = environment();
  for (const source of [relay, null]) {
    const response = await worker.fetch(request('catalog', 'GET', null, source), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), source);
  }
  const response = await worker.fetch(request('health', 'POST', { check: 'classroom-connectivity' }), env);
  cors(response); assert.equal((await response.json()).ok, true); assert.equal(env.rooms.size, 0);
});

test('all browser API calls omit cookies and referrers while preserving the command abort signal', async () => {
  const old = globalThis.fetch;
  let observed;
  globalThis.fetch = async (url, init) => { observed = { url, init }; return new Response('{}'); };
  try {
    const controller = new AbortController();
    await fetchApi(`${relay}/api/sessions`, { method: 'POST', signal: controller.signal, body: '{}' });
    assert.equal(observed.init.credentials, 'omit');
    assert.equal(observed.init.referrerPolicy, 'no-referrer');
    assert.equal(observed.init.signal, controller.signal);
    await fetchApi(`${relay}/api/catalog`);
    assert.ok(observed.init.signal instanceof AbortSignal);
  } finally { globalThis.fetch = old; }
});
