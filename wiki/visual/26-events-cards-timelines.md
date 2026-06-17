---
title: "Events, Cards, and Timelines"
type: "system_ui"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "events", "cards", "forecast", "timeline", "ui"]
summary: "Visual grammar for Forecast Tape, Incident Queue, Dispatch Cards, event warnings, card states, and ownership."
related: ["21-dispatch-console-layout.md", "23-ui-naming-and-taxonomy.md", "24-city-sectors-visual-design.md", "28-animation-and-feedback-priorities.md"]
---

# Events, Cards, and Timelines

## Core distinction

Do not render all events as identical cards.

| System | Player meaning | Visual object |
|---|---|---|
| Forecast Tape | Weather coming soon | Weather tape / CRT strip |
| Incident Queue | City or rival shock coming soon | Municipal alert queue |
| Dispatch Cards | Player tools/actions | Paper file / punch card |

## Forecast Tape

The Forecast Tape shows weather buckets.

```txt
FORECAST TAPE
NOW       +15s      +30s      +45s
SUN       CLOUD     SNOW      WIND
```

| Rule | Value |
|---|---|
| Position | Top center-left |
| Height | 70–90 px |
| Buckets | `NOW`, `+15s`, `+30s`, `+45s` |
| Icon style | Simple weather symbols, 24–32 px |
| Motion | Slow step/ticker shift |
| Tone | Informational, not alarm-red unless extreme |

### Weather effects

| Weather | Visual | Gameplay hint |
|---|---|---|
| Sun | Warm sun disk | Solar/renewables improve |
| Cloud | Grey cloud | Solar/renewables reduce |
| Rain | Diagonal streaks | Optional hydro/storage flavor |
| Snow / Cold | Snowflake + thermometer | Household demand increases |
| Wind | Wind lines/turbine | Wind production changes |

## Incident Queue

The Incident Queue shows incoming city and rival shocks.

```txt
INCIDENT QUEUE
NOW       +15s        +30s       +45s
DATA      FOOTBALL    RIVAL      COLD
```

| Rule | Value |
|---|---|
| Position | Top right |
| Height | 70–90 px |
| Warning time | Use gameplay event timings; `+15s/+30s/+45s` are forecast horizon buckets, not replacement warning durations |
| Current event | Token reaches `NOW`, flashes, then drops/stamps into affected zone |
| Public event | Amber municipal notice |
| Rival malus | Red/black hostile stamp |
| Player-triggered delayed effect | Player green/teal stamped ticket |

## Dispatch Cards

Dispatch Cards are player actions.

Recommended form:

```txt
┌──────────────────┐
│ HOMES        T-8 │
│ FOOTBALL FINAL   │
│                  │
│      [ICON]      │
│                  │
│ Homes +Load      │
│ Revenue +        │
│ ▓▓▓░ cooldown    │
└──────────────────┘
```

## Card dimensions

For a 1920×1080 canvas:

| Parameter | Value |
|---|---:|
| Card width | 144–168 px |
| Card height | 198–228 px |
| Visible cards | 3–5 |
| Icon area | 44–56 px square |
| Title lines | 1–2 max |
| Effect lines | 1–2 max |

## Card anatomy

| Area | Purpose |
|---|---|
| Sector/type tab | Homes / Services / Data / Grid / Rival / Weather |
| Title | Fast recognition |
| Icon | Main visual memory |
| Effect line | Actual mechanic |
| Timer/cooldown | Fuse, punch holes, or progress pips |
| Stamp | Active, expired, hostile, positive, negative |

## Card state grammar

| State | Visual |
|---|---|
| Available | Clean paper, readable icon, small green ready lamp |
| Hover/focus | Lifts 4 px, outline brightens |
| Active | Rubber-stamped, slightly glowing, timer pips drain |
| Cooldown | Greyed paper, punched holes, disabled lamp |
| Positive | Green utility stamp |
| Negative | Red municipal warning stamp |
| Rival malus | Black/red diagonal `RIVAL` stamp |
| Expired | Torn/grey stamp or slides out |

## Card examples

| Card | Type | Effect shorthand | Target |
|---|---|---|---|
| Demand Response | Defensive | `-Load spike` | Any sector |
| Transformer Boost | Defensive | `+Capacity short` | Grid |
| Emergency Crew | Defensive | `-Trip risk` | Grid |
| Load Shed | Emergency | `-Load / -Trust` | City |
| PR Campaign | Market | `+Attraction` | Market |
| Rival Audit | Offensive | `Rival +Cost` | Rival |
| Business Contract | Fixed contract | `+15 MW / 45s` | Shared offer |
| Data Center Contract | Fixed contract | `+25 MW / 35s` | Shared offer |
| Football Final | Incident | `Homes +Load` | Homes |
| Data Burst | Incident | `Data +Load` | Data Centers |
| Cold Wave | Weather/city | `Homes +Heat` | Homes |

## Fixed contract offer modal card

Fixed contracts are not normal hand cards. They are shared first-come-first-served offers visible to both players.

Recommended form:

```txt
┌────────────────────────────┐
│ FIXED CONTRACT OFFER       │
│ BUSINESS CONTRACT          │
│ +15 MW COMMITTED LOAD      │
│ 45s DURATION               │
│ +35 CASH IF COMPLETED      │
│ STRIKE PENALTY: -70 SCORE  │
│                            │
│ [ACCEPT CONTRACT]          │
│ RIVAL CAN ALSO ACCEPT      │
└────────────────────────────┘
```

Rules:

- modal or large municipal notice above Dispatch Cards,
- show load, duration, completion reward, and strike penalty,
- show that the offer disappears for both players after acceptance,
- after acceptance, pin a small active-contract ticket near Grid Pressure or Incident Queue,
- active ticket must show remaining time and committed load,
- accepted contracts cannot be cancelled.

MVP contract values must match gameplay:

| Contract | Load | Duration | Completion reward | Strike penalty |
|---|---:|---:|---:|---:|
| Business Contract | +15 MW | 45s | +35 cash | -70 score |
| Data Center Contract | +25 MW | 35s | +60 cash | -140 score |

## Timeline-to-card relationship

- Forecast and incidents are telegraphed before impact.
- Dispatch Cards are tools the player uses to respond.
- Some incidents may create temporary cards after they hit, but this should be explicit.

Example flow:

```txt
Incident Queue: +15s FOOTBALL FINAL
-> token reaches NOW
-> Homes sector pulses amber
-> Grid Pressure rises
-> player uses Demand Response card
-> card stamps ACTIVE and cooldown starts
```

## PixiJS implementation notes

| Element | Recommended implementation |
|---|---|
| Forecast Tape panel | `Container` + procedural frame + text/icons |
| Timeline buckets | Fixed child containers; update icons and labels |
| Incident tokens | Sprites or code-generated icon boxes sliding left |
| Card shell | Code-generated first; authored card texture later |
| Fixed contract modal | `Container` above card row with accept button and active ticket state |
| Card text | Pixi `Text` first; `BitmapText` later |
| Card stamps | Code-generated text overlay or small stamp sprites |

## Ownership

| Item | Owner | Type | Priority |
|---|---|---|---|
| Tape layout and timers | Agentic coder | Code | Must |
| Card shell placeholder | Agentic coder | Code-generated | Must |
| Event icon placeholders | Agentic coder | Code-generated | Must |
| Final event icons | Human | Authored pixel art | Should |
| Final card paper texture | Human | Authored pixel art | Nice |
| Stamp overlays | Agentic coder first, human optional | Hybrid | Should |

## Acceptance criteria

The system passes if the viewer can distinguish:

1. weather coming soon,
2. city/rival incidents coming soon,
3. cards the player can click now.
