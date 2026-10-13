import {createGame,step,clearInput} from './simulation.js';
import {render} from './renderer.js';
import {CONFIG} from './config.js';
export const ironbreakAdapter={id:'ironbreak',title:'Ironbreak',revision:'ironbreak-0.2.0',dimensions:[640,360],stepSize:CONFIG.step,
 create(run){const s=run.snapshot?structuredClone(run.snapshot):createGame({upgrades:run.loadout,timed:false});clearInput(s);s.bullets=[];s.effects=[];return s;},
 step,render,snapshot:s=>structuredClone(s)};
