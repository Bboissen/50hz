---
title: "Events, Contracts, and Timelines"
type: "system_ui"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "events", "contracts", "forecast", "timeline", "ui"]
summary: "Visual grammar for Forecast Tape, Incident Queue, fixed contract modal, event warnings, and ownership."
related: ["21-dispatch-console-layout.md", "23-ui-naming-and-taxonomy.md", "24-city-sectors-visual-design.md", "28-animation-and-feedback-priorities.md"]
---

# Events, Contracts, and Timelines

## Core distinction

Do not render events and contracts as the same object.

| System | Player meaning | Visual object |
|---|---|---|
| Forecast Tape | Weather coming soon | Weather tape / CRT strip |
| Incident Queue | City or rival shock coming soon | Municipal alert queue |
| Fixed Contract Offer | High-risk optional load | Blocking modal with accept/decline |

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
| Rain | Diagonal streaks | Solar down, dam fills, homes +3% |
| Snow / Cold | Snowflake + thermometer | Solar down, homes +3% |
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
| Rival malus | Red/black hostile stamp if reintroduced later |

## Fixed contract offer modal

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
│ AUTO DECLINE: 5s            │
│                            │
│ [ACCEPT CONTRACT]          │
│ [DECLINE]                  │
└────────────────────────────┘
```

Rules:

- modal is the only player-facing contract offer surface,
- breaker reset modal has higher priority; hide the contract modal and pause its countdown during reset,
- show load, duration, completion reward, and strike penalty,
- show the 5s auto-decline countdown,
- show that the offer disappears for both players after acceptance,
- after acceptance, pin a small active-contract ticket near Grid Pressure or Incident Queue,
- active ticket must show remaining time and committed load,
- accepted contracts cannot be cancelled.

MVP contract values must match gameplay:

| Contract | Load | Duration | Completion reward | Strike penalty |
|---|---:|---:|---:|---:|
| Business Contract | +15 MW | 45s | +35 cash | -70 score |
| Data Center Contract | +25 MW | 35s | +60 cash | -140 score |

## Timeline-to-contract relationship

- Forecast and incidents are telegraphed before impact.
- Fixed-contract offers are optional high-risk commitments, not responses to every incident.
- There is no bottom-right dispatch-card row in the MVP.

Example flow:

```txt
Incident Queue: +15s FOOTBALL FINAL
-> token reaches NOW
-> Homes sector pulses amber
-> Grid Pressure rises
-> player drains dam and raises thermal
-> contract modal stays hidden unless a fixed offer is active
```

## PixiJS implementation notes

| Element | Recommended implementation |
|---|---|
| Forecast Tape panel | `Container` + procedural frame + text/icons |
| Timeline buckets | Fixed child containers; update icons and labels |
| Incident tokens | Sprites or code-generated icon boxes sliding left |
| Fixed contract modal | Top-level `Container` below breaker reset modal |
| Contract modal text | Pixi `Text` first; `BitmapText` later if countdown churn becomes costly |
| Active contract ticket | Small meter-adjacent label showing committed MW and remaining time |

## Ownership

| Item | Owner | Type | Priority |
|---|---|---|---|
| Tape layout and timers | Agentic coder | Code | Must |
| Event icon placeholders | Agentic coder | Code-generated | Must |
| Contract modal and active ticket | Agentic coder | Code-generated | Must |
| Final event icons | Human | Authored pixel art | Should |
| Final contract paper texture | Human | Authored pixel art | Nice |

## Acceptance criteria

The system passes if the viewer can distinguish:

1. weather coming soon,
2. city/rival incidents coming soon,
3. fixed-contract offer requiring accept or decline.
