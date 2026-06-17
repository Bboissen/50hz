# 50Hz Gameplay Wiki

The game is a **real-time 1v1 educational electricity-grid duel**. The first playable version is single-player against an AI opponent. Two electricity companies supply a shared regional demand. The better operator runs a more efficient grid, obtains a lower customer price, attracts more consumers, earns more money, and is then pushed toward overload by that same success.

## Canonical reference order

Future coding agents should route through the relevant skill before loading wiki pages:

1. [`AGENTS.md`](./AGENTS.md)
2. The relevant skill file in [`.agents/skills/`](./.agents/skills/)
3. The wiki pages named by that skill

Use [`wiki/index.md`](./wiki/index.md) or `python3 scripts/wiki.py search "<query>"` when the correct mechanic page is unclear or the user asks for a wiki-backed answer.

## Non-negotiable gameplay rules

- **Manual operation is core gameplay.** The player must actively navigate screens and adjust systems in real time.
- **Better efficiency means lower price.**
- **Better efficiency must also mean more revenue.** The economic formula must preserve this invariant.
- **More customers create more grid pressure.** Winning too hard can overload the network.
- **The grid is most efficient when heavily used but not overloaded.** Overbuilding too early hurts utilization and price.
- **Events create synchronized shocks.** Weather, data centers, heating, football games, and opponent cards can trigger chain reactions.
- **Real open data/geolocation is informational only for the MVP.** Core gameplay uses synthetic, controllable numbers.

## Directory structure

```txt
.
├── AGENTS.md
├── README.md
├── scripts/
│   └── wiki.py
├── .agents/skills/
│   ├── README.md
│   ├── economy-balance/SKILL.md
│   ├── event-card-system/SKILL.md
│   ├── gameplay-canon/SKILL.md
│   ├── manual-control-room/SKILL.md
│   ├── query/SKILL.md
│   └── tuning-and-playtest/SKILL.md
├── wiki/
│   ├── index.md
│   └── gameplay/
│       ├── README.md
│       ├── 00-canonical-summary.md
│       ├── 01-design-axioms.md
│       ├── 02-core-loop.md
│       ├── 03-efficiency-model.md
│       ├── 04-price-market-revenue.md
│       ├── 05-demand-and-customers.md
│       ├── 06-manual-control-room.md
│       ├── 07-generation-assets.md
│       ├── 08-grid-overload-and-reliability.md
│       ├── 09-events-and-cards.md
│       ├── 10-upgrades-and-progression.md
│       ├── 11-match-endgame-and-scoring.md
│       ├── 12-mvp-balance-config.md
│       ├── 13-implementation-guardrails.md
│       └── 99-glossary.md
│   └── visual/
│       ├── README.md
│       ├── 20-visual-design-index.md
│       ├── 21-dispatch-console-layout.md
│       ├── 22-art-direction-bible.md
│       ├── 23-ui-naming-and-taxonomy.md
│       ├── 24-city-sectors-visual-design.md
│       ├── 25-grid-pressure-meter.md
│       ├── 26-events-cards-timelines.md
│       ├── 27-upgrades-generation-tariffs.md
│       ├── 28-animation-and-feedback-priorities.md
│       ├── 29-asset-inventory-and-ownership.md
│       ├── 30-pixijs-agent-integration-brief.md
│       ├── 31-production-console-visual-direction.md
│       └── asset-manifest.prototype.json
```
