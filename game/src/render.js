// render.js — the visible game: aircraft, chase camera, rings, HUD and minimap.
// The camera does half the flying: spring-arm lag, FOV that stretches with
// speed, and a cockpit view for pilots who want the instruments up close.

import * as THREE from 'three';
import { buildWorld, terrainHeight, ISLANDS } from './terrain.js';
import { headingDeg } from './flight.js';

const RING_COLOR = 0xffb347;
const RING_DONE = 0x8fd694;

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 12000);
  const world = buildWorld(scene);
  const cam = { pos: new THREE.Vector3(0, 60, 200), look: new THREE.Vector3(), fov: 62 };

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, world, cam };
}

// A bush plane built from primitives: cream fuselage, red trim, a spinning
// prop, fixed gear. It looks built, not borrowed.
export function buildAircraft(scene) {
  const plane = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({ color: 0xf2e3c2, roughness: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: 0xb03a24, roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f33, roughness: 0.5, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.15, metalness: 0.3 });

  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.55, 5.4, 12), cream);
  fus.rotation.x = Math.PI / 2;
  plane.add(fus);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 12), red);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.4;
  plane.add(nose);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 2.0), glass);
  cabin.position.set(0, 0.55, -0.4);
  plane.add(cabin);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 1.9), cream);
  wing.position.set(0, 0.15, -0.2);
  plane.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 1.9), red);
  wingTipL.position.set(-5.7, 0.15, -0.2);
  plane.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 5.7;
  plane.add(wingTipR);
  const tailH = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 1.1), cream);
  tailH.position.set(0, 0.15, 2.5);
  plane.add(tailH);
  const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.7, 1.4), red);
  tailV.position.set(0, 0.8, 2.5);
  plane.add(tailV);
  // Propeller: hub + two blades, spins with throttle.
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 8), dark);
  hub.rotation.x = Math.PI / 2;
  prop.add(hub);
  for (const a of [0, Math.PI]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.4, 0.1), dark);
    blade.rotation.z = a;
    prop.add(blade);
  }
  prop.position.z = -4.3;
  plane.add(prop);
  // Fixed gear: two wheels and a tail wheel.
  for (const sx of [-0.9, 0.9]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    leg.position.set(sx, -0.9, -0.6);
    plane.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(sx, -1.4, -0.6);
    plane.add(wheel);
  }
  scene.add(plane);
  return { plane, prop };
}

// Glowing rings: the route you fly. Passed rings turn green and dim.
export function buildRings(scene, rings) {
  const meshes = rings.map((r) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(16, 1.1, 10, 40),
      new THREE.MeshBasicMaterial({ color: RING_COLOR, transparent: true, opacity: 0.95 }),
    );
    m.position.set(r.x, r.y, r.z);
    scene.add(m);
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(16, 2.6, 8, 32),
      new THREE.MeshBasicMaterial({ color: RING_COLOR, transparent: true, opacity: 0.18 }),
    );
    glow.position.copy(m.position);
    scene.add(glow);
    return { mesh: m, glow, passed: false, pos: r };
  });
  return meshes;
}

export function markRingPassed(ring) {
  ring.passed = true;
  ring.mesh.material.color.setHex(RING_DONE);
  ring.glow.material.color.setHex(RING_DONE);
  ring.glow.material.opacity = 0.08;
}

// Chase camera with lag + FOV stretch; cockpit view puts you in the seat.
export function updateCamera(r, flight, mode, dt) {
  const { camera, cam } = r;
  const speedKts = flight.speed / 0.514444;
  const targetFov = 58 + Math.min(18, speedKts * 0.09);
  cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 3);
  camera.fov = cam.fov;
  camera.updateProjectionMatrix();

  const heading = flight.heading;
  const fx = -Math.sin(heading);
  const fz = -Math.cos(heading);
  if (mode === 'cockpit') {
    const px = flight.x + fx * 1.2;
    const pz = flight.z + fz * 1.2;
    camera.position.set(px, flight.y + 1.1, pz);
    camera.lookAt(px + fx * 60, flight.y + Math.sin(flight.pitch) * 60, pz + fz * 60);
    camera.rotation.z = flight.roll * 0.55;
    return;
  }
  // Chase: spring arm behind and above, lagging the aircraft's turns.
  const dist = 16 + flight.speed * 0.14;
  const tx = flight.x - fx * dist;
  const tz = flight.z - fz * dist;
  const ty = flight.y + 4.5 + flight.speed * 0.02;
  const k = 1 - Math.exp(-dt * 4.2);
  cam.pos.x += (tx - cam.pos.x) * k;
  cam.pos.y += (ty - cam.pos.y) * k;
  cam.pos.z += (tz - cam.pos.z) * k;
  camera.position.copy(cam.pos);
  cam.look.x += (flight.x + fx * 30 - cam.look.x) * (1 - Math.exp(-dt * 6));
  cam.look.y += (flight.y + Math.sin(flight.pitch) * 30 - cam.look.y) * (1 - Math.exp(-dt * 6));
  cam.look.z += (flight.z + fz * 30 - cam.look.z) * (1 - Math.exp(-dt * 6));
  camera.lookAt(cam.look);
  camera.rotation.z += flight.roll * 0.22;
}

// Point the aircraft mesh at the flight state.
export function updateAircraft(aircraft, flight, dt) {
  const { plane, prop } = aircraft;
  plane.position.set(flight.x, flight.y, flight.z);
  plane.rotation.order = 'YXZ';
  plane.rotation.y = flight.heading;
  plane.rotation.x = -flight.pitch;
  plane.rotation.z = flight.roll;
  prop.rotation.z += (2 + flight.throttle * 40) * dt;
}

// HUD: instruments, compass strip, fuel, wind, rings, timer, damage.
export function updateHUD(flight, leg, ringsPassed, ringsTotal, duskLeft, windName, windSpeed) {
  const $ = (id) => document.getElementById(id);
  $('hud-alt').textContent = Math.round(flight.y * 3.28084);
  $('hud-spd').textContent = Math.round(flight.speed / 0.514444);
  $('hud-hdg').textContent = String(headingDeg(flight.heading)).padStart(3, '0');
  $('hud-thr').textContent = Math.round(flight.throttle * 100);
  $('hud-fuel').textContent = Math.round(flight.fuel) + '%';
  $('hud-cargo').textContent = flight.cargoKg + ' kg';
  $('hud-wind').textContent = windName + ' ' + Math.round(windSpeed * 1.94) + ' kt';
  const fill = $('fuel-fill');
  fill.style.width = Math.max(0, flight.fuel) + '%';
  fill.classList.toggle('low', flight.fuel < 20);
  $('hud-leg').textContent = 'Leg — ' + leg.name;
  $('hud-rings').textContent = 'Rings ' + ringsPassed + ' / ' + ringsTotal;
  const m = Math.max(0, Math.floor(duskLeft / 60));
  const s = Math.max(0, Math.floor(duskLeft % 60));
  $('hud-timer').textContent = 'Dusk ' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  const dmg = $('hud-damage');
  dmg.textContent = 'Airframe ' + Math.max(0, 100 - flight.damage) + '%';
  dmg.classList.toggle('bad', flight.damage > 30);
  // Compass strip: headings scrolling past the needle.
  const hdg = headingDeg(flight.heading);
  const strip = $('compass-strip');
  let html = '';
  for (let d = -120; d <= 120; d += 15) {
    const deg = ((hdg + d) % 360 + 360) % 360;
    const label = deg % 90 === 0 ? ['N', 'E', 'S', 'W'][Math.round(deg / 90) % 4] : String(deg).padStart(3, '0');
    html += '<span style="display:inline-block;width:60px;text-align:center">' + label + '</span>';
  }
  strip.innerHTML = html;
  // Centre the current heading under the needle for any strip width
  // (340px desktop, 180px phone): the d=0 span starts at 8*60 = 480px.
  const half = strip.parentElement.clientWidth / 2;
  strip.style.transform = 'translateX(' + (half - (hdg % 15) * 4 - 480) + 'px)';
}

// Chart minimap: islands, route, rings, aircraft.
export function drawMinimap(flight, leg, ringsPassed) {
  const cv = document.getElementById('minimap');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width;
  const H = cv.height;
  const scale = W / 6000;
  const toX = (x) => (x + 3000) * scale;
  const toY = (z) => (z + 3000) * scale;
  ctx.fillStyle = '#0e2a33';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#143c46';
  ctx.fillRect(0, 0, W, H);
  // Sea.
  ctx.fillStyle = '#1d4e5e';
  ctx.fillRect(0, 0, W, H);
  // Islands.
  for (const isl of ISLANDS) {
    ctx.beginPath();
    ctx.arc(toX(isl.x), toY(isl.z), Math.max(3, isl.r * scale), 0, Math.PI * 2);
    ctx.fillStyle = '#5d7d3a';
    ctx.fill();
  }
  // Route: rings joined.
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  leg.rings.forEach((r, i) => {
    if (i === 0) ctx.moveTo(toX(r.x), toY(r.z));
    else ctx.lineTo(toX(r.x), toY(r.z));
  });
  ctx.stroke();
  leg.rings.forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(toX(r.x), toY(r.z), 4, 0, Math.PI * 2);
    ctx.fillStyle = i < ringsPassed ? '#8fd694' : '#ffb347';
    ctx.fill();
  });
  // Aircraft.
  const ax = toX(flight.x);
  const ay = toY(flight.z);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(-flight.heading);
  ctx.fillStyle = '#f7ead2';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Animate lighthouse beams at night; gentle during the day.
export function animateWorld(world, t, night) {
  for (const b of world.beacons) {
    b.beam.rotation.y = t * (night ? 0.9 : 0.25);
    b.beam.material.opacity = night ? 0.22 : 0.06;
  }
}

// Breathe a ring's glow so the next ring reads as alive, not painted on.
export function pulseRing(ring, t) {
  if (ring.passed) return;
  ring.glow.material.opacity = 0.14 + Math.sin(t * 2.4) * 0.06;
}
