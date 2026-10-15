// MathQuest v0.13.0 — sound on student iPads (moved from Math Arcade v0.8.1; Arcade receives it by sync).
// Loaded as a classic script before the app modules, so every game's AudioContext is tracked.
// 1. Asks iPadOS for "playback" audio, so the side switch / silent mode no longer mutes game sound.
//    (Older iPads without navigator.audioSession get a silent looping <audio> element instead.)
// 2. Every tap, click or key press resumes any game audio that is still suspended. iPads only start
//    audio inside a real gesture, and games often create their audio after a network request.
// 3. A game's resume() never leaves the game waiting: if iOS holds it, the next tap finishes it.
// 4. Music starts by default: a "Sound off" choice lasts for this page only, never for the next
//    student on the same iPad.
(()=>{
 const contexts=new Set();let unlocked=false,silent=null;
 for(const key of ['mq-sound','mq-shooter-sound'])try{localStorage.removeItem(key);}catch{}
 const Native=window.AudioContext||window.webkitAudioContext;
 if(Native&&!Native.arcadeTracked){
  const nativeResume=Native.prototype.resume;
  class Tracked extends Native{
   constructor(...args){super(...args);contexts.add(this);if(unlocked&&this.state==='suspended')void nativeResume.call(this).catch(()=>{});}
   resume(){const p=nativeResume.call(this);return Promise.race([p,new Promise(r=>setTimeout(r,400))]);}
   close(){contexts.delete(this);return super.close();}
  }
  Tracked.arcadeTracked=true;
  window.AudioContext=Tracked;if('webkitAudioContext' in window)window.webkitAudioContext=Tracked;
  window.arcadeAudio={contexts,wake};
 }
 // 0.1 s of silence, 8 kHz mono 8-bit WAV.
 const SILENT='data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
 function session(){try{if(navigator.audioSession){if(navigator.audioSession.type!=='playback')navigator.audioSession.type='playback';return true;}}catch{}return false;}
 function wake(){
  unlocked=true;
  if(!session()&&!silent){try{silent=new Audio(SILENT);silent.loop=true;silent.setAttribute('playsinline','');silent.volume=0.01;void silent.play()?.catch(()=>{silent=null;});}catch{silent=null;}}
  for(const c of contexts)if(c.state==='suspended')void Native.prototype.resume.call(c).catch(()=>{});
 }
 for(const type of ['touchend','pointerup','click','keydown'])window.addEventListener(type,wake,{capture:true,passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&unlocked)for(const c of contexts)if(c.state==='suspended')void Native?.prototype.resume.call(c).catch(()=>{});});
})();
