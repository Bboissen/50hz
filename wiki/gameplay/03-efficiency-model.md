---
title: "Efficiency Model"
type: "model"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "economy", "efficiency", "contracts", "capacity"]
summary: "Canonical efficiency formula based on how close current contracted load is to the current capacity basis."
related: []
---

# Efficiency Model

Efficiency is the price/revenue score. It measures how close the player's current contracted load is to the current capacity basis of their grid.

It does **not** measure real-time supply/demand matching. Real-time matching is handled by breaker risk in [`08-grid-overload-and-reliability.md`](./08-grid-overload-and-reliability.md).

## Design goal

Efficiency should reward a player who has built enough dependable capacity and sold most of it through customers or fixed contracts.

It should reward:

- current contracted load close to the current capacity basis,
- avoiding unused deterministic capacity,
- avoiding contracts above dependable capacity unless the player accepts extreme risk.

It should punish:

- under-contracted capacity,
- overbuilding too early,
- relying on uncertain renewable/dam output to justify customer subscriptions,
- breaker strikes through explicit strike penalties, not through normal efficiency scoring.

## Capacity definitions

Deterministic capacity is the dependable capacity customers can subscribe against.

```ts
const deterministicCapacityMW =
  nuclearCapacityMW +
  thermalCapacityMW +
  gridCapacityMWLimitAdjustment;
```

The effective deterministic max is also capped by the delivery grid:

```ts
const deterministicMaxCapacityMW = Math.min(
  gridCapacityMW,
  nuclearCapacityMW + thermalCapacityMW
);
```

Non-deterministic capacity can help real-time operation but does not raise the normal customer subscription cap:

```txt
renewable = solar + wind, depends on weather
water dam = limited buffer, depends on stored water/rain/manual fill
```

Total max capacity includes currently available non-deterministic and conditional output, capped by the delivery grid:

```ts
const totalMaxCapacityMW = Math.min(
  gridCapacityMW,
  nuclearCapacityMW +
    thermalCapacityMW +
    currentRenewableOutputMW +
    waterDamMaxPowerMW
);
```

The contract capacity basis depends on the type of committed load:

```ts
const contractCapacityBasisMW =
  activeFixedContracts.length > 0
    ? totalMaxCapacityMW
    : deterministicMaxCapacityMW;
```

Normal customers subscribe against deterministic max capacity. Fixed contracts can push the player toward total max capacity, but that is risky because renewable and dam output may disappear before the contract ends.

## Current contracted load

Current contracted load is the load the player has promised to serve.

```ts
const customerContractLoadMW = totalDemandMW * subscribedLoadShare;
const fixedContractLoadMW = activeFixedContracts.reduce((sum, c) => sum + c.loadMW, 0);
const currentContractLoadMW = customerContractLoadMW + fixedContractLoadMW;
```

Normal customer subscriptions are capped at deterministic max capacity. Fixed contracts can push total contracted load up to total max capacity, but that is intentionally high risk.

## Canonical formula

```ts
const contractUtilization = currentContractLoadMW / Math.max(contractCapacityBasisMW, 1);
const efficiency = contractUtilizationEfficiency(contractUtilization);
```

Recommended scoring:

```ts
function contractUtilizationEfficiency(utilization: number): number {
  if (utilization <= 0) return 0;

  // Too underused: improves as capacity gets sold.
  if (utilization < 0.85) {
    return 0.45 + 0.55 * (utilization / 0.85);
  }

  // Best zone: most dependable capacity is contracted.
  if (utilization <= 0.98) {
    return 1.0;
  }

  // Edge: still efficient, but close to dependable capacity.
  if (utilization <= 1.0) {
    return 0.95;
  }

  // Over-contracted against the current capacity basis.
  if (utilization <= 1.05) {
    return 0.75;
  }

  return 0.45;
}
```

Interpretation:

| Contract utilization | Meaning | Efficiency |
|---:|---|---:|
| 40% | heavily overbuilt / under-contracted | weak |
| 70% | usable but inefficient | medium |
| 85%-98% | ideal | best |
| 98%-100% | edge | high |
| 100%-105% | over capacity basis | low/high-risk |
| >105% | invalid or extreme fixed-contract risk | very low |

## What efficiency does not do

Efficiency does not trip breakers.

Breaker risk comes from real-time mismatch:

```txt
delivered supply too low compared to current demand = underload / shortage risk
delivered supply too high compared to current demand = overproduction / over-frequency risk
```

Keep this separation:

```txt
efficiency = price/revenue performance from contracted load vs capacity basis
supply/demand balance = real-time breaker safety
```
