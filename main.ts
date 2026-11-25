// Golden Ladle Bistro — main.ts (hand-in program)
// Node 22, standard library only. Copies the playable game (game/) and the
// real play screenshots (screenshots/) from this repository into the output
// directory and writes /output/dossier.json with the vendored make.fun
// library, so the judge can read the game. Outside the grader, the
// MAKEFUN_OUTPUT_DIR environment variable stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program is deterministic: same repository in, same bytes out, so the
// grader's two runs write identical output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast with a readable message instead of a bare fs error when the
// repository is missing the game (caught during a local dry run once).
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — nothing to hand in');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps (see the kit's RULES.txt): the text budget shapes the
// dossier bytes; the other caps refuse an entry the scorer would refuse —
// more than 4 screenshots or one over 256 KiB; game/ over 993 files and
// directories, over 48 MiB in all, or a path under game/ over 1000 bytes.
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
