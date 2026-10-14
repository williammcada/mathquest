import {journeyServer} from './journey/server.js';
import {advanceIronbreak} from './ironbreak/server.js';
import {vault7Server} from './vault-7/server.js';
import {advanceExpansion} from '../expansion.js';
const registry=new Map([
 ['ironbreak',{advance(team){return advanceIronbreak(this,team);}}],
 ['journey-west',journeyServer],
 ['vault-7',vault7Server],
 ['blackline',{advance(team){return advanceExpansion(this,team);}}],
 ['kingsgate',{advance(team){return advanceExpansion(this,team);}}],
 ['blackout-protocol',{advance(team){return advanceExpansion(this,team);}}],
 ['nightfall-false-haven',{advance(team){return advanceExpansion(this,team);}}],

 ['coastal-escape',{advance(team){return advanceExpansion(this,team);}}],
 ['nightfall',{advance(team){return advanceExpansion(this,team);}}]
]);
export function serverFor(room){const adapter=registry.get(room.state.config.cartridgeId);if(!adapter)throw new Error('Unsupported cartridge.');return adapter;}
