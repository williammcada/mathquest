import {nightfallAdapter} from './adapter.js?v=0.14.2';
import {restoreRescue,stepRescue,assistedRescue} from './rescue.js?v=0.14.2';
import {RESCUE_REVISION,rescueCaller} from './rescue-world.js?v=0.14.2';
export const rescueAdapter={
 ...nightfallAdapter,id:'nightfall-rescue',title:'Nightfall · First Response · v1.1.0',revision:RESCUE_REVISION,commandPrefix:'rescue',
 canvasLabel:'Rescue the selected caller and escort them to the terminal',kitText:'Pistol · 15 rounds · 3 health · no equipment',
 instructions:'Reach the survivor and bring them back to the station. You can retry while the rescue timer is running. A retry does not restart the timer. Follow the south road, alley, then north road. The front door is locked; break either side window. Use the gas tank or alarm to divert the infected. Your survivor follows safely; you can still be hurt on the way back.',
 resultLabels:{success:'Escort completed',lost:'Try again — timer still running',time_window_closed:'Rescue window closed',teacher_closed:'Rescue closed by your teacher',not_started:'Rescue window closed'},
 resultText:'Your rescue record is closed. Wait for the crew, then check the repair plan at Gate 2.',
 create:run=>restoreRescue(run.snapshot,run.route),step:stepRescue,
 objective:s=>s.tasks.recruit?`Escort ${rescueCaller(s.route)} to the terminal${s.prompt?' · '+s.prompt:''}`:`Find ${rescueCaller(s.route)} · south road → alley → north road${s.prompt?' · '+s.prompt:''}`,
 progress:s=>Object.keys(s.tasks).filter(k=>s.tasks[k]),
 assisted(s,root,onProgress){
  const labels=['Follow the south road to the alley','Divert the north-road infected with the car alarm','Break and enter the clinic / garage side window',`Speak with ${rescueCaller(s.route)}`,`Escort ${rescueCaller(s.route)} back through the alley to the terminal`];
  root.innerHTML='<h2>First Response · assisted route</h2><p>Choose the next safe step. The shared rescue timer keeps running. This is engagement evidence, not an action-skill score.</p><button data-next></button>';
  const button=root.querySelector('[data-next]');button.textContent=labels[s.assistedStep||0]||labels[4];
  button.onclick=()=>{assistedRescue(s);onProgress();};
 }
};
