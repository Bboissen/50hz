---
title: "Grid Pressure Meter"
type: "system_ui"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "grid-pressure", "meter", "overload", "ui"]
summary: "Definition and visual spec for the central dual indicator showing capacity utilization and real-time overload/underload balance."
related: ["../gameplay/00-canonical-summary.md", "../gameplay/06-manual-control-room.md", "21-dispatch-console-layout.md", "28-animation-and-feedback-priorities.md"]
---

# Grid Pressure Meter

## Purpose

The Grid Pressure Meter is the iconic tension object of the main screen.

It communicates this instantly:

```txt
I am efficient and winning customers, but I am close to overload.
```

Do not call it a VU meter in the player-facing UI.

Gameplay owns the truth. This visual component must display gameplay values; it must not invent its own pressure formula.

## Player-facing name

```txt
GRID PRESSURE
```

Optional sublabel:

```txt
CAPACITY + LOAD BALANCE
```

## What it measures

The meter shows two related but distinct gameplay risks:

| Indicator | Gameplay value | Meaning |
|---|---|---|
| Capacity gauge | `capacityUtilization = currentContractLoadMW / contractCapacityBasisMW` | Contracted load pressure against safe capacity basis |
| Balance gauge | `supplyDemandMismatch = (deliveredSupplyMW - currentDemandMW) / currentDemandMW` | Real-time underload/overload matching problem |

Capacity pressure rises when:

- player tariff is lower than rival tariff,
- player wins customers,
- city demand spikes,
- fixed contracts add committed load,
- capacity is not upgraded fast enough.

Capacity pressure falls when:

- the rival wins customers,
- demand falls,
- the player increases dependable capacity,
- emergency tools reduce committed load.

Balance pressure moves left or right when delivered supply is below or above current demand.

## Relationship to other concepts

| Concept | UI object | Meaning |
|---|---|---|
| Tariff | Tariff Board | Market price; lower attracts customers |
| Contract Split | Contract Split bar | Current subscribed share plus target market share |
| Grid Pressure | Grid Pressure Meter | Capacity utilization and real-time load balance |
| Efficiency | Economic calculation | Determines how cheap/profitable the player can be |
| Supply/demand balance | Production console | Manual production matching problem |

## Capacity gauge zones

| Range | Zone label | Color | Meaning |
|---:|---|---|---|
| 0–70% | IDLE | Dim green/grey | Underused infrastructure; safe but inefficient |
| 70–85% | SAFE | Phosphor green | Safe but not peak efficiency |
| 85–98% | EFFICIENT | Bright green | Canonical efficiency sweet spot |
| 98–100% | STRAIN | Amber | Efficient edge, overload risk rising |
| 100–105% | TRIP RISK | Red | Capacity overload timer running |
| 105%+ | TRIP | Red flash | Instant breaker trip |

## Balance gauge zones

| Mismatch | Zone label | Color | Meaning |
|---:|---|---|---|
| below -15% | SEVERE UNDERLOAD | Red | Delivered supply far below current demand |
| -15% to -5% | UNDERLOAD | Amber | Shortage risk, breaker timer rises |
| -5% to +5% | LOCK | Phosphor green | Manual production is matched |
| +5% to +15% | OVERLOAD | Amber | Surplus risk, breaker timer rises |
| above +15% | SEVERE OVERLOAD | Red | Severe surplus mismatch |

## Visual construction

Use a large semicircular analog meter.

```txt
┌─────────────────────────────┐
│        GRID PRESSURE         │
│ CAPACITY: IDLE SAFE EFFICIENT│
│       ╭────────────────╮    │
│       │   cap needle    │    │
│       ╰────────────────╯    │
│ BALANCE: UNDER | LOCK | OVER │
│       ◄───────●───────►      │
│              [TRIP LAMP]     │
└─────────────────────────────┘
```

Required parts:

- printed arc with zone labels,
- physical needle,
- second balance gauge or stacked balance strip,
- red `TRIP` lamp,
- small `50Hz` brand plaque away from numeric readouts,
- glass highlight or dark bevel,
- optional screws and calibration ticks.

## Game name placement

`50Hz` is the game name, not a simulated grid-frequency value.

Allowed use:

```txt
small brand plaque on the meter frame or console header
```

Do not show a numeric Hz gameplay readout unless a future mechanic explicitly models frequency.

## Animation states

| State | Animation |
|---|---|
| Normal | Capacity needle gently vibrates ±1°; balance marker rests near center |
| Strain | Capacity needle jitter ±2–3° or balance marker enters amber |
| Danger | Red lamp blink, panel border flashes |
| Trip | Capacity needle slams right or balance marker pegs to edge; `TRIP` stamp appears |
| Recovery | Needles ease back with mechanical lag |

## PixiJS implementation notes

The meter can be code-generated.

| Part | Recommended PixiJS object |
|---|---|
| Capacity arc and zones | `Graphics` |
| Balance strip or second gauge | `Graphics` |
| Tick marks | `Graphics` lines or small sprites |
| Needles/markers | `Graphics` polygon in rotating/sliding `Container` |
| Text labels | `Text` initially, `BitmapText` later |
| Lamp | `Graphics` circle + glow sprite/alpha blink |
| Glass highlight | semi-transparent `Graphics` shape or sprite |
| TRIP stamp | `Text`/sprite overlay in `AlarmOverlayLayer` |

## Update contract

```ts
type GridPressureMeterState = {
  capacityUtilization: number; // currentContractLoadMW / contractCapacityBasisMW
  supplyDemandMismatch: number; // -0.15 underload to +0.15 overload, can exceed
  contractCapacityBasisMW: number;
  currentContractLoadMW: number;
  deliveredSupplyMW: number;
  currentDemandMW: number;
  capacityZone: 'idle' | 'safe' | 'efficient' | 'strain' | 'tripRisk' | 'trip';
  balanceZone:
    | 'severeUnderload'
    | 'underload'
    | 'lock'
    | 'overload'
    | 'severeOverload';
  isBreakerTripped: boolean;
};
```

## Ownership

| Item | Owner | Type | Notes |
|---|---|---|---|
| Meter arc | Agentic coder | Code-generated | Use design tokens |
| Needles/markers | Agentic coder | Code-generated | Rotate capacity needle and slide/rotate balance marker from gameplay state |
| Zone labels | Agentic coder | Code-generated text | Replace with bitmap font later |
| Glass/dust sprite | Human optional | Authored asset | Nice-to-have |
| TRIP stamp texture | Human optional | Authored asset | Can be code-generated first |

## Acceptance criteria

The meter passes if:

1. it is the biggest bottom-row object,
2. pressure state is readable without reading numbers,
3. overload is impossible to miss,
4. the user understands this is the player's grid risk, not total city demand.
