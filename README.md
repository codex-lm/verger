# Verger

*A match-3 orchard, in broad daylight.*

Swap two neighbouring fruits to line up **three or more of a kind**. The swap
must harvest — otherwise the branch refuses and no move is spent. Harvested
fruits vanish, the canopy falls, new buds regrow at the top, and chains
cascade for bonus points. Twelve orchards, each with a **basket** to fill
before the moves run out.

## How to play

- **Tap a fruit, then a neighbouring one** — or drag one onto its neighbour.
- A swap must line up 3+ identical fruits in a row or column.
- Fill the basket (apples, pears, plums, cherries or any fruit) before the
  moves run out. Moves to spare = brighter stars.

Interface in **English** (default), **French** and **Spanish**.

## Run locally

Everything is static and self-contained (no network). `index.html` is the
published autonomous bundle required by LOB7 (all styles and scripts
inlined); it is **generated** from `index.src.html` + `assets/*` — never
edit it by hand. The build, the balancing simulators and the tests live in
the Z Code workshop.

```bash
python -m http.server 8149       # then open http://localhost:8149/
```

## Design notes

- The rules engine (`assets/engine.js`) is pure and deterministic per seed:
  constrained swaps (adjacency + must-match), harvest, gravity, regrowth,
  bounded cascades (≤2 sève rounds), goals, win/lose, stars.
- **Every level was tuned by simulation**: a greedy oracle (30 games/level)
  and a simulated human (40 games at 70% and 50% optimality) set moves and
  basket sizes until the curve climbed from tutorial-easy (levels 1-6) to
  genuinely tight (levels 7, 9, 10, 12).
- 8 Node tests cover determinism, illegal swaps (non-adjacent, no-match),
  gravity after harvest, the one-constructed-match case, goal win / moves
  exhaustion, the cascade bound and all 12 levels' shape.
- Palette: **daylight forest** — lush greens on a bright sky, juicy fruit
  colours, wood border. The sixth family of the workshop's visual rotation.

## Credits & license

A game by Cédric Bernadac, created with AI agents (ZCode). Code under the
[MIT license](LICENSE). Produced automatically with Z Code in the Z Code game
workshop; see `LOB7-ATTRIBUTION.json` for contributions.
