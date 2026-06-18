---
title: "Production Console Visual Direction"
type: "screen"
status: "draft"
updated: "2026-06-18"
tags: ["50hz", "visual-design", "production-console", "manual-control", "controls"]
summary: "Early visual direction for the manual production control center: gauges, potentiometers, switches, and breaker/reset controls."
related: ["../gameplay/06-manual-control-room.md", "../gameplay/07-generation-assets.md", "../gameplay/08-grid-overload-and-reliability.md", "21-dispatch-console-layout.md", "25-grid-pressure-meter.md"]
---

# Production Console Visual Direction

## Purpose

The Production Console is the manual control-center screen.

It answers:

```txt
How do I physically change generation and load response right now?
```

This screen is not fully visually established yet. Until final art direction is chosen, use a physical control-room language:

```txt
gauges
potentiometers
throw switches
push buttons
breaker lamps
paper labels
mechanical detents
```

## Gameplay truth

Gameplay owns the mechanics.

This visual screen must expose the canonical controls from gameplay:

| Gameplay control | Visual object | Required feedback |
|---|---|---|
| Nuclear target | Large slow potentiometer / target dial | Current output chases target slowly |
| Thermal throttle | Lever or rotary throttle | Heat gauge and amber/red overheat lamp |
| Water dam control | Three-position switch: `FILL / HOLD / DRAIN` | Stored-water gauge and available MW lamp |
| Wind turbine routing | Protected toggle: `ON / OFF` | Wind-valid lamp and current wind output |
| Breaker status | Status-only emergency panel | Grid-down, reset-required, and recovery-relief readouts |

## Screen composition

Recommended MVP layout:

```txt
┌────────────────────────────────────────────────────────────────────────────┐
│ PRODUCTION CONSOLE                         GRID PRESSURE MINI STATUS       │
├──────────────────────┬──────────────────────┬─────────────────────────────┤
│ REACTOR TARGET       │ BOILER THROTTLE      │ WATER DAM                   │
│ big rotary dial      │ lever + heat gauge   │ FILL / HOLD / DRAIN switch  │
│ current vs target    │ output MW            │ reservoir gauge             │
├──────────────────────┴──────────────────────┼─────────────────────────────┤
│ RENEWABLE ROUTING                            │ EMERGENCY PANEL             │
│ wind ON/OFF, solar available, weather lamp   │ BREAKER STATUS              │
└──────────────────────────────────────────────┴─────────────────────────────┘
```

## Visual rules

- Controls must look physically actionable, not like flat dashboard cards.
- Every interactive control needs a visible current state.
- Slow controls need target and current readouts so inertia is readable.
- Emergency status needs guarded styling and clear downside labels.
- Breaker reset itself is a main-overview modal: large switch to arm, then green fuse button hold.
- Do not add automatic dispatch controls.
- Do not hide overload/underload behind generic warning text.

## State contract draft

```ts
type ProductionConsoleState = {
  nuclear: {
    outputMW: number;
    targetMW: number;
    capacityMW: number;
  };
  thermal: {
    outputMW: number;
    throttle: number;
    heat: number;
    isOverheated: boolean;
  };
  waterDam: {
    mode: 'fill' | 'hold' | 'drain';
    storedMWh: number;
    capacityMWh: number;
    outputMW: number;
  };
  renewables: {
    solarOutputMW: number;
    windOutputMW: number;
    windEnabled: boolean;
    windValid: boolean;
  };
  reliability: {
    generationMW: number;
    currentDemandMW: number;
    supplyDemandMismatch: number;
    balanceZone:
      | 'severeUnderload'
      | 'underload'
      | 'lock'
      | 'overload'
      | 'severeOverload';
    isBreakerTripped: boolean;
    breakerResetProgress: number;
  };
};
```

## Minimum implementation

The first version can use procedural PixiJS controls:

- `Graphics` dials and levers,
- lamp circles/squares,
- text labels,
- simple switch hit areas,
- reset status/progress readout,
- no authored sprites required.

## Acceptance criteria

The screen passes if a viewer can tell:

1. which generation source they are changing,
2. whether the grid is in overload, underload, or lock,
3. which controls are slow versus immediate,
4. which emergency controls have downsides.
