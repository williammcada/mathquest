// Owner DEV playtest panel — handbook U-13 (approved 2026-10-13).
// One presentation for every game: banner → power-ups → starting point → Start.
// DEV runs skip all mathematics and create no classroom records.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const DEV_STYLE=`.mq-dev{max-width:760px;margin:24px auto;padding:20px 22px;background:#0f2230;color:#e8f1f4;border:2px solid #f0b44c;border-radius:10px;font:16px/1.5 system-ui,sans-serif}
.mq-dev-banner{margin:-20px -22px 16px;padding:10px 22px;background:#f0b44c;color:#1a1306;font:800 14px/1.3 system-ui,sans-serif;letter-spacing:.04em;border-radius:7px 7px 0 0}
.mq-dev h2{font-size:17px;margin:16px 0 8px}.mq-dev-items{display:grid;gap:8px}
.mq-dev-items label{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;background:#173244;border-radius:6px;cursor:pointer}
.mq-dev-items small{display:block;color:#b9cbd3}.mq-dev select{font:16px system-ui;padding:6px;min-height:40px}
.mq-dev-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.mq-dev-actions button{font:700 16px system-ui;min-height:44px;padding:0 18px;border-radius:6px;border:0;cursor:pointer}
.mq-dev-actions .mq-dev-start{background:#3ad1b4;color:#062019}.mq-dev-note{color:#b9cbd3;font-size:14px}`;
export const devBannerText=(game,version)=>`DEV PLAYTEST · ${game} v${version} · no questions, no records`;
export function devBanner(game,version){return `<div class="mq-dev-banner" role="note">${esc(devBannerText(game,version))}</div>`;}
// items: [{id,title,detail}]; starts: [{id,label}]; story: optional href for the story review.
export function devPanelHtml({game,version,items=[],starts=[],selected=[],start,story}){
  return `<section class="mq-dev" aria-label="DEV playtest setup">${devBanner(game,version)}
  <h2>Power-ups</h2>${items.length?`<div class="mq-dev-items">${items.map(i=>`<label><input type="checkbox" data-dev-item value="${esc(i.id)}" ${selected.includes(i.id)?'checked':''}><span><b>${esc(i.title)}</b>${i.detail?`<small>${esc(i.detail)}</small>`:''}</span></label>`).join('')}</div>`:'<p class="mq-dev-note">This game has no selectable power-ups.</p>'}
  <h2>Starting point</h2>${starts.length>1?`<select data-dev-start aria-label="Starting point">${starts.map(s=>`<option value="${esc(s.id)}" ${s.id===start?'selected':''}>${esc(s.label)}</option>`).join('')}</select>`:'<p class="mq-dev-note">Starts at the beginning.</p>'}
  <div class="mq-dev-actions"><button class="mq-dev-start" data-dev-go>Start</button>${story?`<a href="${esc(story)}" style="color:#9fe3d6;align-self:center">Story review instead</a>`:''}</div>
  <p class="mq-dev-note">Owner-only. Mathematics is skipped and nothing is recorded for any class.</p></section>`;
}
export function showDevPanel(root,options,onStart){
  if(!document.getElementById('mq-dev-style')){const st=document.createElement('style');st.id='mq-dev-style';st.textContent=DEV_STYLE;document.head.append(st);}
  root.innerHTML=devPanelHtml(options);
  root.querySelector('[data-dev-go]').onclick=()=>onStart({
    items:[...root.querySelectorAll('[data-dev-item]:checked')].map(i=>i.value),
    start:root.querySelector('[data-dev-start]')?.value||options.starts?.[0]?.id});
}
