import { Container, Graphics, Text } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";

import type { PlayerCommand, ProductionConsoleState, WaterDamMode } from "../../gameplay/types";
import type { AssetResolver } from "../assets";
import { DESIGN_TOKENS } from "../tokens";

type CommandSink = (command: PlayerCommand) => void;
type Rect = { x: number; y: number; w: number; h: number };

const PX = {
  black: 0x0c100d,
  dark: 0x121811,
  wall: 0x2d342b,
  desk: 0xbfb693,
  paper: 0xd4caa3,
  paperLight: 0xe5d9ad,
  screen: 0x142018,
  rail: 0x66705e,
  cream: 0xf4e8bd,
  red: DESIGN_TOKENS.colors.overloadRed,
  green: DESIGN_TOKENS.colors.phosphorGreen,
  amber: DESIGN_TOKENS.colors.amberWarn,
  cyan: DESIGN_TOKENS.colors.dataCyan,
};

function label(text: string, size = 18, color = PX.cream, align: "left" | "center" | "right" = "left"): Text {
  return new Text({
    text,
    style: {
      fontFamily: DESIGN_TOKENS.typography.labelFamily,
      fontSize: size,
      fill: color,
      fontWeight: "700",
      align,
      letterSpacing: 0,
    },
  });
}

function addLabel(parent: Container, text: string, x: number, y: number, size = 18, color = PX.cream, align: "left" | "center" | "right" = "left"): Text {
  const out = label(text, size, color, align);
  out.position.set(Math.round(x), Math.round(y));
  parent.addChild(out);
  return out;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class ProductionConsoleScreen extends Container {
  private readonly g = new Graphics();
  private readonly labels = new Container();
  private resetHeld = false;
  private draggingControl: "nuclear" | "thermal" | undefined;
  private lastTimeSeconds = 0;
  private latestState: ProductionConsoleState | undefined;

  public constructor(private readonly sink: CommandSink, _assets: AssetResolver) {
    super();
    this.addChild(this.g, this.labels);
    this.addControls();
  }

  public update(state: ProductionConsoleState): void {
    this.latestState = state;
    const dt = Math.max(0, state.timeSeconds - this.lastTimeSeconds);
    this.lastTimeSeconds = state.timeSeconds;
    if (this.resetHeld && state.breakerTrippedSeconds > 0 && dt > 0) {
      this.sink({ type: "holdBreakerReset", playerId: "player", seconds: dt });
    }

    this.draw(state);
  }

  private addControls(): void {
    this.addRotaryControl(280, 382, 150, "nuclear");
    this.addRotaryControl(728, 382, 132, "thermal");
    this.addHitZone({ x: 1046, y: 338, w: 116, h: 86 }, () => this.dam("fill"));
    this.addHitZone({ x: 1194, y: 338, w: 116, h: 86 }, () => this.dam("hold"));
    this.addHitZone({ x: 1342, y: 338, w: 126, h: 86 }, () => this.dam("drain"));
    this.addHitZone({ x: 182, y: 762, w: 164, h: 90 }, () => this.wind(true));
    this.addHitZone({ x: 374, y: 762, w: 164, h: 90 }, () => this.wind(false));

    const reset = this.addHitZone({ x: 1042, y: 762, w: 260, h: 86 }, () => undefined);
    reset.on("pointerdown", () => {
      this.resetHeld = this.latestState?.breakerResetRequired === true;
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
    const apply = (event: FederatedPointerEvent): void => this.turnRotary(cx, cy, control, event);
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
      const capacityMW = this.latestState?.nuclearCapacityMW ?? 70;
      this.sink({ type: "setNuclearTarget", playerId: "player", targetMW: Math.round((ratio * capacityMW) / 5) * 5 });
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

  private draw(state: ProductionConsoleState): void {
    this.labels.removeChildren();
    this.g.clear();
    this.drawRoom();
    this.drawHeader(state);
    this.drawPanel({ x: 58, y: 166, w: 438, h: 392 }, "REACTOR TARGET");
    this.drawPanel({ x: 528, y: 166, w: 420, h: 392 }, "BOILER THROTTLE");
    this.drawPanel({ x: 982, y: 166, w: 530, h: 392 }, "WATER DAM");
    this.drawPanel({ x: 1542, y: 166, w: 300, h: 392 }, "GRID STATUS");
    this.drawPanel({ x: 58, y: 610, w: 608, h: 338 }, "RENEWABLE ROUTING");
    this.drawPanel({ x: 704, y: 610, w: 808, h: 338 }, "EMERGENCY PANEL");
    this.drawPanel({ x: 1542, y: 610, w: 300, h: 338 }, "SUPPLY DELTA");

    this.drawRotary(280, 382, 108, state.nuclearTargetMW / Math.max(state.nuclearCapacityMW, 1), PX.green);
    this.drawValuePlate(
      130,
      506,
      300,
      `${state.nuclearTargetMW.toFixed(0)}/${state.nuclearCapacityMW.toFixed(0)}MW TARGET`,
      `${state.nuclearOutputMW.toFixed(0)}MW OUT / ${this.plantStateLabel(state.plantStates.nuclear)}`,
      state.plantStates.nuclear === "gridDown" ? PX.red : PX.green,
    );

    this.drawRotary(728, 382, 96, state.thermalThrottle, PX.amber);
    this.drawLever(842, 260, 210, state.thermalThrottle, state.thermalHeat);
    this.drawValuePlate(
      592,
      506,
      230,
      `${(state.thermalThrottle * 100).toFixed(0)}% / ${state.thermalCapacityMW.toFixed(0)}MW`,
      `${state.thermalOutputMW.toFixed(0)}MW OUT / ${this.plantStateLabel(state.plantStates.thermal)}`,
      state.plantStates.thermal === "gridDown" ? PX.red : PX.amber,
    );

    this.drawDamSwitches(1046, 338, state.waterDamMode);
    this.drawBar(1060, 474, 384, state.storedWaterMWh / Math.max(state.waterDamCapacityMWh, 1), PX.cyan);
    addLabel(this.labels, `STORE ${state.storedWaterMWh.toFixed(0)}/${state.waterDamCapacityMWh.toFixed(0)}MWh`, 1060, 502, 16, PX.black);
    addLabel(
      this.labels,
      `DAM ${state.damOutputMW.toFixed(0)}MW OUT / ${state.damAbsorbMW.toFixed(0)}MW FILL  ${this.plantStateLabel(state.plantStates.waterDam)}`,
      1042,
      536,
      13,
      PX.black,
    );

    this.drawRenewables(state);
    this.drawEmergency(state);
    this.drawStatus(state);
  }

  private drawRoom(): void {
    this.g.rect(0, 0, 1920, 1080).fill({ color: PX.dark });
    for (let x = 0; x < 1920; x += 96) {
      this.g.rect(x, 0, 2, 138).fill({ color: 0x31372f, alpha: 0.7 });
    }
    for (let y = 0; y < 138; y += 42) {
      this.g.rect(0, y, 1920, 2).fill({ color: 0x31372f, alpha: 0.7 });
    }
    this.g.rect(0, 138, 1920, 420).fill({ color: PX.wall }).rect(0, 558, 1920, 522).fill({ color: 0x222820 });
    this.g
      .moveTo(34, 1016)
      .lineTo(1816, 1016)
      .lineTo(1626, 570)
      .lineTo(230, 570)
      .closePath()
      .fill({ color: PX.desk })
      .stroke({ color: PX.black, width: 10 });
  }

  private drawHeader(state: ProductionConsoleState): void {
    addLabel(this.labels, "PRODUCTION CONSOLE", 48, 34, 34, PX.green);
    addLabel(
      this.labels,
      `REACTOR ${state.nuclearOutputMW.toFixed(1)}MW -> ${state.nuclearTargetMW.toFixed(1)}MW   BOILER ${(state.thermalThrottle * 100).toFixed(0)}%   DAM ${state.waterDamMode.toUpperCase()}   WIND ${state.windEnabled ? "ON" : "OFF"}   GRID ${state.isGridDown ? "DOWN" : "LIVE"}`,
      62,
      82,
      20,
      PX.cream,
    );
    addLabel(
      this.labels,
      `SUPPLY ${state.generationMW.toFixed(1)}MW / DEMAND ${state.currentDemandMW.toFixed(1)}MW   SUPPLY-LOAD ${this.formatSignedMw(state.generationMW - state.currentDemandMW)} (${this.formatSignedPercent(state.supplyDemandMismatch)})   RISK ${state.balanceBreakerTimer.toFixed(1)}s`,
      62,
      114,
      19,
      state.breakerResetRequired || state.balanceZone.includes("severe") ? PX.red : PX.cream,
    );
    addLabel(this.labels, state.breakerStatusText, 1126, 114, 17, state.breakerResetRequired ? PX.red : PX.green);
  }

  private drawPanel(bounds: Rect, title: string): void {
    this.g
      .rect(bounds.x, bounds.y, bounds.w, bounds.h)
      .fill({ color: PX.black })
      .rect(bounds.x + 8, bounds.y + 8, bounds.w - 16, bounds.h - 16)
      .fill({ color: PX.paper })
      .rect(bounds.x + 18, bounds.y + 18, bounds.w - 36, 40)
      .fill({ color: PX.screen })
      .rect(bounds.x + 20, bounds.y + bounds.h - 24, bounds.w - 40, 4)
      .fill({ color: 0x8a805c });
    addLabel(this.labels, title, bounds.x + 34, bounds.y + 28, 17, PX.green);
    for (const [x, y] of [
      [bounds.x + 18, bounds.y + 18],
      [bounds.x + bounds.w - 18, bounds.y + 18],
      [bounds.x + 18, bounds.y + bounds.h - 18],
      [bounds.x + bounds.w - 18, bounds.y + bounds.h - 18],
    ]) {
      this.g.rect(x - 5, y - 5, 10, 10).fill({ color: PX.black }).rect(x - 2, y - 2, 4, 4).fill({ color: 0x918869 });
    }
  }

  private drawRotary(cx: number, cy: number, radius: number, ratio: number, accent: number): void {
    const angle = -2.35 + clamp01(ratio) * 4.7;
    this.g.circle(cx, cy, radius + 28).fill({ color: 0x3a3d35 }).stroke({ color: PX.black, width: 8 });
    for (let tick = 0; tick <= 12; tick += 1) {
      const a = -2.35 + (tick / 12) * 4.7;
      const inner = radius + (tick % 3 === 0 ? 0 : 10);
      this.g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner).lineTo(cx + Math.cos(a) * (radius + 28), cy + Math.sin(a) * (radius + 28)).stroke({
        color: PX.black,
        width: tick % 3 === 0 ? 4 : 2,
      });
    }
    this.g.circle(cx, cy, radius).fill({ color: 0x20231e }).stroke({ color: 0xbeb28d, width: 8 });
    this.g.moveTo(cx, cy).lineTo(cx + Math.cos(angle) * (radius - 20), cy + Math.sin(angle) * (radius - 20)).stroke({ color: accent, width: 10 });
    this.g.rect(cx - 18, cy - 18, 36, 36).fill({ color: PX.black }).rect(cx - 7, cy - 7, 14, 14).fill({ color: accent });
  }

  private drawLever(x: number, y: number, h: number, ratio: number, heat: number): void {
    const knobY = y + h - clamp01(ratio) * h;
    this.g
      .rect(x, y, 42, h)
      .fill({ color: PX.screen })
      .stroke({ color: PX.black, width: 4 })
      .rect(x + 16, y + 16, 10, h - 32)
      .fill({ color: 0x7a715b })
      .rect(x - 44, knobY - 18, 130, 36)
      .fill({ color: PX.paperLight })
      .stroke({ color: PX.black, width: 4 })
      .rect(x + 82, y, 32, h)
      .fill({ color: PX.black })
      .rect(x + 82, y + h - h * clamp01(heat), 32, h * clamp01(heat))
      .fill({ color: heat > 0.85 ? PX.red : PX.amber });
  }

  private drawDamSwitches(x: number, y: number, active: WaterDamMode): void {
    const modes: WaterDamMode[] = ["fill", "hold", "drain"];
    modes.forEach((mode, index) => {
      const sx = x + index * 148;
      const isActive = mode === active;
      this.g
        .rect(sx, y, 116, 86)
        .fill({ color: isActive ? PX.screen : 0xb7ad88 })
        .stroke({ color: PX.black, width: 4 })
        .rect(sx + 42, y + (isActive ? 18 : 38), 32, 24)
        .fill({ color: isActive ? PX.green : 0x6b6048 })
        .stroke({ color: PX.black, width: 3 });
      addLabel(this.labels, mode.toUpperCase(), sx + 24, y + 98, 14, isActive ? PX.green : PX.black);
    });
  }

  private drawRenewables(state: ProductionConsoleState): void {
    this.g
      .rect(174, 728, 390, 94)
      .fill({ color: PX.screen })
      .stroke({ color: PX.black, width: 5 })
      .rect(202, 758, 132, 48)
      .fill({ color: state.windEnabled ? PX.green : 0x554338 })
      .stroke({ color: PX.black, width: 3 })
      .rect(386, 758, 132, 48)
      .fill({ color: state.windEnabled ? 0x554338 : PX.red })
      .stroke({ color: PX.black, width: 3 })
      .rect(state.windEnabled ? 244 : 430, 742, 58, 78)
      .fill({ color: PX.paperLight })
      .stroke({ color: PX.black, width: 4 });
    addLabel(this.labels, "WIND ON", 224, 772, 15, PX.black);
    addLabel(this.labels, "CUT OFF", 404, 772, 15, PX.black);
    this.drawBar(176, 854, 390, state.solarOutputMW / Math.max(state.solarPeakMW, 1), PX.amber);
    this.drawBar(176, 900, 390, state.windOutputMW / Math.max(state.windPeakMW, 1), state.windEnabled ? PX.green : DESIGN_TOKENS.colors.smokeGrey);
    addLabel(this.labels, `SOLAR ${state.solarOutputMW.toFixed(0)}/${state.solarPeakMW.toFixed(0)}MW ${this.plantStateLabel(state.plantStates.solar)}`, 176, 832, 16, PX.black);
    addLabel(this.labels, `WIND ${state.windOutputMW.toFixed(0)}/${state.windPeakMW.toFixed(0)}MW ${this.plantStateLabel(state.plantStates.wind)}`, 176, 878, 16, PX.black);
  }

  private drawEmergency(state: ProductionConsoleState): void {
    this.drawGuardedButton(1042, 762, 260, 86, "RESET HOLD", this.resetHeld, state.breakerResetRequired ? PX.green : DESIGN_TOKENS.colors.smokeGrey);
    this.drawBar(910, 882, 490, state.breakerResetProgress, PX.green);
    const resetLabel = state.breakerResetRequired
      ? state.canAffordBreakerReset
        ? `RESET COST ${state.breakerResetCost}`
        : `CASH SHORT ${state.breakerResetCost}`
      : state.gridShutdownReliefSeconds > 0
        ? `RELIEF ${state.gridShutdownReliefSeconds.toFixed(0)}s`
        : "RESET NOT NEEDED";
    addLabel(this.labels, resetLabel, 1058, 862, 15, state.breakerResetRequired ? PX.green : PX.black);
    addLabel(this.labels, state.breakerStatusText, 910, 918, 16, state.breakerResetRequired ? PX.red : PX.black);
  }

  private drawGuardedButton(x: number, y: number, w: number, h: number, text: string, active: boolean, color: number): void {
    this.g
      .rect(x, y, w, h)
      .fill({ color: PX.screen })
      .stroke({ color: PX.black, width: 5 })
      .rect(x + 26, y + 28 + (active ? 8 : 0), w - 52, h - 46)
      .fill({ color })
      .stroke({ color: PX.black, width: 4 });
    addLabel(this.labels, text, x + 34, y + 14, 15, PX.cream);
  }

  private drawStatus(state: ProductionConsoleState): void {
    const statusColor = state.balanceZone === "lock" ? PX.green : state.balanceZone.includes("severe") ? PX.red : PX.amber;
    this.g.circle(1692, 764, 70).fill({ color: statusColor }).stroke({ color: PX.black, width: 8 }).circle(1692, 764, 30).fill({ color: 0xffffff, alpha: 0.18 });
    addLabel(this.labels, state.isGridDown ? "GRID DOWN" : state.balanceZone === "lock" ? "0% MATCH" : state.balanceZone.toUpperCase(), 1602, 868, 16, PX.black);
    addLabel(this.labels, state.breakerLifecycle.toUpperCase(), 1596, 838, 14, state.breakerResetRequired ? PX.red : PX.black);
    addLabel(this.labels, `CAP ${(state.capacityUtilization * 100).toFixed(0)}%`, 1624, 902, 16, PX.black);
    addLabel(this.labels, `${state.currentContractLoadMW.toFixed(0)}/${state.contractCapacityBasisMW.toFixed(0)}MW`, 1604, 930, 14, PX.black);
  }

  private formatSignedMw(value: number): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}MW`;
  }

  private formatSignedPercent(value: number): string {
    const percent = value * 100;
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
  }

  private plantStateLabel(state: ProductionConsoleState["plantStates"][keyof ProductionConsoleState["plantStates"]]): string {
    return state === "gridDown" ? "GRID DOWN" : "ONLINE";
  }

  private drawValuePlate(x: number, y: number, w: number, title: string, sub: string, color: number): void {
    this.g.rect(x, y, w, 64).fill({ color: PX.screen }).stroke({ color: PX.black, width: 4 });
    addLabel(this.labels, title, x + 16, y + 12, 15, color);
    addLabel(this.labels, sub, x + 16, y + 36, 13, PX.cream);
  }

  private drawBar(x: number, y: number, w: number, ratio: number, color: number): void {
    this.g.rect(x, y, w, 24).fill({ color: PX.black }).rect(x + 5, y + 5, (w - 10) * clamp01(ratio), 14).fill({ color });
  }
}
