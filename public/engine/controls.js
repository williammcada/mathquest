import {bindHeldInput,pointInside} from './held-input.js?v=1';
import {padMarkup,bindPad} from './pad.js?v=1';
// Shared input contract. Physical input never owns simulation state.
export const CONTROL_PROFILES = {
  nightfall: {
    pad:'cross', // v0.13.0 U-17: Mega Man cross (up = forward, down = reverse, left/right = turn)
    left:[['up','↑ Forward'],['left','↶ Turn left'],['down','↓ Reverse'],['right','↷ Turn right']],
    right:[['run','Run'],['fire','Fire'],['interact','Search / Use'],['weapon','Change weapon']],
    keys:{arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right',shift:'run',' ':'fire',e:'interact',f:'weapon'},
    help:'W / ↑: forward · S / ↓: reverse · A / ← and D / →: turn · Shift: run · Space: fire · hold E: search / use · M: map · F: change weapon. Release Run to fire. Touch: left thumb steers; right thumb runs, fires or interacts. One live run; no restart after defeat.'
  },
  vault: {
    left:[['left','◀ Move left'],['right','Move right ▶']],right:[['jump','Jump'],['interact','Interact (E)'],['jam','Jam (Q)'],['cloak','Cloak (R)']],
    keys:{arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'jump',w:'jump',' ':'jump',e:'interact',q:'jam',r:'cloak'},
    help:'A / ← and D / →: move · Space / W / ↑: jump · hold E: security console A, access card C or elevator. B is an automatic checkpoint: walk through it. Q: Toolkit Jam, three seconds per checkpoint. R: Cloak, five seconds once. Touch: use the labeled buttons. The third detection ends the run. Three-minute active timer.'
  }
};
export function controlMarkup(profile){
  if(profile.pad)return padMarkup(profile);
  const buttons=entries=>entries.map(([key,label])=>`<button type="button" data-game-key="${key}" aria-label="${label}">${label}</button>`).join('');
  return `<div class="mq-thumb-controls"><div class="mq-thumb-left ${profile.left.length===4?'mq-tank':''}">${buttons(profile.left)}</div><div class="mq-thumb-right ${profile.right.length===2?'mq-two':''}">${buttons(profile.right)}</div></div>`;
}
export function bindGameInput(root,profile,options){
 if(profile.pad)return bindPad(root,profile,options);
 const buttons=[...root.querySelectorAll('[data-game-key]')];
 return bindHeldInput(root,{...options,keys:profile.keys,
  blocked:()=>options.blocked?.()||!!globalThis.matchMedia?.('(orientation: portrait) and (max-width: 700px)').matches,
  zones:buttons.map(element=>({element,read:point=>pointInside(point,element)?{[element.dataset.gameKey]:true}:{}})),
  onChange:value=>{for(const b of buttons)b.classList.toggle('held',!!value[b.dataset.gameKey]);options.onChange(value);}
 });
}
export function crispCanvas(canvas,logicalWidth,logicalHeight){
  const rect=canvas.getBoundingClientRect();
  const scale=Math.min(3,Math.max(1,(rect.width||logicalWidth)/logicalWidth*(globalThis.devicePixelRatio||1)));
  const w=Math.round(logicalWidth*scale),h=Math.round(logicalHeight*scale);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const ctx=canvas.getContext('2d');if(ctx){ctx.setTransform(w/logicalWidth,0,0,h/logicalHeight,0,0);ctx.imageSmoothingEnabled=false;}return ctx;
}
