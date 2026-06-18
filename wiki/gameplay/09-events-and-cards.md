---
title: "Events and Cards"
type: "system"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "events", "contracts", "warnings", "shocks", "demo-queue"]
summary: "Event phases, public event values, fixed contract offers, demo queue, economy, and chain reactions."
related: []
---

# Events and Cards

Events create synchronized shocks. Cards create interaction against the AI opponent.

## Design goal

They should teach that electricity systems are affected by synchronized changes in both demand and supply.

## Event phases

Most major public events should have:

```txt
warning -> impact -> recovery
```

Example:

```ts
const event = {
  warningSeconds: 6,
  durationSeconds: 10,
  recoverySeconds: 4,
};
```

## Public events

Public events affect both players.

| Event | Effect | Lesson | Best response |
|---|---|---|---|
| Cloud front | Solar -60% | Renewable variability | Thermal + water dam |
| Rain | Solar reduced, dam fills, household demand +3% | Weather links supply/storage/demand | Fill/drain dam and trim thermal |
| Snow | Solar reduced, household demand +3% | Weather-driven demand | Nuclear pre-ramp + thermal/dam |
| High wind | Wind inside valid range | Renewable opportunity | Fill dam or reduce thermal |
| Wind storm | Wind above cut-out speed | Renewable loss | Thermal + dam |
| Data center burst | Demand +35% | Digital infrastructure spikes | water dam + thermal |
| Cold wave | Household demand +25% | Weather-driven demand | Nuclear pre-ramp + thermal/dam |
| Football final | Household +20% | Synchronized behavior | water dam + thermal |
| Business rush | Demand ramps +20% | Predictable peak | Nuclear + upgrade planning |
| Sunny interval | Solar surge | Overload / surplus risk | Fill water dam or curtail renewable |

## MVP event values

```ts
const PUBLIC_EVENTS = {
  cloudFront: {
    warningSeconds: 5,
    durationSeconds: 10,
    solarFactorMultiplier: 0.40,
  },
  windStorm: {
    warningSeconds: 5,
    durationSeconds: 9,
    windKmh: 100,
  },
  footballFinal: {
    warningSeconds: 6,
    durationSeconds: 8,
    householdDemandMultiplier: 1.25,
  },
  dataCenterBurst: {
    warningSeconds: 4,
    durationSeconds: 7,
    dataCenterDemandMultiplier: 1.45,
  },
  coldWave: {
    warningSeconds: 8,
    durationSeconds: 18,
    householdDemandMultiplier: 1.30,
  },
  rain: {
    householdDemandMultiplier: 1.03,
    rainActive: true,
    solarFactorMultiplier: 0.35,
  },
  snow: {
    householdDemandMultiplier: 1.03,
    solarFactorMultiplier: 0.25,
  },
};
```

## Player-triggered offers

The MVP has no playable attack or defense cards. Weather and city shocks remain scripted public events.

Player-triggered actions for this system are fixed-contract offers only.

## Fixed contract offers

Fixed contracts are mutual offers visible to both players. The first player to accept gets the contract.

Rules:

- each offer appears as a blocking contract modal with accept and decline actions,
- the modal auto-declines after 5 seconds if the player does nothing,
- breaker reset has higher priority; when reset is required, the contract countdown pauses and the breaker modal is shown instead,
- accepted contracts cannot be cancelled,
- contract load is constant for the full duration,
- contract load is added on top of customer load,
- contracts can push load beyond deterministic max capacity toward total max capacity,
- a strike while a contract is active applies the contract penalty,
- the same offer disappears for both players after acceptance.

Recommended MVP values:

| Contract | Load | Duration | Completion reward | Strike penalty |
|---|---:|---:|---:|---:|
| Business Contract | 15 MW | 45s | 35 cash | 70 score |
| Data Center Contract | 25 MW | 35s | 60 cash | 140 score |
