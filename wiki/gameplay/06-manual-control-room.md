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

Use 2 main screens for MVP.

| Screen | Purpose |
|---|---|
| Main overview | Understand current danger quickly |
| Production console | Manually match supply to load |

Informative detailed panel can be embedded in the main overview screen as modal.

## Screen 1 — Main overview

Purpose:

```txt
What is going wrong right now?
```

┌────────────────────────────────────────────────────────────────────────────┐
│ CASH RESERVE     FORECAST TAPE: NOW | +15s | +30s     INCIDENT QUEUE      │
│ €160             ☀  ☁  ❄              ⚽  DATA  MALUS                     │
├───────────────┬──────────────┬────────────────────┬──────────────┬───────┤
│ YOUR          │ YOUR         │ CITY LOAD WINDOW   │ RIVAL        │ RIVAL │
│ GENERATION    │ TARIFF       │                    │ TARIFF       │ GRID  │
│ STACK         │ BOARD        │ [Homes] [Offices]  │ BOARD        │ STACK │
│               │ 12¢/kWh      │ [Data Center]      │ 15¢/kWh      │       │
│ Reactor  II   │              │                    │              │       │
│ Boiler   I    │              │ CONTRACT SPLIT     │              │       │
│ Renew.   II   │              │ YOU ██████░░ RIVAL │              │       │
├───────────────┴──────────────┴────────────────────┴──────────────┴───────┤
│ UPGRADE RACK          GRID PRESSURE METER             DISPATCH CARDS      │
│ Reactor  [■■□] €80     IDLE | NOMINAL | STRAIN | TRIP  [Card][Card][Card]│
│ Boiler   [■□□] €45            big analog needle         [Card][Card]      │
│ Renew.   [■■□] €60       50Hz LOCK / OVERLOAD LAMP                       │
└────────────────────────────────────────────────────────────────────────────┘

Controls:

- upgrade
- play DISPATCH CARDS
- accept fixed contracts
- load shedding

This screen is mainly diagnostic.

## Screen 2 — Production console

Purpose:

```txt
Manually match supply to customer load.
```

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
| Load shedding | Emergency demand reduction with reputation and contract risk |


## Manual control principle

Each control should have a different response profile.

| System | Response | Skill |
|---|---|---|
| Nuclear | Slow | Anticipation |
| Thermal | Fast but costly | Crisis response |
| Water dam | Immediate if filled, unavailable if empty | Timing |
| Wind turbine | Produces only inside valid wind-speed range | Weather reading |
| Load shedding | Immediate but damaging | Last-resort breaker prevention |

## Anti-patterns

Avoid:

- one master screen with every control available,
- automatic optimal dispatch,
- hidden events with no warning,
- controls that all behave the same.
