#!/usr/bin/env node
// Records the "Substation 9" score (public/games/blackout/audio.js) into the two room-music files
// MathQuest's teacher dashboard plays: assets/blackout/ambient.wav and finale.wav (16 kHz mono PCM,
// like the other cartridges). Renders offline in headless Chromium, so the files come from the same
// code students hear. Dev-only tool: needs Playwright and a Chromium build.
// Usage: PLAYWRIGHT_DIR=<dir with node_modules/playwright> [CHROME_PATH=<chromium>] node scripts/build-blackout-audio.mjs
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const root = new URL('../public/', import.meta.url).pathname;
const require = createRequire(process.env.PLAYWRIGHT_DIR ? join(process.env.PLAYWRIGHT_DIR, 'x.js') : import.meta.url);
const { chromium } = require('playwright');
const server = createServer((req, res) => { let body, p = join(root, decodeURIComponent(req.url.split('?')[0])); try { body = req.url === '/' ? '<!doctype html><title>render</title>' : readFileSync(p); } catch { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(body); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage();
await page.goto(base + '/');
const RATE = 16000;
async function render(kind) {
  return page.evaluate(async ({ kind, RATE }) => {
    const A = await import('/games/blackout/audio.js');
    const loopSec = A.LOOP_STEPS * A.STEP_SECONDS, tail = kind === 'finale' ? 3.2 : 0.4, len = Math.ceil((loopSec + tail) * RATE);
    const ctx = new OfflineAudioContext(1, len, RATE);
    const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = kind === 'finale' ? 4200 : 1100;
    const bus = ctx.createGain(); bus.gain.value = kind === 'finale' ? 0.7 : 0.55; filter.connect(bus); bus.connect(master);
    const buf = A.noiseBuffer(ctx);
    for (let s = 0; s < A.LOOP_STEPS; s++) A.scheduleStep(ctx, buf, filter, bus, s, 0.02 + s * A.STEP_SECONDS, kind === 'finale' ? 'play' : 'ambient', kind === 'finale');
    if (kind === 'finale') A.sting(ctx, master, 0.02 + loopSec, true);
    const out = await ctx.startRendering(), d = out.getChannelData(0);
    let peak = 0; for (const v of d) peak = Math.max(peak, Math.abs(v));
    const g = peak > 0 ? 0.89 / peak : 1;
    return Array.from(d, (v) => Math.max(-32768, Math.min(32767, Math.round(v * g * 32767))));
  }, { kind, RATE });
}
function wav(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(RATE, 24); b.writeUInt32LE(RATE * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(v, 44 + i * 2));
  return b;
}
for (const kind of ['ambient', 'finale']) {
  const s = await render(kind);
  writeFileSync(new URL(`../public/assets/blackout/${kind}.wav`, import.meta.url), wav(s));
  console.log(`${kind}.wav ${(s.length / RATE).toFixed(1)} s`);
}
await browser.close(); server.close();
