# Clean Sprite-Backed Control Desk Migration

## Diagnosis

The previous UI attempt failed because it mixed two incompatible systems:

- a clean authored desk background;
- old procedural Pixi panels, frames, gauges, LEDs, knobs, and viewport widgets drawn on top.

That creates visual artifacts, duplicated controls, misplaced indicators, and unstable UI screenshots. This migration must start from the restored `src/` and `e2e/` baseline and build the desk as a clean sprite-overlay system from scratch.

The clean background is authoritative. Code must not recreate the desk.

## Current Setup

`src/` and `e2e/` have been restored to the current tracked baseline. The app currently uses the older two-screen flow:

- `DispatchConsoleScreen`
- `ProductionConsoleScreen`
- `ScreenManager` routes between dispatch, production, and result
- `src/main.ts` always runs the match ticker and bot commands
- modals can appear during normal gameplay

The new UI assets already exist in the repo as untracked/asset-work inputs:

```txt
assets/ui/background/empty_background_1920.png
assets/ui/background/empty_background_1920.runtime.png
assets/ui/components/Led/empty_10-level.png
assets/ui/components/Led/empty_3-level.png
assets/ui/components/Led/green_led.png
assets/ui/components/Led/orange_led.png
assets/ui/components/Led/red_led.png
assets/ui/components/Led/blue_led.png
assets/ui/components/Knob/knob.png
assets/ui/components/Knob/rotary_knob_left.png
assets/ui/components/Knob/rotary_knob_center.png
assets/ui/components/Knob/rotary_knob_right.png
assets/ui/components/gauge/needle.png
assets/ui/components/upgrade.png
assets/ui/full_clean.png
```

Important asset fact:
- Runtime code must use `assets/ui/background/empty_background_1920.runtime.png` as the desk backplate.
- `assets/ui/background/empty_background_1920.png` is the source/reference PNG and must not be mapped by runtime code.

## Non-Negotiable Rules

- Do not use `assets/ui/control_desk/...` for the new desk screen.
- Do not copy code from `.worktree-quarantine/ui-reset-2026-06-18/`.
- Do not draw procedural desk panels, panel frames, screws, gauge faces, fake LED blocks, fake knobs, or decorative chrome over the clean background.
- Do not run full match simulation on the UI-focus route.
- Do not show contract, breaker, result, pause, start, or scenario modals on the UI-focus route.
- Do not tune layout by scattering magic numbers through component classes.
- Do not implement all controls at once. Bring up one overlay family at a time and screenshot it.

Allowed overlay drawing:

- gauge needles;
- lit LED sprites;
- rotating knob sprites;
- text readouts;
- forecast trace/grid/scanlines inside the monitor area;
- transparent hit zones and debug alignment overlays.

## Target Architecture

Add a new UI-focused control-desk screen while leaving the old screens available until the new screen is proven.

Proposed files:

```txt
src/pixi/controlDesk/controlDeskAssets.ts
src/pixi/controlDesk/controlDeskLayout.ts
src/pixi/controlDesk/controlDeskPreviewState.ts
src/pixi/controlDesk/components/Backplate.ts
src/pixi/controlDesk/components/SpriteLedStrip.ts
src/pixi/controlDesk/components/GaugeNeedle.ts
src/pixi/controlDesk/components/RotaryKnob.ts
src/pixi/controlDesk/components/ThreePositionRotary.ts
src/pixi/controlDesk/components/ModeRotarySwitch.ts
src/pixi/controlDesk/components/UpgradeRow.ts
src/pixi/controlDesk/components/ForecastOscilloscope.ts
src/pixi/controlDesk/components/TextReadout.ts
src/pixi/controlDesk/components/HitZone.ts
src/pixi/screens/ControlDeskScreen.ts
```

Layer model:

```txt
ControlDeskScreen
├─ DeskBackplateLayer
│  └─ one Sprite: empty_background_1920.runtime.png at 1920x1080
├─ StaticTextLayer
├─ InstrumentOverlayLayer
│  ├─ LED strips
│  ├─ gauge needles
│  ├─ knobs
│  ├─ wind/dam mode switches
│  ├─ upgrade arrows
│  └─ forecast overlay
├─ HitZoneLayer
├─ AlignmentDebugLayer optional
└─ ReferenceOverlayLayer optional
```

The `Backplate` component owns exactly one sprite. It should not draw any fallback desk.

## UI-Focus Mode

Create a dedicated visual iteration route:

```txt
/?ui=desk
```

Behavior:

- construct a deterministic frozen preview match state;
- call selectors to produce `ProductionConsoleState` / `DispatchConsoleState`;
- do not call `tickMatch`;
- do not call `chooseBotCommands`;
- do not route to result screen;
- do not update `ContractOfferModal`;
- do not update `BreakerResetModal`;
- do not include debug scenario buttons that force breaker trips;
- allow a debug readout only if it cannot create gameplay popups.

Full simulation remains explicit:

```txt
/?play=1
```

During development, Playwright must target `/?ui=desk`, not the normal running game.

## Asset Resolver Plan

Add typed keys for the clean desk assets:

```ts
type ControlDeskAssetKey =
  | "desk_background"
  | "desk_reference_full_clean"
  | "led_empty_10"
  | "led_empty_3"
  | "led_green"
  | "led_orange"
  | "led_red"
  | "led_blue"
  | "knob"
  | "rotary_left"
  | "rotary_center"
  | "rotary_right"
  | "gauge_needle"
  | "upgrade_arrow"
```

Map only to these paths:

```txt
desk_background -> /assets/ui/background/empty_background_1920.runtime.png
desk_reference_full_clean -> /assets/ui/full_clean.png
led_empty_10 -> /assets/ui/components/Led/empty_10-level.png
led_empty_3 -> /assets/ui/components/Led/empty_3-level.png
led_green -> /assets/ui/components/Led/green_led.png
led_orange -> /assets/ui/components/Led/orange_led.png
led_red -> /assets/ui/components/Led/red_led.png
led_blue -> /assets/ui/components/Led/blue_led.png
knob -> /assets/ui/components/Knob/knob.png
rotary_left -> /assets/ui/components/Knob/rotary_knob_left.png
rotary_center -> /assets/ui/components/Knob/rotary_knob_center.png
rotary_right -> /assets/ui/components/Knob/rotary_knob_right.png
gauge_needle -> /assets/ui/components/gauge/needle.png
upgrade_arrow -> /assets/ui/components/upgrade.png
```

Preflight checks:

- runtime background path exists;
- runtime background starts with PNG signature;
- original PSD-backed `.png` is not used by runtime code;
- every required component sprite path exists;
- no new code references `assets/ui/control_desk`.

## Layout Manifest

Create `src/pixi/controlDesk/controlDeskLayout.ts`.

It must centralize all tuning:

```ts
type ControlDeskLayout = {
  canvas: { width: 1920; height: 1080 };
  backplate: Rect;
  gauges: {
    capacity: NeedleLayout;
    supplyDelta: NeedleLayout;
  };
  ledStrips: Record<string, LedStripLayout>;
  knobs: {
    reactor: RotaryLayout;
    boiler: RotaryLayout;
    windSwitch: ThreePositionRotaryLayout;
    dam: ThreePositionRotaryLayout;
  };
  forecast: {
    plot: Rect;
    labels: Record<string, Point>;
  };
  upgradeRows: Array<{
    key: string;
    label: Point;
    ledStrip: Rect;
    upgradeArrow: Point;
    hitZone: Rect;
  }>;
  text: Record<string, TextLayout>;
  hitZones: Record<string, Rect | CircleLayout>;
};
```

Rules:

- no component should invent its own final position;
- component constructors receive layout slices;
- tuning is done by editing the manifest;
- add `?deskRef=1` and `?layoutDebug=1` to compare layout against references.

## Components

### `Backplate`

Input:

- `Texture`
- `{ x: 0, y: 0, w: 1920, h: 1080 }`

Behavior:

- draw one sprite;
- `eventMode = "none"`;
- no fallback procedural desk.

### `SpriteLedStrip`

Input:

- base strip texture;
- LED textures;
- value ratio;
- color thresholds;
- layout bounds;

Behavior:

- base strip is one sprite;
- lit cells are repeated LED sprites;
- unlit area comes from the base strip;
- no `Graphics` rectangles unless test fallback mode explicitly omits sprites.

Tests:

- value maps to lit sprite count;
- green/orange/red thresholds are stable;
- no loose top-level LED strips outside declared layout.

### `GaugeNeedle`

Input:

- `needle.png`;
- pivot point;
- rotation range;
- normalized value.

Behavior:

- anchor/pivot calibrated once;
- changing value rotates only;
- position never changes after layout.

Tests:

- position stays fixed while rotation changes;
- no procedural gauge face is drawn.

### `RotaryKnob`

Input:

- `knob.png`;
- center;
- radius/hit area;
- min/max angle;
- normalized value.

Behavior:

- sprite rotates around its own center;
- transparent hit zone converts drag angle deltas into incremental adjustments;
- each drag movement adds to or subtracts from the current target/throttle instead of jumping to an absolute target;
- no procedural base/pointer drawn when sprite exists.

### `ModeRotarySwitch`

Input:

- `rotary_knob_left.png`;
- `rotary_knob_center.png`;
- `rotary_knob_right.png`;
- one fixed center point;
- mode labels and fixed label positions;
- wind modes: `OFF | ON`;
- dam modes: `FILL | HOLD | DRAIN`.

Behavior:

- one control stays centered;
- mode swaps texture and/or rotates only the knob sprite;
- fixed text labels must not rotate with the knob;
- it must not jump between slots;
- clicking the center cycles through modes and reverses direction at the ends;
- dragging left or right selects the matching edge mode.

Tests:

- `x` and `y` are identical across all modes;
- rotation or texture changes across modes.
- labels are present and black.
- label rotations stay `0`.

### `UpgradeRow`

Input:

- label;
- level;
- capacity text;
- `SpriteLedStrip`;
- `upgrade.png`;
- hit zone.

Behavior:

- use sprite LEDs for levels;
- display the purchased level immediately, even while a build is in progress;
- do not dim unrelated upgrade rows after one upgrade is purchased;
- use upgrade arrow sprite;
- no old square procedural lamps.

### `ForecastOscilloscope`

Input:

- forecast trace;
- current production;
- current demand;
- plot bounds;

Behavior:

- draw only inside the monitor area;
- red cross for current production;
- pink `+-10%` band;
- green forecast curve;
- subtle grid/scanline graphics inside the screen only;
- visual-only scan animation for validation, without advancing match state.

### `TextReadout`

Input:

- text getter;
- position/style from layout manifest.

Behavior:

- update only if text changes;
- plant power numbers next to category names include `MW`;
- keep text sparse and aligned to background labels.

### `HitZone`

Input:

- shape;
- command callback.

Behavior:

- invisible Pixi container/graphics;
- `eventMode = "static"`;
- explicit `hitArea`;
- optional debug visualization only with `?layoutDebug=1`.

## Migration Phases

### Phase 0: Baseline Guard

Commands:

```bash
git status --short -- src e2e
pnpm typecheck
pnpm test
pnpm build
```

Expected:

- `src/` and `e2e/` start clean;
- any unrelated dirty files are listed but not touched.

### Phase 1: Asset Keys And Preflight

Modify:

- `src/pixi/assets.ts` or new `src/pixi/controlDesk/controlDeskAssets.ts`;
- add asset tests.

Do not create the screen yet.

Done when:

- all new assets resolve;
- runtime background is verified as PNG;
- old control-desk asset paths are rejected.

### Phase 2: UI-Focus Route

Modify:

- `src/main.ts`;
- `src/pixi/screens/ScreenManager.ts` only as needed to route to a UI-focus screen.

Create:

- `controlDeskPreviewState.ts`.

Done when:

- `/?ui=desk` renders a frozen route;
- no match ticking;
- no bot commands;
- no modals;
- e2e proves time/readout is stable after a wait.

### Phase 3: Backplate Only

Create:

- `ControlDeskScreen`;
- `Backplate`;
- `controlDeskLayout.ts`.

Done when:

- screenshot shows only the clean desk background;
- no procedural controls or old screens are visible.

### Phase 4: Layout Debug Overlay

Add:

- optional `?layoutDebug=1`;
- bounding boxes/crosshairs for component positions.

Done when:

- layout can be tuned without editing component code.

### Phase 5: LED Components

Add:

- `SpriteLedStrip`;
- reactor/boiler/wind/solar/dam strips;
- upgrade row level strips.

Done when:

- authored LED sprites are visible;
- wind LEDs show connected wind output against installed wind peak, matching the solar output strip behavior for now;
- upgrade level LEDs show purchased level immediately;
- no procedural LED blocks exist;
- no stray LED appears outside declared layout.

### Phase 6: Gauge Needles

Add:

- capacity needle;
- supply delta needle.

Done when:

- needle position is stable;
- only rotation changes;
- no procedural gauge faces are drawn over the background.

### Phase 7: Knobs And Dam Rotary

Add:

- reactor knob;
- boiler knob;
- wind two-position switch;
- dam three-position rotary switch.

Done when:

- continuous knobs rotate around center;
- reactor and boiler drags emit incremental target/throttle changes;
- wind and dam switches stay in one center, show all labels, and change mode visually;
- switch labels stay fixed while only the knob sprite rotates;
- hit zones update preview commands without simulation.

### Phase 8: Forecast

Add:

- forecast oscilloscope;

Done when:

- forecast elements draw only inside the monitor;
- the desk route has a forecast-only animation example that can be validated without ticking gameplay.

### Phase 9: Text Readouts

Add:

- cash/score;
- tariff/rival tariff;
- weather;
- player/rival subscribed-load share;
- load/supply;
- breaker status;
- compact plant values.

Done when:

- text is readable on desktop screenshot;
- plant readouts next to category names include `MW` where the number is power;
- added writing is black and lives on the desk-top band above the main control desk;
- text does not fight background labels;
- text updates only when values change.

### Phase 10: Interaction Wiring

Add transparent hit zones:

- reactor target;
- boiler throttle;
- wind enable/routing;
- dam fill/hold/drain;
- upgrade rows.

Done when:

- each hit zone emits the existing command;
- reactor and boiler hit zones emit relative adjustments, not direct absolute targets;
- wind and dam hit zones support click cycling plus left/right drag;
- wind switching connects/disconnects wind from the grid and therefore changes the wind output LED strip;
- upgrade row clicks immediately increase the visible purchased-level counter;
- no automatic dispatch is introduced;
- e2e can change one control on the UI-focus route without triggering modals.

### Phase 11: Replace Normal Route

Only after the UI-focus screen is visually accepted:

- make `ControlDeskScreen` the normal main screen;
- remove or stop instantiating legacy dispatch/production navigation;
- keep full gameplay simulation separate from visual preview mode.

## Current Implementation Status

Status date: 2026-06-19.

Completed in the current worktree:

- Phase 1: new control-desk asset keys and preflight tests cover the runtime background PNG, required component sprites, and rejection of old `assets/ui/control_desk` paths.
- Phase 2: `/?ui=desk` constructs a deterministic frozen preview state, suppresses debug scenario controls and gameplay modals, and remains frozen even if `?play=1` is also present.
- Phase 3: `ControlDeskScreen`, `Backplate`, and `controlDeskLayout.ts` exist; the Backplate contract is directly tested as one non-interactive sprite with no procedural fallback.
- Phase 4: `?layoutDebug=1` exposes alignment boxes/crosshairs from the layout manifest without moving tuning into component code.
- Phase 5: LED strips use authored sprite assets for top-level controls and green upgrade rows; wind LEDs show connected output against installed wind peak, matching the solar output strip behavior for now; unit tests cover thresholds, sprite-backed rendering, upgrade color, purchased-level display, and manifest coordinates.
- Phase 6: capacity and supply-delta needles use authored needle sprites; tests prove needle position stays fixed while rotation changes.
- Phase 7: reactor and boiler use sprite-backed incremental knobs; wind and dam use sprite-backed mode switches with fixed black labels; tests prove modes change without jumping center or rotating labels and hit zones update preview commands.
- Phase 8: the forecast oscilloscope draws the current marker, range band, forecast curve, and scan animation inside the monitor area; Playwright checks the forecast region is nonblank and animating while gameplay remains frozen.
- Phase 9: compact black text readouts cover cash, score, tariff, rival tariff, weather, subscribed-load share, load, generation, breaker status, and plant values; plant power values include `MW`; tests prove readouts skip duplicate text writes.
- Phase 10: transparent hit zones emit existing player commands for reactor, boiler, wind, water-dam modes, and upgrades; knobs are relative adjustments, wind/dam support click cycling and left/right drag, wind toggles grid connection and updates the wind output LED strip, and Playwright proves a UI-focus control drag changes the control region without adding modals.

Proof artifacts:

```txt
.artifacts/ui-migration/control-desk-1920x1080.png
.artifacts/ui-migration/control-desk-mobile.png
.artifacts/ui-migration/dispatch-1920x1080.png
.artifacts/ui-migration/production-1920x1080.png
```

Phase 11 remains pending. Do not replace the normal gameplay route or remove legacy dispatch/production routing until the UI-focus screen is visually accepted.

## Test Strategy

Unit tests:

- asset manifest contains only new desk paths;
- background runtime file has PNG signature;
- old `assets/ui/control_desk` paths are absent from new screen modules;
- LED strip maps values to sprite counts/colors;
- gauge needle rotates around stable pivot;
- continuous knob rotates around stable center and emits relative adjustments;
- wind and dam rotary switches keep same `x/y` across modes;
- UI-focus preview state does not tick;
- UI-focus screen does not create contract/breaker/result modals.

E2E tests:

- open `/?ui=desk`;
- assert no modal/start/result UI;
- assert canvas is nonblank;
- assert screenshot desktop `1920x1080`;
- assert screenshot mobile viewport;
- assert forecast region is nonblank and animating after overlays exist;
- wait at least one second and assert preview time/readout did not change;
- assert no old production screen shortcut changes route on the UI-focus screen.

Verification commands:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
python3 scripts/wiki.py check # only if wiki files are edited
```

## Done Criteria

The migration is complete only when:

- `src/` and `e2e/` changes are scoped to the new control-desk architecture;
- the UI-focus route is frozen and modal-free;
- the backplate is one clean 1920x1080 sprite;
- every visible desk component comes from authored assets or approved live-state overlays;
- no old `assets/ui/control_desk` path is referenced by the new screen;
- no procedural desk panels/chrome/fake controls are visible;
- Playwright desktop and mobile screenshots prove the layout;
- typecheck, tests, build, and e2e pass;
- remaining risks are listed before merging.

## Residual Risks

- Component PNGs are currently large and may need scale tuning in the layout manifest.
- The background bakes some static faces/labels; overlays must align precisely and avoid duplicating those labels.
- The UI-focus route should be accepted visually before gameplay state wiring begins.
- The old two-screen system should remain untouched until the new screen passes visual review.
