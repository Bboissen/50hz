---
name: economy-balance
description: Use when editing efficiency, pricing, market attraction, customer share, revenue, cash, scoring math, or economy balance values.
---

# Economy Balance Skill

## Trigger

Use for code or docs touching:

- efficiency components or aggregate efficiency;
- customer price, attraction, target market share, subscribed load share;
- revenue, cash gain, score, margin, or demand-to-money conversion;
- economy tests or balance constants.

## Minimal Context

Read only:

1. `wiki/gameplay/03-efficiency-model.md`
2. `wiki/gameplay/04-price-market-revenue.md`
3. `wiki/gameplay/05-demand-and-customers.md`
4. `wiki/gameplay/12-mvp-balance-config.md` only when changing numeric values
5. `wiki/gameplay/13-implementation-guardrails.md` only when adding or moving gameplay modules
6. `wiki/visual/27-upgrades-generation-tariffs.md` only when implementing tariff, customer-share, generation, or upgrade UI

## Non-negotiable invariant

For the same tick:

```ts
if (efficiencyA > efficiencyB) {
  assert(priceA < priceB);
  assert(cashGainA > cashGainB);
}
```

Do not use a cash model that violates this.

## Required Checks

Before finishing, verify or add tests for:

```ts
priceFromEfficiency(0.9) < priceFromEfficiency(0.6)
cashGainForEfficiency(0.9) > cashGainForEfficiency(0.6)
attractionFromPrice(75) > attractionFromPrice(90)
```

## Common failure modes

Avoid:

- using current subscribed customers for revenue in a way that lets a less efficient player earn more;
- setting `PRICE_ELASTICITY <= 1`;
- subtracting large fixed maintenance after revenue and breaking the monotonic guarantee;
- making upgrades always improve efficiency immediately;
- using price only as cosmetic UI.
