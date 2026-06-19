import { Container, Graphics, Sprite, type Texture } from "pixi.js";

export type DamWaterVisualState = {
  levelRatio: number;
  outputRatio: number;
  absorbRatio: number;
  rainActive: boolean;
  isGridDown: boolean;
  timeOfDayRatio: number;
};

export type DamWaterTextures = {
  upstreamTopMask: Texture;
  upstreamSideMask: Texture;
  downstreamMask: Texture;
};

const DESIGN_WIDTH = 2730;
const DESIGN_HEIGHT = 1536;
const UPSTREAM_SIDE_MASK_Y = -100;
const UPSTREAM_SIDE_MASK_HEIGHT = 200;

export class DamWaterObject extends Container {
  private readonly upstream = new Container({ label: "dam-water-upstream" });
  private readonly upstreamTop = new Graphics({ label: "dam-water-upstream-top" });
  private readonly upstreamSide = new Graphics({ label: "dam-water-upstream-side" });
  private readonly upstreamTopMask: Sprite;
  private readonly upstreamSideMask: Sprite;
  private readonly downstream = new Container({ label: "dam-water-downstream" });
  private readonly downstreamWater = new Graphics({ label: "dam-water-downstream-surface" });
  private readonly downstreamMask: Sprite;
  private readonly foam = new Graphics({ label: "dam-water-foam" });
  private readonly light = new Graphics({ label: "dam-water-light" });
  private waveSeconds = 0;
  private visualState: DamWaterVisualState = {
    levelRatio: 0,
    outputRatio: 0,
    absorbRatio: 0,
    rainActive: false,
    isGridDown: false,
    timeOfDayRatio: 0,
  };

  public constructor(textures: DamWaterTextures) {
    super({ label: "DamWaterObject" });
    this.eventMode = "none";
    this.interactiveChildren = false;
    this.pivot.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);

    this.upstreamTopMask = new Sprite({ texture: textures.upstreamTopMask, label: "dam-water-upstream-top-mask" });
    this.upstreamSideMask = new Sprite({ texture: textures.upstreamSideMask, label: "dam-water-upstream-side-mask" });
    this.downstreamMask = new Sprite({ texture: textures.downstreamMask, label: "dam-water-downstream-mask" });
    fitMask(this.upstreamTopMask);
    fitMask(this.upstreamSideMask, UPSTREAM_SIDE_MASK_Y, UPSTREAM_SIDE_MASK_HEIGHT);
    fitMask(this.downstreamMask);

    this.upstreamTop.mask = this.upstreamTopMask;
    this.upstreamSide.mask = this.upstreamSideMask;
    this.downstream.mask = this.downstreamMask;
    this.upstream.addChild(this.upstreamTop, this.upstreamSide, this.upstreamTopMask, this.upstreamSideMask);
    this.downstream.addChild(this.downstreamWater, this.foam);
    this.addChild(this.upstream, this.downstream, this.downstreamMask, this.light);
    this.render();
  }

  public setVisualState(state: DamWaterVisualState): void {
    this.visualState = {
      levelRatio: clamp01(state.levelRatio),
      outputRatio: clamp01(state.outputRatio),
      absorbRatio: clamp01(state.absorbRatio),
      rainActive: state.rainActive,
      isGridDown: state.isGridDown,
      timeOfDayRatio: clamp01(state.timeOfDayRatio),
    };
    this.render();
  }

  public tick(deltaMS: number): void {
    this.waveSeconds += Math.max(0, Math.min(deltaMS, 100)) / 1000;
    this.render();
  }

  public debugState(): DamWaterVisualState {
    return { ...this.visualState };
  }

  private render(): void {
    this.upstreamTop.clear();
    this.upstreamSide.clear();
    this.downstreamWater.clear();
    this.foam.clear();
    this.light.clear();

    const daylight = daylightAt(this.visualState.timeOfDayRatio);
    const night = 1 - daylight;
    const gridDim = this.visualState.isGridDown ? 0.42 : 1;
    const waterDeep = mix(0x243f43, 0x10283a, night * 0.75);
    const waterMid = mix(0x5f8c8d, 0x2b5870, night * 0.72);
    const waterLine = mix(0xd1ece8, 0x86bfd3, night * 0.8);

    this.renderReservoir(waterDeep, waterMid, waterLine, daylight, gridDim);
    this.renderDownstream(waterDeep, waterMid, waterLine, daylight, gridDim);
    this.renderLight(daylight, night);
  }

  private renderReservoir(deep: number, mid: number, line: number, daylight: number, gridDim: number): void {
    const visualLevel = 0.18 + this.visualState.levelRatio * 0.72;
    const waterline = clamp01((visualLevel - 0.18) / 0.72);
    const topY = lerp(1030, 64, waterline);
    const topRightY = lerp(1110, 120, waterline);
    const sideY = lerp(970, 150, waterline);
    const rainBoost = this.visualState.rainActive ? 0.16 : 0;
    const fillBoost = this.visualState.absorbRatio * 0.22;

    poly(this.upstreamTop, [
      p(-180, topY),
      p(DESIGN_WIDTH + 180, topRightY),
      p(DESIGN_WIDTH + 180, DESIGN_HEIGHT + 180),
      p(-180, DESIGN_HEIGHT + 180),
    ], deep, 0.95 * gridDim);
    poly(this.upstreamTop, [
      p(-180, topY + 92),
      p(DESIGN_WIDTH + 180, topRightY + 58),
      p(DESIGN_WIDTH + 180, DESIGN_HEIGHT + 180),
      p(-180, DESIGN_HEIGHT + 180),
    ], mid, (0.36 + daylight * 0.2 + fillBoost) * gridDim);

    this.upstreamSide.rect(0, sideY, DESIGN_WIDTH, DESIGN_HEIGHT - sideY + 180).fill({
      color: shade(deep, -0.34),
      alpha: 0.98 * gridDim,
    });
    this.upstreamSide.rect(0, sideY + 72, DESIGN_WIDTH, DESIGN_HEIGHT - sideY + 108).fill({
      color: shade(mid, -0.22),
      alpha: (0.45 + daylight * 0.15 + rainBoost) * gridDim,
    });

    this.renderWaterStreaks(this.upstreamTop, [
      [p(92, 772), p(560, 690)],
      [p(220, 642), p(820, 508)],
      [p(462, 522), p(1080, 366)],
      [p(702, 402), p(1324, 304)],
      [p(248, 864), p(780, 786)],
      [p(572, 746), p(1188, 612)],
    ], line, (0.22 + daylight * 0.2 + rainBoost + fillBoost) * gridDim, 1);
  }

  private renderDownstream(deep: number, mid: number, line: number, daylight: number, gridDim: number): void {
    const flow = Math.max(0.16, this.visualState.outputRatio);

    this.downstreamWater.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill({
      color: shade(deep, -0.03),
      alpha: 0.72 * gridDim,
    });
    poly(this.downstreamWater, [
      p(760, 950),
      p(1560, 808),
      p(2360, 940),
      p(2660, 1180),
      p(1900, 1460),
      p(760, 1280),
    ], mid, (0.34 + daylight * 0.16 + flow * 0.18) * gridDim);

    this.renderWaterStreaks(this.downstreamWater, [
      [p(920, 1100), p(1420, 980)],
      [p(1240, 1220), p(1840, 1040)],
      [p(1620, 1320), p(2280, 1120)],
      [p(960, 1326), p(1580, 1240)],
      [p(1960, 1040), p(2560, 1150)],
      [p(820, 1190), p(1320, 1120)],
    ], line, (0.2 + daylight * 0.16 + flow * 0.34) * gridDim, -1.35);

    for (let i = 0; i < 28; i += 1) {
      const x = 1258 + i * 19 + Math.sin(this.waveSeconds * 5.8 + i * 0.9) * (8 + flow * 18);
      const y = 934 + Math.cos(this.waveSeconds * 4.6 + i) * (8 + flow * 20) + (i % 7) * 14;
      this.foam.ellipse(x, y, 18 + flow * 18 + (i % 5) * 7, 6 + (i % 4) * 3).fill({
        color: line,
        alpha: (0.08 + flow * 0.34) * gridDim,
      });
    }
  }

  private renderWaterStreaks(
    target: Graphics,
    lines: Array<[{ x: number; y: number }, { x: number; y: number }]>,
    color: number,
    alpha: number,
    direction: number,
  ): void {
    for (let i = 0; i < lines.length; i += 1) {
      const [start, end] = lines[i];
      const drift = Math.sin(this.waveSeconds * (1.2 + i * 0.17) * direction + i * 1.6) * 38;
      target
        .moveTo(start.x + drift, start.y + drift * 0.12)
        .lineTo((start.x + end.x) / 2 + drift + 42, (start.y + end.y) / 2 - 12)
        .lineTo(end.x + drift, end.y + drift * 0.1)
        .stroke({ color, alpha, width: 5 });
    }
  }

  private renderLight(daylight: number, night: number): void {
    const tint = night > 0.45 ? 0x162445 : 0xf2b35d;
    const alpha = night > 0.45 ? night * 0.2 : (1 - daylight) * 0.075;
    poly(this.light, [p(0, 0), p(DESIGN_WIDTH, 0), p(DESIGN_WIDTH, DESIGN_HEIGHT), p(0, DESIGN_HEIGHT)], tint, alpha);
  }
}

function p(x: number, y: number): { x: number; y: number } {
  return { x, y };
}

function poly(graphics: Graphics, points: Array<{ x: number; y: number }>, color: number, alpha = 1): void {
  graphics.poly(points.flatMap((point) => [Math.round(point.x), Math.round(point.y)])).fill({ color, alpha });
}

function fitMask(mask: Sprite, y = 0, heightOffset = 0): void {
  mask.x = 0;
  mask.y = y;
  mask.width = DESIGN_WIDTH;
  mask.height = DESIGN_HEIGHT + heightOffset;
  mask.eventMode = "none";
}

function daylightAt(t: number): number {
  const noonDistance = Math.abs(t - 0.25);
  const nextNoonDistance = Math.abs(t - 1.25);
  return smoothstep(1 - Math.min(noonDistance, nextNoonDistance) / 0.48);
}

function shade(color: number, amount: number): number {
  return mix(color, amount >= 0 ? 0xffffff : 0x000000, Math.abs(amount));
}

function mix(start: number, end: number, t: number): number {
  const clamped = clamp01(t);
  const sr = (start >> 16) & 0xff;
  const sg = (start >> 8) & 0xff;
  const sb = start & 0xff;
  const er = (end >> 16) & 0xff;
  const eg = (end >> 8) & 0xff;
  const eb = end & 0xff;
  const r = Math.round(lerp(sr, er, clamped));
  const g = Math.round(lerp(sg, eg, clamped));
  const b = Math.round(lerp(sb, eb, clamped));
  return (r << 16) | (g << 8) | b;
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function smoothstep(t: number): number {
  const clamped = clamp01(t);
  return clamped * clamped * (3 - 2 * clamped);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
