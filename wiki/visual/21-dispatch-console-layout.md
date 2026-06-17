---
title: "Dispatch Console Layout"
type: "screen"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "screen", "layout", "dispatch-console", "pixijs"]
summary: "Refined composition for the main game screen, with visual hierarchy, dimensions, zones, states, and PixiJS scene grouping."
related: ["../gameplay/06-manual-control-room.md", "20-visual-design-index.md", "22-art-direction-bible.md", "25-grid-pressure-meter.md", "30-pixijs-agent-integration-brief.md"]
---

# Dispatch Console Layout

## Screen purpose

The main screen answers:

```txt
What is going wrong right now, and what can I manually do about it?
```

This is a **diagnostic and intervention screen**, not a passive dashboard.

## Fixed canvas target

| Parameter | Value |
|---|---:|
| Logical resolution | 1920 x 1080 |
| Aspect ratio | 16:9 |
| Safe margin | 24 px |
| Pixel scale target | 4× or integer-scaled assets |
| Camera | Static |
| Layout | Fixed for MVP; no responsive redesign |

## Macro layout

```txt
┌────────────────────────────────────────────────────────────────────────────┐
│ CASH RESERVE     FORECAST TAPE: NOW | +15s | +30s     INCIDENT QUEUE      │
│ €160             ☀  ☁  ❄              ⚽  DATA  MALUS                     │
├───────────────┬──────────────┬────────────────────┬──────────────┬───────┤
│ YOUR          │ YOUR         │ CITY LOAD WINDOW   │ RIVAL        │ RIVAL │
│ GENERATION    │ TARIFF       │                    │ TARIFF       │ GRID  │
│ STACK         │ BOARD        │ [Homes] [Services] │ BOARD        │ STACK │
│               │ 12¢/kWh      │ [Data Centers]     │ 15¢/kWh      │       │
│ Reactor  II   │              │                    │              │       │
│ Boiler   I    │              │ CONTRACT SPLIT     │              │       │
│ Renew.   II   │              │ YOU ██████░░ RIVAL │              │       │
├───────────────┴──────────────┴────────────────────┴──────────────┴───────┤
│ UPGRADE RACK          GRID PRESSURE METER             DISPATCH CARDS      │
│ Reactor  [■■□] €85     IDLE | SAFE | STRAIN | TRIP     [Card][Card][Card]│
│ Boiler   [■□□] €40            big analog needle         [Card][Card]      │
│ Renew.   [■■□] €45       BALANCE LOCK / OVERLOAD LAMP                    │
└────────────────────────────────────────────────────────────────────────────┘
```

## Proportions

| Region | Y range | Height | Purpose |
|---|---:|---:|---|
| Top anticipation strip | 36–174 | 138 px | Cash, weather, incoming incidents |
| Middle confrontation | 186–654 | 468 px | Player vs city vs rival |
| Bottom operator console | 672–1044 | 372 px | Upgrades, meter, cards |

## Suggested zone bounds

Use these as implementation defaults, not strict art constraints.

| Zone | Bounds `(x,y,w,h)` | Priority | Notes |
|---|---:|---:|---|
| `CashReservePanel` | `36,36,225,138` | Low | Small, fixed; spendable cash only |
| `ForecastTape` | `276,36,750,138` | Medium | Weather tokens by time bucket |
| `IncidentQueue` | `1044,36,840,138` | High | Incoming shocks; should be more alert-like than forecast |
| `YourGenerationStack` | `36,186,285,468` | Medium | Readable, partly decorative |
| `YourTariffBoard` | `336,186,225,468` | High | Large price digits |
| `CityLoadWindow` | `576,186,750,468` | Highest middle priority | Three animated city sectors |
| `RivalTariffBoard` | `1341,186,225,468` | High | Comparison against player tariff |
| `RivalGridStack` | `1581,186,303,468` | Low-medium | Monitored, not clickable |
| `UpgradeRack` | `36,672,495,372` | High | Clickable upgrades; lamps show levels |
| `GridPressureMeter` | `549,672,672,372` | Highest bottom priority | Largest iconic dual indicator |
| `DispatchCardsPanel` | `1239,672,645,372` | High | 3–5 playable cards max |

## Reading order

Design for this eye path:

```txt
1. Your Tariff vs Rival Tariff
2. Contract Split under the city
3. City sector pressure
4. Grid Pressure Meter
5. Dispatch Cards / Upgrade Rack
6. Forecast Tape / Incident Queue
```

## Information hierarchy

| Rank | Element | Visual treatment |
|---:|---|---|
| 1 | Grid Pressure Meter | Largest analog object; capacity needle plus balance gauge; danger zones |
| 2 | City Load Window | Animated pixel diorama; sector lights and overload states |
| 3 | Tariff Boards | Large mechanical digits; easy comparison |
| 4 | Contract Split | Centered under city; directly links price to load share |
| 5 | Dispatch Cards | Large enough for title + icon + one effect line |
| 6 | Incident Queue | Top row, warning tokens moving toward NOW |
| 7 | Upgrade Rack | Functional, compact; lamps and prices |
| 8 | Generation Stacks | Small contextual cards/icons |
| 9 | Cash Reserve | Compact and stable |

## Density rules

- Show at most **3 city sectors**.
- Show at most **5 dispatch cards**.
- Show at most **4 upcoming time buckets**: `NOW`, `+15s`, `+30s`, `+45s`.
- Show at most **3 plant categories**.
- Avoid stat blocks inside the city. Use lamps and icons.
- Do not render a second full control interface for the rival.

## What should be larger

1. Grid Pressure Meter.
2. City Load Window.
3. Tariff Boards.
4. Dispatch Cards.

## What should be smaller

1. Cash Reserve.
2. Rival Grid Stack.
3. Weather tape.
4. Decorative plant art.
5. Long text labels.

## Interactive affordance rules

| Zone | Interactive? | Visual cue |
|---|---|---|
| Upgrade Rack | Yes | Raised buttons, green lamps, cost labels |
| Dispatch Cards | Yes | Card hover/lift, stamp on play |
| City sectors | Optional inspect only | Not button-like in MVP |
| Player Generation Stack | Optional inspect only | Lightly highlighted |
| Rival Grid Stack | No | Darker monitor style, no hover |
| Forecast Tape | No | Passive ticker |
| Incident Queue | No | Passive warning queue |
| Grid Pressure Meter | No direct click | Diagnostic only |

## PixiJS scene grouping

```txt
DispatchConsoleRoot
├─ BackgroundLayer
│  └─ WornDeskBackdrop
├─ PanelFrameLayer
│  ├─ TopStripFrame
│  ├─ MiddleConfrontationFrame
│  └─ BottomConsoleFrame
├─ TopAnticipationLayer
│  ├─ CashReservePanel
│  ├─ ForecastTape
│  └─ IncidentQueue
├─ MarketConfrontationLayer
│  ├─ YourGenerationStack
│  ├─ YourTariffBoard
│  ├─ CityLoadWindow
│  │  ├─ HomesSector
│  │  ├─ ServicesSector
│  │  ├─ DataCentersSector
│  │  └─ ContractSplitBar
│  ├─ RivalTariffBoard
│  └─ RivalGridStack
├─ OperatorConsoleLayer
│  ├─ UpgradeRack
│  ├─ GridPressureMeter
│  └─ DispatchCardsPanel
├─ AlarmOverlayLayer
│  ├─ OverloadFlash
│  └─ StrikeStamp
└─ DebugOverlayLayer_optional
```

## Confusion risks and fixes

| Risk | Fix |
|---|---|
| Player does not understand why winning customers is dangerous | Put `Contract Split` directly under city and animate it before meter rises |
| Player mistakes Grid Pressure for total city demand | Label it `YOUR GRID PRESSURE`; show capacity utilization separately from load balance |
| Event queue and playable cards feel identical | Use `Incident Queue` for incoming shocks and `Dispatch Cards` for player actions |
| Rival looks clickable | Desaturate rival assets; no hover state; use surveillance-monitor framing |
| Screen looks like SaaS | Heavy frames, screws, CRT glow, analog meter, paper cards |

## Acceptance criteria

The screen passes layout review if a new viewer can answer these in 10 seconds:

1. Which company is cheaper?
2. Who is serving more of the city?
3. Which sector is spiking?
4. Is the player's grid safe or near overload?
5. What can the player click right now?
