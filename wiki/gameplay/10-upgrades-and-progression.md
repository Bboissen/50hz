---
title: "Upgrades and Progression"
type: "system"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "upgrades", "progression", "capacity", "strategy"]
summary: "MVP upgrades, cost scaling, timing, downsides, archetypes, purchase information, demo choices, and purchase rules."
related: []
---

# Upgrades and Progression

Upgrades convert revenue into future capacity, flexibility, or information.

## Design goal

Upgrades should solve problems but not be universally good immediately.

Core tension:

```txt
upgrade too late -> overload
upgrade too early -> underused infrastructure -> lower efficiency -> higher price
```

## Recommended MVP upgrades

| Upgrade | Cost | Build time | Effect | Strategic purpose |
|---|---:|---:|---|---|
| Network | 55 | 15s | +25 MW grid capacity | Handle customer growth |
| Renewable farm | 45 | 10s | +15 MW solar peak, +15 MW wind peak | Lower production cost potential |
| Thermal turbine | 40 | 8s | +25 MW thermal capacity | Survive spikes and raise deterministic capacity |
| Nuclear extension | 85 | 20s | +35 MW nuclear capacity | Long-term baseload |
| Water dam | 50 | 12s | +15 MWh stored water, +10 MW power | Buffer overproduction/underproduction |

## Repeat cost scaling

```ts
nextCost = baseCost * Math.pow(REPEAT_COST_MULTIPLIER, timesPurchased);
```

Recommended:

```ts
const REPEAT_COST_MULTIPLIER = 1.25;
```


## Upgrade downside

Do not add explicit fixed maintenance costs unless necessary. Prefer to express overbuilding through utilization scores.

Example:

```txt
player buys network early
load stays the same
grid utilization falls
efficiency falls slightly
price rises
customer growth slows
```

This keeps the economy invariant clean.

## Strategic archetypes

Players can specialize through upgrade sequence.

| Strategy | Upgrade pattern | Strength | Weakness |
|---|---|---|---|
| Cheap green provider | Renewable + water dam | Low operating cost potential | Weather/surplus vulnerable |
| Reliable provider | Nuclear + network | Stable under load | Slow/expensive |
| Crisis survivor | Thermal + water dam | Handles events | Heat/cost pressure if overused |
| Infrastructure player | Network first | Can absorb customers | Early underuse penalty |
| Aggressive market grabber | Renewable + PR cards | Fast growth | Breaker risk |


Do not subtract from score/cumulative revenue. Score should track generated value; cash is spendable.
