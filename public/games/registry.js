import {ironbreakAdapter} from './shooter/adapter.js';
import {blacklineAdapter} from './blackline/adapter.js?v=0.2.0';
import {falseHavenAdapter} from './nightfall/false-haven-adapter.js?v=0.9.8';
import {nightfallAdapter} from './nightfall/adapter.js?v=0.9.8';
// Vault 7 retains its verified runtime. Both games have explicit practice entries.
export const GAME_REGISTRY=Object.freeze({
 'blackline-racer':{adapter:blacklineAdapter,practice:'./blackline-preview.html'},
 'false-haven':{adapter:falseHavenAdapter,practice:'./practice-false-haven.html'},
 ironbreak:{adapter:ironbreakAdapter,practice:'./practice-shooter.html'},
 'topdown-combat':{adapter:nightfallAdapter,practice:'./practice-nightfall.html'},
 stealth:{runtime:'./stealth.js',practice:'./dev-extraction.html'}
});
export function gameFor(id){const item=GAME_REGISTRY[id];if(!item?.adapter)throw new Error('This game uses its preserved cartridge runtime.');return item.adapter;}
