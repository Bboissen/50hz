---
title: "Visual Design Index"
type: "index"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "visual-design", "art-direction", "pixijs", "mvp"]
summary: "Navigation source for the DispatchConsole visual direction, art bible, UI systems, assets, ownership, and PixiJS agent handoff."
related: ["../gameplay/00-canonical-summary.md", "../gameplay/06-manual-control-room.md", "../gameplay/99-glossary.md", "21-dispatch-console-layout.md", "22-art-direction-bible.md", "29-asset-inventory-and-ownership.md", "30-pixijs-agent-integration-brief.md"]
---

# Visual Design Index

This folder is the visual and implementation-facing source of truth for the **50Hz DispatchConsole**.

The hand-drawn screen is not a final layout. It is a functional information map. Preserve the gameplay information; redesign the composition around readability, manual control, and 1v1 market pressure.

## Critical art-direction correction

The isometric assets are not icons.

They are the main visual identity of 50Hz and must be used as large scene/diorama assets.

The center of the DispatchConsole should read as an isometric city-builder / SimCity-like load diorama embedded in a Soviet command console.

Do not shrink the city, plant, dam, nuclear, solar, thermal, or wind assets into small thumbnails unless specifically building a secondary monitor.

Procedural panels are only the frame around the game scene. They must not dominate the screen.

Priority order:

1. Large isometric scene.
2. Physical command-console frame.
3. VU-meter hardware.
4. Cards and controls.
5. Labels and numbers.

A screen fails visual QA if it looks like a flat dashboard with small pasted images.

## Design target

50Hz should look like a **gritty power-grid operator console**, not a modern energy dashboard.

```txt
Soviet-era dispatch room
+ old municipal infrastructure
+ green phosphor CRT displays
+ analog meters and warning lamps
+ bureaucratic contract notices
+ slightly absurd educational energy chaos
```

The core visual message must be readable in under 3 seconds:

```txt
Lower tariff -> more customers -> higher grid pressure -> overload risk
```

## File map

| File | Purpose | Primary user |
|---|---|---|
| `21-dispatch-console-layout.md` | Final screen composition, hierarchy, zones, PixiJS scene grouping | Agentic coder |
| `22-art-direction-bible.md` | Mood, palette, materials, typography, iconography, alarms | Human + coder |
| `23-ui-naming-and-taxonomy.md` | Final UI labels, code names, plant/sector naming | Human + coder |
| `24-city-sectors-visual-design.md` | Homes / Services / Data Centers visual specs and states | Human + coder |
| `25-grid-pressure-meter.md` | Central dual meter definition, gameplay-owned formulas, zones, animation | Agentic coder |
| `26-events-cards-timelines.md` | Forecast Tape, Incident Queue, fixed contract modal grammar | Human + coder |
| `27-upgrades-generation-tariffs.md` | Generation Stack, Tariff Boards, Upgrade Rack | Agentic coder |
| `28-animation-and-feedback-priorities.md` | Ranked animation implementation list | Agentic coder |
| `29-asset-inventory-and-ownership.md` | What is authored art vs code-generated UI vs hybrid | Human + coder |
| `30-pixijs-agent-integration-brief.md` | Direct build brief for PixiJS MCP / coding agent | Agentic coder |
| `31-production-console-visual-direction.md` | Early visual direction for the manual control center screen | Human + coder |
| `asset-manifest.prototype.json` | Proposed PixiJS asset bundle names and file paths | Agentic coder |

## Non-negotiable design decisions

| Decision | Rule |
|---|---|
| Main screen internal name | `DispatchConsole` |
| Player-facing screen name | `50Hz Dispatch Console` |
| Central danger widget | `Grid Pressure Meter` |
| City visualization | Pixel-art load diorama |
| Market-share visualization | Separate `Contract Split` bar |
| Top-row anticipation | `Forecast Tape` + `Incident Queue` |
| Player actions | `Contract Offer Modal` and `Upgrade Rack` |
| Prototype resolution | Fixed 16:9, target 1920x1080 |
| Style | Industrial CRT control desk, not SaaS or cyberpunk |

## Implementation order

1. Build layout containers with procedural panels.
2. Implement the Grid Pressure Meter dual indicator and Contract Split bar.
3. Implement City Load Window with code-generated placeholders.
4. Implement Forecast Tape, Incident Queue, and Contract Offer Modal.
5. Add Generation Stack, Tariff Boards, and Upgrade Rack.
6. Swap placeholder icons/buildings for authored pixel-art assets.
7. Add minimum animation pass.

## MVP art rule

Use code-generated panels and placeholders first. Only hand-author the assets that create identity:

```txt
city sector buildings
plant icons
event icons
card shell
meter face or needle, if time
```

Do not block gameplay integration waiting for finished art.
