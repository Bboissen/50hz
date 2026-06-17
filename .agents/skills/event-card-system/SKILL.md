---
name: event-card-system
description: Use when implementing public events, weather, demand shocks, cards, bonus/malus effects, warnings, cooldowns, or event UI.
---

# Event and Card System Skill

## Trigger

Use for public events, opponent cards, bonus/malus effects, event queues, warning timers, cooldowns, and UI that explains or counters shocks.

## Minimal Context

Read only:

1. `wiki/gameplay/09-events-and-cards.md`
2. `wiki/gameplay/05-demand-and-customers.md` for demand/customer shocks
3. `wiki/gameplay/08-grid-overload-and-reliability.md` for overload, reliability, breaker, or strike effects
4. `wiki/gameplay/07-generation-assets.md` for production or weather effects

## Event canon

Events should create synchronized shocks in demand or supply.

Most major events should follow:

```txt
warning -> impact -> recovery
```

## Card canon

Cards should create stress, not instant unavoidable failure.

Good card properties:

- has cost or cooldown,
- is readable,
- has counterplay,
- creates a reason to switch screens,
- interacts with overload, production, customers, or market pressure.

## Avoid

- untelegraphed instant blackouts,
- attack cards with no response window,
- too many card types before the MVP loop works,
- random event timing during the pitch demo.

## Demo mode

Prefer a seeded or scripted event queue for the hackathon demo.
