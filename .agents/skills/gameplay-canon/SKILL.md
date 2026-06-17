---
name: gameplay-canon
description: Use when a gameplay change is broad, crosses systems, or does not fit a more specific 50Hz skill. Do not use for narrow economy, UI, events, or tuning work when a specific skill applies.
---

# Gameplay Canon Skill

## Trigger

Use this as the fallback gameplay skill for core loop, match flow, new mechanics, scoring-adjacent behavior, or work spanning multiple gameplay systems.

Prefer a narrower skill when possible:

- `economy-balance` for efficiency, pricing, customer share, revenue, score math, or cash.
- `manual-control-room` for screens, controls, operator actions, alarms, or UI flow.
- `event-card-system` for public events, cards, shocks, warnings, cooldowns, or event UI.
- `tuning-and-playtest` for numeric adjustment after implementation.

## Minimal Context

Read only:

1. `AGENTS.md`
2. `wiki/gameplay/00-canonical-summary.md`
3. `wiki/gameplay/01-design-axioms.md`
4. `wiki/gameplay/02-core-loop.md`
5. The one mechanic-specific wiki page, if the change has one

Use `python3 scripts/wiki.py search "<query>"` only if the mechanic page is unclear.

## Do

- Keep mechanics manual and screen-based.
- Preserve the efficiency -> price -> customers -> revenue -> overload loop.
- Keep gameplay readable for a 1-2 minute demo.
- Add tests for any formula that affects price, revenue, overload, or scoring.

## Do not

- Replace manual gameplay with automatic dispatch.
- Add realism that weakens the arcade loop.
- Make real data mandatory for simulation balance.
- Add a new mechanic without connecting it to efficiency, price, customers, overload, events, or upgrades.

## Required invariant checks

Whenever touching gameplay, mentally check:

```ts
higherEfficiency -> lowerPrice
higherEfficiency -> higherCashGain
moreCustomers -> moreGridPressure
moreCapacityTooEarly -> possibleUtilizationPenalty
```
