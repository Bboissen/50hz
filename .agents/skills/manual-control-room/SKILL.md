---
name: manual-control-room
description: Use when building or modifying screens, controls, UI flow, player inputs, alarms, operator actions, or control-room pressure.
---

# Manual Control-Room Skill

## Trigger

Use for UI and interaction work touching:

- screen layout, navigation, panels, dashboards, or alarm surfaces;
- generation, network, market, event, or upgrade controls;
- keyboard/mouse shortcuts and manual response loops;
- information hierarchy for time-pressure decisions.

## Minimal Context

Read only:

1. `wiki/gameplay/06-manual-control-room.md`
2. `wiki/gameplay/07-generation-assets.md` for production controls
3. `wiki/gameplay/08-grid-overload-and-reliability.md` for overload alarms, breakers, reroutes, shedding, or reliability UI
4. `wiki/gameplay/09-events-and-cards.md` for event/card screens
5. `wiki/visual/21-dispatch-console-layout.md` only when implementing the main visual layout
6. `wiki/visual/31-production-console-visual-direction.md` only when implementing the production console visual language

## Core principle

The game is manual. The player should need to switch screens and make operational decisions under time pressure.

## Expected Screens

1. Main grid overview
2. Production console
3. Network/market board
4. Events/cards/forecast desk

An upgrade panel can be embedded or modal.

## Controls must differ

Controls should not all feel like instant sliders.

| System | Required feel |
|---|---|
| Nuclear | slow target/ramp |
| Gas | fast but heat/cost risk |
| Battery | instant but limited |
| Solar | routing decision, weather-dependent |
| Network | reroute/reset/limit contracts under pressure |

## Avoid

- putting all controls on one omnipotent screen,
- automatic optimal dispatch,
- hidden corrections that save the player,
- unreadable alarms,
- too many screens for MVP.

## UI test question

After changing UI, ask:

```txt
Does this make the player read, switch, and manually react faster?
```

If not, it may be visual polish rather than core gameplay.
