---
title: "Upgrades and Progression"
type: "system"
status: "draft"
updated: "2026-06-18"
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
| Renewable farm | 45 | 10s | Move renewables to next peak level | Lower production cost potential |
| Thermal turbine | 40 | 8s | Move boiler to next MW level | Survive spikes and raise deterministic capacity |
| Nuclear extension | 85 | 20s | Move reactor to next MW level | Long-term baseload |
| Water dam | 50 | 12s | Move storage and power to next dam level | Buffer overload/underload |

Physical levels are exact tables:

| Track | Level 1 | Level 2 | Level 3 |
|---|---:|---:|---:|
| Reactor | 35 MW | 70 MW | 105 MW |
| Boiler | 45 MW | 70 MW | 95 MW |
| Renewables | 25 MW peak | 40 MW peak | 55 MW peak |
| Water dam storage | 20 MWh | 35 MWh | 50 MWh |
| Water dam power | 15 MW | 25 MW | 35 MW |

There are two purchases per track in the MVP: level 1 is the starting state, then purchases complete level 2 and level 3.

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
player buys deterministic capacity early
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
| Reliable provider | Nuclear + thermal | Stable dependable capacity | Slow/expensive |
| Crisis survivor | Thermal + water dam | Handles events | Heat/cost pressure if overused |
| Storage operator | Water dam first | Buffers underload/overload events | Limited stored energy |
| Aggressive market grabber | Renewable + fixed contracts | Fast growth | Breaker risk |


Do not subtract from score/cumulative revenue. Score should track generated value; cash is spendable.
