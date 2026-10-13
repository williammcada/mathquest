// Server checks for client-reported Kingsgate runs (envelope validation, not authoritative replay).
import {REVISION,TOWERS,ENEMIES,SPOTS,WAVE_COUNT,MAX_BOUNTY,EQUIPMENT_IDS,PATH_LENGTH} from '../../../public/games/kingsgate/config.js';
import {allowedTowers,startingGold,gateMax} from '../../../public/games/kingsgate/sim.js';
const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
const STATS=['kills','leaks','spawned','bounty','mathGold','spent','refund','shots','answered','correct'];
export function validateKingsgate(run,input){
 const s=input.snapshot,old=run.snapshot,g=s?.g,p=old?.g,elapsed=input.activeElapsedMs;
 if(!s||!g||s.revision!==REVISION||s.runId!==run.runId||s.route!==run.route||s.goldMode!=='mathquest'||JSON.stringify(s.loadout)!==JSON.stringify((run.loadout||[]).filter(id=>EQUIPMENT_IDS.includes(id)))||s.mode!==run.mode)return 'Invalid Kingsgate configuration.';
 if(g.goldMode!=='mathquest'||g.breaks!==false||JSON.stringify(g.allowed)!==JSON.stringify(allowedTowers('mathquest',s.loadout))||g.startGold!==startingGold('mathquest',s.loadout)||g.gateMax!==gateMax(s.loadout))return 'Equipment effects do not match the issued loadout.';
 if(!finite(s.time,0,300)||Math.abs(s.time*1000-elapsed)>2||run.mode==='action'&&Math.abs(g.t-s.time)>.002)return 'Invalid defense clock.';
 if(p&&g.t<p.t)return 'The defense clock cannot rewind.';
 if(!int(g.wave,0,WAVE_COUNT)||!int(g.cleared,0,g.wave)||g.wave<(p?.wave||0)||g.cleared<(p?.cleared||0))return 'Invalid wave progress.';
 if(!int(g.gateHp,0,g.gateMax)||g.gateHp>(p?.gateHp??g.gateMax))return 'Gate health cannot be restored.';
 if(!g.stats||STATS.some(k=>!int(g.stats[k],0,1000000)||g.stats[k]<(p?.stats?.[k]||0)))return 'Defense counters cannot rewind.';
 const st=g.stats;
 if(st.mathGold!==0||st.answered!==0||st.correct!==0)return 'The cartridge defense has no question rounds.';
 if(st.kills+st.leaks>st.spawned||st.bounty>st.kills*MAX_BOUNTY||st.bounty-(p?.stats?.bounty||0)>(st.kills-(p?.stats?.kills||0))*MAX_BOUNTY)return 'Bounty exceeds the orcs defeated.';
 if(st.refund*2>st.spent)return 'Refunds exceed spending.';
 if(!int(g.gold,0,1000000)||g.gold!==g.startGold+st.bounty+st.refund-st.spent)return 'Gold does not balance.';
 if(!Array.isArray(g.towers)||g.towers.length>SPOTS.length||new Set(g.towers.map(t=>t.spot)).size!==g.towers.length||g.towers.some(t=>!SPOTS.some(x=>x.id===t.spot)||!g.allowed.includes(t.type)||!TOWERS[t.type]||![0,1].includes(t.tier)))return 'Invalid tower placement.';
 if(g.towers.reduce((n,t)=>n+TOWERS[t.type].cost+(t.tier?TOWERS[t.type].upgrade:0),0)>st.spent)return 'Towers cost more than was spent.';
 if(!Array.isArray(g.enemies)||g.enemies.length>80||g.enemies.some(e=>!e||!ENEMIES[e.type]||!finite(e.hp,0,ENEMIES[e.type].hp)||!finite(e.d,0,PATH_LENGTH+50)||!int(e.w,0,WAVE_COUNT-1)||e.w>=g.wave))return 'Invalid warband state.';
 if(input.type==='minigame.complete'){
  if(!['success','lost','timed_out','assisted_completed'].includes(input.outcome)||s.outcome!==input.outcome)return 'Invalid Kingsgate outcome.';
  if(input.outcome==='success'&&(run.mode!=='action'||g.mode!=='result'||g.gateHp<=0||!(g.cleared===WAVE_COUNT||g.reason==='time'&&s.time>=299.99)))return 'Hold the gate through all twelve waves or until the time limit.';
  if(input.outcome==='lost'&&(run.mode!=='action'||g.mode!=='result'||g.gateHp!==0))return 'A broken gate needs zero gate health.';
  if(input.outcome==='assisted_completed'&&(run.mode!=='assisted'||s.guideStep!==6))return 'Complete the guided defense separately.';
  if(input.outcome==='timed_out'&&elapsed<300000)return 'The active limit has not elapsed.';
 }else if(s.outcome||g.mode==='result')return 'Terminal states require a completion command.';
 return null;
}
