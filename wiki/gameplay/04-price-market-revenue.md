---
title: "Price, Market, and Revenue"
type: "model"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "economy", "price", "market-share", "revenue", "invariants"]
summary: "Canonical economy model proving higher efficiency lowers price and increases cash gain through attraction, target market share, margin, and revenue."
related: []
---

# Price, Market, and Revenue

This file contains the non-negotiable economy model.

## Required invariant

The economy must preserve both rules:

```txt
higher efficiency -> lower price
higher efficiency -> more cash gain
```

For two players in the same tick:

```ts
if (efficiencyA > efficiencyB) {
  assert(priceA < priceB);
  assert(cashGainA > cashGainB);
}
```

## Why naive revenue is forbidden

Do not use this as the main cash equation:

```ts
revenue = price * currentCustomers;
```

It can accidentally reward the less efficient player if they have a higher price or a temporary customer lead.

The game needs an arcade-market model where low price attracts enough customers to make the efficient operator earn more.

## Canonical price formula

Customer price is a decreasing function of efficiency.

```ts
function priceFromEfficiency(efficiency: number): number {
  const e = clamp01(efficiency);
  return MAX_PRICE - (MAX_PRICE - MIN_PRICE) * e;
}
```

Recommended values:

```ts
const MIN_PRICE = 70;
const MAX_PRICE = 120;
```

Examples:

| Efficiency | Price |
|---:|---:|
| 1.00 | 70 |
| 0.80 | 80 |
| 0.60 | 90 |
| 0.40 | 100 |
| 0.20 | 110 |
| 0.00 | 120 |

## Canonical attraction formula

Customers prefer the cheaper provider.

```ts
function attractionFromPrice(price: number): number {
  return Math.pow(1 / price, PRICE_ELASTICITY);
}
```

Use:

```ts
const PRICE_ELASTICITY = 2.2; // Must be > 1
```

For two players:

```ts
const attractionA = attractionFromPrice(priceA);
const attractionB = attractionFromPrice(priceB);

const targetMarketShareA = attractionA / (attractionA + attractionB);
const targetMarketShareB = 1 - targetMarketShareA;
```

## Why elasticity must be greater than 1

If revenue includes price, the lower-price player needs more than proportional customer gain.

For two players:

```txt
shareA / shareB = (priceB / priceA) ^ elasticity
```

Gross revenue ratio:

```txt
(priceA * shareA) / (priceB * shareB)
= (priceB / priceA) ^ (elasticity - 1)
```

Therefore, if:

```txt
priceA < priceB
elasticity > 1
```

Then:

```txt
grossRevenueA > grossRevenueB
```

This preserves the fantasy:

```txt
cheaper price -> many more consumers -> more revenue
```

## Canonical margin formula

Efficiency also improves operating margin.

```ts
function marginFromEfficiency(efficiency: number): number {
  const e = clamp01(efficiency);
  return MIN_MARGIN + (MAX_MARGIN - MIN_MARGIN) * e;
}
```

Recommended values:

```ts
const MIN_MARGIN = 0.30;
const MAX_MARGIN = 1.00;
```

Examples:

| Efficiency | Margin |
|---:|---:|
| 1.00 | 1.00 |
| 0.80 | 0.86 |
| 0.60 | 0.72 |
| 0.40 | 0.58 |
| 0.20 | 0.44 |
| 0.00 | 0.30 |

## Canonical revenue formula

Use target market share for cash generation to preserve the invariant. Use subscribed/load share separately for grid pressure.

```ts
const grossRevenue = totalDemandMW * targetMarketShare * price * MONEY_SCALE;
const cashGain = grossRevenue * marginFromEfficiency(efficiency);
```

Recommended:

```ts
const MONEY_SCALE = 0.001;
```

## Important distinction: revenue share vs load share

To preserve the economy invariant while still creating overload pressure, use two related shares:

| Share | Used for | Update speed |
|---|---|---|
| `targetMarketShare` | revenue calculation and market signal | immediate from price |
| `subscribedLoadShare` | physical load pressure on grid | moves toward target over time |

Reason:

- Revenue must instantly reward the better operator.
- Grid pressure should ramp in over a few seconds to create anticipation and overload gameplay.

Canonical update:

```ts
function updateSubscribedLoadShare(current: number, target: number, dt: number): number {
  const maxChange = MAX_SHARE_CHANGE_PER_SECOND * dt;
  return moveTowards(current, target, maxChange);
}
```

Recommended:

```ts
const MAX_SHARE_CHANGE_PER_SECOND = 0.012; // 1.2 percentage points per second
const MIN_SHARE = 0.10;
const MAX_SHARE = 0.90;
```

## Revenue example

Assume:

```txt
Total demand = 140 MW
MIN_PRICE = 70
MAX_PRICE = 120
PRICE_ELASTICITY = 2.2
MONEY_SCALE = 0.001
```

| Player | Efficiency | Price | Target market share | Gross revenue | Margin | Cash gain |
|---|---:|---:|---:|---:|---:|---:|
| A | 0.90 | 75.0 | 59.9% | 6.29 | 0.93 | 5.85 |
| B | 0.60 | 90.0 | 40.1% | 5.05 | 0.72 | 3.64 |

Player A is cheaper and still earns more because it attracts more consumers and has better margin.

## Tests that should exist

```ts
it('higher efficiency lowers price', () => {
  expect(priceFromEfficiency(0.9)).toBeLessThan(priceFromEfficiency(0.6));
});

it('higher efficiency earns more cash in a two-player tick', () => {
  const result = simulateRevenueTick({ efficiencyA: 0.9, efficiencyB: 0.6, totalDemandMW: 140 });
  expect(result.cashGainA).toBeGreaterThan(result.cashGainB);
});

it('elasticity greater than one makes cheaper provider gross more despite lower price', () => {
  expect(PRICE_ELASTICITY).toBeGreaterThan(1);
});
```
