import {COASTAL_PERSONAL} from './cartridges/coastal-escape.js';
import {BLACKLINE_PERSONAL} from './cartridges/blackline.js?v=0.3.2';
import {HAVEN_PERSONAL} from './cartridges/false-haven.js?v=0.2.0';
import {equipmentMarkup,bindEquipment} from './equipment-ui.js?v=0.9.7';
import {cartridgeFor} from './cartridges.js?v=0.10.1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function expansionBody(state,team,scene){
  const c=cartridgeFor(state.cartridge.id),s=state.student;
  if(team.stage==='briefing')return `${scene}<section class="panel"><p>${esc(s.alias)}, complete your individual work at each gate, then help your crew choose its route and equipment.</p><button class="primary wide" data-action="briefing.ready" ${s.briefingReady?'disabled':''}>${s.briefingReady?'Mission accepted. Waiting for crew.':'Accept mission'}</button></section>`;
  if(['decision','finale'].includes(team.stage)){
    const final=team.stage==='finale',opts=final?c.choices:c.routes,my=final?team.myFinalVote:team.myVote,totals=final?team.finalVoteTotals:team.voteTotals,count=final?team.finalVoteCount:team.voteCount;
    return `${scene}<section class="panel"><div class="choice-grid">${opts.map(o=>`<button class="choice ${my===o.id?'selected':''}" aria-pressed="${my===o.id}" data-exp-vote="${o.id}"><b>${esc(o.title)}</b><span>${esc(o.text)}</span><strong>${my===o.id?'YOUR VOTE | ':''}${totals?.[o.id]||0} votes</strong></button>`).join('')}</div><p>${count}/${team.memberCount} votes recorded. Ties use the Event Lead's vote when it is tied for first.</p>${s.isLead?`<button class="primary wide" data-action="choice.resolve" ${count<team.memberCount?'disabled':''}>Authorize team decision</button>`:`<p>Event Lead ${esc(team.lead?.alias)} submits after everyone votes.</p>`}</section>`;
  }
  if(team.stage==='market')return scene+(c.id==='coastal-escape'&&team.supply?.count===null?'<p class="panel">Your gate sizes differ. Your teacher must save an extra-preparation question count before your crew can earn additional upgrades.</p>':'')+equipmentMarkup(team,s,c.items);
  if(team.stage==='victory'){
    const r=team.finale?.run,personal=(c.id==='blackline'?BLACKLINE_PERSONAL[r?.outcome]:null)||c.personal?.[r?.outcome]||(c.id==='nightfall-false-haven'?(HAVEN_PERSONAL[r?.outcome]||'Your field record is retained.'):{success:'You reached the bus under your own cover.',lost:'Your character did not make it out alive. The crew watched you disappear into the rain to finish the repairs. Your radio fell silent, and your seat remained empty when the bus left.',setback:'Your character did not make it out alive. Your radio fell silent in the city.',timed_out:'Your field record needs mission control review. No loss of life is inferred from a technical or timing limit.',teacher_advanced:'Mission control closed your crossing without recording an arcade success.',skipped:'You continued with the crew without an arcade crossing.'}[r?.outcome]||'Your crossing is recorded.');
    return `${scene}<section class="panel"><h2>${esc(s.alias)}: personal record</h2><p>${esc(c.id==='coastal-escape'?(COASTAL_PERSONAL[r?.outcome]||'Your escort record is pending.'):personal)}</p><p>${r?.mode==='assisted'?'You used the assisted route.':''} Your crew's final choice still stands.</p><p>Equipment: ${team.inventory.map(id=>esc(c.items.find(i=>i.id===id)?.title)).join(', ')||'Standard kit'}.</p><p>First-attempt accuracy: ${Math.round(s.firstAttemptCorrect/Math.max(1,s.assignedTotal??state.config.totalQuestions)*100)}%. Gameplay does not change this evidence.</p></section>`;
  }
  return null;
}
export function bindExpansion(team,command){
  bindEquipment(team,command);
  document.querySelectorAll('[data-exp-vote]').forEach(b=>b.onclick=()=>command('choice.vote',{choice:b.dataset.expVote}));
  document.querySelectorAll('[data-exp-item]').forEach(b=>b.onclick=()=>{const items=(team.myMarketSelection||'').split('|').filter(Boolean),id=b.dataset.expItem;command('market.propose',{items:items.includes(id)?items.filter(x=>x!==id):[...items,id]});});
  document.querySelector('[data-exp-save]')?.addEventListener('click',()=>command('market.propose',{items:[]}));
}
