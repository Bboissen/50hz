---
title: "PixiJS Agent Integration Brief"
type: "agent_brief"
status: "draft"
updated: "2026-06-17"
tags: ["50hz", "pixijs", "mcp", "agent", "implementation"]
summary: "Direct implementation contract for a PixiJS MCP / coding agent building the DispatchConsole visual prototype."
related: ["20-visual-design-index.md", "21-dispatch-console-layout.md", "25-grid-pressure-meter.md", "29-asset-inventory-and-ownership.md"]
---

# PixiJS Agent Integration Brief

## Objective

Build the `DispatchConsole` main screen for 50Hz as a PixiJS 2D browser prototype.

The output should be a playable/readable UI shell with mock state updates, procedural placeholder visuals, and clear asset-swap points.

## PixiJS documentation entrypoint

Use the official PixiJS LLM documentation entrypoint:

```txt
https://pixijs.com/llms.txt
```

Relevant PixiJS guide areas for this task:

- Application
- Assets
- Manifests & Bundles
- Scene Graph
- Container
- Graphics
- Sprite
- Text / BitmapText
- Events / Interaction
- Ticker
- Render Layers
- NineSlice Sprite
- Performance Tips

## Must build first

1. Fixed 1920×1080 PixiJS application.
2. `DispatchConsoleRoot` scene graph from `21-dispatch-console-layout.md`.
3. Procedural panel frames using design tokens.
4. `GridPressureMeter` with dual capacity/balance indicators and warning zones.
5. `CityLoadWindow` with three sector placeholders and Contract Split bar showing current subscribed share plus target market share.
6. `YourTariffBoard` and `RivalTariffBoard`.
7. `UpgradeRack` with three upgrade rows and level lamps.
8. `ForecastTape`, `IncidentQueue`, and `DispatchCardsPanel`.
9. State-driven animation for core loop feedback.
10. Asset loader that uses `asset-manifest.prototype.json` but tolerates missing files.

## Do not build first

- full production-console screen beyond the draft control-center direction in `31-production-console-visual-direction.md`,
- realistic power-flow model,
- deckbuilding system,
- regional map,
- character animation,
- complex shader effects,
- particle systems,
- responsive layout,
- extra plant categories,
- carbon market UI.

## Component tree

```txt
DispatchConsoleRoot
├─ BackgroundLayer
├─ PanelFrameLayer
├─ TopAnticipationLayer
│  ├─ CashReservePanel
│  ├─ ForecastTape
│  └─ IncidentQueue
├─ MarketConfrontationLayer
│  ├─ YourGenerationStack
│  ├─ YourTariffBoard
│  ├─ CityLoadWindow
│  │  ├─ HomesSector
│  │  ├─ ServicesSector
│  │  ├─ DataCentersSector
│  │  └─ ContractSplitBar
│  ├─ RivalTariffBoard
│  └─ RivalGridStack
├─ OperatorConsoleLayer
│  ├─ UpgradeRack
│  ├─ GridPressureMeter
│  └─ DispatchCardsPanel
└─ AlarmOverlayLayer
```

## Suggested TypeScript state

```ts
export type PlantKey = 'reactor' | 'boiler' | 'renewables' | 'waterDam';
export type SectorKey = 'homes' | 'services' | 'dataCenters';
export type CapacityZone = 'idle' | 'safe' | 'efficient' | 'strain' | 'tripRisk' | 'trip';
export type BalanceZone =
  | 'severeUnderload'
  | 'underload'
  | 'lock'
  | 'overload'
  | 'severeOverload';

export type DispatchConsoleState = {
  cash: number;
  timeSeconds: number;
  playerTariffCents: number;
  rivalTariffCents: number;
  playerSubscribedLoadShare: number; // current physical/load share, 0..1
  playerTargetMarketShare: number; // immediate target from tariff, 0..1
  cityDemandMW: number;
  currentContractLoadMW: number;
  contractCapacityBasisMW: number;
  deliveredSupplyMW: number;
  currentDemandMW: number;
  capacityUtilization: number;
  supplyDemandMismatch: number;
  capacityZone: CapacityZone;
  balanceZone: BalanceZone;
  plants: Record<PlantKey, {
    level: 0 | 1 | 2 | 3;
    upgradeCost: number;
    canAfford: boolean;
  }>;
  sectors: Record<SectorKey, {
    demandLevel: 0 | 1 | 2 | 3;
    isSpiking: boolean;
    isDemandCritical: boolean;
    activeEventId?: string;
  }>;
  forecast: TimelineToken[];
  incidents: TimelineToken[];
  cards: DispatchCardState[];
};

export type TimelineToken = {
  id: string;
  label: string;
  iconKey: string;
  secondsUntilImpact: number;
  kind: 'weather' | 'city' | 'rival' | 'player';
  targetSector?: SectorKey;
};

export type DispatchCardState = {
  id: string;
  title: string;
  iconKey: string;
  type: 'defense' | 'market' | 'emergency' | 'offense' | 'fixedContract';
  target?: SectorKey | 'grid' | 'rival' | 'sharedOffer';
  effectText: string;
  state: 'available' | 'active' | 'cooldown' | 'disabled';
  cooldownRatio: number; // 0..1
};
```

## Initial mock state

```ts
const mockState: DispatchConsoleState = {
  cash: 80,
  timeSeconds: 0,
  // Tariffs are visual mock displays mapped from gameplay price.
  playerTariffCents: 12.4,
  rivalTariffCents: 15.1,
  playerSubscribedLoadShare: 0.50,
  playerTargetMarketShare: 0.57,
  cityDemandMW: 140,
  currentContractLoadMW: 70,
  contractCapacityBasisMW: 80,
  deliveredSupplyMW: 70,
  currentDemandMW: 70,
  capacityUtilization: 0.875,
  supplyDemandMismatch: 0,
  capacityZone: 'efficient',
  balanceZone: 'lock',
  plants: {
    reactor: { level: 2, upgradeCost: 85, canAfford: false },
    boiler: { level: 1, upgradeCost: 40, canAfford: true },
    renewables: { level: 2, upgradeCost: 45, canAfford: true },
    waterDam: { level: 1, upgradeCost: 50, canAfford: true }
  },
  sectors: {
    homes: { demandLevel: 2, isSpiking: true, isDemandCritical: false, activeEventId: 'football_final' },
    services: { demandLevel: 1, isSpiking: false, isDemandCritical: false },
    dataCenters: { demandLevel: 1, isSpiking: false, isDemandCritical: false }
  },
  forecast: [],
  incidents: [],
  cards: []
};
```

## Build phases

### Phase 1 — Visual shell

- Create application.
- Draw root panel layout.
- Add labels and placeholder data.
- No gameplay simulation required.

### Phase 2 — State-driven visuals

- Add `update(state)` methods to each component.
- Bind meter, tariff digits, current and target Contract Split markers, sector states, lamps, cards.
- Create a simple mock loop that changes state every few seconds.

### Phase 3 — Interaction

- Make Upgrade Rack buttons clickable.
- Make Dispatch Cards clickable.
- Emit events to a parent controller.
- Do not implement deep economy unless requested.

### Phase 4 — Asset loading

- Load `asset-manifest.prototype.json`.
- Attempt to resolve icon/sprite keys.
- Fallback to procedural placeholders on missing assets.

### Phase 5 — Visual polish

- Add CRT flicker.
- Add digit tick animation.
- Add stamps.
- Add authored city/plant/event assets.

## Required component API pattern

Each component should support:

```ts
class SomeComponent extends Container {
  constructor(tokens: DesignTokens, assets: AssetResolver) {}
  update(stateSlice: SomeState): void {}
  resize?(bounds: Rect): void {}
  destroy(options?: DestroyOptions): void {}
}
```

Use explicit state slices. Do not let components fetch global state themselves.

## Asset fallback rule

For every sprite asset:

```txt
try asset -> if missing, procedural placeholder -> never crash
```

## Visual QA checklist

The generated screen is acceptable when:

1. it clearly reads as an old dispatch console,
2. the player can identify tariff display, current share, target share, city demand, capacity pressure, and load balance,
3. clickable areas are limited to upgrades and dispatch cards,
4. rival side is readable but not interactive,
5. overload is visually impossible to miss,
6. no clean SaaS dashboard styling appears.

## Human handoff checklist

The human should provide, in priority order:

1. three city building sprites,
2. three plant icons,
3. six core event/action icons,
4. optional card texture,
5. optional meter glass texture,
6. optional bitmap font.

The code must not depend on these assets to run.
