import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {FinaleHost} from '../public/finale-host.js';
import {TASKS} from '../public/games/nightfall/world.js';
const win=new Window({url:'http://localhost'});
for(const k of ['window','document','localStorage','Audio'])Object.defineProperty(globalThis,k,{configurable:true,value:k==='window'?win:win[k]});
Object.defineProperty(document,'hidden',{configurable:true,value:false});globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const drawing=new Proxy({},{get:()=>()=>{},set:()=>true});win.HTMLCanvasElement.prototype.getContext=()=>drawing;
const drain=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setTimeout(r,1));};
function fixture(practice=false){const root=document.createElement('div');document.body.append(root);const sent=[];const run={runId:crypto.randomUUID(),configRevision:'nightfall-1',loadout:['vest','medkit'],seq:0,status:'not_started'};const runtime=new FinaleHost(root,{run,route:'clinic',practice,deadline:Date.now()+150000,send:async(type,data)=>{sent.push({type,...data});}});return {root,runtime,run,sent,close(){runtime.destroy();root.remove();}};}
test('Nightfall canvas survives polling, pause clears held input, outside pointer release clears movement',async()=>{const f=fixture();try{await f.runtime.start();const canvas=f.root.querySelector('canvas'),pad=f.root.querySelector('[data-ap-pad]');/* v0.13.0 U-17: Nightfall uses the cross pad; press its right arm. */pad.getBoundingClientRect=()=>({left:0,top:0,width:156,height:156,right:156,bottom:156,x:0,y:0});pad.dispatchEvent(new win.PointerEvent('pointerdown',{pointerId:1,bubbles:true,clientX:130,clientY:78}));assert.equal(f.runtime.input.right,true);win.dispatchEvent(new win.PointerEvent('pointerup',{pointerId:1}));assert.ok(!f.runtime.input.right);f.runtime.input.right=true;f.runtime.update(f.run,true,Date.now()+150000);assert.deepEqual(f.runtime.input,{});assert.equal(canvas,f.root.querySelector('canvas'));}finally{f.close();}});
test('Nightfall assisted mode completes and sends one terminal result',async()=>{const f=fixture();try{f.root.querySelector('[data-assist]').click();await drain();await f.runtime.start();for(let i=0;i<6;i++)f.root.querySelector('[data-safe]').click();await drain();assert.equal(f.runtime.s.outcome,'success');assert.equal(f.sent.filter(x=>x.type==='minigame.complete').length,1);assert.equal(f.sent[0].mode,'assisted');}finally{f.close();}});
test('Nightfall offline terminal result survives reload and retry; practice sends nothing',async()=>{const f=fixture();try{await f.runtime.start();f.runtime.send=async()=>{throw Error('offline');};f.runtime.s.time=15;f.runtime.s.vest=0;f.runtime.s.outcome='setback';f.runtime.finish();await drain();const saved=JSON.parse(localStorage.getItem(`mq-v09-finale-${f.run.runId}`));assert.equal(saved.snapshot.vest,0);assert.equal(saved.snapshot.outcome,'setback');f.runtime.send=async(type,data)=>f.sent.push({type,...data});await f.runtime.flush();assert.equal(f.runtime.pending,null);}finally{f.close();}const p=fixture(true);try{await p.runtime.start();p.runtime.s.outcome='success';p.runtime.finish();await drain();assert.equal(p.sent.length,0);}finally{p.close();}});
test('Nightfall no-canvas environment offers assisted route',()=>{win.HTMLCanvasElement.prototype.getContext=()=>null;const f=fixture();try{assert.equal(f.runtime.mode,'assisted');f.runtime.draw();}finally{f.close();win.HTMLCanvasElement.prototype.getContext=()=>drawing;}});
test('held keyboard Search/Use reaches the actual game step and survives ordinary polling',async()=>{
 const f=fixture();try{await f.runtime.start();f.runtime.art={};f.runtime.draw=()=>{};f.runtime.s.enemies=[];const task=TASKS.find(t=>t.id==='survivor');f.runtime.s.x=task.x;f.runtime.s.y=task.y;
 win.dispatchEvent(new win.KeyboardEvent('keydown',{key:'e'}));assert.equal(f.runtime.input.interact,true);
 f.runtime.update(f.run,false,Date.now()+150000);let now=f.runtime.last;for(let i=0;i<190;i++){now+=1000/60;f.runtime.tick(now);}assert.equal(f.runtime.s.tasks.survivor,true);
 win.dispatchEvent(new win.KeyboardEvent('keyup',{key:'e'}));assert.ok(!f.runtime.input.interact);
 }finally{f.close();}
});
test.after(()=>win.happyDOM.abort());
