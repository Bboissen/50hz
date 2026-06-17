---
title: "City Sectors Visual Design"
type: "visual_system"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "city", "demand", "sectors", "pixel-art"]
summary: "Visual state specification for the City Load Window: Homes, Services, Data Centers, demand spikes, overload states, icons, and event links."
related: ["21-dispatch-console-layout.md", "23-ui-naming-and-taxonomy.md", "26-events-cards-timelines.md", "29-asset-inventory-and-ownership.md"]
---

# City Sectors Visual Design

## Purpose

The City Load Window turns demand into something physical.

It should show:

```txt
which sector is drawing power
which sector is spiking
which sector is demand-critical
what the player is currently serving
```

For the city, use a compact pixel-art diorama.

## City composition

```txt
┌──────────────────────────────────────────────┐
│ CITY LOAD WINDOW                             │
│                                              │
│ [Homes apartment blocks] [Services towers]   │
│ [Data center bunker + fans + cooling units]  │
│                                              │
│ CONTRACT SPLIT                               │
│ YOU ███████░░░░ RIVAL                        │
└──────────────────────────────────────────────┘
```

## Shared sector state model

Each sector uses the same visual state contract.

```ts
type SectorKey = 'homes' | 'services' | 'dataCenters';

type SectorVisualState = {
  sector: SectorKey;
  demandLevel: 0 | 1 | 2 | 3;
  isSpiking: boolean;
  isDemandCritical: boolean;
  isBrownedOut: boolean;
  activeEventId?: string;
};
```

## Demand levels

| Level | Label | Visual |
|---:|---|---|
| 0 | Idle | Few lights, slow animation |
| 1 | Normal | Moderate lights, stable lamps |
| 2 | Spike | More lights, amber pulse |
| 3 | Demand critical | Red lamp, flicker, fast animation |

## Sector 1 — Homes

| Attribute | Direction |
|---|---|
| Building shape | Soviet apartment slabs, small houses, antennas, chimneys |
| Idle animation | Random windows turn on/off; tiny smoke puff every few seconds |
| Demand spike | Many windows light at once; radiator or TV icon pulses |
| Demand-critical animation | Windows flicker; stairwell strip turns red; one block briefly darkens |
| Brownout | Large percentage of windows off, red stamp or dark overlay |
| Icon | Apartment block + radiator or TV |
| Color cue | Warm yellow / orange |
| Event examples | Football Final, Dinner Hour, Cold Wave, Holiday Evening, Heat Pump Surge |

### Homes asset notes

- One authored sprite is enough: `building_homes_slab.png`.
- Window lights can be code-generated rectangles over the sprite.
- Smoke can be a code-generated 2–3 frame puff or skipped.

## Sector 2 — Services

| Attribute | Direction |
|---|---|
| Building shape | Municipal office block, shops, hospital/service tower, tram stop |
| Idle animation | Office floors switch slowly; shop sign flickers |
| Demand spike | Most floors light up; elevator line moves; sign pulses |
| Demand-critical animation | Neon sign dies; floors flicker; elevator warning lamp blinks |
| Brownout | Office tower dark except emergency lights |
| Icon | Briefcase, storefront, or office tower |
| Color cue | Pale green / cool white |
| Event examples | Monday Rush, Shopping Peak, Hospital Alert, Business Expo, Metro Delay |

### Services asset notes

- One authored sprite is enough: `building_services_tower.png`.
- Floor lights should be code-controlled overlay rows.
- Emergency cross/hospital symbol is optional.

## Sector 3 — Data Centers

| Attribute | Direction |
|---|---|
| Building shape | Low bunker-like server hall, cooling fans, vents, antenna mast |
| Idle animation | Blue LEDs blink; fans rotate in 2 frames |
| Demand spike | Fans spin faster; cyan cable pulses; cooling vapor appears |
| Demand-critical animation | Red fault LEDs; fan shake; frost/steam leak |
| Brownout | LEDs off, one red fault light remains |
| Icon | Server rack + fan or snowflake |
| Color cue | Cyan / pale blue |
| Event examples | Data Center Burst, Cloud Backup, AI Training Run, Streaming Surge, Crypto Panic |

### Data center asset notes

- One authored sprite is enough: `building_data_bunker.png`.
- Fans can be separate small sprites or code-generated spinning rectangles.
- Use cyan sparingly so it does not become generic sci-fi.

## Sector pressure lamps

Each sector gets 3 small lamps.

```txt
HOMES        ● ● ○
SERVICES     ● ○ ○
DATA         ● ● ●
```

| State | Lamp color |
|---|---|
| Idle | Dim green/grey |
| Normal | Green |
| Spike | Amber |
| Demand critical | Red blinking |

## Contract Split bar

Place below sectors inside City Load Window.

```txt
CONTRACT SPLIT
YOU ███████░░░░ RIVAL
```

| Rule | Value |
|---|---|
| Measures | Current subscribed load share, with target market share as a thin ghost marker |
| Purpose | Shows why low tariff will increase player grid pressure after customer movement delay |
| Animation | Current bar moves at gameplay share-change speed; target marker ticks immediately from tariff |
| Color | Player green/teal, rival rust/red, neutral dark gap |

## Minimum implementation

MVP can use:

- three simple blocky building silhouettes from `Graphics`,
- window rectangles as lights,
- 3 lamps per sector,
- red overlay when demand-critical,
- no authored city sprites initially.

Then swap in authored sprites when available.

## Acceptance criteria

A viewer should recognize all three sectors without reading labels after the first demo explanation.

At any time, the most stressed sector should be identifiable by:

1. brighter/faster lights,
2. amber/red pressure lamps,
3. event icon or stamp above it.
