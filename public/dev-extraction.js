import {StealthRuntime} from './stealth.js?v=0.14.0';
import {TeacherAudio} from './teacher-audio.js?v=0.14.0';
import {SceneAssets} from './vault7-assets.js?v=0.14.0';
let runtime;
function restart(){
  if(runtime){runtime.destroy();localStorage.removeItem(runtime.key);}
  const extraction={loadout:document.querySelector('#equipment').value.split('|').filter(Boolean),route:document.querySelector('#route').value,equipment:document.querySelector('#equipment').value||null,adverseCount:Number(document.querySelector('#alerts').value),stageEnteredAt:Date.now(),completedCount:0,rosterCount:1,result:{checkpoint:document.querySelector('#checkpoint').value||null}};
  runtime=new StealthRuntime(document.querySelector('#practice'),{developerMode:true,session:'developer',studentId:'practice',deviceId:'practice',team:{extraction,finalAction:document.querySelector('#final-action').value},onState:()=>{}});
}
document.querySelector('#restart').onclick=restart;
restart();
const music=new TeacherAudio();document.querySelector('#music').innerHTML=music.markup();music.bind();
document.querySelector('#check-media').onclick=async()=>{
  const status=document.querySelector('#media-status');status.textContent='Checking…';
  const paths=[...Object.values(SceneAssets).flatMap(a=>[a.src,a.src.replace('.webp','-480.webp')]),'./assets/vault7/audio/vault7-ambient.mp3','./assets/vault7/audio/vault7-finale.mp3','./assets/vault7/sprites/agent-16x24.png'];
  const results=await Promise.all(paths.map(async path=>{try{const r=await fetch(path,{method:'HEAD',cache:'no-store',signal:AbortSignal.timeout(10000)});const valid=r.ok&&/^(image|audio)\//.test(r.headers.get('content-type')||'');return valid?null:`${path}: ${r.status} ${r.headers.get('content-type')||''}`;}catch{return `${path}: could not connect`;}}));
  const failures=results.filter(Boolean);status.textContent=failures.length?`Missing or invalid media (${failures.length}):\n${failures.join('\n')}\nUpload the assets folder at the repository root, beside index.html.`:`All ${paths.length} media files are reachable. Use Play soundtrack to test audio playback.`;
};
window.addEventListener('pagehide',()=>{if(runtime){runtime.destroy();localStorage.removeItem(runtime.key);}});
