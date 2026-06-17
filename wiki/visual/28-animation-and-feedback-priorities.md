---
title: "Animation and Feedback Priorities"
type: "production"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "animation", "feedback", "mvp", "pixijs"]
summary: "Ranked list of the smallest animations and feedback states that create game feel for a 36-hour PixiJS prototype."
related: ["21-dispatch-console-layout.md", "22-art-direction-bible.md", "25-grid-pressure-meter.md", "26-events-cards-timelines.md"]
---

# Animation and Feedback Priorities

## Principle

Animation must explain state change, not decorate the dashboard.

Prioritize animations that sell this chain:

```txt
Tariff changes -> target share shifts -> subscribed share follows -> grid pressure rises -> overload warning
```

## Priority table

| Rank | Animation | Purpose | Implementation | Owner | Priority |
|---:|---|---|---|---|---|
| 1 | Grid Pressure needle rotates | Core tension | Rotate needle container each tick | Agentic coder | Must |
| 2 | Overload lamp blinks | Danger readability | Alpha blink / red lamp state | Agentic coder | Must |
| 3 | Contract Split current bar and target marker shift | Explains market capture and delayed physical load | Animate bar width plus ghost marker | Agentic coder | Must |
| 4 | City sector lights pulse/flicker | Makes demand physical | Toggle light rectangles/sprite alpha | Agentic coder | Must |
| 5 | Card slide + stamp | Makes actions feel manual | Position tween + stamp overlay | Agentic coder | Should |
| 6 | Price digits tick | Shows tariff change | Step interpolation / digit update | Agentic coder | Should |
| 7 | Upgrade lamps turn green | Purchase feedback | Lamp snap + small flash | Agentic coder | Should |
| 8 | Incident token advances | Event anticipation | Move token between buckets | Agentic coder | Should |
| 9 | CRT flicker / scanline | Atmosphere | Low-alpha overlay jitter | Agentic coder | Nice |
| 10 | Plant idle loops | Flavor | 2-frame smoke/fan/turbine loops | Human assets + coder | Nice |

## Minimum animation set

The prototype needs only five:

```txt
1. needle rotates
2. red overload lamp blinks
3. city lights flicker/pulse
4. Contract Split current share and target marker shift
5. cards slide/stamp
```

Everything else is polish.

## State-to-animation mapping

| Trigger | Feedback |
|---|---|
| Tariff decreases below rival | Your Tariff ticks down; cheaper lamp turns on |
| Target market share changes | Contract Split ghost marker ticks immediately |
| Subscribed load share changes | Contract Split solid bar moves toward target |
| Capacity pressure enters strain | Capacity needle moves amber; mild jitter starts |
| Balance enters overload or underload | Balance marker moves out of lock zone |
| Capacity pressure enters trip risk | Red lamp blinks; panel border flashes |
| Breaker trip | Needle slams; `TRIP` stamp; city sector flickers/darkens |
| Weather changes | Forecast token reaches NOW; affected icons pulse |
| Incident hits | Incident token flashes; affected city sector pulses |
| Card played | Card slides/stamps active; cooldown pips start |
| Upgrade bought | New lamp turns green; cash ticks down |

## Animation timing

| Animation | Duration |
|---|---:|
| Needle response | continuous with 0.2–0.5s lag |
| Overload blink | 0.25–0.4s on/off |
| Contract Split target marker shift | 0.3–0.6s |
| Contract Split current share shift | Gameplay-driven share movement |
| Card slide | 0.2–0.35s |
| Stamp impact | 0.08–0.15s |
| Digit tick | 0.2–0.5s |
| Upgrade lamp flash | 0.15–0.3s |
| Incident bucket advance | 0.2–0.4s |

## PixiJS implementation notes

Use a simple update loop and deterministic state-driven animation.

```ts
type VisualTween = {
  id: string;
  target: unknown;
  from: number;
  to: number;
  durationMs: number;
  elapsedMs: number;
};
```

Do not add a full animation pipeline unless already available.

Use:

- `ticker` for per-frame updates,
- `Container.rotation` for the needle,
- `Graphics` redraw or scale for bars,
- `alpha` for lamp blinking,
- `position` for card/timeline slides,
- `visible` toggles for hard alarm states.

## What should stay static

| Element | Reason |
|---|---|
| Main panel frames | Stability; console feels heavy |
| Labels | Readability |
| Rival plant icons | Avoid false click affordance |
| Inactive cards | Reduce visual noise |
| Cash label | Functional only |

## Do not implement for MVP

- particle systems,
- animated characters,
- physics-based UI,
- cinematic camera shake except optional tiny alarm shake,
- detailed smoke simulations,
- large sprite sheets,
- multiple animation variants per plant level.

## Acceptance criteria

The animation pass succeeds if the screen feels alive when:

1. city demand spikes,
2. the player becomes cheaper,
3. grid pressure enters danger,
4. a card is played.
