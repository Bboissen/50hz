# AGENTS.md

This repo is a **Grid Duel** game, a short visual 1v1 electricity-grid control-room game.
Use `.agents/skills/` as the routing entry point for gameplay, economy, balance, controls, events, or scoring work. Do not load the full wiki for routine code edits, debugging, tests, formatting, or repo navigation.

For implementation tasks, read the matching skill first; each skill names the minimal wiki pages needed for that task. Use `wiki/index.md` or `python3 scripts/wiki.py search "<query>"` only when the user asks for wiki-backed explanation, when a change crosses multiple gameplay systems, or when the correct mechanic file is unclear.

- Core loop: better manual operation → higher efficiency → lower price → more customers → more revenue → higher grid pressure → manual prevention or upgrades.
- Non-negotiable economy invariant: if `efficiencyA > efficiencyB`, then `priceA < priceB` and `cashGainA > cashGainB` for the same market tick.
- Never use naive `revenue = price * customers` unless the better-efficiency revenue invariant is proven by tests.
- For pricing, market share, customer migration, or revenue, use `.agents/skills/economy-balance/SKILL.md`.
- Manual control-room play is core; do not turn the game into passive auto-dispatch. Use `.agents/skills/manual-control-room/SKILL.md`.
- Player navigation should center on screens: grid overview, production console, network/market board, events/cards/forecast, and upgrades.
- Central risk is grid overload caused by winning customers, not abstract efficiency loss.
- Best efficiency is near high but safe utilization; underused overcapacity and overload should both hurt.
- Upgrades are strategic: early overbuilding may reduce current efficiency but prevent future overload.
- Events/cards must be readable, telegraphed, and counterable. Use `.agents/skills/event-card-system/SKILL.md`.
- Real geolocation or nearest-power-plant data is flavor only; core simulation balance must stay synthetic and deterministic.
- Avoid scope creep: real market clearing, live-data-balanced simulation, detailed carbon accounting, long tech trees, map-level transmission, and multiplayer netcode.
- Prefer focused gameplay modules such as `config`, `demand`, `efficiency`, `market`, `revenue`, `assets`, `overload`, `events`, `upgrades`, and `match`.
- Minimum tests: price decreases with efficiency, cash gain increases with efficiency, lower price attracts customers, overload meter rises above safe utilization, upgrades affect stats, and events warn before impact.
- Done means scoped edits, deterministic checks or exact skip reason, updated wiki/skill when mechanics change, and residual risks stated.
