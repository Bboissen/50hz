import "./styles.css";
import { Application, Assets, Container, Graphics, Sprite, Texture } from "pixi.js";
import windLevel3Url from "../../assets/city/power/wind/wind_level_3.png?url";
import turbine1Url from "../../assets/city/power/wind/turbine_1.png?url";
import turbine2Url from "../../assets/city/power/wind/turbine_2.png?url";
import turbine3Url from "../../assets/city/power/wind/turbine_3.png?url";
import turbine4Url from "../../assets/city/power/wind/turbine_4.png?url";
import turbine5Url from "../../assets/city/power/wind/turbine_5.png?url";
import turbine6Url from "../../assets/city/power/wind/turbine_6.png?url";
import turbine7Url from "../../assets/city/power/wind/turbine_7.png?url";
import turbine8Url from "../../assets/city/power/wind/turbine_8.png?url";

type Point = { x: number; y: number };

type TurbineMount = Point & {
  scale: number;
  phase: number;
};

const DESIGN_WIDTH = 1430;
const DESIGN_HEIGHT = 826;
const BASE_FPS = 10;

const TURBINE_FRAME_URLS = [
  turbine1Url,
  turbine2Url,
  turbine3Url,
  turbine4Url,
  turbine5Url,
  turbine6Url,
  turbine7Url,
  turbine8Url,
] as const;

const TURBINE_ROTOR_ANCHOR = {
  x: 126 / 250,
  y: 132 / 250,
};

const TURBINE_MOUNTS: TurbineMount[] = [
  { x: 421, y: 178, scale: 0.72, phase: 0 },
  { x: 693, y: 43, scale: 0.7, phase: 2 },
  { x: 984, y: 179, scale: 0.72, phase: 4 },
  { x: 718, y: 339, scale: 0.86, phase: 6 },
];

const mount = document.querySelector<HTMLElement>("#pixi-stage");
if (!mount) {
  throw new Error("Missing #pixi-stage mount");
}

const searchParams = new URLSearchParams(window.location.search);
const app = new Application();
await app.init({
  resizeTo: mount,
  background: "#14150f",
  antialias: false,
  autoDensity: true,
  resolution: Math.min(window.devicePixelRatio, 2),
});

mount.appendChild(app.canvas);

class AnimatedTurbine extends Container {
  private readonly current: Sprite;
  private readonly next: Sprite;
  private frameIndex = 0;
  private blend = 0;

  public constructor(
    private readonly frames: Texture[],
    mountPoint: TurbineMount,
  ) {
    super({ label: "animated-turbine" });
    this.position.set(mountPoint.x, mountPoint.y);
    this.scale.set(mountPoint.scale);
    this.frameIndex = mountPoint.phase % frames.length;

    this.current = new Sprite({ texture: frames[this.frameIndex], label: "turbine-current-frame" });
    this.next = new Sprite({ texture: frames[(this.frameIndex + 1) % frames.length], label: "turbine-next-frame" });
    for (const sprite of [this.current, this.next]) {
      sprite.anchor.set(TURBINE_ROTOR_ANCHOR.x, TURBINE_ROTOR_ANCHOR.y);
      sprite.eventMode = "none";
    }
    this.addChild(this.current, this.next);
  }

  public update(framePosition: number, smooth: boolean): void {
    const wrapped = positiveModulo(framePosition, this.frames.length);
    const nextFrameIndex = Math.floor(wrapped);
    this.blend = wrapped - nextFrameIndex;

    if (nextFrameIndex !== this.frameIndex) {
      this.frameIndex = nextFrameIndex;
      this.current.texture = this.frames[this.frameIndex];
      this.next.texture = this.frames[(this.frameIndex + 1) % this.frames.length];
    }

    this.current.alpha = smooth ? 1 - this.blend : 1;
    this.next.alpha = smooth ? this.blend : 0;
  }

  public debugFrameIndex(): number {
    return this.frameIndex;
  }
}

class AnimatedTurbineField extends Container {
  private readonly world = new Container({ label: "wind-level-3-world" });
  private readonly map: Sprite;
  private readonly turbines: AnimatedTurbine[];
  private readonly debugLayer = new Graphics();
  private clockFrames = 0;
  private speed = 1;
  private paused = false;
  private smooth = false;
  private showDebug = false;

  public constructor(mapTexture: Texture, turbineFrames: Texture[]) {
    super({ label: "animated-turbine-field" });
    this.map = new Sprite({ texture: mapTexture, label: "wind-level-3-map" });
    this.map.width = DESIGN_WIDTH;
    this.map.height = DESIGN_HEIGHT;
    this.map.eventMode = "none";
    this.turbines = TURBINE_MOUNTS.map((mountPoint) => new AnimatedTurbine(turbineFrames, mountPoint));
    this.world.addChild(this.map, ...this.turbines, this.debugLayer);
    this.addChild(this.world);
    this.setSmooth(searchParams.get("smooth") === "1");
    this.syncDocumentState();
  }

  public resize(width: number, height: number): void {
    const padding = 56;
    const scale = Math.min((width - padding * 2) / DESIGN_WIDTH, (height - padding * 2) / DESIGN_HEIGHT);
    this.world.scale.set(Math.max(0.05, scale));
    this.world.position.set(
      Math.round((width - DESIGN_WIDTH * this.world.scale.x) / 2),
      Math.round((height - DESIGN_HEIGHT * this.world.scale.y) / 2),
    );
  }

  public tick(deltaMS: number): void {
    if (!this.paused) {
      this.clockFrames += (deltaMS / 1000) * BASE_FPS * this.speed;
    }
    for (const [index, turbine] of this.turbines.entries()) {
      turbine.update(this.clockFrames + TURBINE_MOUNTS[index].phase, this.smooth);
    }
    this.syncDocumentState();
  }

  public togglePaused(): void {
    this.paused = !this.paused;
    this.syncDocumentState();
  }

  public adjustSpeed(delta: number): void {
    this.speed = clamp(this.speed + delta, 0.15, 4);
    this.syncDocumentState();
  }

  public toggleDebug(): void {
    this.showDebug = !this.showDebug;
    this.redrawDebug();
    this.syncDocumentState();
  }

  public toggleSmooth(): void {
    this.setSmooth(!this.smooth);
  }

  private setSmooth(smooth: boolean): void {
    this.smooth = smooth;
    this.syncDocumentState();
  }

  private redrawDebug(): void {
    this.debugLayer.clear();
    if (!this.showDebug) {
      return;
    }
    for (const point of TURBINE_MOUNTS) {
      this.debugLayer
        .moveTo(point.x - 16, point.y)
        .lineTo(point.x + 16, point.y)
        .moveTo(point.x, point.y - 16)
        .lineTo(point.x, point.y + 16)
        .stroke({ color: 0xff3b2f, width: 4, alpha: 0.95 })
        .circle(point.x, point.y, 22)
        .stroke({ color: 0xffe17a, width: 3, alpha: 0.88 });
    }
  }

  private syncDocumentState(): void {
    const root = document.documentElement;
    root.dataset.experimentReady = "true";
    root.dataset.animatedTurbines = String(this.turbines.length);
    root.dataset.frameIndex = String(this.turbines[0]?.debugFrameIndex() ?? 0);
    root.dataset.speed = this.speed.toFixed(2);
    root.dataset.paused = String(this.paused);
    root.dataset.smooth = String(this.smooth);
    root.dataset.debugHubs = String(this.showDebug);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

const [mapTexture, turbineFrames] = await Promise.all([
  Assets.load<Texture>({ src: windLevel3Url, data: { scaleMode: "nearest" } }),
  Promise.all(TURBINE_FRAME_URLS.map((src) => Assets.load<Texture>({ src, data: { scaleMode: "nearest" } }))),
]);

for (const texture of [mapTexture, ...turbineFrames]) {
  texture.source.scaleMode = "nearest";
}

const field = new AnimatedTurbineField(mapTexture, turbineFrames);
app.stage.addChild(field);
field.resize(app.screen.width, app.screen.height);

app.renderer.on("resize", (width: number, height: number) => {
  field.resize(width, height);
});

app.ticker.add((ticker) => {
  field.tick(Math.min(ticker.deltaMS, 100));
});

window.addEventListener("keydown", (event) => {
  if (event.key === " ") {
    event.preventDefault();
    field.togglePaused();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    field.adjustSpeed(0.25);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    field.adjustSpeed(-0.25);
  } else if (event.key.toLowerCase() === "d") {
    field.toggleDebug();
  } else if (event.key.toLowerCase() === "i") {
    field.toggleSmooth();
  }
});
