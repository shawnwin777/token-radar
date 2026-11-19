# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/shawnwin777/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/shawnwin777/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

**Token Radar** — a pre-token protocol radar. It reads a sealed DefiLlama snapshot, ranks every protocol that records no token by an implied launch value, and gives each one a concrete 7-step farm plan with costs and times. The implied value is derived from the snapshot's own figures only: TVL × a category multiple (the median market-cap-to-TVL of live-token peers in the same category) × 7-day growth × maturity (how long it has run with no token) × chain breadth. No protocol name is special-cased. Live-token protocols are shown apart at market value, never ranked.

- 289 ranked rows: the full 40-protocol watchlist plus every other rankable pre-token protocol below the floor.
- Sortable, filterable board (search, category, chain, watchlist/early scope) with a detail view for every protocol showing the full model breakdown.
- Static dashboard, no network, no build step: `dashboard/` renders from `data.js`, which `main.ts` writes from the same board.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input token-radar-01-kit/input/snapshot.json
```

Then open `out/dashboard/index.html` in a desktop browser (serve `out/` over HTTP, or open the file directly — the page loads `../data.js` relatively). `?shot=board|detail|filtered` stages the board, a protocol detail view, or a filtered view. `screenshots/` holds the three staged views.

---

<sub>Entered on [make.fun](https://make.fun/?ref=vzf6m5kx&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
