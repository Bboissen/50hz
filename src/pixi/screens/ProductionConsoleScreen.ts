import { Container, Graphics, Sprite, Text } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";

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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class ProductionConsoleScreen extends Container {
  private readonly g = new Graphics();
  private readonly assetLayer = new Container();
  private readonly readout = label("", 64, 74, 24);
  private resetHeld = false;
  private shedPressedUntil = 0;
  private draggingControl: "nuclear" | "thermal" | undefined;
  private lastTimeSeconds = 0;

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
    this.addControls();
  }

  public update(state: ProductionConsoleState): void {
    const dt = Math.max(0, state.timeSeconds - this.lastTimeSeconds);
    this.lastTimeSeconds = state.timeSeconds;
    if (this.resetHeld && state.breakerTrippedSeconds > 0 && dt > 0) {
      this.sink({ type: "holdBreakerReset", playerId: "player", seconds: dt });
    }

    this.draw(state);
  }

  private addControls(): void {
    this.addRotaryControl(282, 312, 130, "nuclear");
    this.addRotaryControl(754, 312, 118, "thermal");
    this.addHitZone({ x: 1064, y: 334, w: 110, h: 82 }, () => this.dam("fill"));
    this.addHitZone({ x: 1196, y: 334, w: 110, h: 82 }, () => this.dam("hold"));
    this.addHitZone({ x: 1328, y: 334, w: 126, h: 82 }, () => this.dam("drain"));
    this.addHitZone({ x: 168, y: 790, w: 164, h: 86 }, () => this.wind(true));
    this.addHitZone({ x: 354, y: 790, w: 164, h: 86 }, () => this.wind(false));
    this.addHitZone({ x: 1166, y: 782, w: 210, h: 82 }, () => {
      this.shedPressedUntil = this.lastTimeSeconds + 0.28;
      this.sink({ type: "shedLoad", playerId: "player" });
    });

    const reset = this.addHitZone({ x: 1410, y: 782, w: 156, h: 82 }, () => undefined);
    reset.on("pointerdown", () => {
      this.resetHeld = true;
    });
    reset.on("pointerup", () => {
      this.resetHeld = false;
    });
    reset.on("pointerupoutside", () => {
      this.resetHeld = false;
    });
  }

  private addHitZone(bounds: Rect, onTap: () => void): Container {
    const root = new Container();
    root.eventMode = "static";
    root.cursor = "pointer";
    root.on("pointertap", onTap);
    root.addChild(new Graphics().rect(bounds.x, bounds.y, bounds.w, bounds.h).fill({ color: 0xffffff, alpha: 0.001 }));
    this.addChild(root);
    return root;
  }

  private addRotaryControl(cx: number, cy: number, radius: number, control: "nuclear" | "thermal"): void {
    const root = new Container();
    const apply = (event: FederatedPointerEvent): void => {
      this.turnRotary(cx, cy, control, event);
    };
    root.eventMode = "static";
    root.cursor = "grab";
    root.on("pointerdown", (event: FederatedPointerEvent) => {
      this.draggingControl = control;
      root.cursor = "grabbing";
      apply(event);
    });
    root.on("globalpointermove", (event: FederatedPointerEvent) => {
      if (this.draggingControl === control) {
        apply(event);
      }
    });
    const stop = (): void => {
      if (this.draggingControl === control) {
        this.draggingControl = undefined;
        root.cursor = "grab";
      }
    };
    root.on("pointerup", stop);
    root.on("pointerupoutside", stop);
    root.addChild(new Graphics().circle(cx, cy, radius).fill({ color: 0xffffff, alpha: 0.001 }));
    this.addChild(root);
  }

  private turnRotary(cx: number, cy: number, control: "nuclear" | "thermal", event: FederatedPointerEvent): void {
    const angle = Math.atan2(event.global.y - cy, event.global.x - cx);
    const ratio = clamp01((angle + 2.35) / 4.7);
    if (control === "nuclear") {
      this.sink({ type: "setNuclearTarget", playerId: "player", targetMW: Math.round((ratio * 70) / 5) * 5 });
      return;
    }
    this.sink({ type: "setThermalThrottle", playerId: "player", throttle: Math.round(ratio * 20) / 20 });
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

  private drawDeskPanel(bounds: Rect, title: string): void {
    this.g
      .roundRect(bounds.x, bounds.y, bounds.w, bounds.h, 10)
      .fill({ color: 0xc9bea0 })
      .stroke({ color: DESIGN_TOKENS.colors.inkBlack, width: 7 })
      .roundRect(bounds.x + 12, bounds.y + 12, bounds.w - 24, bounds.h - 24, 8)
      .fill({ color: 0xd8cfb4 })
      .stroke({ color: 0x8e835f, width: 3 })
      .rect(bounds.x + 24, bounds.y + 24, bounds.w - 48, 32)
      .fill({ color: 0x2d3328 });
    this.drawTinyScrews(bounds);
    this.drawTextPlate(title, bounds.x + 34, bounds.y + 31, 16);
    this.drawSevenSegmentText(title, bounds.x + 34, bounds.y + 31, DESIGN_TOKENS.colors.phosphorGreen, 16);
  }

  private drawTextPlate(text: string, x: number, y: number, size: number): void {
    const plateW = Math.max(86, text.length * size * 0.62);
    this.g.roundRect(x - 8, y - 4, plateW, size + 12, 3).fill({ color: 0x141711, alpha: 0.82 }).stroke({ color: 0x050605, width: 2 });
  }

  private drawTinyScrews(bounds: Rect): void {
    for (const [x, y] of [
      [bounds.x + 22, bounds.y + 22],
      [bounds.x + bounds.w - 22, bounds.y + 22],
      [bounds.x + 22, bounds.y + bounds.h - 22],
      [bounds.x + bounds.w - 22, bounds.y + bounds.h - 22],
    ]) {
      this.g.circle(x, y, 5).fill({ color: 0x252525 }).circle(x - 1, y - 1, 2).fill({ color: 0xb7aa84 });
    }
  }

  private drawWallMeters(x: number, y: number, cols: number, rows: number, alertRatio: number): void {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cx = x + col * 42;
        const cy = y + row * 36;
        const hot = (row * cols + col) / (cols * rows) < alertRatio;
        this.g
          .circle(cx, cy, 13)
          .fill({ color: 0xe6dbc1 })
          .stroke({ color: 0x1b1a16, width: 3 })
          .moveTo(cx, cy)
          .lineTo(cx + Math.cos(-1.2 + ((row + col) % 6) * 0.42) * 9, cy + Math.sin(-1.2 + ((row + col) % 6) * 0.42) * 9)
          .stroke({ color: hot ? DESIGN_TOKENS.colors.overloadRed : 0x1b1a16, width: 2 })
          .rect(cx + 18, cy - 6, 14, 12)
          .fill({ color: hot ? DESIGN_TOKENS.colors.amberWarn : 0x3d4832 })
          .stroke({ color: 0x1b1a16, width: 1 });
      }
    }
  }

  private drawRotary(cx: number, cy: number, radius: number, ratio: number, title: string, sublabel: string, accent: number): void {
    const angle = -2.35 + clamp01(ratio) * 4.7;
    this.g
      .circle(cx, cy, radius + 18)
      .fill({ color: 0x3a3d35 })
      .stroke({ color: 0x11120f, width: 7 });

    for (let tick = 0; tick <= 12; tick += 1) {
      const tickAngle = -2.35 + (tick / 12) * 4.7;
      const inner = radius + (tick % 3 === 0 ? 0 : 8);
      const outer = radius + 20;
      this.g.moveTo(cx + Math.cos(tickAngle) * inner, cy + Math.sin(tickAngle) * inner).lineTo(cx + Math.cos(tickAngle) * outer, cy + Math.sin(tickAngle) * outer).stroke({
        color: 0x151610,
        width: tick % 3 === 0 ? 4 : 2,
      });
    }

    this.g
      .circle(cx, cy, radius)
      .fill({ color: 0x20231e })
      .stroke({ color: 0xbeb28d, width: 8 })
      .circle(cx - 16, cy - 18, radius * 0.28)
      .fill({ color: 0xffffff, alpha: 0.08 })
      .moveTo(cx, cy)
      .lineTo(cx + Math.cos(angle) * (radius - 18), cy + Math.sin(angle) * (radius - 18))
      .stroke({ color: accent, width: 9 })
      .circle(cx, cy, 18)
      .fill({ color: 0x0e100d })
      .stroke({ color: accent, width: 3 });

    this.g.roundRect(cx - 116, cy + radius + 30, 232, 44, 4).fill({ color: 0x10130e }).stroke({ color: 0x0a0a08, width: 2 });
    this.drawSevenSegmentText(title, cx - 98, cy + radius + 41, accent, 17);
    this.drawSevenSegmentText(sublabel, cx - 98, cy + radius + 64, 0xe7d7a9, 12);
  }

  private drawLever(x: number, y: number, h: number, ratio: number, heat: number): void {
    const knobY = y + h - clamp01(ratio) * h;
    this.g
      .roundRect(x, y, 40, h, 8)
      .fill({ color: 0x151711 })
      .stroke({ color: 0x080906, width: 3 })
      .rect(x + 15, y + 14, 10, h - 28)
      .fill({ color: 0x6d6b5a })
      .roundRect(x - 46, knobY - 18, 132, 36, 8)
      .fill({ color: 0xd8c99f })
      .stroke({ color: 0x11120e, width: 4 })
      .rect(x + 82, y, 34, h)
      .fill({ color: 0x11120e })
      .rect(x + 82, y + h - h * clamp01(heat), 34, h * clamp01(heat))
      .fill({ color: heat > 0.85 ? DESIGN_TOKENS.colors.overloadRed : DESIGN_TOKENS.colors.amberWarn })
      .stroke({ color: 0x0a0a08, width: 2 });
  }

  private drawThreePositionSwitch(x: number, y: number, active: WaterDamMode): void {
    const modes: WaterDamMode[] = ["fill", "hold", "drain"];
    modes.forEach((mode, index) => {
      const sx = x + index * 132;
      const isActive = mode === active;
      this.g
        .roundRect(sx, y, 108, 66, 6)
        .fill({ color: isActive ? 0x24281f : 0xb9ad8a })
        .stroke({ color: 0x11120e, width: 4 })
        .roundRect(sx + 38, y + (isActive ? 12 : 30), 32, 24, 4)
        .fill({ color: isActive ? DESIGN_TOKENS.colors.phosphorGreen : 0x6b6048 })
        .stroke({ color: 0x11120e, width: 3 });
      this.drawSevenSegmentText(mode.toUpperCase(), sx + 18, y + 74, isActive ? DESIGN_TOKENS.colors.phosphorGreen : DESIGN_TOKENS.colors.inkBlack, 13);
    });
  }

  private drawToggle(x: number, y: number, on: boolean, leftLabel: string, rightLabel: string): void {
    this.g
      .roundRect(x, y, 350, 92, 8)
      .fill({ color: 0x252820 })
      .stroke({ color: 0x0b0c09, width: 5 })
      .roundRect(x + 24, y + 22, 132, 48, 5)
      .fill({ color: on ? DESIGN_TOKENS.colors.phosphorGreen : 0x554338 })
      .stroke({ color: 0x0b0c09, width: 3 })
      .roundRect(x + 194, y + 22, 132, 48, 5)
      .fill({ color: on ? 0x554338 : DESIGN_TOKENS.colors.overloadRed })
      .stroke({ color: 0x0b0c09, width: 3 })
      .roundRect(x + (on ? 76 : 246), y + 8, 58, 76, 8)
      .fill({ color: 0xd8c99f })
      .stroke({ color: 0x11120e, width: 4 });
    this.drawSevenSegmentText(leftLabel, x + 58, y + 38, 0x11120e, 15);
    this.drawSevenSegmentText(rightLabel, x + 220, y + 38, 0x11120e, 15);
  }

  private drawGuardedButton(x: number, y: number, w: number, h: number, labelText: string, active: boolean, color: number): void {
    this.g
      .roundRect(x, y, w, h, 8)
      .fill({ color: active ? 0x33201c : 0x151711 })
      .stroke({ color: 0x0b0c09, width: 5 })
      .rect(x + 12, y + 8, w - 24, 16)
      .fill({ color: 0xf0d186, alpha: 0.34 })
      .roundRect(x + 30, y + 28 + (active ? 8 : 0), w - 60, h - 44, 8)
      .fill({ color })
      .stroke({ color: 0x0b0c09, width: 4 });
    this.drawSevenSegmentText(labelText, x + 28, y + h + 12, color, 14);
  }

  private drawMiniGauge(x: number, y: number, w: number, ratio: number, color: number): void {
    this.g
      .roundRect(x, y, w, 22, 4)
      .fill({ color: 0x11120e })
      .stroke({ color: 0x0a0a08, width: 2 })
      .rect(x + 4, y + 4, (w - 8) * clamp01(ratio), 14)
      .fill({ color });
  }

  private drawSevenSegmentText(text: string, x: number, y: number, color: number, size: number): void {
    const t = label(text, x, y, size, color);
    this.g.addChild(t);
  }

  private draw(state: ProductionConsoleState): void {
    this.g.removeChildren();
    this.g.clear().rect(0, 0, 1920, 1080).fill({ color: 0x141713 });
    for (let x = 0; x < 1920; x += 96) {
      this.g.rect(x, 0, 2, 122).fill({ color: 0x30322c, alpha: 0.6 });
    }
    for (let y = 0; y < 132; y += 42) {
      this.g.rect(0, y, 1920, 2).fill({ color: 0x30322c, alpha: 0.6 });
    }
    this.g
      .rect(0, 118, 1920, 390)
      .fill({ color: 0x373a31 })
      .rect(0, 508, 1920, 572)
      .fill({ color: 0x282a24 })
      .moveTo(28, 1020)
      .lineTo(1860, 1020)
      .lineTo(1680, 566)
      .lineTo(180, 566)
      .closePath()
      .fill({ color: 0xbdb396 })
      .stroke({ color: 0x10110d, width: 10 })
      .moveTo(180, 566)
      .lineTo(1680, 566)
      .lineTo(1626, 510)
      .lineTo(230, 510)
      .closePath()
      .fill({ color: 0xd7cfb7 })
      .stroke({ color: 0x10110d, width: 6 });

    this.drawPanel({ x: 52, y: 146, w: 384, h: 284 });
    this.drawPanel({ x: 468, y: 146, w: 384, h: 284 });
    this.drawPanel({ x: 884, y: 146, w: 384, h: 284 });
    this.drawPanel({ x: 1300, y: 146, w: 542, h: 284 });
    this.drawWallMeters(1348, 194, 9, 5, clamp01(Math.abs(state.supplyDemandMismatch) * 2.4));

    this.drawDeskPanel({ x: 70, y: 590, w: 440, h: 362 }, "REACTOR TARGET");
    this.drawDeskPanel({ x: 540, y: 590, w: 380, h: 362 }, "BOILER THROTTLE");
    this.drawDeskPanel({ x: 950, y: 590, w: 560, h: 362 }, "DAM + EMERGENCY");
    this.drawDeskPanel({ x: 1540, y: 590, w: 300, h: 362 }, "GRID STATUS");

    this.drawRotary(282, 752, 86, state.nuclearTargetMW / 70, `${state.nuclearTargetMW.toFixed(0)}MW TARGET`, `${state.nuclearOutputMW.toFixed(0)}MW ACTUAL`, DESIGN_TOKENS.colors.phosphorGreen);
    this.drawMiniGauge(124, 890, 314, state.nuclearOutputMW / Math.max(state.nuclearTargetMW, 1), DESIGN_TOKENS.colors.phosphorGreen);
    this.drawRotary(754, 752, 76, state.thermalThrottle, `${(state.thermalThrottle * 100).toFixed(0)}% THROTTLE`, `${state.thermalOutputMW.toFixed(0)}MW OUT`, DESIGN_TOKENS.colors.amberWarn);
    this.drawLever(862, 660, 208, state.thermalThrottle, state.thermalHeat);
    this.drawMiniGauge(610, 890, 220, state.thermalHeat, state.thermalHeat > 0.85 ? DESIGN_TOKENS.colors.overloadRed : DESIGN_TOKENS.colors.amberWarn);

    this.drawThreePositionSwitch(1038, 682, state.waterDamMode);
    this.drawMiniGauge(1052, 826, 392, state.storedWaterMWh / Math.max(state.waterDamCapacityMWh, 1), DESIGN_TOKENS.colors.dataCyan);
    this.drawGuardedButton(1158, 858, 210, 58, "LOAD SHED", this.shedPressedUntil > state.timeSeconds, DESIGN_TOKENS.colors.overloadRed);
    this.drawGuardedButton(1412, 858, 156, 58, "RESET HOLD", this.resetHeld, DESIGN_TOKENS.colors.phosphorGreen);
    this.drawMiniGauge(1246, 936, 290, state.breakerResetProgress, DESIGN_TOKENS.colors.phosphorGreen);

    this.drawToggle(168, 790, state.windEnabled, "WIND ON", "CUT OFF");
    this.drawMiniGauge(552, 826, 294, state.solarOutputMW / 25, DESIGN_TOKENS.colors.amberWarn);
    this.drawMiniGauge(552, 872, 294, state.windOutputMW / 25, state.windEnabled ? DESIGN_TOKENS.colors.phosphorGreen : DESIGN_TOKENS.colors.smokeGrey);

    const statusColor = state.balanceZone === "lock" ? DESIGN_TOKENS.colors.phosphorGreen : state.balanceZone.includes("severe") ? DESIGN_TOKENS.colors.overloadRed : DESIGN_TOKENS.colors.amberWarn;
    this.g
      .circle(1690, 722, 58)
      .fill({ color: statusColor })
      .stroke({ color: 0x11120e, width: 6 })
      .circle(1690, 722, 24)
      .fill({ color: 0xffffff, alpha: 0.18 });

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
