# Weather Timeline Experiment

Standalone PixiJS/Vite experiment for validating the forecast tape behavior before porting it back into the main game UI.

## What It Shows

- A fixed forecast tape frame.
- Weather tiles moving left under a fixed marker.
- Real PNG weather icons from `assets/icons/weather/`.
- Weather conditions sampled from `src/gameplay/weather.ts`.

The experiment intentionally avoids production screen code. It imports gameplay weather sampling only.

## Implementation Guide

Use this experiment as the reference for the production forecast tape.

Port the behavior, not the experiment shell:

- Keep production weather data from `src/gameplay/weather.ts`.
- Load icon textures from `assets/icons/weather/{sun,cloud,rain,wind,snow}.png`.
- Replace procedural weather drawing with Pixi `Sprite` icons.
- Keep the marker fixed.
- Move the weather tile containers left under the fixed marker.
- Recycle a tile to the right only after it leaves the left side.

Core model:

```txt
cellW = visibleTapeWidth / 4
currentSlot = floor(simTimeSeconds / 15)
progress = (simTimeSeconds % 15) / 15
offsetPx = progress * cellW
tileX = tapeLeft + (tile.slotIndex - currentSlot) * cellW - offsetPx
```

Each tile owns a stable `slotIndex` and weather sample. Do not repaint the four visible cells by array index every frame. That was the bug that made the tape look static or jumpy.

Recommended production shape:

- Create a reusable `ForecastTape` Pixi container.
- Give it fixed bounds, icon textures, and a `seed`.
- On each screen update, call `forecastTape.update(state.timeSeconds)`.
- Keep `FORECAST_BUCKET_SECONDS = 15`.
- Keep at least `visibleCells + 3` tile containers so recycling happens offscreen.
- Keep a mask over the tape viewport so entering/leaving tiles are clipped cleanly.

Do not implement it as:

```txt
for each visible index:
  token = forecast[index]
  draw token at fixed cell position
```

That approach changes data but not physical tile motion. It also creates the visible reset when modulo progress wraps.

Production asset loading should follow the existing Pixi resolver pattern, but the final key map needs weather entries:

```txt
weather_sun   -> /assets/icons/weather/sun.png
weather_cloud -> /assets/icons/weather/cloud.png
weather_rain  -> /assets/icons/weather/rain.png
weather_wind  -> /assets/icons/weather/wind.png
weather_snow  -> /assets/icons/weather/snow.png
```

Acceptance criteria for the production port:

- Open the main screen and see weather tiles moving left without input.
- The marker stays fixed.
- No labels are required on the tape.
- A tile visibly disappears on the left and another enters on the right.
- Hard refresh with no query params still moves.
- Playwright compares a cropped tape screenshot before/after and sees pixel changes.

## Run

```sh
pnpm exec vite --config experiments/weather-timeline/vite.config.ts --host 127.0.0.1 --port 5188
```

Open:

```txt
http://127.0.0.1:5188/
```

## Query Params

- `seed`: weather seed, defaults to `vivatech-grid-duel-demo`.
- `start`: initial simulation time in seconds, defaults to `0`.
- `speed`: simulation seconds per real second, defaults to `24`.

Example:

```txt
http://127.0.0.1:5188/?speed=12&start=30
```

## Validation

```sh
pnpm exec tsc -p experiments/weather-timeline/tsconfig.json
pnpm exec playwright test --config experiments/weather-timeline/playwright.config.ts
```

The Playwright smoke test verifies:

- all five weather icon files are served,
- the experiment loads on the base URL with no query params,
- simulation time advances,
- tile positions move,
- tile slots recycle,
- rendered forecast-tape pixels change over time.
