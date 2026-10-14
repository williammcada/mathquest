import {THREATS} from '../games/nightfall/config.js?v=0.12.0';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function teamToolsMarkup(state,t){
 if(state.status==='ended')return '';
 if(state.cartridge.id!=='nightfall')return `<details><summary>Extra equipment review settings</summary><p>Optional blocks unlock one additional distinct resource, up to three.</p><label>Questions each <input type="number" min="1" max="20" value="${t.supply?.count||3}" data-supply-count="${t.id}"></label><label><input type="checkbox" data-supply-reuse="${t.id}" ${t.supply?.allowReuse?'checked':''}> Allow imported question reuse</label><button data-supply="${t.id}" data-enabled="true">Save preparation settings</button></details>`;
 const setting=THREATS[t.threat??1];
 return `<label class="threat-control">Game threat · <b data-threat-label="${t.id}">${setting.name}: ${setting.placed} placed / ${setting.active} active</b><input type="range" min="0" max="4" step="1" value="${setting.id}" data-threat="${t.id}" aria-label="Game threat for ${esc(t.name)}" ${t.threatLocked?'disabled':''}><small>${t.threatLocked?'Locked: a player has begun.':'Private teacher setting. Locks for the entire crew when its first player starts.'} Question difficulty is separate.</small></label>${!t.supply?.started&&!['minigame','finale','victory'].includes(t.stage)?`<details><summary>Optional supply contract</summary><p>Offer extra review at the market. Each completed optional block unlocks another distinct equipment slot, up to three.</p><label>Questions per student <input type="number" min="1" max="20" value="${t.supply?.count||3}" data-supply-count="${t.id}"></label><label><input type="checkbox" data-supply-reuse="${t.id}" ${t.supply?.allowReuse?'checked':''}> Allow reuse of imported questions (otherwise preset modules only)</label><button data-supply="${t.id}" data-enabled="${!t.supply?.enabled}">${t.supply?.enabled?'Withdraw offer':'Offer supply contract'}</button></details>`:''}`;
}
export function teamProgressMarkup(t){
 const results=t.finale?.results||Object.values(t.extraction?.resultsByStudentId||{});
 const done=results.filter(r=>r.status==='terminal').length,active=results.filter(r=>r.status==='active').length;
 return t.stage==='victory'?'<p class="team-complete">✓ TEAM COMPLETE · epilogue open</p>':results.length?`<p class="team-action-status">Field runs: ${results.length-done-active} waiting · ${active} active · ${done}/${results.length} complete${t.stage==='finale'?' · FINAL DECISION PENDING':''}</p>${t.finale?.results?`<ul>${results.map(r=>`<li>${esc(r.alias)}: ${esc(r.outcome||r.status)}${r.mode==='assisted'?' · assisted':''} · ${Math.round((r.activeElapsedMs||0)/1000)}s · ${Object.keys(r.snapshot?.tasks||{}).filter(k=>r.snapshot.tasks[k]).length} tasks</li>`).join('')}</ul>`:''}`:'';
}
export function bindTeamTools(state,command){
 document.querySelectorAll('[data-threat]').forEach(input=>{
  input.oninput=()=>{const t=THREATS[Number(input.value)];document.querySelector(`[data-threat-label="${input.dataset.threat}"]`).textContent=`${t.name}: ${t.placed} placed / ${t.active} active`;};
  input.onchange=()=>command('teacher.setThreat',{teamId:input.dataset.threat,threat:Number(input.value)});
 });
 document.querySelectorAll('[data-supply]').forEach(button=>button.onclick=()=>{const id=button.dataset.supply;command('teacher.setSupply',{teamId:id,enabled:button.dataset.enabled==='true',count:Number(document.querySelector(`[data-supply-count="${id}"]`).value),allowReuse:document.querySelector(`[data-supply-reuse="${id}"]`).checked});});
}
