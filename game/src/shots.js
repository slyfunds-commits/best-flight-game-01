// shots.js — staged screenshot driver for Last Light Mail.
// ?shot=cover | night | logbook | phone — each poses the game in a real,
// running state (never a mock), waits for the render to settle, then raises
// window.__shotReady so the capture waits for the picture, not the clock.

import { LEGS } from './legs.js';

// Poses: leg index, aircraft state, which rings are already passed, narration.
const POSES = {
  cover: {
    leg: 0,
    pose: { x: 180, y: 168, z: -850, heading: -0.51, pitch: 0.02, roll: -0.12, speed: 42, throttle: 0.72, fuel: 71 },
    ringsPassed: 1,
    narration: 'First light over the chain. The mail is aboard, the strip is clear.',
  },
  night: {
    leg: 2,
    pose: { x: -350, y: 178, z: 1300, heading: 0.46, pitch: 0.03, roll: 0.1, speed: 40, throttle: 0.68, fuel: 66 },
    ringsPassed: 1,
    night: true,
    narration: 'Night mail. The lighthouse is sweeping — follow it home.',
  },
  phone: {
    leg: 0,
    pose: { x: 180, y: 168, z: -850, heading: -0.51, pitch: 0.02, roll: -0.12, speed: 42, throttle: 0.72, fuel: 71 },
    ringsPassed: 1,
    narration: 'First light over the chain. The mail is aboard, the strip is clear.',
  },
};

export function shotNames() {
  return Object.keys(POSES);
}

// G: the game context from main.js — { flight, setLeg, rings, renderer,
// aircraft, setNight, showLogbook, setNarration, showHUD, updateHUD }.
// Calls done() when the frame is ready to capture.
export function applyShot(G, name, done) {
  if (name === 'logbook') {
    G.showLogbook({
      legName: 'First Light',
      from: 'Marrow Cay',
      to: 'Gull Rock',
      timeSec: 218,
      fuelLeft: 61,
      landingGrade: 'Butter smooth',
      rings: 3,
      ringsTotal: 3,
      letters: '3 letters + 1 parcel',
      best: '3m 38s',
      newBest: true,
    }).catch(() => {});
    setTimeout(() => {
      window.__shotReady = true;
      done();
    }, 600);
    return;
  }
  const pose = POSES[name];
  if (!pose) {
    window.__shotReady = true;
    done();
    return;
  }
  const leg = LEGS[pose.leg];
  G.setLeg(pose.leg);
  G.setState('flying');
  const f = G.flight;
  Object.assign(f, pose.pose);
  f.onGround = false;
  f.time = 62;
  if (pose.night) G.setNight(true);
  G.markRingsPassed(pose.ringsPassed);
  G.setNarration(pose.narration);
  G.showHUD();
  // Let the chase camera settle behind the aircraft and the rings glow.
  let frames = 0;
  function tick() {
    frames++;
    if (frames >= 45) {
      window.__shotReady = true;
      done();
      return;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
