import {HAVEN_REVISION,HAVEN_TASKS,HAVEN_WORLD,havenWorld,havenEnemies,havenFinale} from '../../../public/games/nightfall/false-haven-world.js';
import {threatFor} from '../../../public/games/nightfall/config.js';
const counters=['shots','hits','blocks','heals','doorUses','doorsBroken','distractionsUsed','shotgunShots'];
export function validateHaven(r,input){
 const s=input.snapshot,old=r.snapshot,w=havenWorld(s),elapsed=input.activeElapsedMs;
 if(s.revision!==HAVEN_REVISION||s.scenario!=='false-haven'||s.runId!==r.runId||s.threat!==r.threat||s.route!==r.route||JSON.stringify(s.loadout)!==JSON.stringify(r.loadout))return 'Invalid False Haven configuration.';
 if(!Number.isFinite(s.time)||s.time<0||s.time>300||Math.abs(s.time*1000-elapsed)>2||!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<0||s.x>HAVEN_WORLD.width||s.y<0||s.y>HAVEN_WORLD.height)return 'Invalid False Haven time or position.';
 if(!s.tasks||Object.entries(s.tasks).some(([id,v])=>v!==true||!HAVEN_TASKS.some(t=>t.id===id))||HAVEN_TASKS.some(t=>s.tasks[t.id]&&!(t.requires||[]).every(id=>s.tasks[id]))||Object.keys(old?.tasks||{}).some(id=>!s.tasks[id]))return 'Invalid machinery sequence.';
 const h=s.haven;
 if(!h||h.powerCircuit!==(s.tasks.power_depot?'depot':s.tasks.power_pump?'pump':'off')||!Number.isFinite(h.trolleyProgress)||h.trolleyProgress<0||h.trolleyProgress>1||s.tasks.trolley_parked&&h.trolleyProgress!==1||old?.haven?.finaleSpawned&&!h.finaleSpawned||h.finaleSpawned&&!s.tasks.gate_unlocked)return 'Invalid compound state.';
 for(const k of ['trapClosed','trolleyMoving','finaleSpawned'])if(typeof h[k]!=='boolean')return 'Invalid compound switch.';
 const enemies=[...havenEnemies(),...(h.finaleSpawned?havenFinale():[])];
 if(!Array.isArray(s.enemies)||s.enemies.length!==enemies.length||new Set(s.enemies.map(e=>e.id)).size!==enemies.length||s.enemies.some(e=>{const a=enemies.find(a=>a.id===e.id),p=old?.enemies?.find(a=>a.id===e.id);return !a||e.kind!==a.kind||!Number.isFinite(e.hp)||e.hp<0||e.hp>(p?.hp??a.hp)||!Number.isFinite(e.x)||!Number.isFinite(e.y)||e.x<0||e.x>3840||e.y<0||e.y>1920;}))return 'Invalid enemy state.';
 if(!Array.isArray(s.picked)||new Set(s.picked).size!==s.picked.length||s.picked.some(id=>!w.PICKUPS.some(p=>p.id===id))||old?.picked?.some(id=>!s.picked.includes(id)))return 'Invalid pickup history.';
 for(const k of counters)if(!Number.isInteger(s[k])||s[k]<(old?.[k]||0)||s[k]>100000)return 'Invalid gameplay counters.';
 const fresh=w.PICKUPS.filter(p=>s.picked.includes(p.id)&&!old?.picked?.includes(p.id));
 const ammo=fresh.filter(p=>p.kind==='ammo').reduce((n,p)=>n+p.amount+threatFor(r.threat).pickupBonus,0);
 if(typeof s.shotgun!=='boolean'||s.shotgun!==s.picked.includes('shotgun')||!Number.isInteger(s.shells)||s.shells<0||s.shells>8||!['primary','shotgun'].includes(s.weapon)||s.weapon==='shotgun'&&!s.shotgun||s.shotgunShots>s.shots||s.shotgunShots-(old?.shotgunShots||0)>s.shots-(old?.shots||0))return 'Invalid weapon state.';
 if(s.shells>(old?.shells||0)+(s.shotgun&&!old?.shotgun?8:0)-(s.shotgunShots-(old?.shotgunShots||0)))return 'Shotgun ammunition cannot refill.';
 if(s.ammo>(old?.ammo??(12+(r.loadout.includes('ammo-pouch')?24:0)))+ammo-((s.shots-s.shotgunShots)-((old?.shots||0)-(old?.shotgunShots||0))))return 'Ammunition cannot be created.';
 const vest=r.loadout.includes('vest')?2:0;
 for(const [k,max] of [['health',3],['ammo',r.loadout.includes('ammo-pouch')?84:60],['vest',vest],['medkit',0]])if(!Number.isInteger(s[k]*(k==='health'?2:1))||s[k]<0||s[k]>max)return 'Invalid equipment or health.';
 if(s.damage!==(r.loadout.includes('carbine')?2:1)||s.vest>(old?.vest??vest)||s.health>(old?.health??3)+fresh.filter(p=>p.kind==='health').reduce((n,p)=>n+p.amount,0))return 'Equipment or health cannot recharge without a pickup.';
 if(!s.doors||Object.keys(s.doors).length!==w.BUILDINGS.length||w.BUILDINGS.some(b=>{const d=s.doors[b.id];return !d||typeof d.closed!=='boolean'||!Number.isFinite(d.hp)||d.hp<0||d.hp>(old?.doors?.[b.id]?.hp??100);}))return 'Invalid door state.';
 if(!s.windows||Object.entries(s.windows).some(([id,v])=>v!==true||!w.WINDOWS.some(p=>p.id===id))||Object.keys(old?.windows||{}).some(id=>!s.windows[id]))return 'Broken windows cannot reset.';
 if(!s.distractions||Object.keys(s.distractions).some(id=>!w.DISTRACTIONS.some(p=>p.id===id))||Object.keys(old?.distractions||{}).some(id=>!s.distractions[id]))return 'Invalid distraction history.';
 if(input.type==='minigame.complete'){
  if(!['success','assisted_completed','lost','timed_out'].includes(input.outcome)||s.outcome!==input.outcome)return 'Invalid False Haven outcome.';
  if(['success','assisted_completed'].includes(input.outcome)&&(!s.tasks.escape||s.health<=0))return 'Complete the machinery route and reach the bus alive.';
  if((input.outcome==='assisted_completed')!==(r.mode==='assisted')&&['success','assisted_completed'].includes(input.outcome))return 'Assisted completion must be recorded separately.';
  if(input.outcome==='lost'&&s.health!==0)return 'A lost run requires zero health.';
  if(input.outcome==='timed_out'&&elapsed<300000)return 'The active time limit has not elapsed.';
 }else if(s.outcome)return 'Terminal states require a completion command.';
 return null;
}
