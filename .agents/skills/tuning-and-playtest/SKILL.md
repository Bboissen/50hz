---
name: tuning-and-playtest
description: Use when adjusting balance values after implementing the first playable prototype or analyzing playtest results.
---

# Tuning and Playtest Skill

## Trigger

Use only after a mechanic exists or the user asks for balance/playtest analysis. Do not use this as a substitute for implementing missing systems.

## Minimal Context

Read only:

1. `wiki/gameplay/12-mvp-balance-config.md`
2. `wiki/gameplay/03-efficiency-model.md` when efficiency weights or utilization curves change
3. `wiki/gameplay/04-price-market-revenue.md` when price, revenue, margin, or market share changes
4. `wiki/gameplay/08-grid-overload-and-reliability.md` when overload pressure or recovery changes
5. `wiki/gameplay/09-events-and-cards.md` when event/card severity changes

## First tuning priority

Tune for the core loop before adding content.

Target loop:

```txt
better operation -> lower price -> more customers -> more revenue -> overload pressure
```

## Playtest checklist

A prototype is healthy when:

- the efficient player earns more money every tick,
- price differences visibly move customers,
- customer growth creates overload pressure within 20-40 seconds,
- overbuilding too early creates a noticeable but not fatal efficiency penalty,
- events are counterable with good manual play,
- players naturally switch screens often,
- the losing player has breathing room because they lose load pressure.

## Tuning Levers

| Problem | Increase/decrease |
|---|---|
| Customers move too slowly | increase `maxShareChangePerSecond` or `priceElasticity` |
| Customers move too violently | decrease `maxShareChangePerSecond` |
| Efficient player does not earn enough | increase `priceElasticity`, `maxMargin`, or `moneyScale` |
| Overload happens too often | increase starting grid capacity or reduce overload gain |
| Overload is too forgiving | increase overload gain or reduce recovery |
| Upgrades feel mandatory too early | reduce customer movement speed or increase starting capacity |
| Upgrades feel irrelevant | increase event severity or customer pressure |
| Gas solves everything | increase heat gain or stability penalty |
| Battery solves everything | reduce capacity/power or increase event duration |
| Solar is too safe | add cloud events or overproduction penalty |

## Never tune by breaking invariants

Do not solve a balance issue by violating:

```txt
higher efficiency -> lower price
higher efficiency -> more revenue
```

Use other levers instead.
