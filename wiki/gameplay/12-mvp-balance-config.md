---
title: "MVP Balance Config"
type: "config"
status: "draft"
updated: "2026-06-17"
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
    durationSeconds: 240,
    tickRateHz: 30,
  },

  demand: {
    baseTotalMW: 140,
    sectors: {
      householdsMW: 80,
      businessMW: 45,
      dataCentersMW: 15,
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
    gridCapacityMW: 90,

    nuclear: {
      capacityMW: 35,
      rampMWPerSecond: 15,
      initialOutputMW: 35,
    },

    thermal: {
      capacityMW: 45,
      heatGainPerSecond: 0.07,
      coolingPerSecond: 0.04,
      overheatThreshold: 0.85,
      outputMultiplierWhenOverheated: 0.85,
    },

    renewable: {
      solarPeakMW: 25,
      solarDefaultFactor: 0.75,
      solarCloudFactor: 0.30,
      windPeakMW: 25,
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
      rainFillMWhPerSecond: 0.50,
      rainAutoDrainThreshold: 0.95,
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
      solarPeakMW: 15,
      windPeakMW: 15,
    },
    thermal: {
      baseCost: 40,
      buildSeconds: 8,
      capacityMW: 25,
    },
    nuclear: {
      baseCost: 85,
      buildSeconds: 20,
      capacityMW: 35,
    },
    waterDam: {
      baseCost: 50,
      buildSeconds: 12,
      capacityMWh: 15,
      maxPowerMW: 10,
    },
  },

  contracts: {
    offerMode: 'first-come-first-served',
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

  cards: {
    cloudFront: {
      cost: 30,
      cooldownSeconds: 25,
      warningSeconds: 2,
      durationSeconds: 8,
      opponentRenewableSolarFactorMultiplier: 0.65,
    },
    windStorm: {
      cost: 30,
      cooldownSeconds: 25,
      warningSeconds: 2,
      durationSeconds: 8,
      opponentWindKmh: 100,
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
grid delivery capacity = 90 MW
nuclear + thermal deterministic generation = 80 MW
deterministic max capacity = min(90, 80) = 80 MW
contract utilization = 70 / 80 = 87.5%
```

This starts the player inside the target efficiency band.

Normal customer subscription cap:

```txt
deterministic max capacity = 80 MW
base total demand = 140 MW
max normal subscribed load share = 80 / 140 = 57.1%
```

If the player accepts a Business Contract at the starting state:

```txt
customer load = 70 MW
business contract = 15 MW
current contract load = 85 MW
deterministic max capacity = 80 MW
total max capacity with normal renewable/dam available = 90 MW
fixed-contract capacity basis = 90 MW
capacity utilization = 85 / 90 = 94.4%
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
