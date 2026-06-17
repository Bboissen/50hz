---
title: "Implementation Guardrails"
type: "guardrails"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "implementation", "tests", "state", "determinism", "guardrails"]
summary: "Recommended module split, pure functions, clamping, required tests, state separation, synthetic data, demo determinism, and documentation rule."
related: []
---

# Implementation Guardrails

This file translates design into coding constraints.

## Recommended module split

```txt
src/gameplay/
  config.ts
  math.ts
  demand.ts
  efficiency.ts
  balance.ts
  market.ts
  revenue.ts
  assets.ts
  breaker.ts
  events.ts
  cards.ts
  contracts.ts
  upgrades.ts
  match.ts
  playerState.ts
```

## Pure functions first

Core gameplay should be implemented as pure functions where possible.

Examples:

```ts
priceFromEfficiency(efficiency)
attractionFromPrice(price)
computeRevenueTick(args)
computeContractEfficiency(args)
computeSupplyDemandBalance(args)
updateBreakerRisk(args)
applyUpgrade(player, upgrade)
```

This makes the game easier to tune and test.

## Clamp aggressively

Use explicit clamping for game safety.

```ts
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
```

Clamp:

- efficiency,
- market share,
- water dam stored water,
- thermal heat,
- breaker timers,
- control inputs.

## Required tests

### Economy tests

```ts
expect(priceFromEfficiency(0.9)).toBeLessThan(priceFromEfficiency(0.6));
expect(cashGain(0.9, 0.6).playerA).toBeGreaterThan(cashGain(0.9, 0.6).playerB);
```

### Efficiency tests

```ts
expect(contractEfficiency({ loadMW: 70, deterministicMaxMW: 80 })).toBeCloseTo(1);
expect(contractEfficiency({ loadMW: 30, deterministicMaxMW: 80 })).toBeLessThan(
  contractEfficiency({ loadMW: 70, deterministicMaxMW: 80 })
);
```

### Breaker tests

```ts
expect(updateBreakerRisk({ deliveredSupplyMW: 100, demandMW: 100 }).timer).toBe(0);
expect(updateBreakerRisk({ deliveredSupplyMW: 106, demandMW: 100 }).timer).toBeGreaterThan(previousTimer);
expect(capacityBreaker({ contractLoadMW: 85, deterministicMaxMW: 80 }).tripped).toBe(true);
```

### Upgrade tests

```ts
expect(buyUpgrade(player, networkUpgrade).cash).toBeLessThan(player.cash);
expect(applyUpgrade(player, networkUpgrade).gridCapacityMW).toBeGreaterThan(player.gridCapacityMW);
```

## Do not mix presentation state and simulation state

Keep simulation state independent from presentation timing.

Good:

```txt
simulation state -> presentation layer reads and displays it
```

Bad:

```txt
presentation timing value becomes source of gameplay truth
```

## Avoid hidden auto-corrections

If the player makes a bad manual adjustment, the game should show the consequence. Do not silently fix production mismatch, overproduction, underproduction, or capacity overload.

Allowed:

- clamping impossible values,
- ramping asset output due to physical inertia,
- clearly displayed helper modes if later added.

Not allowed:

- hidden optimal dispatch,
- hidden emergency thermal activation,
- automatic load shedding without player action.

## Use synthetic data for core balance

Core gameplay should run offline with deterministic config.

External data can be added only as optional non-mechanical metadata.

It should not break the match if unavailable.

## Deterministic demo mode

For hackathon presentation, support a seeded/demo event timeline.

```ts
const DEMO_SEED = 'vivatech-grid-duel-demo';
```

or a hardcoded script:

```ts
const DEMO_EVENTS = [
  { time: 35, type: 'footballWarning' },
  { time: 42, type: 'footballImpact' },
  { time: 65, type: 'cloudWarning' },
  { time: 70, type: 'cloudImpact' },
];
```

This improves reliability during a short pitch.

## Documentation rule

If you change a formula, update the corresponding wiki file in the same commit.

Formula owners:

| Formula | File |
|---|---|
| Efficiency | `03-efficiency-model.md` |
| Price/revenue | `04-price-market-revenue.md` |
| Customer movement | `05-demand-and-customers.md` |
| Asset dynamics | `07-generation-assets.md` |
| Breaker/strikes | `08-grid-overload-and-reliability.md` |
| Events/cards | `09-events-and-cards.md` |
| Upgrades | `10-upgrades-and-progression.md` |
