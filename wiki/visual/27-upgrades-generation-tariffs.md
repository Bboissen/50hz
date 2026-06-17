---
title: "Upgrades, Generation, and Tariffs"
type: "system_ui"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "upgrades", "generation", "tariff", "market", "ui"]
summary: "Visual and implementation spec for Generation Stack, Tariff Boards, Upgrade Rack, rival readability, and price/customer-share feedback."
related: ["21-dispatch-console-layout.md", "23-ui-naming-and-taxonomy.md", "25-grid-pressure-meter.md"]
---

# Upgrades, Generation, and Tariffs

## Purpose

This system connects the economy to physical grid risk.

```txt
better operation / upgrades
-> lower tariff
-> more customer share
-> higher grid pressure
```

Gameplay owns upgrade effects and costs. The visual system must reflect gameplay values rather than introduce alternate upgrade economics.

## Generation Stack

The Generation Stack shows current plant category levels.

| Category | Label | Visual |
|---|---|---|
| Nuclear | Reactor | Cooling tower / reactor block |
| Thermal | Boiler | Smokestack / boiler plant |
| Renewable | Renewables | Wind turbine + solar panel |
| Water dam | Water Dam | Dam wall / reservoir gauge |

## Generation Stack visual rules

| Rule | Value |
|---|---|
| Max levels | 3 per displayed upgrade unless gameplay config says otherwise |
| Display | Icon + label + 3 lamps or roman level |
| Player side | Brighter, more clickable-adjacent |
| Rival side | Smaller, desaturated, surveillance style |
| Detail | No long stat blocks |

## Upgrade Rack

The Upgrade Rack is the player interaction area for plant improvements.

```txt
UPGRADE RACK
REACTOR      Nuclear       [■■□]  €85
BOILER       Thermal       [■□□]  €40
RENEWABLES   Wind/Solar    [■■□]  €45
WATER DAM    Storage       [■□□]  €50
```

There is no Network upgrade in gameplay. Grid capacity can still exist as a system limit, but it is not an upgradable purchase unless gameplay canon changes.

## Upgrade button states

| State | Visual |
|---|---|
| Affordable | Green lamp, raised button, cost readable |
| Unaffordable | Dim cost, disabled lamp |
| Max level | Three green lamps, `MAX` tag |
| Purchased | Lamp snaps on with flash |
| Hover | Button bevel brightens, no glossy effect |

## Tariff Boards

Tariff Boards are the most important middle-row comparison after the city.

```txt
YOUR TARIFF
12.4¢/kWh

RIVAL TARIFF
15.1¢/kWh
```

## Tariff visual rules

| Rule | Value |
|---|---|
| Number size | Large enough to compare at a glance |
| Format | `12.4¢/kWh` or `€0.124/kWh`; choose one and stay consistent |
| Style | Mechanical flip digits or segmented display |
| Change animation | Step/tick digits, 0.2–0.5s |
| Lower price highlight | Subtle green marker on cheaper side |
| Rival board | Same number clarity, less panel detail |

## Recommended MVP price format

Use:

```txt
12.4¢/kWh
```

It is shorter and faster to read than `€0.124/kWh`.

This is a visual display format only. Gameplay price remains the canonical `priceFromEfficiency` output; code must map or mock display tariffs explicitly instead of deriving a second economy model from these cents/kWh examples.

## Contract Split link

When tariff changes, the UI should show a clear chain:

```txt
Tariff digit ticks
-> Contract Split bar shifts
-> Grid Pressure needle moves
```

Do not update these silently at unrelated times.

## Rival treatment

The rival must be understandable but not feel playable.

| Player side | Rival side |
|---|---|
| Brighter lamps | Dimmer lamps |
| Raised buttons nearby | Flat monitor treatment |
| Green/teal accents | Rust/red accents |
| Detailed upgrade rack | Compact grid stack only |
| Hover/click affordances | No hover/click affordances |

## PixiJS implementation notes

| Component | Recommended implementation |
|---|---|
| Plant icon card | `Container` + icon sprite/placeholder + label + lamps |
| Level lamps | Code-generated `Graphics` circles/squares |
| Upgrade row | Interactive `Container` with pointer events |
| Tariff digits | `Text` initially; bitmap/segmented font later |
| Price tick | Step interpolation or integer digit update |
| Cheaper marker | Small lamp or arrow, not a big glow |

## Update contract

```ts
type UpgradeKey = 'reactor' | 'boiler' | 'renewables' | 'waterDam';

type PlantUpgradeState = {
  key: UpgradeKey;
  level: 0 | 1 | 2 | 3;
  upgradeCost: number;
  canAfford: boolean;
  isMaxed: boolean;
};

type TariffBoardState = {
  tariffCentsPerKWh: number;
  isCheaperThanOpponent: boolean;
};
```

## Ownership

| Item | Owner | Type | Priority |
|---|---|---|---|
| Upgrade row layout | Agentic coder | Code | Must |
| Lamps/buttons | Agentic coder | Code-generated | Must |
| Tariff board and digit ticking | Agentic coder | Code-generated | Must |
| Plant icon placeholders | Agentic coder | Code-generated | Must |
| Final plant icons | Human | Authored pixel art | Should |
| Mechanical digit texture | Human optional | Asset | Nice |

## Acceptance criteria

A viewer should know:

1. which tariff is lower,
2. which company is winning load,
3. what plant upgrades are available,
4. that the rival side is not directly controllable.
