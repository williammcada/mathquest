// Shared by the Blackout Protocol adapter (browser) and its Worker validator.
// Snapshot format follows the vendored core: 'blackout-core-<core VERSION>' (must equal BLACKOUT.mapRevision).
export const revisionFor = (coreVersion) => 'blackout-core-' + coreVersion;
export const ITEM_TO_CORE = Object.freeze({ 'spare-fuse': 'spareFuse', 'grid-scanner': 'scanner', 'surge-stabilizer': 'stabilizer' });
export const coreEquipment = (loadout) => (loadout || []).map((id) => ITEM_TO_CORE[id]).filter(Boolean);
export const OUTCOMES = Object.freeze(['success', 'partial', 'lost', 'timed_out', 'assisted_completed']);
