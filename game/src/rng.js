// rng.js — seeded randomness for Last Light Mail. Every number in the game
// comes from here, so a leg plays the same way every time it is flown.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash two integer coordinates into a stable pseudo-random value in [0, 1).
export function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634239) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h ^= h >>> 16;
  return h / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

// 2D value noise in [-1, 1], deterministic for a given seed.
export function valueNoise2(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash2(ix, iz, seed) * 2 - 1;
  const b = hash2(ix + 1, iz, seed) * 2 - 1;
  const c = hash2(ix, iz + 1, seed) * 2 - 1;
  const d = hash2(ix + 1, iz + 1, seed) * 2 - 1;
  const ab = a + (b - a) * fx;
  const cd = c + (d - c) * fx;
  return ab + (cd - ab) * fz;
}

// Fractal (two-octave) noise in roughly [-1, 1].
export function fbm2(x, z, seed) {
  return valueNoise2(x, z, seed) * 0.65 + valueNoise2(x * 2.13, z * 2.13, seed + 7) * 0.35;
}

// Pick one item from a list with a seeded roll.
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// A seeded float in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// A stable seed from a date string like "2026-11-26".
export function seedFromDate(dateStr) {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
