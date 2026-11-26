// flight.js — the arcade flight model for Last Light Mail. Pure math, no DOM,
// no three.js: node can import and unit-test it directly.
//
// Units: metres, seconds, radians. Speed in m/s (1 kt = 0.514 m/s).
// The model: thrust + drag for momentum, quaternion-style banking (banking
// induces yaw, no snap-turns), speed bleeds in climbs, soft stall, and the
// cargo weight physically retunes the aircraft — heavy crates climb slower,
// turn wider and roll longer on landing.

export const KNOT = 0.514444;

export function createFlight(opts) {
  const cargoKg = opts.cargoKg || 0;
  // Weight factor 0..1: a 400 kg load is the heaviest the old mail plane takes.
  const wf = Math.min(1, Math.max(0, cargoKg / 400));
  return {
    x: opts.x || 0,
    y: opts.y || 2,
    z: opts.z || 0,
    heading: opts.heading || 0, // radians, 0 = +north (-z in world)
    pitch: 0,
    roll: 0,
    speed: opts.speed || 0,
    throttle: opts.throttle || 0,
    fuel: opts.fuel ?? 100, // percent of tank
    damage: 0,
    cargoKg,
    weightFactor: wf,
    // Derived tuning, set by the cargo weight.
    maxThrust: 15.5 * (1 - 0.28 * wf),
    stallSpeed: 16 + 4 * wf,
    rollRate: 1.7 * (1 - 0.25 * wf),
    flaps: false,
    onGround: true,
    sinkRate: 0,
    time: 0,
    stalled: false,
  };
}

// One physics step. input: { aileron, elevator, throttleDelta, flaps }.
// wind: { x, z } drift in m/s. terrainHeight(x, z) -> ground metres.
// Returns an event object: { crashed, ditched, landed, bounced, grade }.
export function stepFlight(f, input, dt, wind, terrainHeight) {
  const ev = { crashed: false, ditched: false, landed: false, bounced: false, grade: null };

  // Throttle lever.
  f.throttle = Math.min(1, Math.max(0, f.throttle + (input.throttleDelta || 0) * dt));
  f.flaps = !!input.flaps;

  // Control authority fades near the stall — mushy controls, not dead ones.
  const authority = Math.min(1, Math.max(0.25, f.speed / Math.max(1, f.stallSpeed)));

  // Roll: aileron banks, and the wings ease back level when you let go.
  const rollTarget = (input.aileron || 0) * 0.9;
  f.roll += ((rollTarget - f.roll) * 2.2 * authority + (input.aileron || 0) * f.rollRate * authority * 0.4) * dt;
  f.roll = Math.max(-1.1, Math.min(1.1, f.roll));
  if (!(input.aileron || 0)) f.roll *= Math.max(0, 1 - 1.4 * dt);

  // Pitch: elevator, capped so the plane cannot loop itself apart.
  f.pitch += (input.elevator || 0) * 0.55 * authority * dt;
  f.pitch = Math.max(-0.45, Math.min(0.5, f.pitch));

  // Banking induces yaw — the turn comes from the bank, never from a rudder snap.
  f.heading -= Math.sin(f.roll) * f.speed * 0.011 * dt;

  // Soft stall: below stall speed the nose drops and the plane sinks.
  f.stalled = f.speed < f.stallSpeed && !f.onGround;
  if (f.stalled) {
    f.pitch = Math.max(-0.45, f.pitch - 0.5 * dt);
  }

  // Thrust vs drag, with gravity along the flight path.
  const dragK = 0.0046 + (f.flaps ? 0.004 : 0);
  const thrust = f.throttle * f.maxThrust;
  const drag = dragK * f.speed * f.speed;
  let accel = thrust - drag - Math.sin(f.pitch) * 9.81 * 0.85;
  if (f.onGround) {
    // Rolling resistance on the strip, and no lift until rotation speed.
    accel -= 1.6;
    if (f.speed > f.stallSpeed * 0.9 && f.pitch > 0.08) f.onGround = false;
  }
  f.speed = Math.max(0, f.speed + accel * dt);

  // Velocity along the heading, pitched up or down.
  const cosP = Math.cos(f.pitch);
  const vx = -Math.sin(f.heading) * cosP * f.speed;
  const vz = -Math.cos(f.heading) * cosP * f.speed;
  const vy = Math.sin(f.pitch) * f.speed;
  f.sinkRate = -vy;

  // Wind shoves the whole aircraft — the forecast is something you fly, not read.
  f.x += (vx + (wind ? wind.x : 0)) * dt;
  f.z += (vz + (wind ? wind.z : 0)) * dt;
  f.y += vy * dt;

  // Fuel burn: thirsty at full throttle, sipping at idle.
  f.fuel = Math.max(0, f.fuel - (0.02 + f.throttle * 0.075) * dt);
  f.time += dt;

  // Water first: below sea level over the sea is a ditch, never a landing.
  // (Checked before ground contact — the sea floor sits metres below the waves.)
  const ground = terrainHeight(f.x, f.z);
  if (ground < 0.5 && f.y <= 1.0) {
    ev.ditched = true;
    ev.crashed = true;
    return ev;
  }

  // Ground contact on dry land.
  if (f.y <= ground + 1.2) {
    f.y = ground + 1.2;
    if (f.onGround) return ev; // already rolling on the strip
    // Touchdown: grade it by sink rate, speed and wings level.
    const sink = f.sinkRate;
    const level = Math.abs(f.roll) < 0.25 && Math.abs(f.pitch) < 0.15;
    if (sink > 6.5 || f.speed > 42) {
      // Came in too hot or too hard: bounce hard, airframe takes it.
      f.damage += 30;
      f.speed *= 0.55;
      f.y = ground + 6;
      f.pitch = 0.12;
      ev.bounced = true;
      if (f.damage >= 100) ev.crashed = true;
      return ev;
    }
    if (sink > 4.5) {
      f.damage += 12;
      ev.bounced = true;
      f.y = ground + 3;
      f.speed *= 0.7;
      return ev;
    }
    f.onGround = true;
    f.pitch = 0;
    f.roll = 0;
    ev.landed = true;
    ev.grade = gradeLanding(sink, f.speed, level);
  }

  return ev;
}

function gradeLanding(sink, speed, level) {
  if (sink < 1.6 && speed < 26 && level) return 'Butter smooth';
  if (sink < 2.8 && speed < 30 && level) return 'Clean';
  if (sink < 4.5) return 'Firm, but down';
  return 'A landing is a landing';
}

// Distance in metres between two points (x, z plane).
export function dist2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

// Heading in degrees, 0..359, from a heading in radians.
export function headingDeg(heading) {
  let d = (-heading * 180) / Math.PI;
  d = ((d % 360) + 360) % 360;
  return Math.round(d);
}
