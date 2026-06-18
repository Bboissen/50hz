---
title: "UI Naming and Taxonomy"
type: "naming"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "naming", "taxonomy", "copy", "ui"]
summary: "Final player-facing names, code names, power plant categories, city sectors, and copy rules for the DispatchConsole."
related: ["20-visual-design-index.md", "21-dispatch-console-layout.md", "../gameplay/99-glossary.md"]
---

# UI Naming and Taxonomy

## Naming principle

Names should be flavorful but instantly understandable in a 1–2 minute demo.

Use industrial control-room language, but do not hide the mechanic.

## Final screen-zone names

| Rough concept | Player-facing name | Code/component name | Notes |
|---|---|---|---|
| Cash | Cash Reserve | `CashReservePanel` | Spendable money only |
| Weather | Forecast Tape | `ForecastTape` | Weather timeline |
| Events | Incident Queue | `IncidentQueue` | Incoming city/random/opponent events |
| Player assets | Your Generation Stack | `YourGenerationStack` | Player plant levels |
| Player price | Your Tariff Board | `YourTariffBoard` | Player market weapon |
| City | City Load Window | `CityLoadWindow` | Demand diorama |
| Customer share | Contract Split | `ContractSplitBar` | Shows served load share |
| Opponent price | Rival Tariff Board | `RivalTariffBoard` | Compare price quickly |
| Opponent assets | Rival Grid Stack | `RivalGridStack` | Less interactive |
| Upgrades | Upgrade Rack | `UpgradeRack` | Clickable plant upgrades |
| VU meter | Grid Pressure Meter | `GridPressureMeter` | Central danger widget |
| Contract offers | Contract Offer Modal | `ContractOfferModal` | Fixed-load accept/decline |

## Final plant categories

Use short player-facing labels with educational subtitles.

| Player label | Subtitle | Code key | Role |
|---|---|---|---|
| Reactor | Nuclear baseload | `reactor` | Stable, expensive, high dependable capacity |
| Boiler | Thermal backup | `boiler` | Fast response, costly, emergency-friendly |
| Renewables | Wind / solar | `renewables` | Cheap, weather-sensitive, efficient when available |

### Upgrade rack display

```txt
REACTOR      Nuclear       [■■□]  €80
BOILER       Thermal       [■□□]  €45
RENEWABLES   Wind/Solar    [■■□]  €60
```

## City sectors

| Player label | Code key | Use |
|---|---|---|
| Homes | `homes` | Residential and household climate demand, evening spikes |
| Services | `services` | Offices, shops, hospitals, public services |
| Data Centers | `dataCenters` | Server load, cooling, sudden bursts |

Use **Services**, not `Tertiary`, in the UI. It is shorter and more immediately understood.

## Event names

Event names should be concrete and slightly absurd.

| Sector | Examples |
|---|---|
| Homes | Football Final, Dinner Hour, Cold Wave, Holiday Evening |
| Services | Monday Rush, Shopping Peak, Hospital Alert, Business Expo |
| Data Centers | Data Center Burst, Cloud Backup, AI Training Run, Streaming Surge |
| Weather | Cloud Front, Cold Snap, Snowfall, Heatwave, High Wind |
| Rival | Rival Audit, Cable Theft, PR Smear, Grid Poach |
| Player tools | Transformer Boost, Emergency Crew, PR Campaign |

## Copy rules

- Use all caps for UI labels.
- Keep modal titles to 1-3 words after the contract type.
- Use short contract terms: load, duration, reward, strike risk.
- Prefer `+Load`, `-Pressure`, `+Revenue`, `+Capacity` over sentences.
- Do not use real regulatory terminology if it slows comprehension.
- Do not invent more currencies.

## Critical semantic distinctions

| Term | Meaning |
|---|---|
| Tariff | Customer-facing price display; gameplay price owns the truth, visual tariff examples may be mock-only |
| Contract Split | Current subscribed load share, with target market share shown as a ghost marker |
| Grid Pressure | Dual indication of capacity utilization and supply/demand balance |
| Demand | Total city request before market split |
| Capacity | Safe load the player's grid can carry |
| Supply/demand balance | Production-console matching problem |

## Terms to avoid on the main screen

| Avoid | Reason | Use instead |
|---|---|---|
| Tertiary | Too technical in fast demo | Services |
| VU Meter | Audio metaphor, not in-world | Grid Pressure Meter |
| Price | Too generic | Tariff |
| Events | Too broad | Incident Queue or Contract Offer Modal |
| Assets | Abstract | Generation Stack |
| Renewable Energy Stack | Too long | Renewables |

## Code naming convention

Use stable, explicit component names:

```ts
type ZoneKey =
  | 'cashReserve'
  | 'forecastTape'
  | 'incidentQueue'
  | 'yourGenerationStack'
  | 'yourTariffBoard'
  | 'cityLoadWindow'
  | 'contractSplitBar'
  | 'rivalTariffBoard'
  | 'rivalGridStack'
  | 'upgradeRack'
  | 'gridPressureMeter'
  | 'dispatchCardsPanel';
```

Avoid abbreviations in code except for local variables.
