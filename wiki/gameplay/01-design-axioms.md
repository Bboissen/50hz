---
title: "Design Axioms"
type: "axioms"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "gameplay", "axioms", "invariants", "manual-control"]
summary: "Non-negotiable gameplay axioms covering manual operation, economy invariants, overload risk, events, realism, and demo readability."
related: []
---

# Design Axioms

These axioms are the gameplay constitution. If code or balance conflicts with this file, update the design intentionally or fix the code.

## AX-01 — Manual operation is the game

The player must actively adjust systems in real time. The game should not become an automatic dispatch simulator.

Manual actions include:

- adjusting nuclear target output,
- adjusting thermal turbines,
- stopping wind turbines,
- filling or draining the water dam,
- accepting fixed-load contracts,
- resetting breakers,
- playing cards,
- buying upgrades under pressure.

## AX-02 — Better efficiency means lower price

The customer price must decrease when efficiency increases.

```ts
if (efficiencyA > efficiencyB) {
  priceA < priceB;
}
```

This is not optional.

## AX-03 — Better efficiency means more money

The better-efficiency player must gain more cash than the worse-efficiency player for the same tick.

```ts
if (efficiencyA > efficiencyB) {
  cashGainA > cashGainB;
}
```

The intended explanation is:

```txt
higher efficiency -> lower price -> more consumers -> more revenue
```

Use the canonical economy model in [`04-price-market-revenue.md`](./04-price-market-revenue.md).

## AX-04 — Price is a market signal and a score signal

Price is not just cosmetic. It drives customer attraction and explains why the better operator wins the market.

## AX-05 — Customers are both reward and danger

More customers mean:

- more load served,
- more revenue,
- higher grid utilization,
- greater overload risk.

Winning the market should create new operational danger.

## AX-06 — Grid overload is the central failure pressure

The main danger state is not simply “low efficiency.” The main danger state is **supply/demand mismatch**.

```txt
cheap price -> more customers -> real-time demand changes -> supply/demand mismatch -> breaker risk
```

## AX-07 — High contract utilization is good until real-time operation fails

The grid should be most efficient when the current capacity basis is heavily contracted but not exceeded.

Target zone:

```txt
85%-98% contracted capacity basis = excellent
supply more than 5% away from demand = breaker risk after delay
```

## AX-08 — Overbuilding too early is inefficient

A player who buys too much capacity before having enough customers should lose some efficiency because deterministic capacity is under-contracted. There is a static cost for installation level.

This creates a real decision:

```txt
upgrade too late -> overload
upgrade too early -> worse price and slower growth
```

## AX-09 — Events must be readable before they punish

Major public events should usually have warning time.

```txt
forecast warning -> player response window -> event impact -> recovery
```

Punishment should be tied to player reaction.

## AX-10 — Cards create stress, not instant unavoidable failure

Bonus/malus cards should force decisions and screen switching. They should not instantly decide the match with no counterplay.

## AX-11 — Synthetic balance beats realism for MVP

The goal is an educational and legible game, not an accurate electricity-market simulator.

Use real data only as non-mechanical context unless specifically promoted into a tested mechanic.

## AX-12 — Short demo readability matters

Every mechanic should be explainable quickly. Prefer 4 strong operational surfaces over 12 shallow systems.

The demo should communicate the loop in less than 30 seconds.
