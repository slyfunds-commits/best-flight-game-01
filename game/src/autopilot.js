// autopilot.js — a simple pilot for staged screenshots and the headless
// playtest. It steers toward the next ring, holds an altitude band, and
// flares for landing. It flies the same physics the player flies, so a leg
// the autopilot can finish is a leg a player can finish.

import { dist2d } from './flight.js';
import { terrainHeight } from './terrain.js';

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
  // Sign check (verified in node: the inverted sign flew the plane 75 km
  // southwest of ring 1): aileron > 0 banks right, banking right DECREASES
  // flight.heading, so a negative dh (desired below heading) needs a
  // POSITIVE aileron. The roll term damps the bank back toward level.
  const aileron = Math.max(-1, Math.min(1, -dh * 1.4 - flight.roll * 1.2));

  // Altitude: hold the band, climb early, descend late. On final, fly a
  // glide slope RELATIVE to the destination strip's ground height — the
  // strips sit on island slopes (Marrow ~50 m, Dusk Point ~124 m), so an
  // absolute-altitude slope flew the plane into the hillside short of the
  // strip on the two return-home legs (Night Mail 300 m short, Medicine
  // Crate 346 m short).
  if (ap.phase === 'land') {
    const ground = target.ground || 0;
    ap.targetAlt = ground + Math.max(8, Math.min(70, 10 + dist * 0.1));
  }
  const altErr = ap.targetAlt - flight.y;
  let elevator = Math.max(-0.8, Math.min(0.8, altErr * 0.012 - flight.pitch * 1.6));
  if (ap.phase === 'land' && dist < 250) {
    // Flare, only on short final: level off just above the strip surface,
    // bleed speed, settle.
    const ground = target.ground || 0;
    elevator = Math.max(-0.4, Math.min(0.6, (ground + 2 - flight.y) * 0.05 - flight.pitch * 2));
  }

  // Throttle: cruise power, ease off when fast or close, idle on final.
  // On final, bleed speed early so the plane arrives at the strip slow
  // enough to stop on it instead of overshooting into the far terrain.
  let throttleDelta = 0;
  const want = ap.phase === 'land' ? (dist < 400 ? 0.12 : 0.3) : 0.62;
  const err = want - flight.throttle;
  throttleDelta = Math.max(-0.8, Math.min(0.8, err * 1.5));
  if (flight.speed > 52) throttleDelta = Math.min(throttleDelta, -0.4);

  return {
    aileron,
    elevator,
    throttleDelta,
    flaps: ap.phase === 'land' && dist < 700,
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
    return { x: destStrip.x, z: destStrip.z, y: 20, ring: false, ground: terrainHeight(destStrip.x, destStrip.z) };
  }
  ap.targetAlt = 60;
  return { x: leg.rings[leg.rings.length - 1].x, z: leg.rings[leg.rings.length - 1].z, y: 20, ring: false, ground: 0 };
}

export function ringReached(flight, ring, radius) {
  return dist2d(flight.x, flight.z, ring.x, ring.z) < (radius || 55) && Math.abs(flight.y - ring.y) < 55;
}
