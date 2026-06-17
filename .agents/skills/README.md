# Skills

These skill files are lightweight routing instructions for coding agents working on 50Hz.

They are not independent design documents and should not cause broad wiki loading. Each skill names the smallest wiki page set needed for its task. Use `query` only for explicit wiki-backed lookup or when the right mechanic page is unclear.

## Skill List

| Skill | Use when |
|---|---|
| [`gameplay-canon`](./gameplay-canon/SKILL.md) | Implementing or modifying general gameplay |
| [`economy-balance`](./economy-balance/SKILL.md) | Touching efficiency, price, customers, revenue, or score |
| [`manual-control-room`](./manual-control-room/SKILL.md) | Building controls, screens, UI flow, or operator actions |
| [`event-card-system`](./event-card-system/SKILL.md) | Building public events, cards, warning timers, or shocks |
| [`tuning-and-playtest`](./tuning-and-playtest/SKILL.md) | Adjusting numbers after playtests |
| [`query`](./query/SKILL.md) | Answering wiki-backed design questions |

## Visual and PixiJS Routing

Use `query` with `wiki/visual/` when the user asks for wiki-backed visual direction. For implementation, use the relevant gameplay skill first when mechanics are affected, then use the PixiJS skills for library-specific code.

| Skill | Use when |
|---|---|
| [`pixijs`](./pixijs/SKILL.md) | Routing any PixiJS v8 implementation task |
| [`pixijs-assets`](./pixijs-assets/SKILL.md) | Loading or managing assets and bundles |
| [`pixijs-events`](./pixijs-events/SKILL.md) | Pointer, mouse, touch, wheel, or drag input |
| [`pixijs-scene-sprite`](./pixijs-scene-sprite/SKILL.md) | Sprites, animated sprites, tiling, or nine-slice UI |
| [`pixijs-scene-text`](./pixijs-scene-text/SKILL.md) | Text, bitmap text, HTML text, or split text |
| [`pixijs-performance`](./pixijs-performance/SKILL.md) | FPS, batching, culling, or memory work |
