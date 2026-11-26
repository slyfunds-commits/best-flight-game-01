// autopilot.js — a simple pilot for staged screenshots and the headless
// playtest. It steers toward the next ring, holds an altitude band, and
// flares for landing. It flies the same physics the player flies, so a leg
// the autopilot can finish is a leg a player can finish.

import { dist2d } from './flight.js';

export function createAutopilot() {
  return { active: false, targetAlt: 160, phase: 'rings' };
}

// Reset the autopilot between legs or after a crash.
export function resetAutopilot(ap) {
  ap.active = false;
  ap.targetAlt = 160;
  ap.phase = 'rings';
}

// Compute control inputs for this frame. Returns { aileron, elevator,
// throttleDelta, flaps } in the same shape as input.read().
export function autopilotInput(ap, flight, target, dt, wind) {
  const dx = target.x - flight.x;
  const dz = target.z - flight.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  // Desired heading: point at the target, crabbed against the wind.
  let desired = Math.atan2(-dx, -dz);
  if (wind) {
    // Aim upwind of the target so the drift carries us onto it.
    const crab = Math.min(0.5, (Math.abs(wind.x) + Math.abs(wind.z)) / Math.max(20, flight.speed));
    desired += (wind.x > 0 ? -1 : 1) * crab * 0.4;
  }
  let dh = desired - flight.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  const aileron = Math.max(-1, Math.min(1, dh * 1.4 - flight.roll * 1.2));

  // Altitude: hold the band, climb early, descend late.
  const altErr = ap.targetAlt - flight.y;
  let elevator = Math.max(-0.8, Math.min(0.8, altErr * 0.012 - flight.pitch * 1.6));
  if (ap.phase === 'land') {
    // Flare: level off low, bleed speed, settle.
    elevator = Math.max(-0.4, Math.min(0.6, (12 - flight.y) * 0.02 - flight.pitch * 2));
  }

  // Throttle: cruise power, ease off when fast or close, idle on final.
  let throttleDelta = 0;
  const want = ap.phase === 'land' ? 0.18 : 0.62;
  const err = want - flight.throttle;
  throttleDelta = Math.max(-0.8, Math.min(0.8, err * 1.5));
  if (flight.speed > 52) throttleDelta = Math.min(throttleDelta, -0.4);

  return {
    aileron,
    elevator,
    throttleDelta,
    flaps: ap.phase === 'land' && dist < 600,
  };
}

// Where to aim next: the next unpassed ring, then the destination strip.
export function autopilotTarget(ap, leg, ringsPassed, destStrip) {
  if (ringsPassed < leg.rings.length) {
    const r = leg.rings[ringsPassed];
    ap.phase = 'rings';
    ap.targetAlt = r.y;
    return { x: r.x, z: r.z, y: r.y, ring: true };
  }
  ap.phase = 'land';
  if (destStrip) {
    ap.targetAlt = 60;
    return { x: destStrip.x, z: destStrip.z, y: 20, ring: false };
  }
  ap.targetAlt = 60;
  return { x: leg.rings[leg.rings.length - 1].x, z: leg.rings[leg.rings.length - 1].z, y: 20, ring: false };
}

export function ringReached(flight, ring, radius) {
  return dist2d(flight.x, flight.z, ring.x, ring.z) < (radius || 55) && Math.abs(flight.y - ring.y) < 55;
}
