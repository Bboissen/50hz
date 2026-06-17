---
title: "Match Endgame and Scoring"
type: "system"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "match", "scoring", "cash", "endgame", "strikes"]
summary: "Revenue Duel mode, cash versus score, final score, strikes, optional domination win, match arc, and result causality."
related: []
---

# Match Endgame and Scoring

The recommended primary mode is a short revenue duel.

## Main mode: Revenue Duel

Duration:

```txt
180-300 seconds
```

Winner:

```txt
highest final score
```

## Cash vs score

Use separate values.

| Value | Meaning |
|---|---|
| `cash` | Spendable money for upgrades/cards |
| `score` | Cumulative profit generated during the match |

Every tick:

```ts
player.cash += cashGainThisTick;
player.score += cashGainThisTick;
```

When buying upgrades:

```ts
player.cash -= upgradeCost;
player.score does not decrease;
```

Reason:

```txt
players should not be punished in final score for investing
```

## Final score

```ts
finalScore =
  score -
  strikes * STRIKE_SCORE_PENALTY -
  activeContractStrikePenalties;
```

Recommended:

```ts
const STRIKE_SCORE_PENALTY = 80;
```

Fixed contracts add their own strike penalties if a breaker trip happens while the contract is active.

## MVP match arc

A good match should create three beats:

### 0:00-0:30 — Stabilization

Players learn controls, match production to demand, and create price differences through contract utilization.

### 0:30-1:20 — Market pressure and first crisis

Efficient player attracts customers. Demand event arrives. Supply/demand pressure rises.

### 1:20-2:30 — Chaos and scoring

Cards, fixed contracts, final events, and upgrade timing decide who generates the most revenue without breaker trips.

## Match result should show causality

Do not only show “Player A wins.” Show why.

Example:

```txt
Winner: Player A
Final Score: 412 vs 335
Average Efficiency: 82% vs 67%
Average Price: 79 vs 88
Customers Won: 63% vs 37%
Fixed Contract Profit: 35 vs 0
Revenue Generated: 492 vs 375
Strikes: 1 vs 2
```

This reinforces the educational point.
