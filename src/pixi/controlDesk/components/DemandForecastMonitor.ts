import { Container, Graphics, Text } from "pixi.js";

import type { EventTracePoint } from "../../../gameplay/types";
import type { Point, Rect } from "../controlDeskLayout";

export type DemandForecastMonitorState = {
  eventTrace: EventTracePoint[];
  generationMW: number;
  currentDemandMW: number;
  safeBalanceBand: number;
};

export type DemandForecastMonitorDebugState = {
  plot: Rect;
  demandPoints: Point[];
  supplyPoint: Point;
  safeRange: { minY: number; maxY: number };
};

const SUPPLY_MARKER_RATIO = 0.14;

export class DemandForecastMonitor extends Container {
  private readonly frame = new Graphics({ label: "DemandForecastMonitorFrame" });
  private readonly plotLayer = new Graphics({ label: "DemandForecastMonitorPlot" });
  private readonly title: Text;
  private readonly labels: Text[] = [];
  private readonly plot: Rect;
  private debug?: DemandForecastMonitorDebugState;

  public constructor(private readonly bounds: Rect, fontFamily: string) {
    super({ label: "DemandForecastMonitor" });
    this.eventMode = "none";
    this.interactiveChildren = false;
    this.plot = {
      x: bounds.x + 30,
      y: bounds.y + 60,
      w: bounds.w - 60,
      h: bounds.h - 108,
    };
    this.title = new Text({
      text: "LOAD Forecast",
      style: {
        fontFamily,
        fontSize: 28,
        fill: 0xa8ff63,
        fontWeight: "700",
      },
    });
    this.title.anchor.set(0.5, 0);
    this.title.position.set(bounds.x + bounds.w / 2, bounds.y + 24);

    this.labels = [
      this.createLabel("NOW", bounds.x + 30, bounds.y + bounds.h - 34, fontFamily, "left"),
      this.createLabel("TIME", bounds.x + bounds.w / 2, bounds.y + bounds.h - 34, fontFamily, "center"),
      this.createLabel("+30s", bounds.x + bounds.w - 30, bounds.y + bounds.h - 34, fontFamily, "right"),
    ];
    this.addChild(this.frame, this.plotLayer, this.title, ...this.labels);
    this.drawFrame();
  }

  public update(state: DemandForecastMonitorState): void {
    const demandTrace = normalizeTrace(state.eventTrace, state.currentDemandMW);
    const safeMinMW = state.currentDemandMW * (1 - state.safeBalanceBand);
    const safeMaxMW = state.currentDemandMW * (1 + state.safeBalanceBand);
    const minMW = Math.min(...demandTrace.map((point) => point.demandMW), state.generationMW, safeMinMW);
    const maxMW = Math.max(...demandTrace.map((point) => point.demandMW), state.generationMW, safeMaxMW);
    const padding = Math.max(10, (maxMW - minMW) * 0.16);
    const scaleMin = minMW - padding;
    const scaleMax = maxMW + padding;
    const demandPoints = demandTrace.map((point) => ({
      x: this.plot.x + (point.timeOffsetSeconds / 30) * this.plot.w,
      y: this.yForMW(point.demandMW, scaleMin, scaleMax),
    }));
    const markerX = this.plot.x + this.plot.w * SUPPLY_MARKER_RATIO;
    const supplyPoint = { x: markerX, y: this.yForMW(state.generationMW, scaleMin, scaleMax) };
    const safeRange = {
      minY: this.yForMW(safeMinMW, scaleMin, scaleMax),
      maxY: this.yForMW(safeMaxMW, scaleMin, scaleMax),
    };

    this.drawPlot(demandPoints, supplyPoint, safeRange);
    this.debug = { plot: this.plot, demandPoints, supplyPoint, safeRange };
  }

  public debugState(): DemandForecastMonitorDebugState | undefined {
    return this.debug;
  }

  private drawFrame(): void {
    this.frame
      .clear()
      .rect(this.bounds.x + 12, this.bounds.y + 12, this.bounds.w - 24, this.bounds.h - 24)
      .fill({ color: 0x071007 })
      .stroke({ color: 0x0a0e08, width: 10 })
      .rect(this.bounds.x + 22, this.bounds.y + 24, this.bounds.w - 44, this.bounds.h - 48)
      .fill({ color: 0x18270f })
      .stroke({ color: 0x365c24, alpha: 0.75, width: 2 })
      .rect(this.plot.x, this.plot.y, this.plot.w, this.plot.h)
      .stroke({ color: 0xa8ff63, alpha: 0.82, width: 3 });
  }

  private drawPlot(demandPoints: Point[], supplyPoint: Point, safeRange: { minY: number; maxY: number }): void {
    this.plotLayer.clear();
    for (let index = 1; index <= 6; index += 1) {
      const x = this.plot.x + (this.plot.w / 6) * index;
      this.plotLayer.moveTo(x, this.plot.y).lineTo(x, this.plot.y + this.plot.h);
    }
    for (let index = 1; index <= 4; index += 1) {
      const y = this.plot.y + (this.plot.h / 4) * index;
      this.plotLayer.moveTo(this.plot.x, y).lineTo(this.plot.x + this.plot.w, y);
    }
    this.plotLayer.stroke({ color: 0x5ea040, alpha: 0.32, width: 2 });

    if (demandPoints.length > 0) {
      this.plotLayer.moveTo(demandPoints[0].x, demandPoints[0].y);
      for (const point of demandPoints.slice(1)) {
        this.plotLayer.lineTo(point.x, point.y);
      }
      this.plotLayer.stroke({ color: 0x58a2ff, alpha: 0.48, width: 8 });
      this.plotLayer.moveTo(demandPoints[0].x, demandPoints[0].y);
      for (const point of demandPoints.slice(1)) {
        this.plotLayer.lineTo(point.x, point.y);
      }
      this.plotLayer.stroke({ color: 0x93c7ff, width: 3 });
    }

    const rangeTop = Math.min(safeRange.minY, safeRange.maxY);
    const rangeBottom = Math.max(safeRange.minY, safeRange.maxY);
    this.plotLayer
      .moveTo(supplyPoint.x, rangeTop)
      .lineTo(supplyPoint.x, rangeBottom)
      .stroke({ color: 0xff352e, width: 4 })
      .circle(supplyPoint.x, supplyPoint.y, 7)
      .fill({ color: 0xff352e })
      .circle(supplyPoint.x, supplyPoint.y, 11)
      .stroke({ color: 0xffd4d0, width: 2 });
  }

  private yForMW(value: number, min: number, max: number): number {
    if (max <= min) {
      return this.plot.y + this.plot.h / 2;
    }
    const ratio = (value - min) / (max - min);
    return this.plot.y + this.plot.h - ratio * this.plot.h;
  }

  private createLabel(text: string, x: number, y: number, fontFamily: string, align: "left" | "center" | "right"): Text {
    const label = new Text({
      text,
      style: {
        fontFamily,
        fontSize: 18,
        fill: 0xa8ff63,
        fontWeight: "700",
        align,
      },
    });
    label.anchor.set(align === "left" ? 0 : align === "right" ? 1 : 0.5, 0);
    label.position.set(x, y);
    return label;
  }
}

function normalizeTrace(eventTrace: EventTracePoint[], fallbackDemandMW: number): EventTracePoint[] {
  const trace = eventTrace.length > 0 ? eventTrace : [fallbackTracePoint(0, fallbackDemandMW)];
  const points = trace
    .filter((point) => point.timeOffsetSeconds >= 0 && point.timeOffsetSeconds <= 30)
    .sort((a, b) => a.timeOffsetSeconds - b.timeOffsetSeconds);
  if (points.length === 0) {
    return [fallbackTracePoint(0, fallbackDemandMW)];
  }
  if (points[0].timeOffsetSeconds > 0) {
    points.unshift(fallbackTracePoint(0, fallbackDemandMW));
  }
  const last = points[points.length - 1];
  if (last.timeOffsetSeconds < 30) {
    points.push({ ...last, timeOffsetSeconds: 30 });
  }
  return points;
}

function fallbackTracePoint(timeOffsetSeconds: number, demandMW: number): EventTracePoint {
  return {
    timeOffsetSeconds,
    demandMW,
    renewableSupplyMW: 0,
    eventIntensity: 0,
  };
}
