import {bindHeldInput,pointInside} from '../../engine/held-input.js';
import {readPad,highlightPad} from '../../engine/pad.js?v=1';

// Journey supplies its layout and action names; shared input owns every contact.
export function bindJourneyInput(root,onChange,{signal,blocked=()=>false,onInterrupt=()=>{},onReset=()=>{}}={}){
  const dpad=root.querySelector('[data-dpad]');
  // v0.13.0 U-17: 8-direction pad (shared engine/pad.js); sliding between arrows changes direction.
  const direction=point=>readPad(dpad,point);
  const zones=[{element:dpad,read:direction},...[...root.querySelectorAll('[data-jkey]')].map(element=>({element,read:point=>pointInside(point,element)?{[element.dataset.jkey]:true}:{}}))];
  const binding=bindHeldInput(root,{
    zones,signal,blocked,onPause:onInterrupt,
    keys:{arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right',j:'attack',z:'attack',k:'jump',' ':'jump',x:'jump',l:'magic',c:'magic'},
    onChange:held=>{
      root.querySelectorAll('[data-jkey]').forEach(b=>b.classList.toggle('held',!!held[b.dataset.jkey]));highlightPad(dpad,held);
      onChange({x:Number(!!held.right)-Number(!!held.left),y:Number(!!held.down)-Number(!!held.up),attack:!!held.attack,jump:!!held.jump,magic:!!held.magic});
    }
  });
  const win=root.ownerDocument.defaultView;
  for(const type of ['resize','pointercancel','touchcancel'])win.addEventListener(type,onReset,{signal});
  win.visualViewport?.addEventListener('resize',onReset,{signal});
  // HUD/world touch protection is Journey-specific; form selection stays native.
  for(const element of root.querySelectorAll('.j-hud,.j-heading,.j-status')){
    element.addEventListener('touchstart',event=>{if(event.cancelable)event.preventDefault();},{signal,passive:false});
  }
  return binding;
}
