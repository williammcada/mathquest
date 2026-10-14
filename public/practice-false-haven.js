import {GameHost} from './engine/game-host.js?v=0.9.8';
import {falseHavenAdapter} from './games/nightfall/false-haven-adapter.js?v=0.9.8';
const KEY='mq-false-haven-practice-v1';let host;
const q=s=>document.querySelector(s),status=text=>q('#storage-status').textContent=text;
function read(){try{return JSON.parse(localStorage.getItem(KEY));}catch{status('Saved run could not be read. Start a new practice run.');return null;}}
function save(){if(!host)return;try{host.s.mode=host.mode;localStorage.setItem(KEY,JSON.stringify({runId:host.run.runId,loadout:host.run.loadout,mode:host.mode,snapshot:host.snapshot()}));}catch{status('Progress could not be saved. Keep this tab open to continue.');}}
function launch(saved){host?.destroy();const run=saved||{runId:crypto.randomUUID(),loadout:['carbine','ammo-pouch','vest'].filter(id=>q('#'+id).checked),mode:'action'};host=new GameHost(q('#game'),{adapter:falseHavenAdapter,practice:true,run:{...run,status:'not_started',seq:0}});host.mode=host.s.mode;host.persist=save;host.showOverlay();save();window.falseHaven=host;}
q('#restart').onclick=()=>{if(host&&!host.s.outcome&&!confirm('Replace this practice run? Its progress will be lost.'))return;launch();};
q('#resume').onclick=()=>{const value=read();if(value?.runId&&value?.snapshot)launch(value);else status('No saved run. Choose New practice run.');};
function remove(all){if(!read()&&!host){status('No saved Chapter 2 progress to delete.');return;}if(!confirm(`${all?'Clear all Chapter 2 progress':'Delete this saved run'} (1 run)? This cannot be undone. Other games and classroom records are preserved.`))return;host?.destroy();host=null;try{localStorage.removeItem(KEY);q('#game').innerHTML='';status('Chapter 2 progress cleared. Start a new practice run.');}catch{status('Deletion failed. Saved progress may remain.');}}
q('#delete').onclick=()=>remove(false);q('#clear-all').onclick=()=>remove(true);
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden){host?.pause();save();}});window.addEventListener('blur',()=>host?.pause());
setInterval(()=>{if(host){if(host.mode==='assisted'&&host.s.time>=300&&!host.s.outcome){host.s.outcome='timed_out';host.finish();}save();}},1000);
const existing=read();if(existing?.runId&&existing?.snapshot)launch(existing);else launch();
