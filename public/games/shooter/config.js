export const BUILD = 'shooter-0.2.0';
export const CONFIG = Object.freeze({
  step: 1 / 60, width: 640, height: 360,
  bodyWidth: 20, bodyHeight: 28, crouchHeight: 16, proneHeight: 10,
  runSpeed: 180, swimSpeed: 110, climbSpeed: 90, jump: 380, gravity: 1000,
  coyote: .08, jumpBuffer: .10, immunity: 1, spawnImmunity: 1.5,
  shotPeriod: .16, shotSpeed: 520, shotLife: 1.2, spreadAngle: Math.PI / 12,
  lives: 3, windowMs: 300000, maxBullets: 150, maxEffects: 80,
  bossHP: 180,
});
export const UPGRADES = Object.freeze(['spread', 'armor', 'agility']);
export const ENEMY = Object.freeze({
  patrol: {hp:4,warn:.65, rest:1.2, speed:210, burst:3},
  turret: {hp:5,warn:.8, rest:1.5, speed:205, burst:2},
  drone: {hp:3,warn:.7, rest:1.6, speed:180, burst:1},
  heavy: {hp:12,warn:1, rest:1.8, speed:195, burst:3},
  lobber: {hp:5,warn:.9, rest:2.2, speed:150, burst:1},
  skimmer: {hp:4,warn:.8, rest:1.8, speed:180, burst:1},
});
