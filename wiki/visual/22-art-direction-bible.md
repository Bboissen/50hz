---
title: "Art Direction Bible"
type: "art_direction"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "art-direction", "pixel-art", "industrial", "crt"]
summary: "Coherent visual direction for 50Hz: industrial dispatch room, CRT panels, worn analog controls, warning language, palette, typography, and icon rules."
related: ["20-visual-design-index.md", "21-dispatch-console-layout.md", "29-asset-inventory-and-ownership.md"]
---

# Art Direction Bible

## Visual thesis

50Hz is not a clean smart-grid dashboard. It is a failing but functional regional utility console.

```txt
Soviet-era energy dispatch room
+ municipal electricity bureaucracy
+ heavy analog control desk
+ green phosphor CRTs
+ worn paper labels
+ pixel-art city load diorama
+ absurd civic incidents
```

## Mood keywords

| Keep | Avoid |
|---|---|
| industrial | SaaS |
| bureaucratic | holographic |
| worn | sterile |
| analog | glassmorphism |
| municipal | generic cyberpunk |
| practical | luxury sci-fi |
| slightly absurd | cartoon chaos |
| legible | simulation spreadsheet |

## Palette

Use muted industrial colors and reserve saturated colors for state changes.

| Token | Hex | Use |
|---|---:|---|
| `inkBlack` | `#101711` | Background shadows, deep panel gaps |
| `panelGreen` | `#1f2b22` | Main metal panels |
| `oxideGreen` | `#3d4b36` | Secondary panels, worn edges |
| `fadedOlive` | `#7b8060` | Bevels, inactive frames, old plastic |
| `paperTan` | `#c8b982` | Labels, cards, paper tape |
| `phosphorGreen` | `#8dfc7a` | CRT text, active lamps |
| `amberWarn` | `#ffbd45` | Strain, warning, incoming incidents |
| `overloadRed` | `#e34b35` | Overload, trip, rival malus |
| `dataCyan` | `#6fcad1` | Data center sector, cold electronics |
| `windowWarm` | `#f2dd8a` | City windows, households |
| `smokeGrey` | `#8d9380` | Smoke, disabled UI, inactive icons |

## Color rules

- Green means stable or available.
- Amber means strain or imminent event.
- Red means actual danger, trip, hostile malus, or overload.
- Cyan belongs mostly to data centers and cold electronics.
- Warm yellow belongs mostly to homes and city windows.
- Do not use purple neon.
- Do not use blue as generic UI chrome.

## Lighting

Use low ambient brightness with small, local light sources:

```txt
dark desk base
CRT glow
small warning lamps
warm city windows
red overload flash
```

Do not implement complex lighting for MVP. Use flat colors, small glow sprites, and text shadows.

## Material language

| Object | Material |
|---|---|
| Main console | Chipped painted metal, dark olive/green |
| Panel borders | Thick bevels, screws, seam lines |
| Buttons | Bakelite or cheap plastic |
| Lamps | Small glass bulbs with hard on/off states |
| Tariff displays | Mechanical flip board or segmented digits |
| Forecast / incidents | Paper tape or CRT ticker |
| Dispatch cards | Paper files, punch cards, stamped forms |
| Meter | Dusty glass, printed arc, physical needle |
| City | Pixel diorama inside CRT/map window |

## UI frame style

Frames should feel bolted in.

Required motifs:

- thick bevels,
- black inner shadows,
- visible screws,
- rubber corners,
- seam lines,
- serial labels,
- cheap taped labels,
- worn edges.

Avoid thin modern outlines.

## Typography

Use two typographic modes.

| Use | Style |
|---|---|
| Numeric readouts | Blocky segmented digits or pixel mono |
| Labels / cards | Condensed all-caps pixel mono |

Rules:

- Labels are uppercase.
- Numbers are large and high contrast.
- Card titles are 1–3 words.
- Avoid long paragraph text in-game.
- Use bitmap/pixel fonts for final pass; use Pixi `Text` fallback during prototyping.

## Icon style

Icons are not detailed illustrations. They are operational symbols.

| Rule | Value |
|---|---|
| Base size | 32×32 or 48×48 px |
| Colors | 2–3 colors + outline |
| Shape | Strong silhouette first |
| Detail | Minimum needed to identify |
| Line | Chunky pixel outline |
| State | Use lamps/stamps, not redraw-heavy variants |

## Warning and alarm language

Escalate visually by state.

| State | Visual treatment |
|---|---|
| Normal | Stable green lamps, soft CRT glow |
| Strain | Amber lamp pulse, mild needle jitter |
| Danger | Red lamp blink, city flicker, card/tape warning |
| Trip | Needle slams right, `TRIP` stamp, hard red panel flash |
| Strike | A city sector goes dark, red bureaucratic failure stamp |

Use warning text sparingly:

```txt
STRAIN
TRIP
STRIKE
BREAKER
```

## Animation style

Animations should be mechanical, not slick.

Use:

- blinking lamps,
- needle lag and jitter,
- card stamp impacts,
- step-based digit changes,
- sliding ticker tokens,
- CRT flicker,
- 2-frame fan spin.

Avoid:

- elastic easing,
- particles,
- glossy hover effects,
- complex character animation,
- smooth sci-fi hologram motion.

## Pixel-art rendering rules

- Use integer scaling when possible.
- Disable smoothing on sprite textures.
- Prefer 1 px internal highlights and heavy silhouettes.
- Use tileable/reusable frames for panels.
- Keep UI readable before applying scanlines or grime.

## Minimum viable art pass

The prototype feels coherent with only:

1. heavy console frame,
2. CRT panel treatment,
3. Grid Pressure Meter,
4. three city sectors,
5. two tariff boards,
6. three generation icons,
7. upgrade rack lamps,
8. Forecast Tape and Incident Queue,
9. Dispatch Card template,
10. overload red state.
