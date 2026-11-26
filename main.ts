// main.ts — the hand-in program for Last Light Mail (Node 22, stdlib only).
//
// The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, three.js vendored
// under game/vendor/, no network request). The program hands it in: it copies
// game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json with buildDossier from vendor/makefun-game.ts (the
// kit's copy, unchanged). Two runs write the same bytes: no timestamps, no
// randomness, nothing deleted that the grader owns.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The game lives beside this file, never relative to the working directory:
// the grader runs `node /bot/main.ts` from /, so a bare `join('game')`
// would resolve to /game and miss.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from an empty output directory so a second run cannot inherit stale
// files from the first. Clear the directory's CONTENTS only — never delete
// the directory itself: as the grader's unprivileged user, deleting /output
// needs write permission on / and fails with EPERM.
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(out)) {
  rmSync(join(out, entry), { recursive: true, force: true });
}

cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// A one-line note on stdout only: it is not part of /output, so it cannot
// change what the two runs write. The dossier's byte length is deterministic
// for a given game/ and screenshots/, so it is safe to print.
console.log(`wrote ${out}/dossier.json`);
