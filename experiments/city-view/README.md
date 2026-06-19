# City View Experiment

Standalone PixiJS prototype for the city map that sits inside the transparent viewport of the control-desk background.

This experiment is intentionally isolated from the main app while the layout and art direction are still moving. The code is structured so the final game screen can reuse the same pieces: asset manifest, deterministic layout config, modular level slots, and scene rendering.

## Run It

```sh
pnpm exec vite --config experiments/city-view/vite.config.ts --host 127.0.0.1
```

Open the printed local URL. Current dev URL is usually:

```txt
http://127.0.0.1:5178/
```

You can force initial upgrade levels through query params:

```txt
/?household=3&business=3&datacenter=3&nuclear=3&thermal=3&solar=3&wind=3&dam=3
```

## Controls

- `H`: select household
- `B`: select business
- `C`: select datacenter
- `N`: select nuclear
- `T`: select thermal
- `S`: select solar
- `W`: select wind
- `M`: select dam
- `1`, `2`, `3`: set selected tile level
- `ArrowUp`, `ArrowDown`: cycle selected tile level
- `D`: toggle viewport/slot debug markers

## File Map

- `assetManifest.ts`: imports every city asset through Vite URLs and maps each slot to levels `1`, `2`, and `3`.
- `citySceneConfig.ts`: all deterministic placement, scale, z-order, viewport, terrain, and decoration constants.
- `CityScene.ts`: Pixi scene container. It creates the masked viewport, background terrain, decorations, and slot instances.
- `CitySlot.ts`: modular upgrade slot. It owns one sprite and swaps its texture when the level changes.
- `cityTypes.ts`: shared slot, level, and config types.
- `main.ts`: standalone boot file, Pixi app setup, asset loading, URL param parsing, keyboard controls, and test/debug dataset sync.
- `smoke.spec.ts`: Playwright checks for asset existence, alpha presence, deterministic non-overlapping layout, rendering, and level swapping.

## Asset Contract

Each upgradeable slot must provide one transparent PNG per level:

```txt
assets/city/buildings/<slot>/<slot>_level_1.png
assets/city/buildings/<slot>/<slot>_level_2.png
assets/city/buildings/<slot>/<slot>_level_3.png
assets/city/power/<slot>/<slot>_level_1.png
assets/city/power/<slot>/<slot>_level_2.png
assets/city/power/<slot>/<slot>_level_3.png
```

Current exceptions are part of the live asset naming and are mapped explicitly in `assetManifest.ts`:

- `household` uses `house_level_1.png`, `house_level_2.png`, `house_level_3.png`.
- `openAI.png` is a decoration, not an upgradeable slot.

The source files must preserve alpha. The tests intentionally fail when expected transparent assets lose their alpha channel.

## Adding Or Changing A Building

1. Add the level PNGs under `assets/city/buildings` or `assets/city/power`.
2. Import the PNG URLs in `assetManifest.ts`.
3. Add the slot id to `UPGRADEABLE_CITY_SLOT_IDS`.
4. Add the slot level map to `CITY_SLOT_ASSET_URLS`.
5. Add one deterministic entry in `CITY_SLOT_CONFIGS`.
6. Add the level 3 asset path to `layoutAssetPaths` in `smoke.spec.ts`.
7. Run the validation commands below.

Do not place tiles with random generation. The city map must be reproducible from config and game state.

## Layout Rules

The available world area is the transparent desk viewport:

```ts
export const DESK_VIEWPORT = { x: 28, y: 28, w: 1429, h: 589 };
```

The render transform is split into:

- `WORLD_CAMERA`: moves and zooms the whole map inside the desk viewport.
- `TERRAIN_TILE_CONFIGS`: covers the viewport with the wasteland terrain.
- `CITY_SLOT_CONFIGS`: fixed positions for upgradeable city/power tiles.
- `CITY_DECORATION_CONFIGS`: fixed positions for non-upgrade decorations, currently the OpenAI sign.

When tuning layout:

- Keep power tiles packed together on the left.
- Keep city/building tiles packed together on the right.
- Keep the wasteland terrain covering the full viewport behind them.
- Keep visible alpha bounds inside `DESK_VIEWPORT`.
- Keep visible alpha bounds from overlapping.
- Use `zIndex` close to each tile's `y` coordinate unless there is a specific draw-order reason.

The Playwright layout test measures each level 3 PNG's actual alpha bounds after camera and scale transforms. This is stricter than a visual screenshot and catches sub-pixel clipping or overlap.

## Level Swapping Model

`CitySlot` is the reusable upgrade primitive:

```ts
const slot = new CitySlot(config, textures.slots[config.id]);
slot.setLevel(2);
```

The object does not know gameplay rules. It only knows:

- its deterministic map position,
- whether it is upgradeable,
- its current level,
- the texture for each level.

In the main game, the screen should receive levels from match/upgrades state and call:

```ts
cityScene.setLevels({
  household: 2,
  nuclear: 3,
});
```

This keeps game logic outside the rendering component.

## Main App Integration Plan

When this experiment is ready to graduate:

1. Move the reusable files into a city screen module, likely under `src/pixi`.
2. Keep `assetManifest.ts` or merge its maps into the existing asset-loading layer.
3. Replace the standalone `main.ts` keyboard/query-param state with real match state selectors.
4. Keep `CityScene`, `CitySlot`, and `citySceneConfig` mostly intact.
5. Mount `CityScene` in the real screen area that uses the desk frame and transparent viewport.
6. Preserve the alpha-bound layout regression test, either as a Pixi visual test or a node-side asset/layout test.

The important boundary is that upgrades should change the slot level, not the slot identity or location.

## Validation

Run the focused checks after any asset, placement, or level-map change:

```sh
pnpm exec tsc -p experiments/city-view/tsconfig.json --noEmit
pnpm exec playwright test --config experiments/city-view/playwright.config.ts
pnpm exec vite build --config experiments/city-view/vite.config.ts
```

For a manual screenshot pass:

```sh
pnpm exec node --input-type=module <<'NODE'
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5178/?household=3&business=3&datacenter=3&nuclear=3&thermal=3&solar=3&wind=3&dam=3');
await page.locator('html[data-experiment-ready="true"]').waitFor({ timeout: 10000 });
await page.locator('canvas').screenshot({ path: '/tmp/50hz-city-view.png' });
await browser.close();
NODE
```

