import {bindHeldInput} from './held-input.js?v=1';
import {padDirection,highlightPad} from './pad.js?v=1';
// Opt-in free-movement profile. Existing tank/platform input is unchanged.
export const DIRECTIONAL_KEYS={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
export function directionAt(x,y,width,height){
  if(x<0||x>width||y<0||y>height)return {};
  const nx=(x-width/2)/(width/2),ny=(y-height/2)/(height/2),out={};
  if(Math.abs(nx)<.18&&Math.abs(ny)<.18)return out;
  // Square zones allow diagonals and one-thumb gliding; no dead gaps.
  if(nx<-.26)out.left=true;if(nx>.26)out.right=true;if(ny<-.26)out.up=true;if(ny>.26)out.down=true;
  return out;
}
export function bindDirectionalInput(root,options){
 const pad=root.querySelector('[data-dpad]');
 return bindHeldInput(root,{...options,keys:DIRECTIONAL_KEYS,zones:[{element:pad,read:point=>{const r=pad.getBoundingClientRect();return padDirection('eight',point.clientX-r.left,point.clientY-r.top,r.width,r.height);}}],
  onChange:value=>{root.querySelectorAll('[data-direction]').forEach(b=>b.classList.toggle('held',!!value[b.dataset.direction]));highlightPad(pad,value);options.onChange(value);}
 });
}
