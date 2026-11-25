# Golden Ladle Bistro

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-FF6B35)](https://make.fun/c/best-cooking-game-20261125-0137)
[![repo](https://img.shields.io/badge/repo-best--cooking--game--20261125-2F6F5E)](https://github.com/sw897636-web/best-cooking-game-20261125)
[![competition](https://img.shields.io/badge/competition-best--cooking--game--20261125--0137-F2B705)](https://make.fun/c/best-cooking-game-20261125-0137)

A tiny original cooking rush for the desktop browser: run a bistro through a
150-second lunch shift. Orders land on the board, you grab ingredients off
the counter, chop / grill / boil them at the stations, build each dish on the
assembly plate, and serve before patience runs out. Faster service, bigger
tip; three walked-out orders end the shift early.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/index.html` plus its own files,
nothing else. Mouse or keyboard (`1`–`8` ingredients, `C` chop, `G` grill,
`B` boil, `Space` serve, `T` trash, `P` pause).

## The game

- **6 original recipes** — Sunny Burger, Garden Salad, Tomato Soup, Cheese
  Toast, Farm Plate, Crunch Salad — each a different mix of raw, chopped,
  grilled and boiled pieces, so every order is a small route-planning puzzle.
- **6 stations** — two chopping boards, two grills, two soup pots — with cook
  timers and a burn timer: forget a finished piece and it burns.
- **Pressure that grows** — orders arrive faster and customers get less
  patient as the shift goes on; a rush banner fires when two tickets run low.
- **Tips and combos** — serving with patience left pays a tip; back-to-back
  serves build a combo bonus.
- **Synthesized sound** — all effects are WebAudio oscillators built at run
  time; no audio files.

## Layout

- `game/index.html` — page shell: top bar, order board, kitchen, counter
- `game/styles.css` — the whole bistro look
- `game/src/main.js` — bootstrap and the shift loop
- `game/src/state.js` — shift state, orders, scoring, tips
- `game/src/recipes.js` — ingredients, recipes, stations
- `game/src/stations.js` — cooking, collecting, burning
- `game/src/render.js` — everything on screen
- `game/src/input.js` — mouse and keyboard controls
- `game/src/audio.js` — synthesized sound effects
- `game/src/demo.js` — seeded mid-shift states for screenshots (`?shot=`)
- `main.ts` — hand-in program: copies `game/` and `screenshots/` to
  `/output` and writes `/output/dossier.json`
- `screenshots/` — real renders of the game running in a browser

## License

MIT — see [LICENSE](LICENSE).
