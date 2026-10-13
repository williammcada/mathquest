// Blackout Protocol audio · "Substation 9" original synthesized score and effects.
// Ported from williammcada/blackout-protocol v0.1.4 (src/game.js), shaped to MathQuest's GameAudio interface.
// Nothing is downloaded; every sound is generated with Web Audio. Silence never blocks play.
const BPM = 96, SPB = 60 / BPM / 4;
const BARS = [[45, 'm'], [45, 'm'], [41, 'M'], [41, 'M'], [38, 'm'], [38, 'm'], [40, 'M'], [40, 'M']];
const TONES = { m: [0, 3, 7], M: [0, 4, 7] };
const ARP = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0, 1];
export const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
export const STEP_SECONDS = SPB;
export const LOOP_STEPS = 16 * BARS.length;

export function voice(ctx, dest, freq, t0, dur, type, vol, opts = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + (opts.attack || 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
}
export function noiseBuffer(ctx) {
  const len = Math.floor(ctx.sampleRate * 0.5), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let seed = 7; for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; d[i] = seed / 1073741823.5 - 1; }
  return buf;
}
export function noiseHit(ctx, buf, dest, t0, dur, vol, hp) {
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = buf; let node = s;
  if (hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.connect(f); node = f; }
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  node.connect(g).connect(dest); s.start(t0); s.stop(t0 + dur + 0.02);
}
// One 16th-note step of the score. mode: 'ambient' | 'play'. `filter` feeds the tonal voices; `bus` the drums.
export function scheduleStep(ctx, buf, filter, bus, step, t, mode, intense) {
  const bar = Math.floor(step / 16) % BARS.length, pos = step % 16;
  const [root, q] = BARS[bar], tones = TONES[q];
  if (pos === 0 && bar % 2 === 0) for (const iv of tones) voice(ctx, filter, hz(root + 24 + iv), t, SPB * 32, 'triangle', 0.035, { attack: 0.6 });
  if (mode === 'play') {
    if (pos % 2 === 0) voice(ctx, filter, hz(root + (pos === 6 || pos === 14 ? 12 : 0)), t, SPB * 1.8, 'sawtooth', 0.05);
    if (pos === 0 || pos === 8 || (intense && pos === 12)) voice(ctx, bus, 110, t, 0.18, 'sine', 0.22, { slideTo: 40 });
    if (pos % 4 === 2 || (intense && pos % 2 === 1)) noiseHit(ctx, buf, bus, t, 0.05, intense ? 0.05 : 0.035, 7000);
    voice(ctx, filter, hz(root + 36 + tones[ARP[pos]]), t, SPB * 1.4, 'square', intense ? 0.028 : 0.02);
  } else if (pos === 0 || pos === 8) voice(ctx, filter, hz(root), t, SPB * 7, 'sine', 0.06, { attack: 0.08 });
}
export function sting(ctx, dest, t, good) {
  const notes = good ? [57, 61, 64, 69, 73] : [45, 48, 51];
  notes.forEach((m, i) => voice(ctx, dest, hz(m + 12), t + i * (good ? 0.12 : 0.22), good ? 1.4 : 1.8, good ? 'triangle' : 'sawtooth', good ? 0.07 : 0.04, { attack: 0.02 }));
}

// MathQuest GameAudio-compatible object: start/toggle/enabled/pause/effect/music/alarm/update/destroy.
export function createBlackoutAudio() {
  let ctx = null, master = null, sfx = null, musicBus = null, filter = null, buf = null, timer = 0, step = 0, next = 0, mode = 'off', intense = false;
  let preference = true; try { preference = globalThis.localStorage?.getItem('mq-sound') !== 'off'; } catch { /* default on */ }
  const level = () => { if (!ctx) return; const t = ctx.currentTime; musicBus.gain.setTargetAtTime(mode === 'off' ? 0 : mode === 'ambient' ? 0.55 : 0.7, t, 0.25); filter.frequency.setTargetAtTime(mode === 'play' ? (intense ? 4200 : 2200) : 1100, t, 0.4); };
  const tick = () => { if (!ctx || mode === 'off' || ctx.state !== 'running') return; if (next < ctx.currentTime) next = ctx.currentTime + 0.05; while (next < ctx.currentTime + 0.15) { scheduleStep(ctx, buf, filter, musicBus, step, next, mode, intense); step++; next += SPB; } };
  const fx = (fn) => { if (!api.enabled || api.paused || !ctx || ctx.state !== 'running') return; try { fn(ctx.currentTime); } catch { /* ignore */ } };
  const api = {
    enabled: false, paused: false, failed: [],
    async start() {
      try {
        ctx ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
        if (!master) {
          master = ctx.createGain(); master.connect(ctx.destination);
          sfx = ctx.createGain(); sfx.connect(master);
          filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1100;
          musicBus = ctx.createGain(); musicBus.gain.value = 0; filter.connect(musicBus); musicBus.connect(master);
          buf = noiseBuffer(ctx);
        }
        await ctx.resume();
        api.enabled = preference; master.gain.value = api.enabled ? 0.9 : 0;
        if (!timer) timer = setInterval(tick, 25);
        if (!api.enabled || api.paused) await ctx.suspend();
      } catch { api.enabled = false; return ['Web Audio unavailable']; }
      return [];
    },
    async toggle() {
      preference = !api.enabled; try { localStorage.setItem('mq-sound', preference ? 'on' : 'off'); } catch { /* ignore */ }
      if (!ctx) { await api.start(); return; }
      api.enabled = preference; master.gain.value = api.enabled ? 0.9 : 0;
      if (api.enabled && !api.paused) await ctx.resume(); else await ctx.suspend();
    },
    pause(value) { api.paused = value; if (!ctx || api.destroyed) return; (value || !api.enabled ? ctx.suspend() : ctx.resume()).catch(() => {}); },
    music(key) { const m = key === 'intense' ? 'play' : key; const want = key === 'intense'; if (m !== mode || want !== intense) { if (m !== mode) { step = 0; next = 0; } mode = m; intense = want; level(); } },
    effect(type) {
      fx((t) => {
        if (type === 'rotate') voice(ctx, sfx, 520, t, 0.05, 'square', 0.035);
        else if (type === 'locked') voice(ctx, sfx, 140, t, 0.08, 'square', 0.05);
        else if (type === 'fuse') { noiseHit(ctx, buf, sfx, t, 0.35, 0.18); voice(ctx, sfx, 90, t, 0.25, 'square', 0.06, { slideTo: 50 }); }
        else if (type === 'districtLit' || type === 'surgeCleared') { voice(ctx, sfx, 110, t, 0.5, 'sawtooth', 0.06, { slideTo: 440 }); [523, 659, 784, 1046].forEach((f, i) => voice(ctx, sfx, f, t + 0.35 + i * 0.09, 0.22, 'sine', 0.07)); }
        else if (type === 'storm') noiseHit(ctx, buf, sfx, t, 0.08, 0.06, 2000);
        else if (type === 'surge') voice(ctx, sfx, 880, t, 0.35, 'sawtooth', 0.05, { slideTo: 220 });
        else if (type === 'scan') voice(ctx, sfx, 660, t, 0.12, 'sine', 0.05, { slideTo: 990 });
        else if (type === 'end-good') sting(ctx, sfx, t, true);
        else if (type === 'end-bad') sting(ctx, sfx, t, false);
      });
    },
    alarm() { /* the score itself intensifies; no separate alarm voice */ },
    destroy() { api.destroyed = true; api.enabled = false; clearInterval(timer); try { ctx?.close(); } catch { /* ignore */ } },
  };
  return api;
}
