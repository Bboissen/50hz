---
title: "Gameplay Wiki Index"
type: "index"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "gameplay", "index", "reading-order"]
summary: "Reading order and compact entry point for the 50Hz gameplay wiki."
related: []
---

# Gameplay Wiki Index

This folder is the canonical gameplay reference for **Grid Duel**.

## Reading order

1. [`00-canonical-summary.md`](./00-canonical-summary.md)
2. [`01-design-axioms.md`](./01-design-axioms.md)
3. [`02-core-loop.md`](./02-core-loop.md)
4. [`03-efficiency-model.md`](./03-efficiency-model.md)
5. [`04-price-market-revenue.md`](./04-price-market-revenue.md)
6. [`05-demand-and-customers.md`](./05-demand-and-customers.md)
7. [`06-manual-control-room.md`](./06-manual-control-room.md)
8. [`07-generation-assets.md`](./07-generation-assets.md)
9. [`08-grid-overload-and-reliability.md`](./08-grid-overload-and-reliability.md)
10. [`09-events-and-cards.md`](./09-events-and-cards.md)
11. [`10-upgrades-and-progression.md`](./10-upgrades-and-progression.md)
12. [`11-match-endgame-and-scoring.md`](./11-match-endgame-and-scoring.md)
13. [`12-mvp-balance-config.md`](./12-mvp-balance-config.md)
14. [`13-implementation-guardrails.md`](./13-implementation-guardrails.md)
15. [`99-glossary.md`](./99-glossary.md)

## Main design

**Grid Duel** is a real-time manual electricity-grid duel against an AI opponent.

Two electricity providers compete for a shared regional demand. In the first version, the other provider is AI-controlled rather than another human player. The better operator keeps contracted load close to the current capacity basis, which creates a higher efficiency score. Higher efficiency lowers customer price. Lower price attracts more customers. More customers create more revenue but also force the player to manually keep supply and demand matched in real time.

The player wins by pricing efficiently, accepting the right contracts, and keeping real-time supply within the breaker-safe range.

Multiplayer is not part of the first release plan.

## Demo target

The hackathon demo should show the core loop in under 30 seconds:

```txt
efficient contract load -> lower price -> more customers -> more revenue -> supply/demand pressure -> breaker risk -> upgrades/events/fixed contracts
```

Match duration target: **180-300 seconds**.
