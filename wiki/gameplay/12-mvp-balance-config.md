---
title: "MVP Balance Config"
type: "config"
status: "draft"
updated: "2026-06-18"
tags: ["50hz", "balance", "config", "mvp", "tuning", "playtest"]
summary: "TypeScript-style MVP balance constants, first tuning targets, sanity checks, and playtest questions."
related: []
---

# MVP Balance Config

This file contains a recommended first playable configuration. Treat it as a starting point, not as final balance.

## TypeScript-style config

```ts
export const GAME_CONFIG = {
  match: {
    durationSeconds: 300,
    tickRateHz: 30,
    simulationSpeed: 0.60,
    defaultSeed: 'vivatech-grid-duel-demo',
  },

  weather: {
    dayCycleSeconds: 36,
    rainSnowHouseholdMultiplier: 1.03,
    forecastOffsetsSeconds: [0, 15, 30, 45],
  },

  demand: {
    baseTotalMW: 140,
    progressionSteps: 6,
    progressionStartSeconds: 40,
    progressionEndSeconds: 270,
    progressionJitterSeconds: 10,
    progressionRampSeconds: 12,
    sectors: {
      householdsMW: [80, 100, 120],
      businessMW: [15, 35, 55],
      dataCentersMW: [45, 65, 85],
    },
  },

  market: {
    minPrice: 70,
    maxPrice: 120,
    priceElasticity: 2.2,
    minMargin: 0.30,
    maxMargin: 1.00,
    moneyScale: 0.001,
    maxShareChangePerSecond: 0.012,
    minShare: 0.10,
    maxShare: 0.90,
  },

  players: {
    startingCash: 80,
    startingSubscribedLoadShare: 0.50,
    startingScore: 0,
    startingStrikes: 0,
  },

  assets: {
    gridCapacityMW: 210,
    plantLevels: {
      nuclearMW: [35, 70, 105],
      thermalMW: [45, 70, 95],
      renewablePeakMW: [25, 40, 55],
      waterDamStorageMWh: [20, 35, 50],
      waterDamPowerMW: [15, 25, 35],
    },

    nuclear: {
      capacityMW: 35,
      rampMWPerSecond: 15,
      initialOutputMW: 35,
    },

    thermal: {
      capacityMW: 45,
      initialThrottle: 0.38,
      heatGainPerSecond: 0.07,
      coolingPerSecond: 0.04,
      overheatThreshold: 0.85,
      outputMultiplierWhenOverheated: 0.85,
    },

    renewable: {
      solarPeakMW: 10,
      solarShare: 0.40,
      windPeakMW: 15,
      windShare: 0.60,
      windCutInKmh: 12,
      windFullPowerKmh: 45,
      windCutOutKmh: 90,
      windDefaultKmh: 35,
    },

    waterDam: {
      capacityMWh: 20,
      maxPowerMW: 15,
      initialStoredRatio: 0.50,
      fillEfficiency: 0.75,
      drainEfficiency: 0.90,
      storageSecondsPerMWh: 20,
      rainFillMWhPerSecond: 0.50,
      rainAutoDrainThreshold: 0.95,
      rainAutoDrainPowerRatio: 0.25,
    },
  },

  efficiency: {
    targetUtilizationMin: 0.85,
    targetUtilizationMax: 0.98,
    edgeUtilizationMax: 1.00,
    overContractedMax: 1.05,
  },

  breaker: {
    safeBalanceBand: 0.05,
    severeBalanceMismatch: 0.15,
    balanceBreakerSeconds: 3,
    severeBalanceTimerMultiplier: 3,
    balanceRecoverySeconds: 1,
    capacityOverloadInstantThreshold: 1.05,
    capacityOverloadBreakerSeconds: 3,
    capacityOverloadRecoverySeconds: 1,
    breakerTripSeconds: 8,
    gridShutdownReliefSeconds: 5,
    resetCost: 35,
  },

  strike: {
    cashPenalty: 25,
    subscriberLossRatio: 0.10,
    scorePenalty: 80,
  },

  upgrades: {
    repeatCostMultiplier: 1.25,
    renewable: {
      baseCost: 45,
      buildSeconds: 10,
    },
    thermal: {
      baseCost: 40,
      buildSeconds: 8,
    },
    nuclear: {
      baseCost: 85,
      buildSeconds: 20,
    },
    waterDam: {
      baseCost: 50,
      buildSeconds: 12,
    },
  },

  contracts: {
    offerMode: 'first-come-first-served',
    offerWindowSeconds: 5,
    offerSchedule: [
      { id: 'business-1', kind: 'business', startsAtSeconds: 3 },
      { id: 'data-center-1', kind: 'dataCenter', startsAtSeconds: 75 },
    ],
    types: {
      business: {
        loadMW: 15,
        durationSeconds: 45,
        completionCashReward: 35,
        strikeScorePenalty: 70,
      },
      dataCenter: {
        loadMW: 25,
        durationSeconds: 35,
        completionCashReward: 60,
        strikeScorePenalty: 140,
      },
    },
  },
};
```

## First tuning targets

A match meets the first tuning target when:

| Situation | Desired behavior |
|---|---|
| 10%-20% efficiency advantage | lower price and higher cash gain |
| Customer load reaches deterministic cap | normal subscriptions stop growing |
| Fixed contract accepted near cap | high reward but immediate breaker pressure |
| Supply/demand mismatch exceeds 5% | breaker timer starts |
| Capacity utilization exceeds 105% | breaker trips immediately |
| Breaker trips | all plant states become grid down; supply, demand, and served contract load read 0 |
| Breaker reset unaffordable | match ends immediately |
| First 5s after reset | served contract load follows supply to give ramping headroom |
| One event hits | manageable with good manual reaction |
| Two events overlap | creates panic and likely breaker if unprepared |
| Early plant overbuild | short-term efficiency/price penalty |
| Good player | earns more money but has more real-time control risk |
| Bad player | loses customers, gets recovery room, earns less |

## Starting balance sanity check

Baseline:

```txt
total demand = 140 MW
player share = 50%
customer load = 70 MW
grid delivery capacity = 210 MW
nuclear + thermal deterministic generation = 80 MW
deterministic max capacity = min(210, 80) = 80 MW
contract utilization = 70 / 80 = 87.5%
```

This starts the player inside the target efficiency band.

Normal customer subscription cap:

```txt
deterministic max capacity = 80 MW
base total demand = 140 MW
max normal subscribed load share = 80 / 140 = 57.1%
```

Sector level sanity checks:

```txt
all sectors level 1 = 140 MW
all sectors level 2 = 200 MW
all sectors level 3 = 260 MW
level-2 demand at 50% share = 100 MW
level-3 demand at 50% share = 130 MW
level-2 reactor + level-2 boiler = 140 MW deterministic
level-3 reactor + level-3 boiler = 200 MW deterministic
```

If the player accepts a Business Contract at the starting state:

```txt
customer load = 70 MW
business contract = 15 MW
current contract load = 85 MW
deterministic max capacity = 80 MW
total max capacity with normal renewable/dam available is above deterministic capacity
fixed-contract capacity basis uses current total max capacity
capacity utilization remains below instant-trip range if production is prepared
result = no capacity breaker yet, but high real-time supply/demand risk if renewable or dam output drops
```

This is intentional: fixed contracts are high reward, high risk.

## Suggested first playtest questions

- Does the better contract-utilization player always earn more cash?
- Does cheaper price attract customers quickly enough?
- Does normal customer growth stop at deterministic max capacity?
- Does accepting a fixed contract feel tempting but dangerous?
- Does the 5% supply/demand band create understandable breaker pressure?
- Are renewable and dam controls useful without becoming automatic safety nets?
- Does overbuilding dependable generation reduce efficiency enough to matter?
- Are production controls responsive but not trivial?
- Are event warnings readable?
- Does the player switch screens under pressure?
