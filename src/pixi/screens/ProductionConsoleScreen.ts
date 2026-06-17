import { Container, Graphics, Sprite, Text } from "pixi.js";

import type { PlayerCommand, ProductionConsoleState, WaterDamMode } from "../../gameplay/types";
import type { AssetResolver, VisualAssetKey } from "../assets";
import { DESIGN_TOKENS } from "../tokens";

type CommandSink = (command: PlayerCommand) => void;
type Rect = { x: number; y: number; w: number; h: number };

function label(text: string, x: number, y: number, size = 24, color: number = DESIGN_TOKENS.colors.paperTan): Text {
  const out = new Text({
    text,
    style: {
      fontFamily: DESIGN_TOKENS.typography.labelFamily,
      fontSize: size,
      fill: color,
      fontWeight: "700",
      letterSpacing: 1,
    },
  });
  out.position.set(x, y);
  return out;
}

function button(text: string, bounds: Rect, onTap: () => void): Container {
  const root = new Container();
  root.eventMode = "static";
  root.cursor = "pointer";
  root.on("pointertap", onTap);
  const g = new Graphics()
    .roundRect(bounds.x, bounds.y, bounds.w, bounds.h, 8)
    .fill({ color: DESIGN_TOKENS.colors.paperTan })
    .stroke({ color: DESIGN_TOKENS.colors.inkBlack, width: 3 });
  const t = label(text, bounds.x + 12, bounds.y + 10, 18, DESIGN_TOKENS.colors.inkBlack);
  root.addChild(g, t);
  return root;
}

function sceneSprite(assets: AssetResolver, key: VisualAssetKey, bounds: Rect, alpha = 0.42): Sprite | undefined {
  const texture = assets.texture(key);
  if (!texture) {
    return undefined;
  }

  const sprite = new Sprite(texture);
  const scale = Math.min(bounds.w / texture.width, bounds.h / texture.height);
  sprite.scale.set(scale);
  sprite.position.set(bounds.x + (bounds.w - texture.width * scale) / 2, bounds.y + (bounds.h - texture.height * scale) / 2);
  sprite.alpha = alpha;
  sprite.roundPixels = true;
  return sprite;
}

export class ProductionConsoleScreen extends Container {
  private readonly g = new Graphics();
  private readonly assetLayer = new Container();
  private readonly readout = label("", 64, 74, 24);
  private resetHeld = false;
  private lastTimeSeconds = 0;
  private current?: ProductionConsoleState;

  public constructor(private readonly sink: CommandSink, assets: AssetResolver) {
    super();
    this.addChild(
      this.g,
      this.assetLayer,
      label("PRODUCTION CONSOLE", 48, 28, 34, DESIGN_TOKENS.colors.phosphorGreen),
      label("REACTOR TARGET", 72, 142, 22),
      label("BOILER THROTTLE", 574, 142, 22),
      label("WATER DAM", 1036, 142, 22),
      label("RENEWABLE ROUTING", 72, 614, 22),
      label("EMERGENCY PANEL", 930, 614, 22),
      label("GRID STATUS", 1594, 142, 22),
      this.readout,
    );
    this.addBackdrops(assets);
    this.addButtons();
  }

  public update(state: ProductionConsoleState): void {
    const dt = Math.max(0, state.timeSeconds - this.lastTimeSeconds);
    this.lastTimeSeconds = state.timeSeconds;
    this.current = state;
    if (this.resetHeld && state.breakerTrippedSeconds > 0 && dt > 0) {
      this.sink({ type: "holdBreakerReset", playerId: "player", seconds: dt });
    }

    this.draw(state);
  }

  private addButtons(): void {
    this.addChild(
      button("REACTOR -", { x: 118, y: 398, w: 150, h: 52 }, () => this.nuclear(-5)),
      button("REACTOR +", { x: 286, y: 398, w: 150, h: 52 }, () => this.nuclear(5)),
      button("BOILER -", { x: 612, y: 398, w: 140, h: 52 }, () => this.thermal(-0.1)),
      button("BOILER +", { x: 770, y: 398, w: 140, h: 52 }, () => this.thermal(0.1)),
      button("FILL", { x: 1068, y: 344, w: 110, h: 48 }, () => this.dam("fill")),
      button("HOLD", { x: 1194, y: 344, w: 110, h: 48 }, () => this.dam("hold")),
      button("DRAIN", { x: 1320, y: 344, w: 124, h: 48 }, () => this.dam("drain")),
      button("WIND ON", { x: 158, y: 798, w: 140, h: 54 }, () => this.wind(true)),
      button("WIND OFF", { x: 318, y: 798, w: 150, h: 54 }, () => this.wind(false)),
      button("LOAD SHED", { x: 1194, y: 790, w: 190, h: 62 }, () => this.sink({ type: "shedLoad", playerId: "player" })),
    );

    const reset = button("HOLD RESET", { x: 1408, y: 790, w: 190, h: 62 }, () => undefined);
    reset.on("pointerdown", () => {
      this.resetHeld = true;
    });
    reset.on("pointerup", () => {
      this.resetHeld = false;
    });
    reset.on("pointerupoutside", () => {
      this.resetHeld = false;
    });
    this.addChild(reset);
  }

  private nuclear(delta: number): void {
    if (!this.current) {
      return;
    }
    this.sink({ type: "setNuclearTarget", playerId: "player", targetMW: this.current.nuclearTargetMW + delta });
  }

  private thermal(delta: number): void {
    if (!this.current) {
      return;
    }
    this.sink({ type: "setThermalThrottle", playerId: "player", throttle: this.current.thermalThrottle + delta });
  }

  private dam(mode: WaterDamMode): void {
    this.sink({ type: "setWaterDamMode", playerId: "player", mode });
  }

  private wind(enabled: boolean): void {
    this.sink({ type: "setWindEnabled", playerId: "player", enabled });
  }

  private addBackdrops(assets: AssetResolver): void {
    const scenes: Array<[VisualAssetKey, Rect, number]> = [
      ["plant_reactor", { x: 70, y: 178, w: 420, h: 210 }, 0.5],
      ["plant_boiler", { x: 570, y: 178, w: 390, h: 210 }, 0.5],
      ["plant_water_dam", { x: 1038, y: 176, w: 470, h: 220 }, 0.5],
      ["plant_solar", { x: 82, y: 650, w: 370, h: 160 }, 0.42],
      ["plant_wind_turbine", { x: 430, y: 636, w: 390, h: 184 }, 0.42],
    ];

    for (const [key, bounds, alpha] of scenes) {
      const sprite = sceneSprite(assets, key, bounds, alpha);
      if (sprite) {
        this.assetLayer.addChild(sprite);
      }
    }
  }

  private drawPanel(bounds: Rect): void {
    this.g
      .roundRect(bounds.x, bounds.y, bounds.w, bounds.h, 12)
      .fill({ color: 0xd0c6a0 })
      .stroke({ color: DESIGN_TOKENS.colors.inkBlack, width: 7 })
      .roundRect(bounds.x + 12, bounds.y + 12, bounds.w - 24, bounds.h - 24, 8)
      .stroke({ color: DESIGN_TOKENS.colors.fadedOlive, width: 3, alpha: 0.9 });
  }

  private draw(state: ProductionConsoleState): void {
    this.g.clear().rect(0, 0, 1920, 1080).fill({ color: 0x171a14 });
    this.drawPanel({ x: 48, y: 120, w: 470, h: 430 });
    this.drawPanel({ x: 550, y: 120, w: 430, h: 430 });
    this.drawPanel({ x: 1012, y: 120, w: 522, h: 430 });
    this.drawPanel({ x: 48, y: 592, w: 820, h: 360 });
    this.drawPanel({ x: 906, y: 592, w: 628, h: 360 });
    this.drawPanel({ x: 1570, y: 120, w: 300, h: 832 });

    const reactorAngle = -2.3 + (state.nuclearTargetMW / 70) * 4.6;
    this.g
      .circle(282, 282, 112)
      .fill({ color: DESIGN_TOKENS.colors.oxideGreen })
      .stroke({ color: DESIGN_TOKENS.colors.paperTan, width: 8 })
      .moveTo(282, 282)
      .lineTo(282 + Math.cos(reactorAngle) * 92, 282 + Math.sin(reactorAngle) * 92)
      .stroke({ color: DESIGN_TOKENS.colors.phosphorGreen, width: 8 })
      .rect(104, 476, 334 * Math.min(1, state.nuclearOutputMW / Math.max(state.nuclearTargetMW, 1)), 18)
      .fill({ color: DESIGN_TOKENS.colors.phosphorGreen });

    const leverY = 474 - state.thermalThrottle * 250;
    this.g
      .rect(704, 210, 36, 270)
      .fill({ color: DESIGN_TOKENS.colors.inkBlack })
      .roundRect(660, leverY, 124, 34, 8)
      .fill({ color: DESIGN_TOKENS.colors.paperTan })
      .rect(824, 210, 36, 270)
      .fill({ color: DESIGN_TOKENS.colors.inkBlack })
      .rect(824, 480 - state.thermalHeat * 270, 36, state.thermalHeat * 270)
      .fill({ color: state.thermalHeat > 0.85 ? DESIGN_TOKENS.colors.overloadRed : DESIGN_TOKENS.colors.amberWarn });

    this.g
      .rect(1080, 454, 350, 28)
      .fill({ color: DESIGN_TOKENS.colors.inkBlack })
      .rect(1080, 454, 350 * (state.storedWaterMWh / Math.max(state.waterDamCapacityMWh, 1)), 28)
      .fill({ color: DESIGN_TOKENS.colors.dataCyan });

    const statusColor = state.balanceZone === "lock" ? DESIGN_TOKENS.colors.phosphorGreen : state.balanceZone.includes("severe") ? DESIGN_TOKENS.colors.overloadRed : DESIGN_TOKENS.colors.amberWarn;
    this.g.circle(1720, 254, 46).fill({ color: statusColor }).stroke({ color: DESIGN_TOKENS.colors.paperTan, width: 4 });
    this.g.rect(1246, 882, 290 * state.breakerResetProgress, 18).fill({ color: DESIGN_TOKENS.colors.phosphorGreen });

    this.readout.text = [
      `REACTOR ${state.nuclearOutputMW.toFixed(1)}MW -> ${state.nuclearTargetMW.toFixed(1)}MW TARGET`,
      `BOILER ${(state.thermalThrottle * 100).toFixed(0)}%  OUT ${state.thermalOutputMW.toFixed(1)}MW  HEAT ${(state.thermalHeat * 100).toFixed(0)}%`,
      `DAM ${state.waterDamMode.toUpperCase()}  OUT ${state.damOutputMW.toFixed(1)}MW  STORE ${state.storedWaterMWh.toFixed(1)}MWh`,
      `SOLAR ${state.solarOutputMW.toFixed(1)}MW  WIND ${state.windOutputMW.toFixed(1)}MW ${state.windEnabled ? "ON" : "OFF"}`,
      `LOAD ${state.currentDemandMW.toFixed(1)}MW / SUPPLY ${state.deliveredSupplyMW.toFixed(1)}MW`,
      `BALANCE ${(state.supplyDemandMismatch * 100).toFixed(1)}% ${state.balanceZone.toUpperCase()}  BREAKER ${state.breakerTimer.toFixed(1)}s`,
      `LOAD SHED: IMMEDIATE RELIEF, TRUST DOWNSIDE. RESET REQUIRES 2s HOLD.`,
    ].join("\n");
  }
}
