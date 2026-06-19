---
title: "Main Control Room Layout"
type: "screen"
status: "draft"
updated: "2026-06-18"
tags: ["50hz", "screen", "layout", "main-control-room", "pixijs"]
summary: "Single-screen main control-room composition, with fixed dimensions, desk zones, instrument layers, and PixiJS scene grouping."
related: ["../gameplay/06-manual-control-room.md", "20-visual-design-index.md", "22-art-direction-bible.md", "25-grid-pressure-meter.md", "30-pixijs-agent-integration-brief.md"]
---

# Main Control Room Layout

## Screen purpose

The main screen answers:

```txt
What is going wrong right now, and what can I manually do about it?
```

This is a **diagnostic and intervention screen**, not a passive dashboard. The MVP embeds the former production-console controls in the right tower and bottom desk instead of routing to a second user-facing screen.

## Fixed canvas target

| Parameter | Value |
|---|---:|
| Logical resolution | 1920 x 1080 |
| Aspect ratio | 16:9 |
| Safe margin | 24 px |
| Pixel scale target | 4x or integer-scaled assets |
| Camera | Static |
| Layout | Fixed for MVP; no responsive redesign |

## Macro layout

Use `assets/ui/full_clean.png` only as a reference overlay. The shipped desk backplate is `assets/ui/background/empty_background_1920.runtime.png`; interactive controls are Pixi sprite overlays and approved live-state overlays.

```txt
┌──────────────────────────────────────────────────────────────┬─────────────┐
│ PHASE-2 WORLD / CITY LOAD VIEWPORT                           │ REACTOR     │
│ black or current world view                                  │ BOILER      │
│                                                              ├─────────────┤
│ market/load HUD                                              │ WIND/SOLAR  │
│                                                              ├─────────────┤
│                                                              │ DAM         │
├───────────────┬───────────────────────┬──────────────────────┼─────────────┤
│ UPGRADE RACK  │ CAPACITY METER        │ SUPPLY DELTA METER   │ LOAD        │
│ plant rows    │ analog utilization    │ under/over balance   │ FORECAST    │
└───────────────┴───────────────────────┴──────────────────────┴─────────────┘
```

## Proportions

| Region | Y range | Height | Purpose |
|---|---:|---:|---|
| World viewport | 0-618 | 618 px | Phase-2 game/world area and compact load HUD |
| Right control tower | 0-620 | 620 px | Manual production controls |
| Bottom operator desk | 618-1080 | 462 px | Upgrades, grid pressure, supply delta, load forecast |

## Suggested zone bounds

Use these as implementation defaults, not strict art constraints.

| Zone | Bounds `(x,y,w,h)` | Priority | Notes |
|---|---:|---:|---|
| `WorldViewportLayer` | `0,0,1462,618` | Medium | Phase-2 area; can remain black/placeholder in this phase |
| `RightControlTower` | `1462,0,458,620` | Highest controls | Reactor, boiler, wind, solar, dam controls |
| `UpgradeRack` | `34,650,444,382` | High | Clickable upgrades; lamps show levels |
| `CapacityMeter` | `518,672,430,328` | Highest bottom priority | Capacity utilization analog meter |
| `SupplyDeltaMeter` | `974,672,456,328` | Highest bottom priority | Underload/overload balance meter |
| `ForecastMonitor` | `1488,660,386,338` | Medium | Event/load trace and active incident |
| `ContractOfferModal` | centered overlay | Conditional high | Fixed-contract accept/decline modal only |

## Reading order

Design for this eye path:

```txt
1. Capacity and supply-delta meters
2. Right-tower manual controls
3. Contract split and load HUD in the world viewport
4. Upgrade Rack
5. Contract offer modal / breaker reset modal
6. Forecast monitor and incident readout
```

## Information hierarchy

| Rank | Element | Visual treatment |
|---:|---|---|
| 1 | Capacity and Supply Delta | Largest analog objects; danger zones and needles |
| 2 | Right production controls | Physical dials/switches with visible state |
| 3 | Contract Split | Links price/load share to grid risk |
| 4 | Forecast Monitor | Upcoming load/event trace |
| 5 | Contract Offer Modal | Blocking offer, accept/decline buttons, 5s countdown |
| 6 | Upgrade Rack | Functional, compact; lamps and prices |
| 7 | Cash / tariff / weather / status HUD | Compact black text on the desk-top band above the main control desk |

## Density rules

- Show at most 5 plant rows in the upgrade rack.
- Do not show a bottom-right dispatch-card row.
- Do not render a second full control interface for the rival.
- Keep right-tower controls physically distinct: knobs, switches, lamps, and mode buttons.
- Avoid long stat blocks inside the world viewport.

## Interactive affordance rules

| Zone | Interactive? | Visual cue |
|---|---|---|
| Reactor knob | Yes | Incremental rotary target-trim knob with output/target readout |
| Boiler knob | Yes | Incremental rotary throttle-trim knob with heat/output readout |
| Wind switch | Yes | Physical two-position rotary switch with fixed `OFF / ON` labels; left/right drag connects or disconnects wind from the grid without changing the resource LED level |
| Dam mode switch | Yes | Physical three-position rotary switch with fixed `FILL / HOLD / DRAIN` labels, left/right drag, and storage gauge |
| Upgrade Rack | Yes | Raised buttons, green lamps, cost/status labels; click shows purchased level immediately without dimming unrelated rows |
| Contract Offer Modal | Yes when offer-active | Blocking center overlay; accept/decline buttons and countdown |
| Breaker Reset Modal | Yes when grid-down | Blocking center overlay; arm switch then hold fuse button |
| Capacity and Supply Delta | No direct click | Diagnostic meters only |
| Forecast Monitor | No | Passive trace with monitor-local validation animation |

## PixiJS scene grouping

```txt
MainControlRoomRoot
├─ WorldViewportLayer
├─ DeskBackplateLayer
├─ InstrumentLayer
│  ├─ CapacityMeter
│  ├─ SupplyDeltaMeter
│  ├─ ForecastMonitor
│  ├─ PlantStatusRows
│  └─ RightTowerReadouts
├─ InteractionLayer
│  ├─ ReactorKnobHitZone
│  ├─ BoilerKnobHitZone
│  ├─ WindSwitchHitZone
│  ├─ DamModeHitZones
│  └─ UpgradeRowHitZones
├─ AlarmOverlayLayer
├─ ContractOfferModal
├─ BreakerResetModal
└─ ReferenceOverlayLayer_optional
```

## Confusion risks and fixes

| Risk | Fix |
|---|---|
| Player does not understand why winning customers is dangerous | Put contract split and subscribed-load share in the world viewport near the pressure meters |
| Player mistakes capacity pressure for supply/demand balance | Keep capacity utilization and supply delta as separate meters |
| Event queue and fixed contracts feel identical | Use forecast monitor for incoming shocks and a centered modal for contract offers |
| Player misses production controls | Right tower controls are always visible and physically styled |
| Breaker reset is missed during grid-down | Use a blocking center modal that absorbs underlying clicks until reset completes |
| Screen looks like SaaS | Heavy frames, screws, CRT glow, analog meters, and industrial modal controls |

## Acceptance criteria

The screen passes layout review if a new viewer can answer these in 10 seconds:

1. Is the player's grid safe or near overload?
2. Is supply too low, balanced, or too high?
3. Which generation controls can be changed right now?
4. Who is serving more of the city?
5. What can the player click right now?
