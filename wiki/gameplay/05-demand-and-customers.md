---
title: "Demand and Customers"
type: "system"
status: "draft"
updated: "2026-06-17"
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
  dataCenterDemandMW +
  eventDemandMW;
```

Recommended baseline:

| Sector | Baseline |
|---|---:|
| Households | 80 MW |
| Business | 45 MW |
| Data centers | 15 MW |
| **Total** | **140 MW** |

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

A 2-minute match can use a semi-scripted sequence:

```txt
0:00 baseline demand
0:20 customer growth pressure begins
0:35 football final warning
0:42 football final impact
1:05 cloud front warning
1:10 cloud front impact
1:30 data center burst warning
1:36 data center impact
1:50 final demand ramp
```

Semi-scripted events are recommended for a hackathon demo because they make the story readable.
