---
title: "Demand and Customers"
type: "system"
status: "draft"
updated: "2026-06-18"
tags: ["50hz", "demand", "customers", "load", "market-movement"]
summary: "Shared demand, customer share types, deterministic subscription caps, fixed contracts, demand events, and timeline examples."
related: []
---

# Demand and Customers

Demand is shared by both companies. Customer share determines how much of that demand each company must supply.

## Design goal

Demand should be simple, readable, and event-driven.

Do not simulate every individual customer. Use sector labels to make demand understandable.

## Shared demand model

```ts
const totalDemandMW =
  householdDemandMW +
  businessDemandMW +
  dataCenterDemandMW;
```

Each sector has three physical demand levels. Level 1 is the starting state. Level 2 and level 3 are reached through a seeded deterministic schedule generated for the match.

| Sector | Level 1 | Level 2 | Level 3 |
|---|---:|---:|---:|
| Households | 80 MW | 100 MW | 120 MW |
| Business | 15 MW | 35 MW | 55 MW |
| Data centers | 45 MW | 65 MW | 85 MW |
| **Total if all same level** | **140 MW** | **200 MW** | **260 MW** |

Public events and weather can temporarily multiply sector demand, but they do not own the baseline progression. Fixed contracts add committed load on top of customer demand. Final pressure comes from sectors reaching level 3, not from a separate final demand bonus.

Rain and snow increase household demand by 3%, representing heating, lighting, and indoor activity. This modifier stacks with public event multipliers.

## Seeded demand progression

`createInitialMatchState({ seed })` generates one deterministic schedule per match.

Rules:

- all sectors start at level 1,
- there are 6 progression steps,
- each sector reaches level 2 once, then level 3 once,
- level 2 order and level 3 order are randomized separately from the seed,
- a sector cannot reach level 3 before it reaches level 2,
- slots are linearly spaced from about `40s` to `270s`,
- each slot receives seeded `+/-10s` jitter.

Example shape:

```txt
0:00 all sectors level 1 = 140 MW
~0:40 first sector reaches level 2
~1:26 second sector reaches level 2
~2:12 third sector reaches level 2
~2:58 first sector reaches level 3
~3:44 second sector reaches level 3
~4:30 final sector reaches level 3 = 260 MW
```

## Player customer load

Physical customer load uses the subscribed/load share.

```ts
const customerLoadMW = totalDemandMW * subscribedLoadShare;
```

Example:

| Total demand | Player share | Customer load |
|---:|---:|---:|
| 140 MW | 50% | 70 MW |
| 140 MW | 57% | 80 MW |
| 160 MW | 57% | 91 MW |

## Customer share types and caps

The economy uses two related but distinct values.

| Value | Description |
|---|---|
| `targetMarketShare` | What customers currently want based on price |
| `subscribedLoadShare` | Customers physically connected and creating load pressure |

`targetMarketShare` updates instantly from efficiency/price. `subscribedLoadShare` moves toward it over time.

Normal customer subscriptions are capped by deterministic max capacity:

```ts
const maxCustomerLoadMW = deterministicMaxCapacityMW;
const maxSubscribedLoadShare = maxCustomerLoadMW / Math.max(totalDemandMW, 1);
```

Deterministic max capacity comes from dependable generation and delivery capacity. Renewable and dam output can help serve real-time demand, but customers do not normally subscribe against them because they are not always available.

## Market movement

```ts
const target = clamp(targetMarketShare, MIN_SHARE, MAX_SHARE);
subscribedLoadShare = moveTowards(
  subscribedLoadShare,
  target,
  MAX_SHARE_CHANGE_PER_SECOND * dt
);
```

Recommended:

```ts
const MAX_SHARE_CHANGE_PER_SECOND = 0.012;
const MIN_SHARE = 0.10;
const MAX_SHARE = 0.90;
```

## Why movement is delayed

Instant customer movement would make overload too sudden and chaotic.

Delayed physical load creates this pattern:

```txt
you become efficient -> customers start arriving -> grid pressure rises -> you see it coming -> you must respond
```

## Fixed contracts

Fixed contracts are explicit high-risk load commitments.

MVP contract types:

| Contract | Load | Duration | Reward | Risk |
|---|---:|---:|---:|---|
| Business contract | +15 MW | 45s | +35 cash if completed | penalty on strike |
| Data center contract | +25 MW | 35s | +60 cash if completed | massive penalty on strike |

Rules:

- both players see the same contract offer,
- first player to accept gets it,
- accepted contracts cannot be cancelled,
- fixed contract load is added on top of normal customer load,
- contracts can push total load toward total max capacity, including renewable/dam assumptions,
- any strike while a fixed contract is active applies the contract penalty.
- a contract that would complete on the same tick as a breaker trip does not pay out; the strike resolves first while the contract is still active.

```ts
const fixedContractLoadMW = activeFixedContracts.reduce((sum, c) => sum + c.loadMW, 0);
const currentContractLoadMW = customerLoadMW + fixedContractLoadMW;
```

## Contract limiter

The player can slow incoming subscribed customers.

```ts
if (contractLimiterActive) {
  effectiveTargetShare = currentShare + (targetShare - currentShare) * 0.35;
  marketPenalty += 0.03;
  reputationPenalty += 0.02;
}
```

Design role:

```txt
I am too cheap right now, and too many customers are arriving.
I need to slow growth before the grid explodes.
```

This is a defensive manual tool, not a permanent strategy. It does not cancel accepted fixed contracts.

## Demand sector events

Demand should shift through recognizable social/industrial events.

| Event | Sector | Effect |
|---|---|---:|
| Football final | Households | +20% to +30% short spike |
| Cold wave | Households | +20% to +35% long pressure |
| Data center burst | Data centers | +35% to +50% short spike |
| Business rush | Business | +15% to +25% ramp |
| Heatwave | Households/data centers | +15% to +30% cooling demand |
| Rain / snow | Households | +3% small weather pressure |

## Event shape

Events should usually have:

```txt
warning phase -> ramp/impact phase -> recovery phase
```

Example:

```ts
const footballFinal = {
  warningSeconds: 6,
  durationSeconds: 8,
  householdMultiplier: 1.25,
};
```

## MVP demand timeline example

A 5-minute match combines seeded sector progression with semi-scripted public incidents:

```txt
0:00 all sectors level 1
0:35 football final warning
0:42 football final impact
~0:40 first sector reaches level 2
1:05 cloud front warning
1:10 cloud front impact
1:30 data center burst warning
1:36 data center impact
~4:30 final sector reaches level 3
```

Semi-scripted events are recommended for a hackathon demo because they make the story readable. The seed keeps sector progression reproducible without making every match use the same sector order.
