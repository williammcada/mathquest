import Sim from '../../../public/games/blackline/sim.js';
const EQUIPMENT=['impact-plating','boost-capacitor','repair-reserve'];
const finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
export function validateBlackline(run,input){
 const s=input.snapshot,old=run.snapshot,r=s?.race,p=old?.race,elapsed=input.activeElapsedMs;
 if(!s||!r||s.revision!=='blackline-racer-0.3.0'||s.runId!==run.runId||s.route!==run.route||s.threat!==run.threat||JSON.stringify(s.loadout)!==JSON.stringify(run.loadout)||s.mode!==run.mode)return 'Invalid BLACKLINE configuration.';
 if(!finite(s.time,0,300)||Math.abs(s.time*1000-elapsed)>2||!finite(r.t,0,s.time+.002)||run.mode==='action'&&Math.abs(r.t-s.time)>.002)return 'Invalid race clock.';
 if(!finite(r.z,0,14500)||r.z<(p?.z||0)||!finite(r.x,-1.17,1.17)||!finite(r.v,0,Sim.C.boostMax+.001)||!finite(r.hp,0,100)||!finite(r.boost,0,1))return 'Invalid race position or resources.';
 const dt=s.time-(old?.time||0);
 if(r.z-(p?.z||0)>dt*Sim.C.boostMax+.1)return 'Distance exceeds the driving envelope.';
 for(const k of ['collisions','landings','jumpIndex','encounterIndex','enemySerial','burstSerial','strikeSerial'])if(!Number.isInteger(r[k])||r[k]<(p?.[k]||0)||r[k]>100000)return 'Race counters cannot rewind.';
 if(r.landings>3||r.jumpIndex>3||r.landings>r.jumpIndex||r.landings>Sim.JUMPS.filter(j=>r.z>=j.end).length||r.jumpIndex>Sim.JUMPS.filter(j=>r.z>=j.start).length)return 'Invalid jump sequence.';
 if(!r.stats||Object.keys(Sim.newState().stats).some(k=>!Number.isInteger(r.stats[k])||r.stats[k]<(p?.stats?.[k]||0)||r.stats[k]>100000))return 'Invalid pursuit counters.';
 if(!Array.isArray(r.enemies)||r.enemies.length>3||r.enemies.some(e=>!e||!['interceptor','rammer'].includes(e.type)||!finite(e.z,-500,15000)||!finite(e.x,-1.2,1.2)||!finite(e.v,0,80)))return 'Invalid pursuit state.';
 if(!Array.isArray(r.projectiles)||r.projectiles.length>30||r.projectiles.some(x=>!x||!finite(x.z,-500,15000)||!finite(x.x,-2,2)||!finite(x.life,0,2)))return 'Invalid projectile state.';
 if(!Array.isArray(r.strikes)||r.strikes.length>2||r.strikes.some(k=>!k||!Number.isInteger(k.id)||k.id>r.strikeSerial||!finite(k.age,0,Sim.STRIKE.flight+.02)||!finite(k.aim,-1.2,1.2)||!['interceptor','artillery'].includes(k.source))||!Array.isArray(r.blasts)||r.blasts.length>10)return 'Invalid strike state.';
 if(!Array.isArray(r.obstaclesHit)||new Set(r.obstaclesHit).size!==r.obstaclesHit.length||r.obstaclesHit.some(i=>!Sim.OBSTACLES[i]||r.z<Sim.OBSTACLES[i].z)||p?.obstaclesHit?.some(i=>!r.obstaclesHit.includes(i)))return 'Invalid obstacle history.';
 if(!Array.isArray(r.picked)||new Set(r.picked).size!==r.picked.length||r.picked.some(i=>!Sim.REPAIRS[i]||r.z<Sim.REPAIRS[i].z)||p?.picked?.some(i=>!r.picked.includes(i)))return 'Invalid repair history.';
 if(!s.used||Object.entries(s.used).some(([id,v])=>!EQUIPMENT.includes(id)||!run.loadout.includes(id)||v!==true)||Object.keys(old?.used||{}).some(k=>!s.used[k]))return 'Equipment cannot recharge.';
 if(s.used['boost-capacitor']&&r.z<1900||s.used['repair-reserve']&&r.z<6800||s.used['impact-plating']&&r.collisions<1)return 'Equipment used before its trigger.';
 if(run.loadout.includes('impact-plating')&&r.collisions>0&&!s.used['impact-plating']||run.loadout.includes('boost-capacitor')&&r.z>=1900&&!s.used['boost-capacitor']||run.loadout.includes('repair-reserve')&&r.z>=6800&&!s.used['repair-reserve'])return 'An earned trigger cannot be deferred.';
 const repaired=r.picked.filter(i=>!p?.picked?.includes(i)).length*20+(!old?.used?.['repair-reserve']&&s.used['repair-reserve']?10:0);
 if(r.hp>(p?.hp??100)+repaired||r.boost>(p?.boost??1)+dt/10+(!old?.used?.['boost-capacitor']&&s.used['boost-capacitor']?.25:0)+.002)return 'Resources cannot be created.';
 if(!Number.isInteger(s.guideStep)||s.guideStep<(old?.guideStep||0)||s.guideStep>6||run.mode==='action'&&s.guideStep!==0)return 'Invalid guided progress.';
 if(input.type==='minigame.complete'){
  if(!['success','lost','timed_out','assisted_completed'].includes(input.outcome)||s.outcome!==input.outcome)return 'Invalid BLACKLINE outcome.';
  if(input.outcome==='success'&&(run.mode!=='action'||r.mode!=='result'||r.reason!=='escaped'||r.z<14500||r.landings!==3||r.hp<=0||s.time>=300))return 'Complete all three jumps and reach the exit alive.';
  if(input.outcome==='assisted_completed'&&(run.mode!=='assisted'||s.guideStep!==6))return 'Complete the guided route separately.';
  if(input.outcome==='lost'&&(run.mode!=='action'||r.mode!=='result'||!['destroyed','jump-too-slow','missed-landing','missed-ramp'].includes(r.reason)||r.reason==='destroyed'&&r.hp!==0))return 'A failed run needs a recorded cause.';
  if(input.outcome==='timed_out'&&elapsed<300000)return 'The active limit has not elapsed.';
 }else if(s.outcome||r.mode==='result')return 'Terminal states require a completion command.';
 return null;
}
