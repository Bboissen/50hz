---
title: "Events and Cards"
type: "system"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "events", "cards", "warnings", "shocks", "demo-queue"]
summary: "Event phases, public event values, starter cards, design constraints, attack warnings, demo queue, economy, and chain reactions."
related: []
---

# Events and Cards

Events create synchronized shocks. Cards create 1v1 interaction.

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
| High wind | Wind inside valid range | Renewable opportunity | Fill dam or reduce thermal |
| Wind storm | Wind above cut-out speed | Renewable loss | Thermal + dam |
| Data center burst | Demand +35% | Digital infrastructure spikes | water dam + thermal |
| Cold wave | Heating +25% | Weather-driven demand | Nuclear pre-ramp + network |
| Football final | Household +20% | Synchronized behavior | water dam + thermal |
| Business rush | Demand ramps +20% | Predictable peak | Nuclear + upgrade planning |
| Sunny interval | Solar surge | Overproduction risk | Fill water dam or curtail renewable |

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
    heatingDemandMultiplier: 1.30,
  },
};
```

## Card types

Cards are player-triggered bonus/malus actions.

| Type | Meaning |
|---|---|
| Attack | Creates stress for opponent |
| Contract | Shared fixed-load offer accepted by the first player to commit |

## Starter card set

| Card | Type | Cost | Cooldown | Effect |
|---|---|---:|---:|---|
| Cloud Front | Attack | 30 | 25s | Opponent solar factor -35% for 8s |
| Wind Storm | Attack | 30 | 25s | Opponent wind speed forced above cut-out for 8s |
| Demand Response | Defense | 20 | 20s | Own customer demand -15% for 8s, reputation penalty |
| PR Campaign | Market/risk | 20 | 30s | Customer attraction +15% for 10s |
| Business Contract | Contract | 0 | offer-based | +15 MW fixed load for 45s; reward if completed |
| Data Center Contract | Contract | 0 | offer-based | +25 MW fixed load for 35s; high reward, massive strike penalty |

## Fixed contract offers

Fixed contracts are mutual offers visible to both players. The first player to accept gets the contract.

Rules:

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


## Warning for attacks

Opponent attacks should usually show a short warning.

```ts
const ATTACK_WARNING_SECONDS = 2;
```

This creates a chance to switch screens and respond.
