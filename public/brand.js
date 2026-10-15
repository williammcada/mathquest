import { CARTRIDGES } from './cartridges.js?v=0.14.0';

export const BRAND = Object.freeze({name:'MathQuest',mark:'MQ',credit:'A WILLIAM MCADA PRODUCT',version:'0.14.0',engineVersion:'0.14.0'});
export const escapeBrand = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Resolve only registered metadata; missing/unknown IDs never inherit a cartridge.
export function presentationFor(id, registry=CARTRIDGES) {
  const cartridge=registry.find(c=>c.id===id);
  return cartridge ? {id:cartridge.id,title:cartridge.title,...cartridge.presentation} : null;
}
export function setBrandContext(doc, id, registry=CARTRIDGES) {
  const p=presentationFor(id,registry);
  doc.title=p ? `${BRAND.name} ${BRAND.version} — ${p.title}` : `${BRAND.name} ${BRAND.version}`;
  doc.documentElement.dataset.cartridge=p?.id||'';
  doc.documentElement.dataset.theme=p?.theme||'mathquest';
  return p;
}
export function markMarkup(p=null, small=false) {
  return `<div class="mq-mark${small?' small':''}" aria-hidden="true">${escapeBrand(p?.emblem||BRAND.mark)}</div>`;
}
export function cartridgeCard(id, registry=CARTRIDGES) {
  const p=presentationFor(id,registry);
  if(!p)return '<div class="cartridge-placeholder"><h3>Choose a cartridge</h3><p>Select a story above to preview it and create your session.</p></div>';
  return `<article class="game-card selected" aria-label="Selected cartridge: ${escapeBrand(p.title)}"><span class="game-cover"><img src="${escapeBrand(p.cover)}" width="960" height="540" alt="${escapeBrand(p.coverAlt)}"></span><span><b>${escapeBrand(p.title)}</b><small>${escapeBrand(p.summary)}</small></span><span class="selected-pill">Selected</span></article>`;
}
