# Dam Water PixiJS Experiment

This experiment proves the dam can stay mostly as authored pixel art while the
water is rebuilt as PixiJS-rendered animated surfaces.

It intentionally lives outside `src/`. Treat it as a prototype/reference for a
future production `Dam` or `HydroDam` scene object.

## Running It

From the repository root:

```bash
pnpm exec vite --config experiments/dam-water/vite.config.ts --host 127.0.0.1 --port 5174
```

Open:

```text
http://127.0.0.1:5174/
```

Useful checks:

```bash
pnpm exec tsc -p experiments/dam-water/tsconfig.json --noEmit
pnpm exec vite build --config experiments/dam-water/vite.config.ts
pnpm exec playwright test --config experiments/dam-water/playwright.config.ts
```

## Current Asset Contract

The experiment uses the dam art under:

```text
assets/city/power/dam/
```

Required files:

```text
dam_level_1.png
mask_1.png
mask_2.png
mask_3.png
```

Current interpretation:

```text
dam_level_1.png  dry/no-water dam image, rendered above Pixi water
mask_1.png       upstream reservoir horizontal/top water source mask
mask_2.png       upstream reservoir vertical/side water mask
mask_3.png       downstream river water mask
```

The source dam and masks are `2730x1536` and `1672x941` respectively. The mask
sprites are stretched to the dam coordinate system in `fitMask(...)`.

## Generated Mask

The file below is generated from the source masks:

```text
experiments/dam-water/generated/upstream_top_mask.png
```

It is derived as:

```text
mask_1 - mask_2, keeping only the largest connected component
```

Reason: `mask_1.png` includes part of the vertical side face. If used directly,
the horizontal water bleeds into the lateral face region. The derived mask makes
the horizontal and vertical reservoir surfaces independent.

If `mask_1.png` or `mask_2.png` changes, regenerate this derived mask before
reviewing the animation.

## Scene Structure

`AnimatedDamWater` is the prototype object.

Render order is important:

```text
upstream horizontal water
upstream vertical/side water
downstream water
dry dam sprite
time-of-day light overlay
```

The water is rendered behind `dam_level_1.png`. Only transparent holes in the
dam art reveal the Pixi water.

Inside `upstream`, the vertical side is drawn after the horizontal water so it
appears on top:

```ts
this.upstream.addChild(
  this.upstreamTop,
  this.upstreamSide,
  this.upstreamTopMask,
  this.upstreamSideMask,
);
```

The mask sprites must remain in the display list so PixiJS can use them for
masking.

## Water Model

There are three water regions:

```text
upstreamTop   horizontal reservoir surface
upstreamSide  left vertical reservoir face
downstream    river below the dam
```

The implementation deliberately overdraws broad procedural water shapes and lets
the alpha masks define the exact visible region. Do not try to hand-align the
water fill polygons to the dam art. The masks own placement.

The reservoir level is controlled by:

```ts
private level = 0.82;
```

The animated loop automatically moves between:

```ts
0.18 <= level <= 0.9
```

Keyboard controls:

```text
ArrowUp    increase water level
ArrowDown  decrease water level
```

The level affects:

```text
topY       horizontal surface fill band
topRightY  horizontal surface perspective slope
sideY      vertical/side face fill band
```

The current movement is visual only. It is not connected to gameplay state.

## Tunables

The current side mask registration is controlled here:

```ts
const UPSTREAM_SIDE_MASK_Y = -100;
const UPSTREAM_SIDE_MASK_HEIGHT = 200;
```

Meaning:

```text
UPSTREAM_SIDE_MASK_Y       vertical offset for mask_2 in dam design pixels
UPSTREAM_SIDE_MASK_HEIGHT  extra height added to mask_2 after scaling
```

If the side face appears too high/low, adjust `UPSTREAM_SIDE_MASK_Y`.
If the side face is clipped vertically, adjust `UPSTREAM_SIDE_MASK_HEIGHT`.

The mask is scaled as:

```ts
mask.width = DESIGN_WIDTH;
mask.height = DESIGN_HEIGHT + heightOffset;
```

## Animation Technique

Water motion is currently procedural Pixi `Graphics`:

```text
solid dark water fill
lighter translucent secondary fill
moving line strokes for surface motion
ellipse foam below the dam
```

The wave motion uses `this.wave`, advanced by `app.ticker`.

The visual style is intentionally simple and pixel-art compatible:

```text
no DOM sliders
no CSS filters for water
no moving full PNG water layer
```

## Time Of Day

The experiment includes a lightweight time-of-day overlay:

```ts
drawTimeOfDayLight(...)
```

This is only a placeholder for evaluating scene layering. For production, the
target should be real per-object lighting/shadow/color changes, not a single
global color wash.

Expected future direction:

```text
separate warm/cool material tints per water/dam/terrain layer
window/emissive accents at night
directional shadow sprites or projected shadow geometry
possibly pre-authored shadow masks for pixel-art consistency
```

## Integration Plan

When moving this into the real game, extract the prototype into a reusable Pixi
object with no experiment shell:

```ts
class DamWaterObject extends Container {
  setWaterLevel(level: number): void;
  setTimeOfDay(time: number): void;
  tick(deltaMS: number): void;
}
```

The production object should receive already-loaded textures or asset aliases:

```ts
type DamWaterTextures = {
  damDry: Texture;
  upstreamTopMask: Texture;
  upstreamSideMask: Texture;
  downstreamMask: Texture;
};
```

Recommended integration steps:

1. Move the object logic out of `experiments/dam-water/main.ts`.
2. Keep asset loading outside the object.
3. Pass textures into the constructor.
4. Replace the local auto-oscillating `level` with gameplay state.
5. Keep `tick(deltaMS)` for wave animation only.
6. Add a deterministic visual smoke test that verifies the dam canvas renders
   and the masks are non-empty.
7. Keep all mask registration constants next to the dam asset definition.

## Gameplay Hook Later

The dam water level should eventually come from simulation state, for example:

```ts
damWater.setWaterLevel(reservoirFillRatio);
```

Do not bind this prototype directly to final gameplay values yet. The current
level range is art-directed and may need remapping:

```text
game reservoirFillRatio 0..1
visual water level      0.18..0.9
```

## Known Constraints

The current prototype is useful, but still not production-ready:

```text
mask registration is hand-tuned
water highlights are procedural lines, not pixel-authored sprites
foam is simple ellipse geometry
time-of-day is still a broad overlay
the generated mask needs a regeneration step if source masks change
```

The important validated approach is:

```text
dry dam art above Pixi water
separate alpha masks per water plane
side face rendered above top face
water level changes by changing fill bands, not translating a whole water PNG
```

That is the model to preserve during integration.
