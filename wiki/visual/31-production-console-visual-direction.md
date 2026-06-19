---
title: "Embedded Production Controls Visual Direction"
type: "screen"
status: "draft"
updated: "2026-06-18"
tags: ["50hz", "visual-design", "main-control-room", "manual-control", "controls"]
summary: "Visual direction for the embedded manual production controls: gauges, potentiometers, switches, and breaker/reset status."
related: ["../gameplay/06-manual-control-room.md", "../gameplay/07-generation-assets.md", "../gameplay/08-grid-overload-and-reliability.md", "21-dispatch-console-layout.md", "25-grid-pressure-meter.md"]
---

# Embedded Production Controls Visual Direction

## Purpose

The old separate Production Console is deprecated as a user-facing route. Its controls now live inside the single Main Control Room screen.

It answers:

```txt
How do I physically change generation and load response right now?
```

Use a physical control-room language:

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

This visual area must expose the canonical controls from gameplay:

| Gameplay control | Visual object | Required feedback |
|---|---|---|
| Nuclear target | Large slow incremental potentiometer / target trim dial | Current output chases target slowly |
| Thermal throttle | Incremental rotary throttle | Heat gauge and amber/red overheat lamp |
| Water dam control | Three-position rotary switch with visible `FILL / HOLD / DRAIN` labels | Stored-water gauge and available MW lamp |
| Wind turbine routing | Two-position rotary switch with visible `OFF / ON` labels | Wind output lamp shows connected output against installed peak, matching solar for now |
| Breaker status | Status-only emergency panel or modal | Grid-down, reset-required, and recovery-relief readouts |

## Screen composition

Recommended MVP placement:

```txt
RIGHT CONTROL TOWER
├─ REACTOR target-trim knob + output lamp row
├─ BOILER throttle-trim knob + heat lamp row
├─ WIND two-position rotary switch + solar readout
└─ DAM storage gauge + FILL/HOLD/DRAIN rotary switch

BOTTOM DESK
├─ Capacity meter
├─ Supply-delta meter
├─ Load forecast monitor
└─ Upgrade rack
```

## Visual rules

- Controls must look physically actionable, not like flat dashboard cards.
- Every interactive control needs a visible current state.
- Slow controls need target and current readouts so inertia is readable.
- Reactor and boiler knobs are relative trim controls: click-drag changes the target/throttle incrementally instead of jumping to an absolute dial position.
- Wind and dam switches must support left/right drag, while center taps cycle through modes and reverse at the ends.
- Wind and dam switch labels stay fixed; only the switch knob sprite rotates.
- Power numbers beside plant names must carry `MW` for context.
- Upgrade rows show the purchased level immediately and must not dim unrelated rows after one purchase.
- The forecast monitor can animate as a validation example, but that animation must not advance gameplay state.
- Added live text on the desk must be black, compact, and placed on the desk-top band above the main control desk.
- Emergency status needs guarded styling and clear downside labels.
- Breaker reset itself is a blocking main-control-room modal: large switch to arm, then green fuse button hold.
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

The current sprite-backed desk migration uses authored assets for the physical controls:

- `assets/ui/background/empty_background_1920.runtime.png` for the shipped desk backplate,
- authored LED, knob, needle, and upgrade sprites for visible controls,
- text labels and approved live-state overlays for readouts,
- transparent hit areas for interaction,
- green upgrade-level LEDs,
- fixed black switch labels,
- forecast scan animation inside the monitor only,
- no procedural dials, levers, lamp blocks, panel chrome, or gauge faces over the clean desk.

The `assets/ui/full_clean.png` image is a dev reference only. Use it for `?deskRef=1` alignment overlays, not as the shipped interface.

## Acceptance criteria

The screen passes if a viewer can tell:

1. which generation source they are changing,
2. whether the grid is in overload, underload, or lock,
3. which controls are slow versus immediate,
4. which emergency controls have downsides.
