---
title: "Manual Control Gameplay"
type: "system"
status: "draft"
updated: "2026-06-18"
tags: ["50hz", "controls", "screens", "manual-control", "alarms"]
summary: "Screen model, manual interaction principles, alarms, pressure pattern, anti-patterns, and shortcuts."
related: []
---

# Manual Control Gameplay

Manual adjustment is the core of the game.

## Design target

The player must adjust the right system before events chain into overload, underload, or capacity overload.

The game should not be mostly automatic.

## Screen model

Use 1 main operational screen for MVP.

| Screen | Purpose |
|---|---|
| Main control room | Understand current danger and manually match supply to load |

The main control room combines the diagnostic overview and physical production controls. It is still manual: the player must read the instruments and operate reactor, thermal, wind, and water-dam controls directly. Blocking modals can appear above this screen for fixed-contract offers and breaker reset.

## Main control room

Purpose:

```txt
What is going wrong right now, and what can I manually do about it?
```

┌────────────────────────────────────────────────────────────────────────────┐
│ CASH RESERVE     FORECAST TAPE: NOW | +15s | +30s     INCIDENT QUEUE      │
│ ₽160             ☀  ☁  ❄              ⚽  DATA  MALUS                     │
├───────────────┬──────────────┬────────────────────┬──────────────┬───────┤
│ YOUR          │ YOUR         │ CITY LOAD WINDOW   │ RIVAL        │ RIVAL │
│ GENERATION    │ TARIFF       │                    │ TARIFF       │ GRID  │
│ STACK         │ BOARD        │ [Homes] [Offices]  │ BOARD        │ STACK │
│               │ ₽12/kWh      │ [Data Center]      │ ₽15/kWh      │       │
│ Reactor  II   │              │                    │              │       │
│ Boiler   I    │              │ CONTRACT SPLIT     │              │       │
│ Renew.   II   │              │ YOU ██████░░ RIVAL │              │       │
├───────────────┴──────────────┴────────────────────┴──────────────┴───────┤
│ UPGRADE RACK          GRID PRESSURE METER             DISPATCH CARDS      │
│ Reactor  [■■□] ₽80     IDLE | NOMINAL | STRAIN | TRIP  [Card][Card][Card]│
│ Boiler   [■□□] ₽45            big analog needle         [Card][Card]      │
│ Renew.   [■■□] ₽60       50Hz LOCK / OVERLOAD LAMP                       │
└────────────────────────────────────────────────────────────────────────────┘

Core areas:

- top-left world/load viewport for the phase-2 game view,
- bottom desk for upgrades, capacity, supply delta, and load forecast,
- right control tower for reactor target, thermal throttle, wind routing, solar readout, and water-dam mode,
- blocking contract and breaker-reset modals above the desk.

Controls:

- upgrade,
- accept fixed contracts,
- set nuclear target,
- set thermal throttle,
- set wind turbine routing,
- set water dam fill/hold/drain,
- reset the breaker through the emergency modal when grid-down.

The player must keep controllable generation output within 5% of current demand.

```ts
const supplyDemandMismatch = (generationMW - currentDemandMW) / Math.max(currentDemandMW, 1);
const supplyDemandSafe = Math.abs(supplyDemandMismatch) <= 0.05;
```

If supply is too low, the grid is in underload. If supply is too high, the grid is in overload. Both paths can trip a breaker after a delay.

Controls:

| Control | Role |
|---|---|
| Nuclear target | Slow cheap baseload |
| Thermal throttle | Fast expensive emergency power |
| Water dam control | Fill / neutral / drain |
| Wind turbine routing | ON / OFF |
| Breaker status | Grid-down and reset status; the reset action is handled by the blocking emergency modal |

When the breaker trips, the game stays on the main control room and opens a blocking reset modal. The player must flip the large breaker switch to `ON`, then hold the fuse button for 2 seconds. Completing the hold pays the reset cost; if the player cannot pay, the match ends immediately. Every plant reports `gridDown` and contributes 0 MW while reset is required. Supply, demand, and served contract load read as 0 until reset completes. For 15 seconds after reset, served load follows actual supply so the operator has recovery headroom while ramping generation back up.

## Manual control principle

Each control should have a different response profile.

| System | Response | Skill |
|---|---|---|
| Nuclear | Slow | Anticipation |
| Thermal | Fast but costly | Crisis response |
| Water dam | Short fill/drain ramp if storage allows | Timing |
| Wind turbine | Produces only inside valid wind-speed range | Weather reading |
| Breaker reset | Main-control-room modal switch arm plus fuse hold, paid from cash reserve | Recovery discipline |

## Anti-patterns

Avoid:

- passive dashboards where controls are hidden or automatic,
- automatic optimal dispatch,
- hidden events with no warning,
- controls that all behave the same.
