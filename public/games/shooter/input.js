import {bindHeldInput,pointInside} from '../../engine/held-input.js';
import {readPad,highlightPad,ensurePadStyle} from '../../engine/pad.js?v=1';
export function padSector(dx,dy,radius){
  if(Math.hypot(dx,dy)<radius*.19)return {x:0,y:0};
  const n=(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8;
  return [{x:1,y:0},{x:1,y:1},{x:0,y:1},{x:-1,y:1},{x:-1,y:0},{x:-1,y:-1},{x:0,y:-1},{x:1,y:-1}][n];
}
export function bindInput({pad,jump,root=pad.closest('main')||pad.parentElement,signal,onPause=()=>{},onFire=()=>{},blocked=()=>false}){
 ensurePadStyle(pad.ownerDocument);const own=signal?null:new AbortController(),sig=signal||own.signal;let held={};
 const binding=bindHeldInput(root,{signal:sig,blocked,onPause:()=>onPause(true),keys:{arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'up',w:'up',arrowdown:'down',s:'down',' ':'jump',c:'prone'},zones:[
 {element:pad,read:e=>readPad(pad,e)}, // v0.13.0 U-17: 8-direction pad (engine/pad.js) replaces the round thumbstick
 {element:jump,read:e=>pointInside(e,jump)?{jump:true}:{}}
 ],onChange:v=>{held=v;jump.classList.toggle('held',!!v.jump);highlightPad(pad,v);}});
 root.ownerDocument.defaultView.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'&&!e.repeat&&!blocked()&&!e.target.closest?.('input,textarea,select,button')){e.preventDefault();onFire();}},{signal:sig});
 return {clear:binding.clear,poll:binding.poll,value:()=>{binding.poll();return {x:(held.right?1:0)-(held.left?1:0),y:(held.down?1:0)-(held.up?1:0),jump:!!held.jump,prone:!!held.prone};},destroy:()=>{binding.clear();own?.abort();}};
}
