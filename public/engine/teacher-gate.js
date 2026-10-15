// MathQuest v0.14.0 — teacher passcode (spec change-specs/v0.14.0-teacher-passcode.md).
// The passcode lives only in the Worker secret TEACHER_PASSCODE; this device remembers it after the server accepts it.
import {hostingFor,fetchApi} from '../hosting.js?v=0.14.0';
const KEY='mq-teacher-passcode';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const storedPasscode=()=>{try{return localStorage.getItem(KEY)||'';}catch{return '';}};
export const forgetPasscode=()=>{try{localStorage.removeItem(KEY);}catch{}};
export const teacherHeaders=(headers={})=>{const p=storedPasscode();return p?{...headers,'x-mathquest-teacher':p}:headers;};
export async function checkPasscode(passcode,href=globalThis.location.href){
 let response;
 try{response=await fetchApi(hostingFor(href).api('teacher-check'),{method:'POST',headers:{'content-type':'application/json','x-mathquest-teacher':passcode},body:'{}'});}
 catch{return {ok:false,error:'Could not reach MathQuest. Check the connection and try again.'};}
 if(response.ok){try{localStorage.setItem(KEY,passcode);}catch{}return {ok:true};}
 let error=response.status===403?'Teacher passcode not recognized.':'MathQuest could not check the passcode.';try{error=(await response.json()).error||error;}catch{}
 if(response.status===403)forgetPasscode();
 return {ok:false,status:response.status,error};
}
export const gateStyle=`.mq-gate{max-width:440px;margin:12vh auto;padding:26px 28px;background:#0f2230;color:#e8f1f4;border:2px solid #f0b44c;border-radius:12px;font:16px/1.5 system-ui,sans-serif}
.mq-gate h1{font-size:22px;margin:0 0 6px}.mq-gate p{margin:6px 0 14px;color:#c9d8de}.mq-gate label{display:block;font-weight:700;margin:10px 0 6px}
.mq-gate input{width:100%;box-sizing:border-box;font:18px system-ui;padding:10px 12px;border-radius:8px;border:1px solid #6d8796;background:#fff;color:#0f2230}
.mq-gate button{margin-top:14px;font:700 16px system-ui;min-height:44px;padding:0 20px;border-radius:8px;border:0;background:#3ad1b4;color:#062019;cursor:pointer}
.mq-gate .mq-gate-error{color:#ffb4a8;min-height:1.4em;margin:10px 0 0}.mq-gate small{display:block;margin-top:16px;color:#9fb4bd}`;
export function ensureGateStyle(doc=document){if(doc.getElementById('mq-gate-style'))return;const s=doc.createElement('style');s.id='mq-gate-style';s.textContent=gateStyle;doc.head.append(s);}
export function gateHtml({title='Teacher passcode',note='This page is for the teacher.'}={}){
 return `<form class="mq-gate" data-gate autocomplete="off"><h1>${esc(title)}</h1><p>${esc(note)}</p><label for="mq-gate-pass">Teacher passcode</label><input id="mq-gate-pass" type="password" autocomplete="current-password" required minlength="1"><button type="submit">Continue</button><p class="mq-gate-error" role="alert"></p><small>Students: open the link or QR code your teacher shares in class.</small></form>`;
}
// Wire a rendered gate form; onOk runs once the server accepts the passcode.
export function bindGate(root,onOk){
 const form=root.querySelector('[data-gate]');if(!form)return;
 form.addEventListener('submit',async e=>{e.preventDefault();const input=form.querySelector('input'),error=form.querySelector('.mq-gate-error'),button=form.querySelector('button');button.disabled=true;error.textContent='Checking…';const r=await checkPasscode(input.value.trim());button.disabled=false;if(r.ok){error.textContent='';onOk();}else{error.textContent=r.error;input.select();}});
}
// Practice / DEV / review pages: cover the whole page until the passcode is verified with the server.
export async function guardPage(){
 const doc=document;ensureGateStyle(doc);
 const cover=doc.createElement('div');cover.id='mq-gate-cover';cover.setAttribute('role','dialog');cover.setAttribute('aria-modal','true');
 cover.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#07121e;overflow:auto';
 doc.documentElement.style.overflow='hidden';
 const mount=()=>{if(!doc.body.contains(cover))doc.body.append(cover);};
 if(doc.body)mount();else doc.addEventListener('DOMContentLoaded',mount,{once:true});
 const open=()=>{doc.documentElement.style.overflow='';cover.remove();};
 const stored=storedPasscode();
 if(stored){cover.innerHTML='<p class="mq-gate" style="text-align:center">Checking teacher access…</p>';const r=await checkPasscode(stored);if(r.ok){open();return true;}}
 ensureGateStyle(doc);cover.innerHTML=gateHtml({title:'Teacher practice page',note:'Practice and DEV pages are for the teacher. Enter the teacher passcode to continue.'});
 return new Promise(resolve=>bindGate(cover,()=>{open();resolve(true);}));
}
