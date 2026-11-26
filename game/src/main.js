// main.js — Last Light Mail: boot, state machine, game loop.
// States: briefing → flying → logbook | crash. The render loop runs in every
// state so the world is alive behind the panels.

import { createRenderer, buildAircraft, buildRings, markRingPassed, updateCamera, updateAircraft, updateHUD, drawMinimap, animateWorld } from './render.js';
import { terrainHeight } from './terrain.js';
import { createFlight, stepFlight, headingDeg, KNOT } from './flight.js';
import { LEGS, legById, totalCargoKg, windVector, stripForLeg, destStripForLeg } from './legs.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { showBriefing, showLogbook, showCrash, showHUD, setNarration, setCenterMsg } from './screens.js';
import { createAutopilot, autopilotInput, autopilotTarget, ringReached } from './autopilot.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const AUTO = params.get('auto') === '1';

const canvas = document.getElementById('scene');
const R = createRenderer(canvas);
const aircraft = buildAircraft(R.scene);
const input = createInput();
const audio = createAudio();
const ap = createAutopilot();

let legIndex = 0;
let leg = LEGS[0];
let flight = null;
let rings = [];
let ringsPassed = 0;
let state = 'briefing';
let fuelChoice = 'standard';
let duskLeft = leg.duskMinutes * 60;
let cameraMode = 'chase';
let paused = false;
let night = false;
let bestTimes = {}; // leg id -> best seconds, this session
let orbitT = 0;
let lastTs = 0;
let msgTimer = 0;

const FUEL_START = { light: 55, standard: 80, full: 100 };

function setLeg(i) {
  legIndex = i;
  leg = LEGS[i];
  const strip = stripForLeg(leg);
  const startFuel = FUEL_START[fuelChoice];
  flight = createFlight({
    x: strip.x,
    y: terrainHeight(strip.x, strip.z) + 1.2,
    z: strip.z,
    heading: strip.heading,
    fuel: startFuel,
    cargoKg: totalCargoKg(leg),
  });
  // Clear old rings.
  for (const r of rings) {
    R.scene.remove(r.mesh);
    R.scene.remove(r.glow);
  }
  rings = buildRings(R.scene, leg.rings);
  ringsPassed = 0;
  duskLeft = leg.duskMinutes * 60;
  night = !!leg.night;
  setNight(night);
  setNarration(leg.narration);
}

function setNight(on) {
  night = on;
  if (on) {
    R.scene.background.set(0x0a1622);
    R.scene.fog.color.set(0x1a2c3e);
  } else {
    R.scene.background.set(0x2a4a5e);
    R.scene.fog.color.set(0xd8a06a);
  }
}

function startLeg() {
  audio.unlock();
  setLeg(legIndex);
  showHUD();
  state = 'flying';
  setCenterMsg('Take off — full throttle, gentle pull');
  msgTimer = 3;
}

function finishLeg() {
  const timeSec = flight.time;
  const best = bestTimes[leg.id];
  const newBest = best === undefined || timeSec < best;
  if (newBest) bestTimes[leg.id] = timeSec;
  const bestStr = bestTimes[leg.id] !== undefined ? fmtTime(bestTimes[leg.id]) : '—';
  state = 'logbook';
  audio.stamp();
  const grade = lastLandingGrade || 'Clean';
  showLogbook({
    legName: leg.name,
    from: leg.from,
    to: leg.to,
    timeSec,
    fuelLeft: flight.fuel,
    landingGrade: grade,
    rings: ringsPassed,
    ringsTotal: leg.rings.length,
    letters: totalCargoKg(leg) + ' kg of mail',
    best: bestStr + (newBest ? '  ·  NEW BEST' : ''),
    newBest,
  }).then((choice) => {
    if (choice === 'next') {
      legIndex = (legIndex + 1) % LEGS.length;
      openBriefing();
    } else {
      openBriefing();
    }
  });
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + 'm ' + String(sec).padStart(2, '0') + 's';
}

let lastLandingGrade = 'Clean';

function crash(title, text) {
  state = 'crash';
  audio.thud();
  showCrash(title, text).then(() => openBriefing());
}

function openBriefing() {
  setLeg(legIndex);
  state = 'briefing';
  const fuelHandler = (choice) => {
    fuelChoice = choice;
    openBriefing();
  };
  showBriefing(leg, fuelChoice, startLeg, fuelHandler);
}

function nearStrip(x, z, strip, radius) {
  if (!strip) return false;
  const dx = x - strip.x;
  const dz = z - strip.z;
  return dx * dx + dz * dz < radius * radius;
}

function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0.016);
  lastTs = ts;
  const t = ts / 1000;

  // Global keys.
  if (input.wasPressed('p') && state === 'flying') {
    paused = !paused;
    setCenterMsg(paused ? 'Paused — P to resume' : '');
  }
  if (input.wasPressed('m')) {
    const m = audio.toggleMute();
    setNarration(m ? 'Sound off.' : 'Sound on.');
  }
  if (input.wasPressed('c') && state === 'flying') {
    cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
  }

  if (state === 'briefing') {
    // Slow orbit over the home strip behind the board.
    orbitT += dt * 0.05;
    const cx = Math.cos(orbitT) * 500;
    const cz = Math.sin(orbitT) * 500 - 260;
    R.camera.position.set(cx, 260, cz);
    R.camera.lookAt(0, 40, -260);
    R.camera.fov = 60;
    R.camera.updateProjectionMatrix();
    animateWorld(R.world, t, night);
    R.renderer.render(R.scene, R.camera);
    return;
  }

  if (state !== 'flying' || paused) {
    // Logbook / crash screens still render the world behind them.
    if (flight) {
      updateAircraft(aircraft, flight, dt);
      updateCamera(R, flight, cameraMode, dt);
    }
    animateWorld(R.world, t, night);
    R.renderer.render(R.scene, R.camera);
    return;
  }

  // --- flying ---
  const wind = windVector(leg, flight.time);
  const ctrl = AUTO
    ? autopilotInput(ap, flight, autopilotTarget(ap, leg, ringsPassed, destStripForLeg(leg) || stripForLeg(leg)), dt, wind)
    : input.read(dt);
  const ev = stepFlight(flight, ctrl, dt, wind, terrainHeight);
  const windSpeed = Math.sqrt(wind.x * wind.x + wind.z * wind.z);

  // Rings.
  if (ringsPassed < leg.rings.length && ringReached(flight, leg.rings[ringsPassed])) {
    markRingPassed(rings[ringsPassed]);
    ringsPassed++;
    audio.ring();
    setNarration(ringsPassed >= leg.rings.length ? 'All rings flown. Bring her home to the strip.' : 'Ring ' + ringsPassed + ' of ' + leg.rings.length + ' — on the route.');
    setCenterMsg('Ring ' + ringsPassed + ' ✓');
    msgTimer = 1.6;
  }

  // Dusk clock.
  duskLeft = Math.max(0, leg.duskMinutes * 60 - flight.time);
  if (duskLeft === 0 && !flight._duskWarned) {
    flight._duskWarned = true;
    setNarration('The light is gone. Bring her in — instruments only from here.');
  }

  // Fuel out: the engine quits and you glide.
  if (flight.fuel <= 0 && flight.throttle > 0) {
    flight.throttle = 0;
    setNarration('Fuel gone. You are a glider now — pick your field.');
  }

  // Landing / crash outcomes.
  if (ev.landed) {
    lastLandingGrade = ev.grade || 'Clean';
    const dest = destStripForLeg(leg);
    if (dest && nearStrip(flight.x, flight.z, dest, 260)) {
      finishLeg();
    } else if (nearStrip(flight.x, flight.z, stripForLeg(leg), 260)) {
      finishLeg();
    } else {
      crash('Put her down in a field', 'You landed short of the strip — the mail is safe, the plane needs a tow, and the islanders are already walking over.');
    }
  } else if (ev.ditched) {
    crash('Dit​ched in the lagoon', 'The sea took the mail run. The letters are drying on a rock somewhere; the plane is not.');
  } else if (ev.crashed) {
    crash('Airframe written off', 'The old mail plane gave everything she had. The mail, at least, was insured.');
  } else if (ev.bounced) {
    audio.thud();
    setNarration('A bounce — she is still flying. Settle her gently this time.');
  }

  if (msgTimer > 0) {
    msgTimer -= dt;
    if (msgTimer <= 0) setCenterMsg('');
  }

  // Render + HUD.
  updateAircraft(aircraft, flight, dt);
  updateCamera(R, flight, cameraMode, dt);
  updateHUD(flight, leg, ringsPassed, leg.rings.length, duskLeft, leg.wind.name, windSpeed);
  drawMinimap(flight, leg, ringsPassed);
  animateWorld(R.world, t, night);
  audio.engine(flight.throttle, flight.speed);
  R.renderer.render(R.scene, R.camera);
}

// Context the staged screenshot driver needs.
const G = {
  get flight() { return flight; },
  setLeg,
  setState(s) { state = s; },
  get rings() { return rings; },
  renderer: R,
  aircraft,
  setNight,
  showLogbook,
  setNarration,
  showHUD,
  markRingsPassed(n) {
    for (let i = 0; i < n && i < rings.length; i++) markRingPassed(rings[i]);
    ringsPassed = n;
  },
};

window.__game = {
  get state() { return state; },
  get flight() { return flight; },
  get leg() { return leg; },
  get ringsPassed() { return ringsPassed; },
  setLeg,
  startLeg,
};

openBriefing();
if (AUTO) {
  // Headless playtest: start the leg by itself so the autopilot can fly it.
  setTimeout(() => document.getElementById('takeoff-btn').click(), 600);
}
if (SHOT) {
  // Staged capture: skip the briefing, pose the game, raise __shotReady.
  applyShot(G, SHOT, () => {});
}
requestAnimationFrame(frame);
