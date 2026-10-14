// Blackout Protocol game adapter for MathQuest's shared GameHost · A WILLIAM MCADA PRODUCT
// Rules come from the vendored canonical core (core.js, synced from williammcada/blackout-protocol).
// Snapshot = plain data: {revision, runId, loadout, mode, time, outcome, events, message, messageAt, game: <core Run>}.
import C from './core.js';
import { revisionFor, coreEquipment } from './config.js';
import { createBlackoutAudio } from './audio.js';

export const REVISION = revisionFor(C.VERSION);
const BOARD = { x: 12, y: 12, size: 336 };
const FLASH_MS = 2500;
const TASKS = [
  'Connect the generator to the pump house, then press Energize.',
  'Two buildings. Padlocked tiles are already correct and cannot turn: use them as clues.',
  'Three buildings. The junction tile (J) feeds more than one building.',
  'Storm tiles (dashed border) turn by themselves every few seconds. Watch them before you Energize.',
  'Energize, then hold it: a surge scrambles the red tiles twice. Fix them and Energize before the surge timer ends.',
];
const views = new WeakMap(); // render/animation state per snapshot object; never sent to the server

function view(s) {
  let v = views.get(s);
  if (!v) { v = { board: null, turns: [], last: [], sparks: [], flash: null, scanUntil: 0, scan: new Set(), prev: {}, keyboard: false, cursor: 0 }; views.set(s, v); }
  if (v.board !== s.game.board) { v.board = s.game.board; v.turns = s.game.board.tiles.map((t) => t.rot); v.last = v.turns.slice(); v.cursor = s.game.board.gen; v.sparks = []; v.flash = null; v.scan = new Set(); }
  return v;
}

export function createBlackout(run = {}) {
  const loadout = [...(run.loadout || [])];
  const s = { revision: REVISION, runId: run.runId, loadout, mode: run.mode || 'action', time: 0, outcome: null, events: [], message: '', messageAt: 0, game: null };
  const old = run.snapshot;
  if (old?.revision === REVISION && old.runId === s.runId && JSON.stringify(old.loadout) === JSON.stringify(loadout) && old.game) {
    Object.assign(s, structuredClone(old), { events: [] });
    s.game = C.Run.revive(s.game);
  } else {
    s.game = new C.Run({ seed: run.runId || 'practice', equipment: coreEquipment(loadout), startDistrict: run.startDistrict || 0, mode: 'classroom', skipIntro: true });
    s.game.drainEvents();
  }
  return s;
}

function outcomeOf(g) {
  if (g.outcome === 'success') return 'success';
  if (g.outcome === 'assisted_success') return 'assisted_completed';
  if (g.outcome === 'partial') return 'partial';
  return g.endReason === 'fuses' ? 'lost' : 'timed_out';
}

function say(s, text) { s.message = text; s.messageAt = s.time; }

// Turn core events into effects, sounds and messages.
function absorb(s, now) {
  const g = s.game, v = view(s), out = [];
  for (const e of g.drainEvents()) {
    if (e.type === 'fuse') {
      v.flash = { set: C.powerState(g.board).powered, until: now + FLASH_MS };
      for (const o of e.openEnds) v.sparks.push({ idx: o.idx, bit: o.bit, until: now + FLASH_MS });
      say(s, e.reason === 'surge' ? 'The surge timer ran out. A fuse blew!' : e.fuses > 0 ? 'Not every building is connected. A fuse blew!' : 'The last fuse blew.');
    } else if (e.type === 'guidedMiss') {
      v.flash = { set: C.powerState(g.board).powered, until: now + FLASH_MS };
      say(s, 'Not connected yet. No fuse lost on the guided route.');
    } else if (e.type === 'locked') say(s, 'That tile is locked. It is already correct.');
    else if (e.type === 'scan') { v.scan = new Set(e.cells); v.scanUntil = now + e.ms; say(s, e.cells.length + (e.cells.length === 1 ? ' tile is' : ' tiles are') + ' already correct.'); }
    else if (e.type === 'surge') say(s, 'SURGE! Fix the red tiles and Energize again.');
    else if (e.type === 'surgeCleared') say(s, `Surge ${e.n} of 2 held.`);
    else if (e.type === 'districtLit') say(s, C.DISTRICTS[e.district].name + ': POWER RESTORED');
    if (['rotate', 'locked', 'fuse', 'storm', 'surge', 'surgeCleared', 'scan', 'districtLit'].includes(e.type)) out.push({ type: e.type });
  }
  if (g.status === 'ended' && !s.outcome) {
    s.outcome = outcomeOf(g);
    out.push({ type: ['success', 'assisted_completed'].includes(s.outcome) ? 'end-good' : 'end-bad' });
  }
  return out;
}

export function stepBlackout(s, input = {}, dt = 1 / 60) {
  s.events = [];
  if (s.outcome) return;
  const g = s.game, v = view(s), n = g.board.n;
  const press = (k) => !!input[k] && !v.prev[k];
  if (press('left') || press('right') || press('up') || press('down')) {
    v.keyboard = true;
    const x = v.cursor % n, y = Math.floor(v.cursor / n);
    if (press('left')) v.cursor = y * n + Math.max(0, x - 1);
    if (press('right')) v.cursor = y * n + Math.min(n - 1, x + 1);
    if (press('up')) v.cursor = Math.max(0, y - 1) * n + x;
    if (press('down')) v.cursor = Math.min(n - 1, y + 1) * n + x;
  }
  if (press('rotate')) { v.keyboard = true; g.rotate(v.cursor); }
  if (press('energize')) g.energize();
  if (press('scan')) g.useScanner();
  v.prev = { ...input };
  g.step(dt * 1000);
  s.time = g.elapsedMs / 1000;
  s.events = absorb(s, performance.now());
}

export function tapBlackout(s, x, y) {
  if (s.outcome) return false;
  const g = s.game, n = g.board.n, size = BOARD.size / n;
  const cx = Math.floor((x - BOARD.x) / size), cy = Math.floor((y - BOARD.y) / size);
  if (cx < 0 || cy < 0 || cx >= n || cy >= n) return false;
  const v = view(s);
  v.keyboard = false; v.cursor = cy * n + cx;
  g.rotate(v.cursor);
  return true;
}

// ---------------------------------------------------------------- canvas renderer (neon polygon style)
const COL = { bg: '#060912', tile: '#0d1424', edge: '#19243b', off: '#3a5a6e', on: '#4fe3ff', amber: '#ffb547', gold: '#ffd36a', red: '#ff5a4f', text: '#e8eefb', muted: '#9fb0cf', storm: '#7fa3ff', story: '#a98bff' };
const EDGE = { 1: [0.5, 0], 2: [1, 0.5], 4: [0.5, 1], 8: [0, 0.5] };

function drawTile(ctx, t, x, y, w, angle, powered, v, i, now, g) {
  ctx.save();
  ctx.fillStyle = v.scanUntil > now && v.scan.has(i) ? '#10362a' : t.surge ? (Math.floor(now / 400) % 2 ? '#33131a' : '#1d0d12') : t.locked && !t.anchor ? '#121a2c' : COL.tile;
  ctx.strokeStyle = t.surge ? COL.red : v.scanUntil > now && v.scan.has(i) ? '#3fdc92' : COL.edge;
  ctx.lineWidth = t.surge ? 2.5 : 1;
  ctx.fillRect(x + 1, y + 1, w - 2, w - 2); ctx.strokeRect(x + 1.5, y + 1.5, w - 3, w - 3);
  if (t.storm) { ctx.setLineDash([4, 3]); ctx.strokeStyle = COL.storm; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 3, w - 6, w - 6); ctx.setLineDash([]); }
  // wires in the base orientation, rotated by the animated angle
  ctx.translate(x + w / 2, y + w / 2); ctx.rotate(angle);
  const color = powered ? COL.on : t.kind === 'gen' ? COL.amber : COL.off;
  for (const [lw, alpha] of [[w * 0.22, powered ? 0.35 : 0.16], [w * 0.09, 1]]) {
    ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = lw; ctx.lineCap = 'round';
    for (const bit of [1, 2, 4, 8]) if (t.base & bit) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((EDGE[bit][0] - 0.5) * w, (EDGE[bit][1] - 0.5) * w); ctx.stroke(); }
  }
  ctx.globalAlpha = 1; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, w * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.restore(); ctx.save();
  const cx = x + w / 2, cy = y + w / 2;
  if (t.kind === 'gen') {
    ctx.fillStyle = '#3a2808'; ctx.strokeStyle = COL.amber; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, w * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COL.amber; ctx.beginPath();
    const b = [[.04, -.2], [-.1, .04], [0, .04], [-.05, .22], [.11, -.04], [.01, -.04]];
    b.forEach(([px, py], k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, cx + px * w, cy + py * w)); ctx.closePath(); ctx.fill();
  } else if (t.kind === 'load') {
    ctx.fillStyle = '#1a2236'; ctx.strokeStyle = powered ? COL.gold : '#5d6e92'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - w * .2, cy + w * .24); ctx.lineTo(cx - w * .2, cy - w * .12); ctx.lineTo(cx, cy - w * .27); ctx.lineTo(cx + w * .2, cy - w * .12); ctx.lineTo(cx + w * .2, cy + w * .24); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = powered ? COL.gold : '#24304a';
    for (const [px, py] of [[-.12, -.06], [.04, -.06], [-.12, .08], [.04, .08]]) ctx.fillRect(cx + px * w, cy + py * w, w * .08, w * .09);
  }
  if (t.locked && !t.anchor) { // padlock
    const lx = x + w * .74, ly = y + w * .08, s2 = w * .17;
    ctx.strokeStyle = '#9fb0cf'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(lx + s2 / 2, ly + s2 * .45, s2 * .3, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#9fb0cf'; ctx.fillRect(lx, ly + s2 * .45, s2, s2 * .6);
  }
  if (t.junction) {
    ctx.fillStyle = '#2a1f4a'; ctx.strokeStyle = COL.story; ctx.lineWidth = 1.5; const s2 = w * .26;
    ctx.fillRect(x + 3, y + 3, s2, s2); ctx.strokeRect(x + 3, y + 3, s2, s2);
    ctx.fillStyle = '#e2d8ff'; ctx.font = `800 ${Math.round(s2 * .75)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('J', x + 3 + s2 / 2, y + 3 + s2 / 2 + 1);
  }
  ctx.restore();
}

export function renderBlackout(ctx, s) {
  const g = s.game, b = g.board, n = b.n, w = BOARD.size / n, v = view(s), now = performance.now();
  ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, 640, 360);
  ctx.strokeStyle = '#1a2742'; ctx.lineWidth = 3; ctx.strokeRect(BOARD.x - 3, BOARD.y - 3, BOARD.size + 6, BOARD.size + 6);
  let on = null;
  if (g.guided || g.phase === 'lit' || (g.status === 'ended' && g.outcome?.includes('success'))) on = C.powerState(b).powered;
  else if (v.flash && now < v.flash.until) on = v.flash.set;
  const guide = g.guided && g.phase === 'board' ? g.guidedTarget() : null;
  b.tiles.forEach((t, i) => {
    if (t.rot !== v.last[i]) { v.turns[i] += (t.rot - v.last[i] + 4) % 4; v.last[i] = t.rot; }
    const target = v.turns[i] * Math.PI / 2;
    v.angles ||= []; const cur = v.angles[i] ?? target;
    v.angles[i] = Math.abs(target - cur) < 0.02 ? target : cur + (target - cur) * 0.35;
    const x = BOARD.x + (i % n) * w, y = BOARD.y + Math.floor(i / n) * w;
    drawTile(ctx, t, x, y, w, v.angles[i], !!(on && on.has(i)), v, i, now, g);
    if (guide && guide.action === 'rotate' && guide.idx === i) { ctx.strokeStyle = COL.gold; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, w - 4, w - 4); }
    if (v.keyboard && i === v.cursor) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y + 4, w - 8, w - 8); }
  });
  v.sparks = v.sparks.filter((sp) => now < sp.until);
  for (const sp of v.sparks) {
    const x = BOARD.x + (sp.idx % n) * w + EDGE[sp.bit][0] * w, y = BOARD.y + Math.floor(sp.idx / n) * w + EDGE[sp.bit][1] * w, k = 1 - (sp.until - now) / FLASH_MS;
    ctx.fillStyle = COL.red; ctx.beginPath(); ctx.arc(x, y, 4 + 2 * Math.sin(now / 60), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COL.red; ctx.globalAlpha = Math.max(0, 1 - k); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 6 + k * 16, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // right-hand panel
  const px = 366;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COL.muted; ctx.font = '700 11px system-ui,sans-serif'; ctx.fillText(`DISTRICT ${g.district + 1} OF ${C.DISTRICTS.length}`, px, 30);
  ctx.fillStyle = COL.text; ctx.font = '700 19px system-ui,sans-serif'; ctx.fillText(C.DISTRICTS[g.district].name, px, 54);
  ctx.fillStyle = COL.muted; ctx.font = '700 11px system-ui,sans-serif'; ctx.fillText('CITY GRID', px, 84);
  C.DISTRICTS.forEach((d, k) => { const lit = g.restored.includes(k), x = px + k * 52; ctx.fillStyle = lit ? COL.gold : '#16203a'; ctx.strokeStyle = k === g.district ? COL.on : '#2a3a5a'; ctx.lineWidth = k === g.district ? 2 : 1; ctx.fillRect(x, 92, 44, 30); ctx.strokeRect(x + .5, 92.5, 43, 29); });
  ctx.fillStyle = COL.muted; ctx.fillText('FUSES', px, 146);
  for (let k = 0; k < g.fusesMax; k++) { ctx.fillStyle = k < g.fuses ? COL.amber : 'transparent'; ctx.strokeStyle = k < g.fuses ? COL.amber : '#5a4a35'; ctx.lineWidth = 2; ctx.fillRect(px + k * 22, 154, 14, 24); ctx.strokeRect(px + k * 22 + 1, 155, 12, 22); }
  const rem = Math.max(0, C.RULES.runMs - g.elapsedMs) / 1000;
  ctx.fillStyle = COL.muted; ctx.fillText('TIME', px + 140, 146);
  ctx.fillStyle = rem <= 30 ? COL.red : COL.text; ctx.font = '700 24px system-ui,sans-serif'; const secs = Math.ceil(rem); ctx.fillText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, px + 140, 176);
  if (g.surgeActive) {
    const frac = g.surgeLeftMs / g.surgeWindowMs();
    ctx.fillStyle = COL.red; ctx.font = '800 12px system-ui,sans-serif'; ctx.fillText(`SURGE ${g.surgeDone + 1} OF 2 · ${Math.ceil(g.surgeLeftMs / 1000)}s`, px, 206);
    ctx.fillStyle = '#2a1013'; ctx.fillRect(px, 214, 250, 10); ctx.fillStyle = COL.red; ctx.fillRect(px, 214, 250 * frac, 10);
  }
  if (g.has('scanner')) { ctx.fillStyle = g.scanUsed ? '#5a6a86' : '#3fdc92'; ctx.font = '700 12px system-ui,sans-serif'; ctx.fillText(g.scanUsed ? 'Grid Scanner used this district' : 'Grid Scanner ready (Scanner button / S)', px, 246); }
  if (s.message && s.time - s.messageAt < 4 || g.phase === 'lit') {
    const msg = g.phase === 'lit' ? `${C.DISTRICTS[g.district].name}: POWER RESTORED` : s.message;
    ctx.fillStyle = g.phase === 'lit' ? '#8fffc6' : msg.includes('fuse') || msg.includes('SURGE') ? '#ffd0cc' : COL.gold;
    ctx.font = '700 13px system-ui,sans-serif'; wrap(ctx, msg, px, 276, 262, 17);
  }
  if (g.phase === 'lit') { ctx.fillStyle = 'rgba(11,26,18,.85)'; ctx.fillRect(BOARD.x + 30, BOARD.y + BOARD.size / 2 - 30, BOARD.size - 60, 60); ctx.fillStyle = '#8fffc6'; ctx.font = '900 22px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('POWER RESTORED', BOARD.x + BOARD.size / 2, BOARD.y + BOARD.size / 2 + 8); ctx.textAlign = 'left'; }
}
function wrap(ctx, text, x, y, maxW, lh) {
  let line = '';
  for (const word of text.split(' ')) { const t = line ? line + ' ' + word : word; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = word; } else line = t; }
  if (line) ctx.fillText(line, x, y);
}

// ---------------------------------------------------------------- guided route (GameHost "Assisted route")
// Step-by-step board in the overlay: the next tile glows, power is shown live, misses cost no fuse.
// Storm tiles and surge timers do not run here (the guided route has no clock pressure).
const EDGE_PX = { 1: [50, 0], 2: [100, 50], 4: [50, 100], 8: [0, 50] };
function guidedBoard(g) {
  const b = g.board, n = b.n, on = C.powerState(b).powered, tg = g.guidedTarget();
  let svg = `<svg viewBox="-4 -4 ${n * 100 + 8} ${n * 100 + 8}" style="width:min(100%,330px);display:block;margin:8px auto;touch-action:manipulation" role="grid" aria-label="Guided circuit board">`;
  b.tiles.forEach((t, i) => {
    const x = (i % n) * 100, y = Math.floor(i / n) * 100, m = C.rotMask(t.base, t.rot), lit = on.has(i), target = tg?.action === 'rotate' && tg.idx === i;
    svg += `<g data-tile="${i}" style="cursor:pointer"><rect x="${x + 2}" y="${y + 2}" width="96" height="96" rx="10" fill="${target ? '#3a3010' : t.surge ? '#33131a' : '#0d1424'}" stroke="${target ? '#ffd36a' : t.surge ? '#ff5a4f' : '#19243b'}" stroke-width="${target ? 6 : 2}"/>`;
    for (const bit of [1, 2, 4, 8]) if (m & bit) svg += `<line x1="${x + 50}" y1="${y + 50}" x2="${x + EDGE_PX[bit][0]}" y2="${y + EDGE_PX[bit][1]}" stroke="${lit ? '#4fe3ff' : t.kind === 'gen' ? '#ffb547' : '#3a5a6e'}" stroke-width="10" stroke-linecap="round"/>`;
    if (t.kind === 'gen') svg += `<circle cx="${x + 50}" cy="${y + 50}" r="22" fill="#3a2808" stroke="#ffb547" stroke-width="4"/>`;
    if (t.kind === 'load') svg += `<rect x="${x + 30}" y="${y + 30}" width="40" height="42" rx="3" fill="#1a2236" stroke="${lit ? '#ffd36a' : '#5d6e92'}" stroke-width="4"/>`;
    svg += '</g>';
  });
  return svg + '</svg>';
}
export function assistedBlackout(s, root, progress) {
  const g = s.game;
  if (!g.guided) { g.enableGuided(); g.drainEvents(); }
  const sync = () => { g.elapsedMs = Math.max(g.elapsedMs, Math.round(s.time * 1000)); };
  const settle = () => { if (g.phase === 'lit') g.step(C.RULES.litMs + 1); s.events = absorb(s, performance.now()); progress(); };
  if (s.outcome) { root.innerHTML = '<h2>Guided route complete</h2><p>Every district is lit. A guided finish is recorded separately from an unguided run.</p>'; return; }
  const tg = g.guidedTarget();
  root.innerHTML = `<h2>Guided route · District ${g.district + 1} of ${C.DISTRICTS.length}: ${C.DISTRICTS[g.district].name}</h2>
    <p>${tg?.action === 'energize' ? 'Every wire on the route is in place. Press Energize.' : 'Tap the glowing tile until its wire lines up with the lit wire.'}${g.surgeActive ? ' A surge scrambled the red tiles; the glowing tile shows the next fix.' : ''}</p>
    ${guidedBoard(g)}<p><button data-guided-energize ${tg?.action === 'energize' ? '' : 'disabled'}>⚡ Energize</button></p>`;
  root.querySelectorAll('[data-tile]').forEach((el) => el.addEventListener('click', () => { sync(); g.rotate(+el.dataset.tile); settle(); }));
  root.querySelector('[data-guided-energize]').addEventListener('click', () => { sync(); g.energize(); settle(); });
}

// In short landscape views MathQuest overlays the control bar on the game. A puzzle must not hide any
// part of its board, so on this game's screen the bar is transparent: only the two buttons remain, and
// they sit over the right-hand info panel. Scoped to Blackout; other games are unchanged.
const BOARD_LABEL = 'Circuit board for one city district, with the city grid, fuses and timer beside it';
function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById('blackout-host-style')) return;
  const st = document.createElement('style'); st.id = 'blackout-host-style';
  const scope = `.nf-game:has(canvas[aria-label="${BOARD_LABEL}"])`;
  st.textContent = `${scope} .mq-thumb-controls{background:transparent;justify-content:flex-end}${scope} .mq-thumb-left:empty{display:none}`;
  document.head.append(st);
}

export const blackoutAdapter = {
  id: 'blackout', title: 'Blackout Protocol · Cartridge v0.2.1', revision: REVISION, activeLimitSeconds: 300,
  kitText: 'Standard panel · 3 fuses', hideMap: true,
  latchPresses: true, // a press shorter than one frame still counts once (Energize, Grid Scanner)
  canvasLabel: BOARD_LABEL,
  controlProfile: {
    left: [],
    right: [['energize', '⚡ Energize'], ['scan', 'Grid Scanner']],
    keys: { arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down', ' ': 'rotate', enter: 'energize', s: 'scan' },
    help: 'Tap a tile to turn it a quarter turn (keyboard: arrows move, Space turns). Connect the generator to every building, then press Energize (Enter). A wrong Energize blows a fuse; the last fuse ends your panel. Grid Scanner (S), if your crew earned it: once per district, correct tiles glow. Five active minutes; classroom crew time continues during local pauses.',
  },
  instructions: 'Restore five districts in five minutes. Tap tiles to turn them and connect the generator to every building, then press Energize. Padlocked tiles are already correct. Storm tiles turn by themselves. At the Central Substation, hold the grid through two surges. One classroom run; no restart. The guided route is available separately.',
  resultLabels: { success: 'All five districts restored', partial: 'Part of the city restored', lost: 'Your panel lost every fuse', timed_out: 'Your shift ended', assisted_completed: 'City restored with the guided route', teacher_advanced: 'Mission control closed your panel' },
  resultText: 'Your puzzle result is separate from mathematics. Everyone still votes on what happens to LANTERN.',
  create: createBlackout, step: stepBlackout, tap: tapBlackout, render: renderBlackout, loadArt: async () => { ensureStyle(); return {}; },
  createAudio: createBlackoutAudio,
  music: (s) => (s.game.surgeActive || C.RULES.runMs - s.game.elapsedMs <= 60000 ? 'intense' : 'play'),
  hud: (s) => `FUSES ${s.game.fuses}/${s.game.fusesMax} · DISTRICTS ${s.game.restored.length}/5 · ${Math.max(0, Math.ceil(300 - s.time))}s`,
  objective: (s) => 'Your task: ' + TASKS[s.game.district],
  assisted: assistedBlackout,
};
