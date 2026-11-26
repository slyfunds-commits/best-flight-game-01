// terrain.js — the Sable Chain: a seeded golden-hour archipelago.
// One height function drives both the flight model's ground checks and the
// visible mesh, so what you see is exactly what you can hit.

import * as THREE from 'three';
import { fbm2 } from './rng.js';

export const WORLD_SEED = 20261126;
export const WORLD_SIZE = 6000; // metres across, centred on (0, 0)

// Named islands: centre, radius, peak height. The strips sit on the first two.
export const ISLANDS = [
  { name: 'Marrow Cay', x: 0, z: 0, r: 950, peak: 62 },
  { name: 'Gull Rock', x: 500, z: -1500, r: 520, peak: 48 },
  { name: 'Tamara Isle', x: -1700, z: -900, r: 720, peak: 96 },
  { name: 'Puffin Holm', x: 1900, z: 950, r: 620, peak: 70 },
  { name: 'Sister Light', x: -750, z: 1900, r: 560, peak: 58 },
  { name: 'Dusk Point', x: 1600, z: 2300, r: 820, peak: 128 },
];

export const STRIPS = [
  { name: 'Marrow Cay strip', x: 0, z: -260, heading: 0, length: 420, width: 26 },
  { name: 'Gull Rock strip', x: 500, z: -1560, heading: 0.4, length: 380, width: 24 },
  { name: 'Tamara strip', x: -1700, z: -960, heading: -0.3, length: 400, width: 24 },
  { name: 'Dusk Point strip', x: 1600, z: 2240, heading: 0.9, length: 420, width: 26 },
];

// Ground height in metres at (x, z). Sea level is 0; the sea floor sits at -6.
export function terrainHeight(x, z) {
  let h = -6;
  for (const isl of ISLANDS) {
    const dx = x - isl.x;
    const dz = z - isl.z;
    const d = Math.sqrt(dx * dx + dz * dz) / isl.r;
    if (d < 1.6) {
      const fall = Math.max(0, 1 - d * d);
      const bump = fall * fall * isl.peak;
      const rough = fbm2(x * 0.004, z * 0.004, WORLD_SEED) * 7 * fall;
      h = Math.max(h, bump + rough - 2);
    }
  }
  // Gentle swell between islands so the sea is never a flat mirror.
  h += fbm2(x * 0.0012, z * 0.0012, WORLD_SEED + 31) * 1.2;
  return h;
}

// True when (x, z) is dry land.
export function isLand(x, z) {
  return terrainHeight(x, z) > 0.5;
}

// The island nearest to (x, z), by centre distance.
export function nearestIsland(x, z) {
  let best = ISLANDS[0];
  let bd = Infinity;
  for (const isl of ISLANDS) {
    const d = (x - isl.x) * (x - isl.x) + (z - isl.z) * (z - isl.z);
    if (d < bd) {
      bd = d;
      best = isl;
    }
  }
  return best;
}

// Build the visible world: terrain mesh, sea, sky, sun, clouds, strips,
// lighthouse beacons. Returns { group, stripMeshes, beacons }.
export function buildWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Golden-hour sky: warm horizon, deep teal above, light haze at the sea.
  scene.background = new THREE.Color(0x2a4a5e);
  scene.fog = new THREE.Fog(0xd8a06a, 900, 5200);

  const sun = new THREE.DirectionalLight(0xffc27d, 2.6);
  sun.position.set(-1800, 700, -2600);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x8fb8c9, 0x3a2a18, 0.9));

  // Terrain: 140x140 grid, vertex-coloured by height (sand, grass, rock).
  const seg = 140;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(0xd9b380);
  const grass = new THREE.Color(0x5d7d3a);
  const rock = new THREE.Color(0x6b5a4a);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    if (h < 2.5) tmp.copy(sand);
    else if (h < 34) tmp.copy(grass).lerp(sand, Math.max(0, (6 - h) / 6) * 0.5);
    else tmp.copy(rock).lerp(grass, Math.max(0, (48 - h) / 14) * 0.6);
    // Shading variation so the terrain reads as land, not a flat sheet.
    const v = 0.92 + fbm2(x * 0.01, z * 0.01, WORLD_SEED + 5) * 0.08;
    colors[i * 3] = tmp.r * v;
    colors[i * 3 + 1] = tmp.g * v;
    colors[i * 3 + 2] = tmp.b * v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  );
  group.add(terrain);

  // Sea: a wide, slightly reflective plane under the islands.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE * 2.4, WORLD_SIZE * 2.4),
    new THREE.MeshStandardMaterial({ color: 0x1d4e5e, roughness: 0.35, metalness: 0.25 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0;
  group.add(sea);

  // Grass strips: flattened earth with a windsock at the threshold.
  const stripMeshes = [];
  for (const s of STRIPS) {
    const g = new THREE.Group();
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(s.width, s.length),
      new THREE.MeshStandardMaterial({ color: 0xb59a68, roughness: 1 }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = terrainHeight(s.x, s.z) + 0.4;
    g.add(pad);
    // Centre line dashes.
    for (let d = -3; d <= 3; d++) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 14),
        new THREE.MeshBasicMaterial({ color: 0xf7ead2 }),
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, pad.position.y + 0.15, d * 52);
      g.add(dash);
    }
    // Windsock: orange cone on a pole, pointing downwind.
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 9, 6),
      new THREE.MeshStandardMaterial({ color: 0xdddddd }),
    );
    pole.position.set(s.width / 2 + 8, pad.position.y + 4.5, -s.length / 2 + 12);
    g.add(pole);
    const sock = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 7, 8),
      new THREE.MeshStandardMaterial({ color: 0xff7b2a, emissive: 0x903a00 }),
    );
    sock.rotation.z = Math.PI / 2;
    sock.position.set(s.width / 2 + 8, pad.position.y + 8.5, -s.length / 2 + 12);
    g.add(sock);
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.heading;
    group.add(g);
    stripMeshes.push(g);
  }

  // Lighthouses on Sister Light and Dusk Point, beacons sweeping at dusk.
  const beacons = [];
  for (const [ix, iz, h] of [[-750, 1900, 26], [1600, 2300, 30]]) {
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 4.5, h, 10),
      new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.8 }),
    );
    const base = terrainHeight(ix, iz);
    tower.position.set(ix, base + h / 2, iz);
    group.add(tower);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
    );
    lamp.position.set(ix, base + h + 1, iz);
    group.add(lamp);
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(26, 320, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.rotation.z = Math.PI / 2;
    beam.position.set(ix, base + h + 1, iz);
    group.add(beam);
    beacons.push({ beam, lamp, baseY: base + h + 1 });
  }

  // Clouds: soft white billboards drifting slowly, high above the sea.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffe8c8, transparent: true, opacity: 0.55, depthWrite: false });
  for (let i = 0; i < 26; i++) {
    const w = 180 + ((i * 137) % 260);
    const puff = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(w * (0.28 + j * 0.08), 8, 6), cloudMat);
      s.position.set(j * w * 0.35 - w * 0.3, j * 8, 0);
      s.scale.y = 0.35;
      puff.add(s);
    }
    const a = (i / 26) * Math.PI * 2;
    const r = 700 + ((i * 389) % 2400);
    puff.position.set(Math.cos(a) * r, 420 + ((i * 61) % 160), Math.sin(a) * r);
    group.add(puff);
  }

  // The low sun itself, a warm disc on the horizon.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(150, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false }),
  );
  sunDisc.position.set(-3200, 320, -4200);
  sunDisc.lookAt(0, 200, 0);
  group.add(sunDisc);

  return { group, stripMeshes, beacons };
}
