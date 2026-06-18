import { Container, Graphics } from "pixi.js";

import type { EventTracePoint, ProductionConsoleState } from "../../../gameplay/types";
import type { Rect } from "../controlDeskLayout";

export class ForecastOscilloscope extends Container {
  private readonly graphics = new Graphics({ label: "forecast-oscilloscope-graphics" });
  private animationSeconds = 0;
  private latestState?: ProductionConsoleState;
  private features = {
    hasCurrentMarker: false,
    hasRangeBand: false,
    hasForecastCurve: false,
    hasScanAnimation: false,
  };

  public constructor(private readonly plot: Rect) {
    super({ label: "ForecastOscilloscope" });
    this.position.set(plot.x, plot.y);
    this.eventMode = "none";
    this.interactiveChildren = false;
    this.addChild(this.graphics);
  }

  public update(state: ProductionConsoleState): void {
    this.latestState = state;
    this.draw(state);
  }

  public animate(dt: number): void {
    if (!this.latestState) {
      return;
    }
    this.animationSeconds += Math.max(0, Math.min(dt, 0.1));
    this.draw(this.latestState);
  }

  public debugFeatures(): { hasCurrentMarker: boolean; hasRangeBand: boolean; hasForecastCurve: boolean; hasScanAnimation: boolean } {
    return { ...this.features };
  }

  public debugAnimationPhase(): number {
    return this.animationSeconds;
  }

  private draw(state: ProductionConsoleState): void {
    this.graphics.clear();
    this.features = { hasCurrentMarker: true, hasRangeBand: true, hasForecastCurve: state.eventTrace.length > 1, hasScanAnimation: true };
    const traceValues = state.eventTrace.map((point) => point.demandMW - point.renewableSupplyMW);
    const values = [...traceValues, state.currentDemandMW, state.generationMW];
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    this.graphics.rect(0, 0, this.plot.w, this.plot.h).fill({ color: 0x07170f, alpha: 0.16 });
    for (let x = 0; x <= this.plot.w; x += 64) {
      this.graphics.moveTo(x, 0).lineTo(x, this.plot.h).stroke({ color: 0x7fffa0, alpha: 0.12, width: 1 });
    }
    for (let y = 0; y <= this.plot.h; y += 44) {
      this.graphics.moveTo(0, y).lineTo(this.plot.w, y).stroke({ color: 0x7fffa0, alpha: 0.12, width: 1 });
    }

    const bandTop = this.yForValue(state.currentDemandMW * 1.1, minValue, maxValue);
    const bandBottom = this.yForValue(state.currentDemandMW * 0.9, minValue, maxValue);
    this.graphics
      .rect(0, Math.min(bandTop, bandBottom), this.plot.w, Math.abs(bandBottom - bandTop))
      .fill({ color: 0xff77b7, alpha: 0.18 });

    const markerX = Math.max(0, Math.min(this.plot.w, this.plot.w * 0.12));
    const markerY = this.yForValue(state.generationMW, minValue, maxValue);
    this.graphics
      .moveTo(markerX - 10, markerY - 10)
      .lineTo(markerX + 10, markerY + 10)
      .moveTo(markerX + 10, markerY - 10)
      .lineTo(markerX - 10, markerY + 10)
      .stroke({ color: 0xff4b55, alpha: 0.95, width: 3 });

    this.drawForecastCurve(state.eventTrace, minValue, maxValue);
    this.drawScanAnimation();
  }

  private drawForecastCurve(trace: EventTracePoint[], minValue: number, maxValue: number): void {
    if (trace.length < 2) {
      return;
    }

    const maxOffset = Math.max(...trace.map((point) => point.timeOffsetSeconds), 1);
    trace.forEach((point, index) => {
      const x = point.timeOffsetSeconds / maxOffset * this.plot.w;
      const y = this.yForValue(point.demandMW - point.renewableSupplyMW, minValue, maxValue);
      if (index === 0) {
        this.graphics.moveTo(x, y);
      } else {
        this.graphics.lineTo(x, y);
      }
    });
    this.graphics.stroke({ color: 0x79ff82, alpha: 0.9, width: 3 });
  }

  private drawScanAnimation(): void {
    const scanX = this.animationSeconds * 92 % this.plot.w;
    const pulse = 0.45 + Math.sin(this.animationSeconds * Math.PI * 2) * 0.18;
    this.graphics
      .rect(Math.max(0, scanX - 8), 0, 16, this.plot.h)
      .fill({ color: 0x8fffd7, alpha: 0.1 + pulse * 0.12 })
      .moveTo(scanX, 0)
      .lineTo(scanX, this.plot.h)
      .stroke({ color: 0xa6ffd2, alpha: 0.35 + pulse * 0.28, width: 2 });
    this.graphics
      .rect(0, Math.max(0, this.plot.h * 0.16 + Math.sin(this.animationSeconds * 4.2) * 6), this.plot.w, 2)
      .fill({ color: 0x9cff88, alpha: 0.18 });
  }

  private yForValue(valueMW: number, minValue: number, maxValue: number): number {
    const padding = Math.max(8, (maxValue - minValue) * 0.12);
    const low = minValue - padding;
    const high = maxValue + padding;
    const range = Math.max(1, high - low);
    const normalized = Math.max(0, Math.min(1, (valueMW - low) / range));
    return this.plot.h - normalized * this.plot.h;
  }
}
