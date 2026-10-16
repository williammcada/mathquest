// Backward-compatible import; new callers should use the game registry.
import {GameHost} from './engine/game-host.js?v=0.14.1';
import {gameFor} from './games/registry.js?v=0.14.1';
import {NIGHTFALL,cartridgeFor} from './cartridges.js?v=0.14.1';
import {rescueAdapter} from './games/nightfall/rescue-adapter.js?v=0.14.1';
export class FinaleHost extends GameHost{constructor(root,options){const c=cartridgeFor(options.cartridgeId)||NIGHTFALL;super(root,{...options,adapter:options.run.phase==='early-rescue'?rescueAdapter:gameFor(c.gameId),items:c.items});}}
