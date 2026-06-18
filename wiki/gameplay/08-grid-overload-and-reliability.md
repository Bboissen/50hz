---
title: "Grid Overload, Underload, and Reliability"
type: "system"
status: "draft"
updated: "2026-06-18"
tags: ["50hz", "overload", "reliability", "strikes", "breaker"]
summary: "Capacity overload, real-time overload/underload, breaker thresholds, strikes, and reliability tradeoffs."
related: []
---

# Grid Overload, Underload, and Reliability

Grid overload and underload are the central reliability failure paths.

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
| <70% | underused/overbuilt; efficiency problem, not a breaker trip |
| 70%-85% | safe but not yet efficient |
| 85%-98% | efficient sweet spot |
| 98%-100% | risk of overload rising |
| 100%-105% | severe overload - short delay before breaker |
| >105% | instant breaker |

For normal customer load, `contractCapacityBasisMW` is deterministic max capacity. When fixed contracts are active, it can include current renewable and water dam capacity up to total max capacity.

Low capacity utilization is intentionally not an underload breaker condition. A player at 70%-85%, or even below 70%, has overbuilt or under-contracted infrastructure; the punishment is lower efficiency, higher price, slower customer growth, and worse cash gain. Breaker underload is reserved for real-time supply being too low for current demand in the production console.

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

The production console is about keeping controllable generation close to current demand.

```ts
const supplyDemandMismatch =
  (generationMW - currentDemandMW) / Math.max(currentDemandMW, 1);
```

Interpretation:

| Mismatch | State |
|---:|---|
| -5% to +5% | safe |
| below -5% | underload / shortage risk |
| above +5% | overload / surplus risk |
| below -15% or above +15% | severe mismatch |

## Supply/demand breaker timer

Both underload and overload can trip a breaker after a delay.

```ts
if (Math.abs(supplyDemandMismatch) > SEVERE_BALANCE_MISMATCH) {
  balanceBreakerTimer += dt * SEVERE_BALANCE_TIMER_MULTIPLIER;
} else if (Math.abs(supplyDemandMismatch) > SAFE_BALANCE_BAND) {
  balanceBreakerTimer += dt;
} else {
  balanceBreakerTimer = Math.max(0, balanceBreakerTimer - BALANCE_RECOVERY_SECONDS * dt);
}

if (balanceBreakerTimer >= BALANCE_BREAKER_SECONDS) {
  tripBreaker(supplyDemandMismatch < 0 ? 'underload' : 'overload');
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

Do not trigger a strike merely because capacity utilization is low. Underused capacity should be legible as an economy/strategy mistake, while underload should be legible as a manual production failure.

## Strike effect

Recommended MVP strike:

```ts
strikes += 1;
cash -= 25;
subscribedLoadShare *= 0.90;
breakerTripSeconds = 8;
gridShutdownReliefSeconds = 15;
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
Pay the reset cost or lose the match.
```

While tripped:

```ts
plantStates = {
  nuclear: 'gridDown',
  thermal: 'gridDown',
  solar: 'gridDown',
  wind: 'gridDown',
  waterDam: 'gridDown',
};

generationMW = 0;
deliveredSupplyMW = 0;
currentDemandMW = 0;
currentContractLoadMW = 0;
```

This is a derived grid state, not a forced market-share mutation. The underlying customer subscription can remain part of the economy model, but the served contract split displayed during grid-down is 0 because no plant is connected to the grid.

Reset behavior:

```ts
if (cash < BREAKER_RESET_COST) {
  gameOver('reset-bankrupt');
} else {
  cash -= BREAKER_RESET_COST;
  breakerTrippedSeconds = 0;
}
```

After a reset, the first 15 seconds are a recovery relief window. During that window, served contract load and demand match actual supply so the player has headroom to ramp plants without immediately retripping the breaker. This does not erase the economy state; it controls served load while the grid is coming back online.

## Reliability vs efficiency

The grid can be efficient near 98% contract utilization and still be risky.

This distinction is central:

```txt
high contract utilization = good efficiency
supply/demand mismatch outside +/-5% = breaker timer rises
capacity utilization above 100% = capacity overload timer or instant breaker
capacity utilization below target = lower efficiency and price disadvantage, not breaker risk
```
