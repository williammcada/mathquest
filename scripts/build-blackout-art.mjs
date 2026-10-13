#!/usr/bin/env node
// Blackout Protocol story scenes · polygon art drawn in code by Claude (handbook U-15).
// Deterministic: the same script always writes the same five SVG files. No text in any image.
// Usage: node scripts/build-blackout-art.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
const out = new URL('../public/assets/blackout/', import.meta.url);
mkdirSync(out, { recursive: true });
const W = 960, H = 540;

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const f = (n) => Math.round(n * 10) / 10;
const poly = (pts, fill, extra = '') => `<polygon points="${pts.map(([x, y]) => f(x) + ',' + f(y)).join(' ')}" fill="${fill}"${extra}/>`;

const defs = `<defs>
<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03050c"/><stop offset=".6" stop-color="#0b1430"/><stop offset="1" stop-color="#16204a"/></linearGradient>
<linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a5a"/><stop offset=".45" stop-color="#7a5a8a"/><stop offset=".75" stop-color="#f0a070"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient>
<linearGradient id="interior" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0f1e"/><stop offset="1" stop-color="#1a1428"/></linearGradient>
<radialGradient id="amberglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffcf6a" stop-opacity=".9"/><stop offset=".4" stop-color="#ffb547" stop-opacity=".35"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient>
<radialGradient id="lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2c8"/><stop offset=".35" stop-color="#ffb547"/><stop offset="1" stop-color="#7a3d00"/></radialGradient>
<radialGradient id="cyanglow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#4fe3ff" stop-opacity=".7"/><stop offset="1" stop-color="#4fe3ff" stop-opacity="0"/></radialGradient>
</defs>`;
const svg = (body, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">${defs}${body}</svg>\n`;

function stars(r, n, maxY) { let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * maxY)}" r="${f(r() * 1.4 + .3)}" fill="#c9d6f2" opacity="${f(r() * .6 + .2)}"/>`; return s; }

// A low-poly skyline: faceted buildings, optional lit windows, a harbor crane pair.
function skyline(r, baseY, litChance, opts = {}) {
  let s = '', x = -10;
  const shades = opts.dawn ? ['#2a2440', '#33294a', '#3b2f52'] : ['#0c1324', '#0f182c', '#121c34'];
  while (x < W + 10) {
    const w = 34 + r() * 60, h = 70 + r() * (opts.tall || 190), top = baseY - h, shade = shades[Math.floor(r() * shades.length)];
    const roof = r();
    const pts = roof < .3 ? [[x, baseY], [x, top + 14], [x + w / 2, top], [x + w, top + 14], [x + w, baseY]] : roof < .55 ? [[x, baseY], [x, top], [x + w * .6, top], [x + w, top + 18], [x + w, baseY]] : [[x, baseY], [x, top], [x + w, top], [x + w, baseY]];
    s += poly(pts, shade, ' stroke="#1d2a47" stroke-width="1"');
    s += poly([[x + w * .55, top + 6], [x + w, top + 18], [x + w, baseY], [x + w * .55, baseY]], '#000', ' opacity=".18"');
    for (let wy = top + 14; wy < baseY - 12; wy += 13) for (let wx = x + 6; wx < x + w - 8; wx += 11) {
      const on = r() < litChance;
      if (on || r() < .35) s += `<rect x="${f(wx)}" y="${f(wy)}" width="5" height="6" fill="${on ? (r() < .8 ? '#ffd36a' : '#ffe9b0') : '#162038'}"${on ? '' : ' opacity=".8"'}/>`;
    }
    x += w + 2 + r() * 6;
  }
  return s;
}
function crane(x, baseY, scale, color) {
  const s = scale;
  return poly([[x, baseY], [x + 8 * s, baseY], [x + 6 * s, baseY - 120 * s], [x + 2 * s, baseY - 120 * s]], color) +
    poly([[x - 60 * s, baseY - 118 * s], [x + 70 * s, baseY - 126 * s], [x + 70 * s, baseY - 120 * s], [x - 60 * s, baseY - 112 * s]], color) +
    `<line x1="${f(x + 40 * s)}" y1="${f(baseY - 122 * s)}" x2="${f(x + 40 * s)}" y2="${f(baseY - 70 * s)}" stroke="${color}" stroke-width="${f(1.5 * s)}"/>`;
}
// A faceted adult figure seen from behind or side; jacket color, optional headset.
function figure(x, y, s, jacket, skin, opts = {}) {
  let g = `<g transform="translate(${f(x)},${f(y)}) scale(${s})">`;
  g += poly([[-14, 0], [14, 0], [11, -46], [-11, -46]], '#151a26');                // legs
  g += poly([[-20, -44], [20, -44], [16, -98], [-16, -98]], jacket);                // torso
  g += poly([[0, -44], [20, -44], [16, -98], [0, -98]], '#000', ' opacity=".18"');
  g += poly([[-16, -96], [-26, -60], [-20, -58], [-10, -88]], jacket);              // arm L
  g += poly([[16, -96], [26, -60], [20, -58], [10, -88]], jacket);                  // arm R
  g += `<rect x="-18" y="-70" width="36" height="3" fill="#d8e3ff" opacity=".55"/>`; // reflective trim
  g += poly([[-9, -98], [9, -98], [11, -114], [0, -124], [-11, -114]], skin);       // head
  if (opts.cap) g += poly([[-12, -112], [12, -112], [10, -126], [0, -130], [-10, -126]], opts.cap);
  if (opts.headset) g += `<path d="M-11 -116 Q0 -134 11 -116" stroke="#9fb0cf" stroke-width="2.5" fill="none"/><rect x="9" y="-118" width="5" height="8" fill="#9fb0cf"/>`;
  return g + '</g>';
}

// 1 · cover: Substation 9 roof over the dark city
{
  const r = rng(11);
  let b = `<rect width="${W}" height="${H}" fill="url(#night)"/>` + stars(r, 90, 240);
  b += skyline(r, 400, 0.0);
  b += crane(120, 400, 1, '#121a30') + crane(220, 400, .8, '#101828');
  b += poly([[0, 400], [W, 400], [W, 420], [0, 420]], '#0a1022');
  b += poly([[0, 420], [W, 420], [W, H], [0, H]], '#070b16');
  for (let i = 0; i < 9; i++) b += `<line x1="${f(r() * W)}" y1="${f(425 + r() * 30)}" x2="${f(r() * W + 40)}" y2="${f(425 + r() * 30)}" stroke="#2a3a66" stroke-width="1" opacity=".5"/>`;
  // Substation 9 roof (foreground), glowing work lamps
  b += poly([[540, 540], [540, 455], [960, 440], [960, 540]], '#2a1e14');
  b += poly([[540, 455], [960, 440], [960, 452], [540, 467]], '#4a3420');
  b += `<circle cx="900" cy="410" r="120" fill="url(#amberglow)"/><circle cx="600" cy="430" r="80" fill="url(#amberglow)" opacity=".7"/>`;
  b += poly([[892, 446], [906, 446], [902, 400], [896, 400]], '#3a2a1a') + `<circle cx="899" cy="396" r="7" fill="url(#lamp)"/>`;
  // switch panel and Nadia
  b += poly([[700, 450], [760, 448], [760, 392], [700, 394]], '#3d4a5e') + poly([[704, 400], [756, 398], [756, 420], [704, 422]], '#1a2232');
  for (let i = 0; i < 4; i++) b += `<rect x="${710 + i * 12}" y="404" width="5" height="12" fill="${i < 1 ? '#ffb547' : '#55657f'}"/>`;
  b += figure(800, 452, 1.15, '#1c2e5a', '#5a3a2a');
  for (let i = 0; i < 60; i++) b += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(r() * 1.6 + .4)}" fill="#e8f0ff" opacity="${f(r() * .5 + .2)}"/>`;
  writeFileSync(new URL('cover.svg', out), svg(b, 'The darkened Port Calder skyline seen from the lit roof of Substation 9'));
}

// 2 · radio: the manual switchyard hall
{
  const r = rng(22);
  let b = `<rect width="${W}" height="${H}" fill="url(#interior)"/>`;
  for (let i = 0; i < 4; i++) { const x = 90 + i * 220; b += poly([[x, 40], [x + 120, 40], [x + 120, 230], [x, 230]], '#1b2b4e') + poly([[x + 6, 46], [x + 114, 46], [x + 114, 224], [x + 6, 224]], '#2a4270', ' opacity=".6"'); }
  b += poly([[0, 250], [W, 250], [W, 262], [0, 262]], '#202a40');
  for (let i = 0; i < 6; i++) { const x = 30 + i * 155; b += poly([[x, 262], [x + 120, 262], [x + 120, 420], [x, 420]], '#2e3a52') + poly([[x + 8, 272], [x + 112, 272], [x + 112, 330], [x + 8, 330]], '#141c2c'); for (let k = 0; k < 6; k++) { const on = r() < .5; b += poly([[x + 16 + k * 16, 300], [x + 22 + k * 16, 300], [x + 24 + k * 16, on ? 282 : 318], [x + 18 + k * 16, on ? 282 : 318]], on ? '#c9a24a' : '#7a8296'); } }
  for (let i = 0; i < 5; i++) b += `<path d="M0 ${18 + i * 6} Q480 ${40 + i * 10} 960 ${16 + i * 6}" stroke="#30405e" stroke-width="3" fill="none"/>`;
  b += `<circle cx="300" cy="60" r="160" fill="url(#amberglow)" opacity=".6"/><circle cx="760" cy="80" r="140" fill="url(#amberglow)" opacity=".45"/>`;
  b += poly([[0, 420], [W, 420], [W, H], [0, H]], '#0c111e');
  // dispatch desk with Theo and radio
  b += poly([[520, 470], [900, 470], [880, 430], [540, 430]], '#3a2c22') + poly([[540, 430], [880, 430], [880, 440], [540, 440]], '#4c3a2c');
  b += poly([[600, 430], [680, 430], [680, 398], [600, 398]], '#2a3448') + `<circle cx="618" cy="414" r="6" fill="#4fe3ff"/><circle cx="640" cy="414" r="6" fill="#ffb547"/>`;
  b += poly([[700, 432], [800, 428], [806, 436], [706, 440]], '#d9ccb0') + `<path d="M712 434 L760 431 L790 433" stroke="#4a6a8a" stroke-width="1.5" fill="none"/>`;
  b += poly([[830, 430], [846, 430], [844, 404], [832, 404]], '#7a8a9a');
  b += figure(760, 470, .95, '#3a5a3a', '#c99a6a', { headset: true, cap: '#5a3030' });
  b += figure(330, 500, 1.2, '#1c2e5a', '#5a3a2a');
  b += `<circle cx="300" cy="420" r="22" fill="none" stroke="#c96a2a" stroke-width="7"/>`;
  writeFileSync(new URL('radio.svg', out), svg(b, 'Inside the Substation 9 switchyard: rows of manual switch panels, Theo at the dispatch radio, Nadia carrying cable'));
}

// 3 · market: workbench with the three power-ups
{
  const r = rng(33);
  let b = `<rect width="${W}" height="${H}" fill="#0a0e18"/>`;
  b += poly([[620, 60], [900, 60], [900, 300], [620, 300]], '#16244a') + poly([[630, 70], [890, 70], [890, 290], [630, 290]], 'url(#night)');
  b += `<clipPath id="win"><rect x="630" y="70" width="260" height="220"/></clipPath><g clip-path="url(#win)">${skyline(rng(3), 290, 0, { tall: 120 }).replace(/<polygon/g, '<polygon transform="translate(630,0) scale(.27,1)"').replace(/<rect/g, '<rect transform="translate(630,0) scale(.27,1)"')}</g>`;
  for (let i = 0; i < 30; i++) b += `<circle cx="${f(640 + r() * 240)}" cy="${f(80 + r() * 200)}" r="1.2" fill="#e8f0ff" opacity=".6"/>`;
  b += `<circle cx="420" cy="140" r="260" fill="url(#amberglow)" opacity=".75"/>`;
  b += poly([[400, 0], [440, 0], [436, 110], [404, 110]], '#2a2a30') + poly([[370, 110], [470, 110], [450, 140], [390, 140]], '#3c3a40') + `<ellipse cx="420" cy="142" rx="30" ry="6" fill="#fff2c8"/>`;
  b += poly([[60, 380], [900, 380], [940, 440], [20, 440]], '#5a3e26') + poly([[20, 440], [940, 440], [940, 470], [20, 470]], '#3a2818') + poly([[20, 470], [940, 470], [940, H], [20, H]], '#120d0a');
  // spare fuses box
  b += poly([[150, 384], [300, 384], [300, 330], [150, 330]], '#3a2e24') + poly([[150, 330], [300, 330], [280, 316], [170, 316]], '#4a3a2c');
  for (let i = 0; i < 5; i++) b += poly([[166 + i * 26, 368], [184 + i * 26, 368], [184 + i * 26, 336], [166 + i * 26, 336]], '#cfe6ff', ' opacity=".55"') + `<rect x="${166 + i * 26}" y="336" width="18" height="5" fill="#b08a40"/><rect x="${166 + i * 26}" y="363" width="18" height="5" fill="#b08a40"/>`;
  // grid scanner
  b += poly([[380, 384], [470, 384], [480, 300], [390, 300]], '#2a3040') + poly([[396, 312], [470, 312], [464, 360], [392, 360]], '#082028') + `<rect x="398" y="314" width="68" height="44" fill="url(#cyanglow)"/>`;
  for (let i = 0; i < 3; i++) b += `<line x1="${404 + i * 20}" y1="320" x2="${404 + i * 20}" y2="352" stroke="#4fe3ff" stroke-width="2" opacity=".8"/><line x1="400" y1="${324 + i * 12}" x2="462" y2="${324 + i * 12}" stroke="#4fe3ff" stroke-width="2" opacity=".6"/>`;
  // surge stabilizer
  b += poly([[560, 384], [740, 384], [740, 300], [560, 300]], '#3a4250') + poly([[560, 300], [740, 300], [720, 284], [580, 284]], '#4a5262');
  for (let i = 0; i < 6; i++) b += `<rect x="${574 + i * 26}" y="312" width="14" height="58" fill="#252b36"/>`;
  b += `<path d="M740 350 C 800 350, 790 420, 860 400" stroke="#1a1a1a" stroke-width="10" fill="none"/><circle cx="700" cy="296" r="6" fill="#ffb547"/>`;
  // thermos, gloves, reaching hands
  b += poly([[800, 384], [830, 384], [828, 300], [802, 300]], '#6a7a8a') + poly([[798, 300], [832, 300], [828, 288], [802, 288]], '#3a4a5a');
  b += poly([[300, 470], [330, 420], [360, 418], [370, 430], [350, 470]], '#5a3a2a') + poly([[330, 420], [360, 418], [358, 408], [334, 410]], '#1c2e5a');
  writeFileSync(new URL('market.svg', out), svg(b, 'A workbench under one lamp with spare fuses, a grid scanner and a surge stabilizer'));
}

// 4 · lantern: LANTERN's core
{
  const r = rng(44);
  let b = `<rect width="${W}" height="${H}" fill="#04060c"/>`;
  for (let i = 0; i < 8; i++) { const x = 40 + i * 112; b += poly([[x, 60], [x + 96, 60], [x + 96, 400], [x, 400]], '#0e1424') + poly([[x + 6, 66], [x + 90, 66], [x + 90, 394], [x + 6, 394]], '#121c34', ' opacity=".7"'); for (let k = 0; k < 22; k++) b += `<rect x="${x + 12 + (k % 2) * 40}" y="${76 + Math.floor(k / 2) * 28}" width="32" height="4" fill="${r() < .25 ? '#4fe3ff' : r() < .4 ? '#ffb547' : '#1c2840'}" opacity=".8"/>`; }
  b += `<circle cx="480" cy="230" r="230" fill="url(#amberglow)" opacity=".85"/><circle cx="480" cy="230" r="78" fill="#2a1600"/>`;
  for (let i = 0; i < 12; i++) { const a0 = i / 12 * Math.PI * 2, a1 = (i + 1) / 12 * Math.PI * 2; b += poly([[480, 230], [480 + Math.cos(a0) * 70, 230 + Math.sin(a0) * 70], [480 + Math.cos(a1) * 70, 230 + Math.sin(a1) * 70]], i % 2 ? '#ffb547' : '#ffcf6a', ' opacity=".9"'); }
  b += `<circle cx="480" cy="230" r="34" fill="url(#lamp)"/>`;
  b += poly([[0, 400], [W, 400], [W, H], [0, H]], '#0a0d16');
  b += poly([[380, 400], [580, 400], [700, H], [260, H]], '#ffb547', ' opacity=".12"');
  b += figure(410, 520, 1.05, '#0a0d14', '#0a0d14') + figure(530, 520, 1, '#0a0d14', '#0a0d14', { cap: '#0a0d14' });
  writeFileSync(new URL('lantern.svg', out), svg(b, "LANTERN's core: walls of server racks around one great amber lamp; Nadia and Theo silhouetted below"));
}

// 5 · ending: dawn, the city lit again (neutral across every final choice)
{
  const r = rng(55);
  let b = `<rect width="${W}" height="${H}" fill="url(#dawn)"/>`;
  b += `<circle cx="760" cy="330" r="60" fill="#ffe2a8" opacity=".9"/><circle cx="760" cy="330" r="150" fill="#ffd9a0" opacity=".25"/>`;
  b += skyline(r, 400, 0.55, { dawn: true });
  b += crane(120, 400, 1, '#3a2f52') + crane(220, 400, .8, '#33294a');
  b += `<circle cx="126" cy="278" r="4" fill="#ffd36a"/><circle cx="222" cy="302" r="3" fill="#ffd36a"/>`;
  b += poly([[0, 400], [W, 400], [W, 420], [0, 420]], '#3a3050');
  // bridge with a lit train
  b += poly([[300, 372], [700, 372], [700, 380], [300, 380]], '#2a2440');
  for (let i = 0; i < 9; i++) b += poly([[310 + i * 46, 380], [316 + i * 46, 380], [316 + i * 46, 400], [310 + i * 46, 400]], '#2a2440');
  b += poly([[420, 372], [520, 372], [520, 360], [424, 360]], '#46406a'); for (let i = 0; i < 6; i++) b += `<rect x="${430 + i * 14}" y="363" width="8" height="5" fill="#ffd36a"/>`;
  b += poly([[0, 420], [W, 420], [W, H], [0, H]], '#2a2238');
  for (let i = 0; i < 14; i++) b += `<line x1="${f(r() * W)}" y1="${f(426 + r() * 26)}" x2="${f(r() * W + 60)}" y2="${f(426 + r() * 26)}" stroke="#f0a070" stroke-width="1.2" opacity=".35"/>`;
  b += poly([[560, 540], [560, 470], [960, 456], [960, 540]], '#3a2e2a') + poly([[560, 470], [960, 456], [960, 462], [560, 476]], '#5a4438');
  b += poly([[560, 452], [960, 438], [960, 442], [560, 456]], '#8a7a7a');
  b += figure(700, 470, 1.05, '#1c2e5a', '#5a3a2a') + figure(780, 468, 1, '#3a5a3a', '#c99a6a', { cap: '#5a3030' });
  writeFileSync(new URL('ending.svg', out), svg(b, 'Dawn over Port Calder with lights back on across the city; Nadia and Theo watch from the Substation 9 roof'));
}
console.log('Wrote cover, radio, market, lantern and ending SVG scenes.');
