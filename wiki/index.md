---
title: "50Hz Wiki Index"
type: "index"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "wiki", "index", "routing"]
summary: "Top-level entry point for the 50Hz design wiki and agent operating references."
related: []
---

# 50Hz Wiki Index

This wiki is the durable design reference for 50Hz. For gameplay work, start with the gameplay index and then read the mechanic-specific page. For visual or PixiJS implementation work, start with the visual index and then read only the screen or component page needed. The first playable version is single-player against an AI opponent, not multiplayer.

## Gameplay

- [`gameplay/README.md`](./gameplay/README.md) - canonical reading order and summary
- [`gameplay/00-canonical-summary.md`](./gameplay/00-canonical-summary.md) - compact gameplay canon
- [`gameplay/01-design-axioms.md`](./gameplay/01-design-axioms.md) - non-negotiable design axioms
- [`gameplay/02-core-loop.md`](./gameplay/02-core-loop.md) - player loop and match flow
- [`gameplay/03-efficiency-model.md`](./gameplay/03-efficiency-model.md) - efficiency scoring
- [`gameplay/04-price-market-revenue.md`](./gameplay/04-price-market-revenue.md) - price, market share, and revenue
- [`gameplay/05-demand-and-customers.md`](./gameplay/05-demand-and-customers.md) - demand and customer movement
- [`gameplay/06-manual-control-room.md`](./gameplay/06-manual-control-room.md) - screens and controls
- [`gameplay/07-generation-assets.md`](./gameplay/07-generation-assets.md) - generation assets
- [`gameplay/08-grid-overload-and-reliability.md`](./gameplay/08-grid-overload-and-reliability.md) - overload and reliability risk
- [`gameplay/09-events-and-cards.md`](./gameplay/09-events-and-cards.md) - events, cards, and shocks
- [`gameplay/10-upgrades-and-progression.md`](./gameplay/10-upgrades-and-progression.md) - upgrades and progression
- [`gameplay/11-match-endgame-and-scoring.md`](./gameplay/11-match-endgame-and-scoring.md) - endgame and scoring
- [`gameplay/12-mvp-balance-config.md`](./gameplay/12-mvp-balance-config.md) - MVP values
- [`gameplay/13-implementation-guardrails.md`](./gameplay/13-implementation-guardrails.md) - implementation guardrails
- [`gameplay/99-glossary.md`](./gameplay/99-glossary.md) - glossary

## Visual

- [`visual/README.md`](./visual/README.md) - visual design reading order and implementation map
- [`visual/20-visual-design-index.md`](./visual/20-visual-design-index.md) - visual design and PixiJS entry point
- [`visual/21-dispatch-console-layout.md`](./visual/21-dispatch-console-layout.md) - main screen layout and scene grouping
- [`visual/22-art-direction-bible.md`](./visual/22-art-direction-bible.md) - art direction, palette, typography, and alarms
- [`visual/23-ui-naming-and-taxonomy.md`](./visual/23-ui-naming-and-taxonomy.md) - player-facing names and code taxonomy
- [`visual/24-city-sectors-visual-design.md`](./visual/24-city-sectors-visual-design.md) - City Load Window states and sector visuals
- [`visual/25-grid-pressure-meter.md`](./visual/25-grid-pressure-meter.md) - central pressure meter visual spec
- [`visual/26-events-cards-timelines.md`](./visual/26-events-cards-timelines.md) - forecast, incident, and card visual grammar
- [`visual/27-upgrades-generation-tariffs.md`](./visual/27-upgrades-generation-tariffs.md) - generation, tariff, and upgrade UI
- [`visual/28-animation-and-feedback-priorities.md`](./visual/28-animation-and-feedback-priorities.md) - animation priority list
- [`visual/29-asset-inventory-and-ownership.md`](./visual/29-asset-inventory-and-ownership.md) - asset ownership and swap contract
- [`visual/30-pixijs-agent-integration-brief.md`](./visual/30-pixijs-agent-integration-brief.md) - PixiJS implementation brief
- [`visual/31-production-console-visual-direction.md`](./visual/31-production-console-visual-direction.md) - production console visual direction

## Operating Entry Points

- `AGENTS.md` - repo-level agent policy and invariants
- `.agents/skills/` - task-scoped agent instructions
- `wiki/gameplay/` - canonical gameplay design reference
- `wiki/visual/` - visual design and PixiJS implementation reference
