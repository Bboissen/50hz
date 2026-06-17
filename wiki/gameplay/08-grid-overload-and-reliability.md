---
title: "Grid Overload and Reliability"
type: "system"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "overload", "reliability", "strikes", "breaker"]
summary: "Capacity overload, supply/demand mismatch, breaker thresholds, strikes, and reliability tradeoffs."
related: []
---

# Grid Overload and Reliability

Grid overload and supply/demand mismatch are the central failure paths.

## Design goal

Winning or dropping customers should create danger. A player with a low price attracts more customers, which raises committed load and makes real-time supply/demand matching harder.

The player must anticipate this with manual controls and upgrades.
Normal customers cannot subscribe beyond deterministic max capacity. Fixed contracts can push total committed load higher, up to total max capacity, but they cannot be cancelled and punish strikes heavily.

## Core utilization

```ts
const capacityUtilization = currentContractLoadMW / Math.max(contractCapacityBasisMW, 1);
```

Interpretation:

| Capacity utilization | State |
|---:|---|
| <70% | underused/overbuilt |
| 70%-85% | safe |
| 85%-98% | efficient sweet spot |
| 98%-100% | risk of overload rising |
| 100%-105% | severe overload - short delay before breaker |
| >105% | instant breaker |

For normal customer load, `contractCapacityBasisMW` is deterministic max capacity. When fixed contracts are active, it can include current renewable and water dam capacity up to total max capacity.

## Capacity overload breaker

Use an overload timer for the 100%-105% band. Crossing 105% trips immediately.

```ts
if (capacityUtilization > 1.05) {
  tripBreaker('capacity-overload');
} else if (capacityUtilization > 1.0) {
  overloadTimer += dt;
  if (overloadTimer >= CAPACITY_OVERLOAD_BREAKER_SECONDS) {
    tripBreaker('capacity-overload');
  }
} else {
  overloadTimer = Math.max(0, overloadTimer - CAPACITY_OVERLOAD_RECOVERY_SECONDS * dt);
}
```

Recommended:

```ts
const CAPACITY_OVERLOAD_BREAKER_SECONDS = 3;
const CAPACITY_OVERLOAD_RECOVERY_SECONDS = 1;
```

## Supply/demand balance

The production console is about keeping delivered supply close to current demand.

```ts
const supplyDemandMismatch =
  (deliveredSupplyMW - currentDemandMW) / Math.max(currentDemandMW, 1);
```

Interpretation:

| Mismatch | State |
|---:|---|
| -5% to +5% | safe |
| below -5% | underproduction / shortage risk |
| above +5% | overproduction / underload risk |
| below -15% or above +15% | severe mismatch |

## Supply/demand breaker timer

Both underproduction and overproduction can trip a breaker after a delay.

```ts
if (Math.abs(supplyDemandMismatch) > SEVERE_BALANCE_MISMATCH) {
  balanceBreakerTimer += dt * SEVERE_BALANCE_TIMER_MULTIPLIER;
} else if (Math.abs(supplyDemandMismatch) > SAFE_BALANCE_BAND) {
  balanceBreakerTimer += dt;
} else {
  balanceBreakerTimer = Math.max(0, balanceBreakerTimer - BALANCE_RECOVERY_SECONDS * dt);
}

if (balanceBreakerTimer >= BALANCE_BREAKER_SECONDS) {
  tripBreaker(supplyDemandMismatch < 0 ? 'underproduction' : 'overproduction');
}
```

Recommended:

```ts
const SAFE_BALANCE_BAND = 0.05;
const SEVERE_BALANCE_MISMATCH = 0.15;
const BALANCE_BREAKER_SECONDS = 3;
const SEVERE_BALANCE_TIMER_MULTIPLIER = 3;
const BALANCE_RECOVERY_SECONDS = 1;
```

## Strike conditions

Trigger a strike if:

```txt
capacity utilization > 105%
```

or:

```txt
capacity utilization is 100%-105% for 3 seconds
```

or:

```txt
supply/demand mismatch stays outside +/-5% long enough to fill the breaker timer
```

## Strike effect

Recommended MVP strike:

```ts
strikes += 1;
cash -= 25;
subscribedLoadShare *= 0.90;
breakerTripSeconds = 8;
```

Interpretation:

- the player loses trust/customers,
- cash is damaged,
- one sector or breaker requires attention,
- fixed contracts apply their strike penalty if active.

## Breaker trip

Breaker trips are good for manual gameplay because they create a specific screen action.

Example:

```txt
Breaker tripped.
Go to Production console screen and hold Reset for 2 seconds.
```

While tripped:

```ts
availableDeterministicCapacityMW *= 0.85;
availableSupplyMW *= 0.85;
```

## Reliability vs efficiency

The grid can be efficient near 98% contract utilization and still be risky.

This distinction is central:

```txt
high contract utilization = good efficiency
supply/demand mismatch outside +/-5% = breaker timer rises
capacity utilization above 100% = capacity overload timer or instant breaker
```
