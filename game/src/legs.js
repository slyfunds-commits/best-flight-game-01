// legs.js — the Last Light Mail campaign: seven legs across the Sable Chain.
// Each leg is its own job: a named wind you must fly, a cargo whose weight
// retunes the aircraft, a ring route, and a dusk clock that never stops.

import { ISLANDS, STRIPS } from './terrain.js';

// Wind: direction the wind blows TOWARD (degrees, 0 = north), speed m/s,
// gust adds a slow sine wobble so the push is never a constant.
export const LEGS = [
  {
    id: 'first-light',
    name: 'First Light',
    from: 'Marrow Cay',
    to: 'Gull Rock',
    strip: 0,
    destStrip: 1,
    wind: { name: 'a light trades breeze', dirDeg: 200, speed: 2.5, gust: 0.8 },
    cargo: [
      { item: 'Letters for Gull Rock', kg: 42 },
      { item: 'A birthday parcel', kg: 18 },
      { item: 'Seed packets', kg: 9 },
    ],
    fuel: 80,
    duskMinutes: 14,
    rings: [
      { x: 120, z: -700, y: 150 },
      { x: 320, z: -1100, y: 170 },
      { x: 500, z: -1380, y: 140 },
    ],
    brief: 'An easy first run: three rings, a gentle breeze, and the whole chain ahead of you. Keep the nose on the rings and bring her in soft.',
    narration: 'First light over the chain. The mail is aboard, the strip is clear.',
  },
  {
    id: 'harmattan-push',
    name: 'The Harmattan Push',
    from: 'Marrow Cay',
    to: 'Tamara Isle',
    strip: 0,
    destStrip: 2,
    wind: { name: 'the Harmattan push', dirDeg: 285, speed: 9, gust: 2.5 },
    cargo: [
      { item: 'Fishing licences', kg: 36 },
      { item: 'Spare engine parts', kg: 88 },
      { item: 'Tea chests', kg: 54 },
    ],
    fuel: 85,
    duskMinutes: 12,
    rings: [
      { x: -500, z: -420, y: 160 },
      { x: -1000, z: -700, y: 190 },
      { x: -1400, z: -860, y: 170 },
      { x: -1680, z: -900, y: 150 },
    ],
    brief: 'The Harmattan is shoving your nose left all the way to Tamara. Crab into it or you will miss every ring by a field.',
    narration: 'The Harmattan push is up. Hold her nose into it and she will fly true.',
  },
  {
    id: 'night-mail',
    name: 'Night Mail',
    from: 'Marrow Cay',
    to: 'Sister Light',
    strip: 0,
    destStrip: null,
    wind: { name: 'a cold sea breeze', dirDeg: 160, speed: 4, gust: 1.2 },
    cargo: [
      { item: 'Lamp oil for the lighthouse', kg: 64 },
      { item: 'Letters, all of them urgent', kg: 51 },
    ],
    fuel: 85,
    duskMinutes: 10,
    night: true,
    rings: [
      { x: -200, z: 500, y: 150 },
      { x: -450, z: 1100, y: 170 },
      { x: -650, z: 1600, y: 160 },
      { x: -750, z: 1850, y: 140 },
    ],
    brief: 'Night mail: instruments lit, the lighthouse sweeping, the sea black below. Fly the beacons home.',
    narration: 'Night mail. The lighthouse is sweeping — follow it home.',
  },
  {
    id: 'storm-front',
    name: 'Storm Front',
    from: 'Gull Rock',
    to: 'Puffin Holm',
    strip: 1,
    destStrip: null,
    wind: { name: 'the storm front', dirDeg: 120, speed: 12, gust: 5 },
    cargo: [
      { item: 'Storm warnings', kg: 28 },
      { item: 'A crate of storm lanterns', kg: 72 },
    ],
    fuel: 90,
    duskMinutes: 11,
    rings: [
      { x: 900, z: -1100, y: 180 },
      { x: 1300, z: -400, y: 210 },
      { x: 1600, z: 300, y: 190 },
      { x: 1880, z: 800, y: 160 },
    ],
    brief: 'A storm front is rolling in off the east sea. Gusts will throw you sideways mid-turn — small inputs, early corrections.',
    narration: 'Storm front coming. Fly small and early, or the gusts will fly you.',
  },
  {
    id: 'medicine-crate',
    name: 'The Medicine Crate',
    from: 'Tamara Isle',
    to: 'Puffin Holm',
    strip: 2,
    destStrip: null,
    wind: { name: 'a steady westerly', dirDeg: 90, speed: 5, gust: 1.5 },
    cargo: [
      { item: 'The medicine crate', kg: 340 },
      { item: 'Bandages and quinine', kg: 60 },
    ],
    fuel: 95,
    duskMinutes: 13,
    rings: [
      { x: -900, z: -400, y: 170 },
      { x: 200, z: 100, y: 200 },
      { x: 1200, z: 600, y: 180 },
    ],
    brief: 'Four hundred kilos of medicine and the island is waiting. She climbs like a loaded mule and turns like a barge — plan every turn a mile early.',
    narration: 'Four hundred kilos aboard. She will not hurry for anyone.',
  },
  {
    id: 'dusk-finale',
    name: 'Dusk Finale',
    from: 'Marrow Cay',
    to: 'Dusk Point',
    strip: 0,
    destStrip: 3,
    wind: { name: 'the evening katabatic', dirDeg: 340, speed: 7, gust: 2 },
    cargo: [
      { item: 'The last post of the day', kg: 47 },
      { item: 'A wedding invitation, very late', kg: 4 },
      { item: 'Two bottles of island rum', kg: 22 },
    ],
    fuel: 90,
    duskMinutes: 8,
    rings: [
      { x: 400, z: 600, y: 160 },
      { x: 800, z: 1200, y: 190 },
      { x: 1100, z: 1700, y: 210 },
      { x: 1400, z: 2050, y: 180 },
      { x: 1600, z: 2220, y: 150 },
    ],
    brief: 'The last light is going. Five rings, eight minutes of dusk, one strip at Dusk Point. Do not be late for the wedding.',
    narration: 'Last light. Five rings between you and the wedding invitation.',
  },
  {
    id: 'daily-run',
    name: "Today's Mail Run",
    from: 'Marrow Cay',
    to: 'Dusk Point',
    strip: 0,
    destStrip: 3,
    wind: { name: 'the morning trades', dirDeg: 230, speed: 6, gust: 2 },
    cargo: [
      { item: "Today's post bag", kg: 96 },
      { item: 'A parcel, address smudged', kg: 31 },
    ],
    fuel: 90,
    duskMinutes: 12,
    daily: true,
    rings: [
      { x: 300, z: -600, y: 160 },
      { x: 900, z: -300, y: 180 },
      { x: 1400, z: 500, y: 200 },
      { x: 1200, z: 1400, y: 190 },
      { x: 1600, z: 2100, y: 150 },
    ],
    brief: 'The seeded daily run: the same route for every pilot flying today. Fly it clean and your time stands against the whole chain.',
    narration: "Today's mail run. Same route for every pilot flying today.",
  },
];

export function totalCargoKg(leg) {
  return leg.cargo.reduce((s, c) => s + c.kg, 0);
}

// Wind vector in m/s (x east, z south) for a leg at time t (seconds).
// Gusts breathe slowly so the push is a rhythm, not a wall.
export function windVector(leg, t) {
  const w = leg.wind;
  const rad = (w.dirDeg * Math.PI) / 180;
  const gust = 1 + (w.gust / Math.max(1, w.speed)) * Math.sin(t * 0.35) * 0.6;
  const s = w.speed * gust;
  return { x: Math.sin(rad) * s, z: Math.cos(rad) * s };
}

export function legById(id) {
  return LEGS.find((l) => l.id === id) || LEGS[0];
}

// The daily run's seed, from today's date: every pilot flies the same route.
export function dailySeed() {
  const d = new Date();
  const key = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function stripForLeg(leg) {
  return STRIPS[leg.strip];
}

export function destStripForLeg(leg) {
  return leg.destStrip === null || leg.destStrip === undefined ? null : STRIPS[leg.destStrip];
}

export function islandByName(name) {
  return ISLANDS.find((i) => i.name === name);
}
