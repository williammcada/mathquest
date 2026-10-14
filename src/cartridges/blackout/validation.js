// Blackout Protocol run validation (Stage B spec §6). Returns an error message or null.
// Envelope checks like other cartridges, plus a real re-check of every restored district:
// the board is rebuilt from the run's seed (= runId) and the reported rotations must power it.
// Timing and the order of taps remain client-reported; this is not anti-cheat.
import C from '../../../public/games/blackout/core.js';
import { revisionFor, coreEquipment, OUTCOMES } from '../../../public/games/blackout/config.js';
const int = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
const STATS = ['rotations', 'energizeAttempts', 'fusesBlown', 'scansUsed', 'stormTurns'];
export function validateBlackout(run, input) {
  const s = input.snapshot, old = run.snapshot, g = s?.game, p = old?.game, elapsed = input.activeElapsedMs;
  if (!s || !g || s.revision !== revisionFor(C.VERSION) || s.runId !== run.runId || s.mode !== run.mode || JSON.stringify(s.loadout) !== JSON.stringify(run.loadout)) return 'Invalid Blackout Protocol configuration.';
  const equipment = coreEquipment(run.loadout);
  if (g.version !== C.VERSION || g.seed !== run.runId || g.startDistrict !== 0 || JSON.stringify([...(g.equipment || [])].sort()) !== JSON.stringify([...equipment].sort())) return 'Invalid panel configuration.';
  if (!Number.isFinite(s.time) || s.time < 0 || s.time > 300 || Math.abs(s.time * 1000 - elapsed) > 2) return 'Invalid run clock.';
  if (!Number.isFinite(g.elapsedMs) || g.elapsedMs < (p?.elapsedMs || 0) || g.elapsedMs > elapsed + 2) return 'Invalid panel clock.';
  const fusesMax = C.RULES.fuses + (equipment.includes('spareFuse') ? 1 : 0);
  if (g.fusesMax !== fusesMax || !int(g.fuses, 0, fusesMax) || g.fuses > (p?.fuses ?? fusesMax)) return 'Fuses cannot be restored.';
  if (!g.stats || STATS.some((k) => !int(g.stats[k], p?.stats?.[k] || 0, 100000))) return 'Panel counters cannot rewind.';
  if (g.stats.fusesBlown !== fusesMax - g.fuses) return 'Fuse count does not match blown fuses.';
  if (g.scanUsed && !equipment.includes('scanner') || g.stats.scansUsed > 0 && !equipment.includes('scanner')) return 'The Grid Scanner was not issued.';
  if (!Array.isArray(g.restored) || g.restored.length > C.DISTRICTS.length || g.restored.some((d, i) => d !== i)) return 'Districts must be restored in order.';
  if ((p?.restored?.length || 0) > g.restored.length) return 'Restored districts cannot be removed.';
  if (!int(g.district, 0, C.DISTRICTS.length - 1) || ![g.restored.length, g.restored.length - 1].includes(g.district)) return 'Invalid current district.';
  if (!g.solved || typeof g.solved !== 'object' || Object.keys(g.solved).length !== g.restored.length) return 'Missing solved boards.';
  for (const d of g.restored) {
    if (p?.solved?.[d] && JSON.stringify(p.solved[d]) !== JSON.stringify(g.solved[d])) return 'A restored district cannot be rewired.';
    if (!p?.solved?.[d] && !C.verifySolved(d, run.runId, g.solved[d])) return `District ${d + 1} is not actually connected.`;
  }
  if (typeof g.guided !== 'boolean' || (p?.guided && !g.guided) || (run.mode === 'action' && g.guided)) return 'Invalid guided route state.';
  const n = g.restored.length;
  if (input.type === 'minigame.complete') {
    if (!OUTCOMES.includes(input.outcome) || s.outcome !== input.outcome) return 'Invalid Blackout Protocol outcome.';
    if (input.outcome === 'success' && (run.mode !== 'action' || n !== 5 || g.guided)) return 'Restore all five districts without the guided route.';
    if (input.outcome === 'assisted_completed' && (run.mode !== 'assisted' || n !== 5 || !g.guided)) return 'Complete the guided route separately.';
    if (input.outcome === 'partial' && (n < 1 || n > 4 || (g.fuses !== 0 && elapsed < 299998))) return 'A partial result needs a used-up panel or clock.';
    if (input.outcome === 'lost' && (g.fuses !== 0 || n !== 0)) return 'A lost panel needs zero fuses and no restored district.';
    if (input.outcome === 'timed_out' && elapsed < 299998) return 'The active limit has not elapsed.';
  } else if (s.outcome) return 'Terminal states require a completion command.';
  return null;
}
