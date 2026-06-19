import "./styles.css";
import { Application, Assets, Container, Graphics, Sprite } from "pixi.js";
import damNoWaterUrl from "../../assets/city/power/dam/dam_level_1.png?url";
import downstreamMaskUrl from "../../assets/city/power/dam/mask_3.png?url";
import upstreamSideMaskUrl from "../../assets/city/power/dam/mask_2.png?url";
import upstreamTopMaskUrl from "./generated/upstream_top_mask.png?url";

type Point = { x: number; y: number };

const DESIGN_WIDTH = 2730;
const DESIGN_HEIGHT = 1536;
const CYCLE_SECONDS = 54;
const UPSTREAM_SIDE_MASK_Y = -100;
const UPSTREAM_SIDE_MASK_HEIGHT = 200;

const mount = document.querySelector<HTMLElement>("#pixi-stage");
if (!mount) {
  throw new Error("Missing #pixi-stage mount");
}

const app = new Application();
await app.init({
  resizeTo: mount,
  background: "#b9ad93",
  antialias: false,
  autoDensity: true,
  resolution: Math.min(window.devicePixelRatio, 2),
});

mount.appendChild(app.canvas);

class AnimatedDamWater extends Container {
  private readonly upstream = new Container();
  private readonly upstreamTop = new Graphics();
  private readonly upstreamSide = new Graphics();
  private readonly upstreamTopMask: Sprite;
  private readonly upstreamSideMask: Sprite;
  private readonly downstream = new Container();
  private readonly downstreamWater = new Graphics();
  private readonly downstreamMask: Sprite;
  private readonly foam = new Graphics();
  private readonly light = new Graphics();
  private readonly dam: Sprite;
  private clock = 0;
  private wave = 0;
  private level = 0.82;
  private direction = 1;
  private manualUntil = 0;

  public constructor(
    dam: Sprite,
    masks: {
      upstreamTop: Sprite;
      upstreamSide: Sprite;
      downstream: Sprite;
    },
  ) {
    super();
    this.dam = dam;
    this.upstreamTopMask = masks.upstreamTop;
    this.upstreamSideMask = masks.upstreamSide;
    this.downstreamMask = masks.downstream;
    this.dam.width = DESIGN_WIDTH;
    this.dam.height = DESIGN_HEIGHT;
    fitMask(this.upstreamTopMask);
    fitMask(this.upstreamSideMask, UPSTREAM_SIDE_MASK_Y, UPSTREAM_SIDE_MASK_HEIGHT);
    fitMask(this.downstreamMask);
    this.upstreamTop.mask = this.upstreamTopMask;
    this.upstreamSide.mask = this.upstreamSideMask;
    this.downstream.mask = this.downstreamMask;
    this.upstream.addChild(this.upstreamTop, this.upstreamSide, this.upstreamTopMask, this.upstreamSideMask);
    this.downstream.addChild(this.downstreamWater, this.foam);
    this.addChild(this.upstream, this.downstream, this.downstreamMask, this.dam, this.light);
  }

  public setWaterLevel(level: number): void {
    this.level = clamp01(level);
    this.manualUntil = performance.now() + 2400;
    this.redraw();
  }

  public tick(deltaMS: number): void {
    const seconds = deltaMS / 1000;
    this.clock = wrap01(this.clock + seconds / CYCLE_SECONDS);
    this.wave += seconds;

    if (performance.now() > this.manualUntil) {
      this.level += this.direction * seconds * 0.026;
      if (this.level > 0.9) {
        this.level = 0.9;
        this.direction = -1;
      } else if (this.level < 0.18) {
        this.level = 0.18;
        this.direction = 1;
      }
    }

    this.redraw();
  }

  private redraw(): void {
    this.upstreamTop.clear();
    this.upstreamSide.clear();
    this.downstreamWater.clear();
    this.foam.clear();
    this.light.clear();

    const daylight = daylightAt(this.clock);
    const night = 1 - daylight;
    const waterDeep = mix(0x243f43, 0x10283a, night * 0.75);
    const waterMid = mix(0x5f8c8d, 0x2b5870, night * 0.72);
    const waterLine = mix(0xd1ece8, 0x86bfd3, night * 0.8);

    this.drawReservoir(waterDeep, waterMid, waterLine, daylight);
    this.drawDownstream(waterDeep, waterMid, waterLine, daylight);
    this.drawTimeOfDayLight(daylight, night);

    document.documentElement.dataset.experimentReady = "true";
    document.documentElement.dataset.waterLevel = this.level.toFixed(3);
    document.documentElement.dataset.timeOfDay = this.clock.toFixed(3);
  }

  private drawReservoir(deep: number, mid: number, line: number, daylight: number): void {
    const waterline = clamp01((this.level - 0.18) / 0.72);
    const topY = lerp(1030, 64, waterline);
    const topRightY = lerp(1110, 120, waterline);
    const sideY = lerp(970, 150, waterline);

    poly(this.upstreamTop, [
      p(-180, topY),
      p(DESIGN_WIDTH + 180, topRightY),
      p(DESIGN_WIDTH + 180, DESIGN_HEIGHT + 180),
      p(-180, DESIGN_HEIGHT + 180),
    ], deep, 0.95);
    poly(this.upstreamTop, [
      p(-180, topY + 92),
      p(DESIGN_WIDTH + 180, topRightY + 58),
      p(DESIGN_WIDTH + 180, DESIGN_HEIGHT + 180),
      p(-180, DESIGN_HEIGHT + 180),
    ], mid, 0.36 + daylight * 0.2);

    this.upstreamSide.rect(0, sideY, DESIGN_WIDTH, DESIGN_HEIGHT - sideY + 180).fill({
      color: shade(deep, -0.34),
      alpha: 0.98,
    });
    this.upstreamSide.rect(0, sideY + 72, DESIGN_WIDTH, DESIGN_HEIGHT - sideY + 108).fill({
      color: shade(mid, -0.22),
      alpha: 0.45 + daylight * 0.15,
    });

    this.drawWaterStreaks(this.upstreamTop, [
      [p(92, 772), p(560, 690)],
      [p(220, 642), p(820, 508)],
      [p(462, 522), p(1080, 366)],
      [p(702, 402), p(1324, 304)],
      [p(248, 864), p(780, 786)],
      [p(572, 746), p(1188, 612)],
    ], line, 0.34 + daylight * 0.28, 1);
  }

  private drawDownstream(deep: number, mid: number, line: number, daylight: number): void {
    const drain = this.direction < 0 ? 1 : 0.45;

    this.downstreamWater.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill({
      color: shade(deep, -0.03),
      alpha: 0.95,
    });
    poly(this.downstreamWater, [
      p(760, 950),
      p(1560, 808),
      p(2360, 940),
      p(2660, 1180),
      p(1900, 1460),
      p(760, 1280),
    ], mid, 0.42 + daylight * 0.18);

    this.drawWaterStreaks(this.downstreamWater, [
      [p(920, 1100), p(1420, 980)],
      [p(1240, 1220), p(1840, 1040)],
      [p(1620, 1320), p(2280, 1120)],
      [p(960, 1326), p(1580, 1240)],
      [p(1960, 1040), p(2560, 1150)],
      [p(820, 1190), p(1320, 1120)],
    ], line, 0.36 + daylight * 0.22, -1.35);

    for (let i = 0; i < 28; i += 1) {
      const x = 1258 + i * 19 + Math.sin(this.wave * 5.8 + i * 0.9) * 18;
      const y = 934 + Math.cos(this.wave * 4.6 + i) * 28 + (i % 7) * 14;
      this.foam.ellipse(x, y, 24 + (i % 5) * 7, 8 + (i % 4) * 3).fill({
        color: line,
        alpha: 0.12 + drain * 0.32,
      });
    }
  }

  private drawWaterStreaks(
    target: Graphics,
    lines: Array<[Point, Point]>,
    color: number,
    alpha: number,
    direction: number,
  ): void {
    for (let i = 0; i < lines.length; i += 1) {
      const [start, end] = lines[i];
      const drift = Math.sin(this.wave * (1.2 + i * 0.17) * direction + i * 1.6) * 38;
      target
        .moveTo(start.x + drift, start.y + drift * 0.12)
        .lineTo((start.x + end.x) / 2 + drift + 42, (start.y + end.y) / 2 - 12)
        .lineTo(end.x + drift, end.y + drift * 0.1)
        .stroke({ color, alpha, width: 5 });
    }
  }

  private drawTimeOfDayLight(daylight: number, night: number): void {
    const tint = night > 0.45 ? 0x162445 : 0xf2b35d;
    const alpha = night > 0.45 ? night * 0.2 : (1 - daylight) * 0.075;
    poly(this.light, [
      p(0, 0),
      p(DESIGN_WIDTH, 0),
      p(DESIGN_WIDTH, DESIGN_HEIGHT),
      p(0, DESIGN_HEIGHT),
    ], tint, alpha);

    if (night > 0.35) {
      for (let i = 0; i < 12; i += 1) {
        this.light.rect(1634 + i * 41, 622 + (i % 2) * 36, 18, 32).fill({
          color: 0xff765e,
          alpha: (night - 0.35) * 0.68,
        });
      }
    }
  }
}

function p(x: number, y: number): Point {
  return { x, y };
}

function poly(graphics: Graphics, points: Point[], color: number, alpha = 1): void {
  graphics.poly(points.flatMap((point) => [Math.round(point.x), Math.round(point.y)])).fill({ color, alpha });
}

function fitMask(mask: Sprite, y = 0, heightOffset = 0): void {
  mask.x = 0;
  mask.y = y;
  mask.width = DESIGN_WIDTH;
  mask.height = DESIGN_HEIGHT + heightOffset;
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

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}

const [damTexture, upstreamTopMaskTexture, upstreamSideMaskTexture, downstreamMaskTexture] = await Promise.all([
  Assets.load(damNoWaterUrl),
  Assets.load(upstreamTopMaskUrl),
  Assets.load(upstreamSideMaskUrl),
  Assets.load(downstreamMaskUrl),
]);
const scene = new AnimatedDamWater(new Sprite(damTexture), {
  upstreamTop: new Sprite(upstreamTopMaskTexture),
  upstreamSide: new Sprite(upstreamSideMaskTexture),
  downstream: new Sprite(downstreamMaskTexture),
});
app.stage.addChild(scene);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp") {
    scene.setWaterLevel(Number(document.documentElement.dataset.waterLevel ?? "0.62") + 0.06);
  } else if (event.key === "ArrowDown") {
    scene.setWaterLevel(Number(document.documentElement.dataset.waterLevel ?? "0.62") - 0.06);
  }
});

function resizeScene(): void {
  const scale = Math.min(app.screen.width / DESIGN_WIDTH, app.screen.height / DESIGN_HEIGHT);
  scene.scale.set(scale);
  scene.x = Math.round((app.screen.width - DESIGN_WIDTH * scale) / 2);
  scene.y = Math.round((app.screen.height - DESIGN_HEIGHT * scale) / 2);
}

scene.tick(0);
resizeScene();

app.ticker.add((ticker) => {
  scene.tick(ticker.deltaMS);
  resizeScene();
});

window.addEventListener("beforeunload", () => {
  app.destroy(true);
});
