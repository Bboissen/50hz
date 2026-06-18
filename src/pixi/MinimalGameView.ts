import { Container, Graphics, Text } from "pixi.js";

import type { DispatchConsoleState } from "../gameplay/types";

const COLORS = {
  background: 0x101711,
  panel: 0x1f2b22,
  panelLine: 0x3d4b36,
  phosphor: 0x8dfc7a,
  paper: 0xc8b982,
  amber: 0xffbd45,
  red: 0xe34b35,
  cyan: 0x6fcad1,
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function mw(value: number): string {
  return `${value.toFixed(1)} MW`;
}

export class MinimalGameView extends Container {
  private readonly background = new Graphics();
  private readonly pressure = new Graphics();
  private readonly title: Text;
  private readonly playerStats: Text;
  private readonly rivalStats: Text;
  private readonly gridStats: Text;
  private readonly alarm: Text;

  public constructor() {
    super();

    this.title = new Text({
      text: "50Hz",
      style: {
        fontFamily: "Georgia, serif",
        fontSize: 64,
        fontWeight: "700",
        fill: COLORS.phosphor,
      },
    });
    this.title.position.set(48, 34);

    this.playerStats = this.makeText(48, 138, 24, COLORS.paper);
    this.rivalStats = this.makeText(520, 138, 24, COLORS.paper);
    this.gridStats = this.makeText(48, 315, 22, COLORS.phosphor);
    this.alarm = this.makeText(520, 315, 28, COLORS.amber);

    this.addChild(this.background, this.pressure, this.title, this.playerStats, this.rivalStats, this.gridStats, this.alarm);
    this.drawFrame();
  }

  public update(state: DispatchConsoleState): void {
    this.playerStats.text = [
      "YOUR GRID",
      `EFFICIENCY ${pct(state.playerEfficiency)}`,
      `TARIFF ${state.playerTariffCents.toFixed(1)} c/kWh`,
      `TARGET SHARE ${pct(state.playerTargetMarketShare)}`,
      `SUBSCRIBED ${pct(state.playerSubscribedLoadShare)}`,
      `CASH ${state.cash.toFixed(1)}  SCORE ${state.score.toFixed(1)}`,
    ].join("\n");

    this.rivalStats.text = [
      "RIVAL GRID",
      `EFFICIENCY ${pct(state.rivalEfficiency)}`,
      `TARIFF ${state.rivalTariffCents.toFixed(1)} c/kWh`,
      "DETERMINISTIC BOT",
      `CITY DEMAND ${mw(state.cityDemandMW)}`,
      `EVENT ${state.activeEventLabel}`,
    ].join("\n");

    this.gridStats.text = [
      "GRID PRESSURE",
      `LOAD ${mw(state.currentDemandMW)} / SUPPLY ${mw(state.deliveredSupplyMW)}`,
      `CONTRACT ${mw(state.currentContractLoadMW)} / BASIS ${mw(state.contractCapacityBasisMW)}`,
      `CAPACITY ${pct(state.capacityUtilization)}  BALANCE ${pct(state.supplyDemandMismatch)}`,
      `BREAKER TIMER ${state.breakerTimer.toFixed(1)}s  STRIKES ${state.strikes}`,
    ].join("\n");

    const isBad = state.balanceZone !== "lock" || state.capacityZone === "tripRisk" || state.capacityZone === "trip";
    this.alarm.style.fill = isBad ? COLORS.red : COLORS.phosphor;
    this.alarm.text = isBad ? `ALARM: ${state.capacityZone.toUpperCase()} / ${state.balanceZone.toUpperCase()}` : "50HZ LOCK";
    this.drawPressure(state);
  }

  private makeText(x: number, y: number, fontSize: number, fill: number): Text {
    const text = new Text({
      text: "",
      style: {
        fontFamily: "Courier New, monospace",
        fontSize,
        fill,
        lineHeight: fontSize * 1.35,
      },
    });
    text.position.set(x, y);
    return text;
  }

  private drawFrame(): void {
    this.background
      .clear()
      .rect(0, 0, 960, 540)
      .fill({ color: COLORS.background })
      .roundRect(32, 28, 896, 484, 16)
      .fill({ color: COLORS.panel })
      .stroke({ color: COLORS.panelLine, width: 3 })
      .rect(48, 120, 390, 176)
      .stroke({ color: COLORS.phosphor, width: 2, alpha: 0.75 })
      .rect(504, 120, 376, 176)
      .stroke({ color: COLORS.cyan, width: 2, alpha: 0.7 })
      .rect(48, 302, 832, 160)
      .stroke({ color: COLORS.paper, width: 2, alpha: 0.65 });
  }

  private drawPressure(state: DispatchConsoleState): void {
    const normalized = Math.min(1.25, Math.abs(state.supplyDemandMismatch) / 0.2);
    const width = Math.min(420, 420 * normalized);
    const color = state.balanceZone === "lock" ? COLORS.phosphor : normalized > 0.75 ? COLORS.red : COLORS.amber;

    this.pressure
      .clear()
      .rect(520, 420, 420, 24)
      .fill({ color: 0x0a0f0b })
      .rect(520, 420, width, 24)
      .fill({ color })
      .rect(520 + 210 - 2, 414, 4, 36)
      .fill({ color: COLORS.paper });
  }
}
