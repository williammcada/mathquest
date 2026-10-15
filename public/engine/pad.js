// MathQuest v0.13.0 — the one directional pad for every MathQuest game and Math Arcade (handbook U-17, U-10).
// Layouts (owner, 2026-10-15):
//  'cross' — the Mega Man Math pad: up above, down below, left and right meeting in the middle.
//  'eight' — the same pad with arrows in all four corners: a full 3 × 3 of directions, no empty cells.
// The pad is ONE held-input zone; the direction is read from where the finger is, so sliding between
// arrows changes direction without lifting. Contact ownership, release and interruption handling come
// from the shared held-input module (U-10). Math Arcade receives this file through its MathQuest sync.
import {bindHeldInput,pointInside} from './held-input.js?v=1';

export const PAD_DIRECTIONS=['up','down','left','right'];
const CELLS={
 cross:[['up','▲'],['left','◀'],['right','▶'],['down','▼']],
 eight:[['up-left','◤'],['up','▲'],['up-right','◥'],['left','◀'],['right','▶'],['down-left','◣'],['down','▼'],['down-right','◢']]
};

export const PAD_STYLE=`.ap-pad{--c:52px;position:relative;width:calc(var(--c)*3);height:calc(var(--c)*3);flex:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.ap-cell{position:absolute;display:grid;place-items:center;width:var(--c);height:var(--c);background:#163348e6;color:#fff;border:1px solid #3a6380;font:24px/1 system-ui,sans-serif;box-sizing:border-box;pointer-events:none}
.ap-up{left:var(--c);top:0}.ap-down{left:var(--c);top:calc(var(--c)*2)}
.ap-left{left:0;top:var(--c);width:calc(var(--c)*1.5)}.ap-right{left:calc(var(--c)*1.5);top:var(--c);width:calc(var(--c)*1.5)}
.ap-up-left{left:0;top:0}.ap-up-right{left:calc(var(--c)*2);top:0}.ap-down-left{left:0;top:calc(var(--c)*2)}.ap-down-right{left:calc(var(--c)*2);top:calc(var(--c)*2)}
.ap-eight .ap-up-left,.ap-eight .ap-up-right,.ap-eight .ap-down-left,.ap-eight .ap-down-right{font-size:20px;background:#12293ae6}
.ap-cell.held{background:#c4f4df;color:#142c39}
.ap-bar{display:flex;justify-content:space-between;align-items:center;gap:24px}
.ap-bar .ap-actions{display:grid;grid-template-columns:repeat(2,auto);gap:8px 10px;align-items:center;justify-items:center}
.ap-bar .ap-actions:empty{display:none}
.ap-bar .ap-actions .ap-round{width:72px;height:72px;min-width:0;min-height:0;border-radius:50%;padding:0;background:#873e4a;color:#fff;border:2px solid #b7606d;font:800 14px/1.1 system-ui,sans-serif;touch-action:none}
.ap-bar .ap-actions .ap-small{min-height:40px;min-width:72px;padding:0 10px;font-size:13px;touch-action:none}
.ap-bar .ap-actions .held{background:#c4f4df;color:#142c39}
@media (max-height:600px){.ap-pad{--c:44px}.ap-bar .ap-actions .ap-round{width:60px;height:60px}}`;
export function ensurePadStyle(doc=globalThis.document){if(!doc||doc.getElementById('mq-pad-style'))return;const s=doc.createElement('style');s.id='mq-pad-style';s.textContent=PAD_STYLE;doc.head.append(s);}

// Direction under a point. x,y are relative to the pad box (w × h). Outside the pad box the finger has
// left the pad, so no direction is held.
export function padDirection(mode,x,y,w,h){
 if(x<0||x>w||y<0||y>h)return {};
 const nx=Math.min(.999,Math.max(0,x/w)),ny=Math.min(.999,Math.max(0,y/h));
 const col=nx<1/3?0:nx<2/3?1:2,row=ny<1/3?0:ny<2/3?1:2,out={};
 if(row===1){out[nx<.5?'left':'right']=true;return out;}
 if(mode==='eight'){out[row===0?'up':'down']=true;if(col===0)out.left=true;if(col===2)out.right=true;return out;}
 if(col===1){out[row===0?'up':'down']=true;return out;}
 // Cross corners are not drawn; a finger there goes to the nearer arm so it is never "dead".
 const dx=nx-.5,dy=ny-.5;if(Math.abs(dx)>Math.abs(dy))out[dx<0?'left':'right']=true;else out[dy<0?'up':'down']=true;return out;
}
export const padCellsHtml=mode=>CELLS[mode==='eight'?'eight':'cross'].map(([key,glyph])=>`<span class="ap-cell ap-${key}" data-pad-cell="${key}" aria-hidden="true">${glyph}</span>`).join('');
// Pad element markup. extra: additional attributes/classes for hosts that keep their own hooks (e.g. data-dpad).
export function padHtml(mode,{label='Direction pad',attrs='',cls=''}={}){const m=mode==='eight'?'eight':'cross';ensurePadStyle();return `<div class="ap-pad ap-${m} ${cls}" data-ap-pad data-pad-mode="${m}" role="group" aria-label="${label}" ${attrs}>${padCellsHtml(m)}</div>`;}
export function readPad(pad,point){const r=pad.getBoundingClientRect();return padDirection(pad.dataset.padMode||'eight',point.clientX-r.left,point.clientY-r.top,r.width,r.height);}
export function highlightPad(pad,value){const eight=pad?.dataset.padMode==='eight';for(const c of pad?.querySelectorAll('[data-pad-cell]')||[]){const k=c.dataset.padCell,parts=k.split('-');c.classList.toggle('held',parts.length===2?parts.every(p=>value[p]):!!value[k]&&(!eight||!PAD_DIRECTIONS.some(d=>value[d]&&['up','down'].includes(k)!==['up','down'].includes(d))));}}

// Button-profile games ({left:[[key,label]...],right:[...],keys,pad:'cross'|'eight'}): pad bottom-left, actions bottom-right.
export function padMarkup(profile){
 const mode=profile.pad==='eight'?'eight':'cross',names=PAD_DIRECTIONS.map(d=>profile.left.find(([k])=>k===d)?.[1]||d).join(', ');
 const actions=profile.right.map(([key,text],i)=>`<button type="button" class="${i<2?'ap-round':'ap-small'}" data-game-key="${key}" aria-label="${text}">${text}</button>`).join('');
 return `<div class="ap-bar mq-thumb-controls">${padHtml(mode,{label:(mode==='eight'?'8-direction pad: ':'Direction pad: ')+names})}<div class="ap-actions ap-n${profile.right.length}">${actions}</div></div>`;
}
export function bindPad(root,profile,options){
 ensurePadStyle(root.ownerDocument);
 const pad=root.querySelector('[data-ap-pad]'),buttons=[...root.querySelectorAll('.ap-actions [data-game-key]')];
 return bindHeldInput(root,{...options,keys:profile.keys,
  blocked:()=>options.blocked?.()||!!globalThis.matchMedia?.('(orientation: portrait) and (max-width: 700px)').matches,
  zones:[{element:pad,read:point=>readPad(pad,point)},...buttons.map(element=>({element,read:point=>pointInside(point,element)?{[element.dataset.gameKey]:true}:{}}))],
  onChange:value=>{highlightPad(pad,value);for(const b of buttons)b.classList.toggle('held',!!value[b.dataset.gameKey]);options.onChange(value);}
 });
}
