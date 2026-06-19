# 50Hz

50Hz is a finished 48h hackathon project: a short single-player electricity-grid control game built with TypeScript, Vite, PixiJS, and deterministic gameplay modules.

The project is considered complete as of the end of the 48h hackathon on 2026-06-19. It is not planned for further updates.

## Current Status

- `Status`: finished hackathon prototype
- `Playable mode`: single-player against an AI opponent
- `Core loop`: operate the grid manually, keep generation close to load, win customers through efficiency, earn revenue, and survive breaker pressure
- `Frontend`: PixiJS control-desk game screen with menu, match flow, visual city/generation state, weather forecast, upgrades, contracts, and result screen
- `Gameplay`: deterministic TypeScript systems for demand, generation assets, efficiency, pricing, market share, revenue, breaker risk, events, upgrades, weather, bot commands, and match scoring
- `Tests`: Vitest unit coverage plus Playwright baseline coverage
- `Documentation`: gameplay canon, visual direction, asset manifest, and agent routing notes under `wiki/` and `.agents/skills/`

## Play It Locally

```sh
pnpm install
pnpm dev
```

Then open the Vite URL printed by the command.

Useful query modes:

- `?play=1` starts directly in the match.
- `?dev=1` enables the debug panel.
- `?seed=<value>` runs a deterministic seeded match.
- `?cityEditor=1` opens the city editor mode.
- `?dev=1&layoutEdit=1` opens layout editing helpers.

## Checks

```sh
pnpm test
pnpm build
python3 scripts/wiki.py check
```

`make check` runs the main test and build path.

## Project Shape

```txt
src/
  gameplay/        deterministic game systems
  pixi/            PixiJS application, screens, city view, and controls
  ui/              DOM overlays, menu, debug panel, and editor helpers
tests/             Vitest coverage for gameplay, UI helpers, and assets
e2e/               Playwright baseline check
public/            app icons and manifest
wiki/              gameplay canon and visual documentation
.agents/skills/   task routing notes used during development
```

## Hackathon Token Usage

This project was built with Codex/OpenAI assistance during the hackathon.

Codex session stats are the following:

- `Sessions counted`: 92
- `Date range counted`: 2026-06-17 to 2026-06-19
- `Total tokens`: 501,802,000
- `Input tokens`: 499,695,162
- `Cached input tokens`: 465,119,488
- `Output tokens`: 2,106,838
- `Reasoning output tokens`: 708,010

The `Total tokens` figure includes cached input tokens because that is how Codex records `total_tokens` in the local session logs.

## Canonical Gameplay Summary

50Hz is a real-time electricity-grid control game where the player faces an AI opponent. The provider with better contract-to-capacity efficiency offers the cheaper tariff, attracts more customers, earns more money, and then has to handle the extra grid pressure created by that success.

The main tension is not simply building more power plants. Overbuilding hurts utilization and price, while underreacting to demand causes breaker trips. The player is trying to keep contracted load close to the efficient capacity basis while keeping real-time supply within a safe band around demand.

## Repository Notes

- The MVP uses synthetic gameplay numbers. External data and geolocation are flavor only.
- Multiplayer, real market clearing, live-data balance, detailed carbon accounting, and long tech trees are intentionally out of scope.
- The wiki is retained as design canon and historical development context, not as a roadmap for future work.
