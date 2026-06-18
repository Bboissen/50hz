---
title: "Asset Inventory and Ownership"
type: "production"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "assets", "ownership", "production", "pixijs"]
summary: "Asset list, dimensions, file naming, code-generated vs authored content, and ownership split between human and agentic coder."
related: ["20-visual-design-index.md", "22-art-direction-bible.md", "24-city-sectors-visual-design.md", "30-pixijs-agent-integration-brief.md"]
---

# Asset Inventory and Ownership

## Ownership model

| Owner | Responsibility |
|---|---|
| Agentic coder | Build PixiJS scene, layout, procedural UI, state binding, placeholder art, animations, interactions, asset loading |
| Human / art generator | Produce final pixel-art sprites, icons, card texture, font selection, visual QA |
| Both | Replace placeholders with final assets without changing component APIs |

## Production rule

Code-generated UI first. Authored assets should be additive swaps.

The game must remain playable if all authored assets are missing.

## Correct asset role

The current city and plant files are full isometric scene assets, not small icons.

Use them as:

- central city/load viewport scenes;
- production console backdrops;
- large plant inspection views;
- optional upgrade previews.

If small icons are needed, create separate simplified icon assets or procedural placeholders.

## Asset types

| Type | Definition | MVP use |
|---|---|---|
| Code-generated | Drawn with Pixi `Graphics`, `Text`, simple shapes | Panels, lamps, bars, meter, placeholders |
| Authored asset | PNG/SVG/font made by human or image tool | Final buildings, plant icons, event icons |
| Hybrid | Code-generated base with optional texture overlay | Contract modal, stamps, CRT frames, meter face |

## Directory structure

```txt
assets/
  ui/
    panels/
    contracts/
    meters/
    lamps/
  icons/
    plants/
    sectors/
    weather/
    events/
    actions/
  city/
    buildings/
    overlays/
  fonts/
  textures/
    grime/
    crt/
```

## Mandatory authored assets

These are the highest-return human/art-generator tasks.

| ID | File | Size | Owner | Priority | Fallback |
|---|---|---:|---|---|---|
| `city_homes_slab` | `assets/city/buildings/building_homes_slab.png` | 128×96 | Human | Must/Should | Code blocks + windows |
| `city_services_tower` | `assets/city/buildings/building_services_tower.png` | 128×96 | Human | Must/Should | Code tower + floor lights |
| `city_data_bunker` | `assets/city/buildings/building_data_bunker.png` | 128×96 | Human | Must/Should | Code bunker + fans |
| `plant_reactor` | `assets/icons/plants/plant_reactor.png` | 48×48 | Human | Should | Cooling-tower placeholder |
| `plant_boiler` | `assets/icons/plants/plant_boiler.png` | 48×48 | Human | Should | Smokestack placeholder |
| `plant_renewables` | `assets/icons/plants/plant_renewables.png` | 48×48 | Human | Should | Wind/solar placeholder |
| `plant_water_dam` | `assets/icons/plants/plant_water_dam.png` | 48×48 | Human | Should | Dam wall placeholder |
| `contract_notice_base` | `assets/ui/contracts/contract_notice_base.png` | 420×300 | Human | Nice | Procedural modal rectangle |
| `meter_glass_overlay` | `assets/ui/meters/meter_glass_overlay.png` | 448×248 | Human | Nice | Transparent highlight shape |

## Event and action icons

| ID | File | Size | Owner | Priority | Notes |
|---|---|---:|---|---|---|
| `event_football` | `assets/icons/events/event_football.png` | 32×32 | Human | Should | Ball + TV |
| `event_cold_wave` | `assets/icons/events/event_cold_wave.png` | 32×32 | Human | Should | Snowflake + thermometer |
| `event_data_burst` | `assets/icons/events/event_data_burst.png` | 32×32 | Human | Should | Server + lightning |
| `event_cloud_front` | `assets/icons/events/event_cloud_front.png` | 32×32 | Human | Nice | Cloud |
| `event_business_expo` | `assets/icons/events/event_business_expo.png` | 32×32 | Human | Nice | Briefcase/building |
| `event_rival_malus` | `assets/icons/events/event_rival_malus.png` | 32×32 | Human | Nice | Red stamp |
| `action_transformer_boost` | `assets/icons/actions/action_transformer_boost.png` | 32×32 | Human | Should | Transformer + bolt |
| `action_emergency_crew` | `assets/icons/actions/action_emergency_crew.png` | 32×32 | Human | Nice | Helmet/wrench |
| `contract_business` | `assets/icons/actions/contract_business.png` | 32×32 | Human optional | Nice | Briefcase + stamped form |
| `contract_data_center` | `assets/icons/actions/contract_data_center.png` | 32×32 | Human optional | Nice | Server + stamped form |

## Weather icons

Weather icons can be code-generated first.

| ID | File | Size | Owner | Priority |
|---|---|---:|---|---|
| `weather_sun` | `assets/icons/weather/weather_sun.png` | 32×32 | Human optional | Nice |
| `weather_cloud` | `assets/icons/weather/weather_cloud.png` | 32×32 | Human optional | Nice |
| `weather_rain` | `assets/icons/weather/weather_rain.png` | 32×32 | Human optional | Nice |
| `weather_snow` | `assets/icons/weather/weather_snow.png` | 32×32 | Human optional | Nice |
| `weather_wind` | `assets/icons/weather/weather_wind.png` | 32×32 | Human optional | Nice |

## Code-generated elements

The agentic coder should generate these without waiting for art.

| Element | Implementation |
|---|---|
| Panel frames | `Graphics` rectangles, bevels, screws |
| Lamps | `Graphics` squares/circles with alpha states |
| Contract Split bar | `Graphics` rectangles |
| Grid Pressure arc | `Graphics` arcs and ticks |
| Meter needle | `Graphics` polygon in rotating `Container` |
| Tariff digits | `Text` or `BitmapText` later |
| Forecast and incident buckets | `Container` + text + icon placeholders |
| Card placeholder | `Graphics` card shell + text |
| CRT scanline | low-alpha overlay texture or procedural lines |
| Alarm flash | red `Graphics` overlay with alpha |

## Authored asset specs

| Spec | Rule |
|---|---|
| Format | PNG with transparent background |
| Scale | Design at logical pixel size, render with pixelated scaling |
| Smoothing | Must look correct with nearest-neighbor scaling |
| Palette | Use design tokens; avoid unrelated neon colors |
| Background | Transparent except full panel textures |
| Naming | lowercase snake_case |
| Variants | Avoid variants unless mechanically necessary |

## Human asset priority for 36h

1. Three city building sprites.
2. Three plant icons.
3. Six core event/action icons.
4. Card paper texture.
5. Optional meter glass/dust overlay.

Do not create large sprite sheets or character art.

## Integration contract

The code must support placeholder-to-final swap by asset key.

```ts
type VisualAssetKey =
  | 'city_homes_slab'
  | 'city_services_tower'
  | 'city_data_bunker'
  | 'plant_reactor'
  | 'plant_boiler'
  | 'plant_renewables'
  | 'plant_water_dam'
  | 'event_football'
  | 'event_cold_wave'
  | 'event_data_burst'
  | 'action_demand_response'
  | 'action_transformer_boost'
  | 'contract_business'
  | 'contract_data_center';
```

If `Assets.load(key)` fails, render procedural fallback.

## Acceptance criteria

Asset production succeeds if the prototype can run in three states:

1. no authored assets, full procedural placeholders,
2. partial assets, mixed placeholders,
3. final assets, no layout changes required.
