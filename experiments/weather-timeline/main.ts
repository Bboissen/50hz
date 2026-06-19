import "./styles.css";
import { Application, Assets, Container, Graphics, Sprite, Texture } from "pixi.js";

import cloudUrl from "../../assets/icons/weather/cloud.png?url";
import rainUrl from "../../assets/icons/weather/rain.png?url";
import snowUrl from "../../assets/icons/weather/snow.png?url";
import sunUrl from "../../assets/icons/weather/sun.png?url";
import windUrl from "../../assets/icons/weather/wind.png?url";
import { sampleWeather } from "../../src/gameplay/weather";

type WeatherIconKey = "sun" | "cloud" | "rain" | "wind" | "snow";

type ForecastBucket = {
  icon: WeatherIconKey;
  absoluteTimeSeconds: number;
  slotIndex: number;
};

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 520;
const TAPE_BOUNDS: Rect = { x: 96, y: 150, w: 1088, h: 160 };
const FORECAST_BUCKET_SECONDS = 15;
const FORECAST_TILE_COUNT = 7;
const WEATHER_ICON_URLS: Record<WeatherIconKey, string> = {
  sun: sunUrl,
  cloud: cloudUrl,
  rain: rainUrl,
  wind: windUrl,
  snow: snowUrl,
};
const WEATHER_COLORS: Record<WeatherIconKey, number> = {
  sun: 0x9fd7dc,
  cloud: 0x566375,
  rain: 0x455f6a,
  wind: 0x657ea1,
  snow: 0x607a8e,
};
const PIXEL = {
  black: 0x0d110e,
  shell: 0x20261f,
  shellLight: 0x5b6b53,
  screen: 0x16221a,
  copper: 0x8f4b24,
  copperLight: 0xd47d34,
  amber: 0xf0b947,
};

const mount = document.querySelector<HTMLElement>("#pixi-stage");
if (!mount) {
  throw new Error("Missing #pixi-stage mount");
}

const searchParams = new URLSearchParams(window.location.search);
const seed = searchParams.get("seed") ?? "vivatech-grid-duel-demo";
const startTimeSeconds = numberParam("start", 0);
const speed = numberParam("speed", 24);

const app = new Application();
await app.init({
  resizeTo: mount,
  background: "#161813",
  antialias: false,
  autoDensity: true,
  resolution: Math.min(window.devicePixelRatio, 2),
});
mount.appendChild(app.canvas);

class WeatherTimelineExperiment extends Container {
  private readonly world = new Container({ label: "weather-timeline-world" });
  private readonly background = new Graphics({ label: "weather-timeline-background" });
  private readonly tape: ForecastTape;
  private readonly seenWeather = new Set<WeatherIconKey>();
  private simTimeSeconds = startTimeSeconds;

  public constructor(iconTextures: Record<WeatherIconKey, Texture>) {
    super({ label: "weather-timeline-experiment" });
    this.tape = new ForecastTape(TAPE_BOUNDS, iconTextures);
    this.world.addChild(this.background, this.tape);
    this.addChild(this.world);
    this.redrawBackground();
    this.update();
  }

  public resize(width: number, height: number): void {
    const padding = 32;
    const scale = Math.min((width - padding * 2) / DESIGN_WIDTH, (height - padding * 2) / DESIGN_HEIGHT);
    this.world.scale.set(Math.max(0.05, scale));
    this.world.position.set(
      Math.round((width - DESIGN_WIDTH * this.world.scale.x) / 2),
      Math.round((height - DESIGN_HEIGHT * this.world.scale.y) / 2),
    );
  }

  public setElapsedSeconds(elapsedSeconds: number): void {
    this.simTimeSeconds = startTimeSeconds + elapsedSeconds * speed;
    this.update();
  }

  private update(): void {
    const buckets = this.tape.update(this.simTimeSeconds);
    for (const bucket of buckets) {
      this.seenWeather.add(bucket.icon);
    }
    this.syncDocumentState(buckets);
  }

  private redrawBackground(): void {
    this.background
      .clear()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: 0x161813 })
      .rect(52, 68, DESIGN_WIDTH - 104, DESIGN_HEIGHT - 126)
      .fill({ color: PIXEL.shell })
      .stroke({ color: PIXEL.shellLight, width: 4 })
      .rect(78, 92, DESIGN_WIDTH - 156, DESIGN_HEIGHT - 174)
      .fill({ color: 0x111711 })
      .stroke({ color: 0x384637, width: 3 });
  }

  private syncDocumentState(buckets: ForecastBucket[]): void {
    const root = document.documentElement;
    root.dataset.experimentReady = "true";
    root.dataset.iconCount = String(Object.keys(WEATHER_ICON_URLS).length);
    root.dataset.activeWeather = buckets[0]?.icon ?? "";
    root.dataset.forecastSequence = buckets.map((bucket) => bucket.icon).join(",");
    root.dataset.seenWeather = [...this.seenWeather].sort().join(",");
    root.dataset.simTime = this.simTimeSeconds.toFixed(2);
    root.dataset.tapeOffset = this.tape.debugOffsetPixels().toFixed(2);
    root.dataset.pointerX = this.tape.debugPointerX().toFixed(2);
  }
}

class ForecastTape extends Container {
  private readonly frame = new Graphics({ label: "forecast-tape-frame" });
  private readonly track = new Container({ label: "forecast-tape-moving-track" });
  private readonly trackMask = new Graphics({ label: "forecast-tape-mask" });
  private readonly marker = new Graphics({ label: "forecast-tape-marker" });
  private readonly tileViews: ForecastBucketView[];
  private readonly cellW: number;
  private readonly tileW: number;
  private readonly cellY: number;
  private readonly pointerX: number;
  private nextSlotIndex = 0;
  private offsetPixels = 0;

  public constructor(private readonly bounds: Rect, iconTextures: Record<WeatherIconKey, Texture>) {
    super({ label: "forecast-tape" });
    this.cellW = (bounds.w - 44) / 4;
    this.tileW = this.cellW - 14;
    this.cellY = bounds.y + 24;
    this.pointerX = bounds.x + 22 + this.cellW * 0.5;
    this.tileViews = Array.from(
      { length: FORECAST_TILE_COUNT },
      (_, index) => new ForecastBucketView(index, this.tileW, bounds.h - 62, iconTextures),
    );
    this.track.addChild(...this.tileViews);
    this.track.mask = this.trackMask;
    this.addChild(this.frame, this.track, this.trackMask, this.marker);
    this.drawFrame(bounds);
    this.drawMask(bounds);
    this.seedTiles(0);
  }

  public update(simTimeSeconds: number): ForecastBucket[] {
    const progress = positiveModulo(simTimeSeconds, FORECAST_BUCKET_SECONDS) / FORECAST_BUCKET_SECONDS;
    this.offsetPixels = progress * this.cellW;
    const currentSlotIndex = Math.floor(simTimeSeconds / FORECAST_BUCKET_SECONDS);

    if (currentSlotIndex + FORECAST_TILE_COUNT > this.nextSlotIndex) {
      this.recycleTilesThrough(currentSlotIndex + FORECAST_TILE_COUNT);
    }

    const visibleBuckets: ForecastBucket[] = [];
    for (const tile of this.tileViews) {
      const slotOffset = tile.slotIndex - currentSlotIndex;
      const x = this.bounds.x + 22 + slotOffset * this.cellW - this.offsetPixels;
      tile.position.set(Math.round(x), this.cellY);
      tile.setRelativeOffset(slotOffset);
      visibleBuckets.push(tile.bucket);
      if (x + this.cellW > this.bounds.x + 22 && x < this.bounds.x + this.bounds.w - 22) {
        tile.visible = true;
      } else {
        tile.visible = false;
      }
    }

    this.drawMarker(simTimeSeconds);
    this.syncTileDebug();
    return visibleBuckets.sort((a, b) => a.slotIndex - b.slotIndex);
  }

  public debugOffsetPixels(): number {
    return this.offsetPixels;
  }

  public debugPointerX(): number {
    return this.pointerX;
  }

  private seedTiles(currentSlotIndex: number): void {
    this.nextSlotIndex = currentSlotIndex;
    for (const tile of this.tileViews) {
      this.assignTile(tile, this.nextSlotIndex);
      this.nextSlotIndex += 1;
    }
  }

  private recycleTilesThrough(requiredNextSlotIndex: number): void {
    while (this.nextSlotIndex < requiredNextSlotIndex) {
      const oldestTile = this.tileViews.reduce((oldest, tile) => (tile.slotIndex < oldest.slotIndex ? tile : oldest));
      this.assignTile(oldestTile, this.nextSlotIndex);
      this.nextSlotIndex += 1;
    }
  }

  private assignTile(tile: ForecastBucketView, slotIndex: number): void {
    tile.update(bucketForSlot(seed, slotIndex));
  }

  private syncTileDebug(): void {
    const ordered = [...this.tileViews].sort((a, b) => a.x - b.x);
    const root = document.documentElement;
    root.dataset.tileXs = ordered.map((tile) => tile.x.toFixed(1)).join(",");
    root.dataset.tileSlots = ordered.map((tile) => String(tile.slotIndex)).join(",");
  }

  private drawFrame(bounds: Rect): void {
    this.frame
      .clear()
      .rect(bounds.x, bounds.y, bounds.w, bounds.h)
      .fill({ color: PIXEL.black })
      .rect(bounds.x + 10, bounds.y + 10, bounds.w - 20, bounds.h - 20)
      .fill({ color: PIXEL.copper })
      .rect(bounds.x + 22, bounds.y + 24, bounds.w - 44, bounds.h - 62)
      .fill({ color: PIXEL.screen })
      .rect(bounds.x + 22, bounds.y + bounds.h - 32, bounds.w - 44, 14)
      .fill({ color: 0x5b2a19 });
  }

  private drawMask(bounds: Rect): void {
    this.trackMask
      .clear()
      .rect(bounds.x + 22, bounds.y + 24, bounds.w - 44, bounds.h - 38)
      .fill({ color: 0xffffff });
  }

  private drawMarker(simTimeSeconds: number): void {
    const cyclePulse = 0.68 + Math.sin(simTimeSeconds * 5.2) * 0.22;
    const x = this.pointerX;
    const y = TAPE_BOUNDS.y - 10;
    this.marker.removeChildren();
    this.marker
      .clear()
      .moveTo(x - 24, y)
      .lineTo(x + 24, y)
      .lineTo(x + 24, y + 26)
      .lineTo(x + 8, y + 26)
      .lineTo(x, y + 42)
      .lineTo(x - 8, y + 26)
      .lineTo(x - 24, y + 26)
      .closePath()
      .fill({ color: PIXEL.amber, alpha: cyclePulse })
      .stroke({ color: PIXEL.black, width: 4 })
      .rect(x - 3, TAPE_BOUNDS.y + 24, 6, TAPE_BOUNDS.h - 56)
      .fill({ color: PIXEL.amber, alpha: 0.74 });
  }
}

class ForecastBucketView extends Container {
  private readonly background = new Graphics({ label: "forecast-bucket-background" });
  private readonly icon: Sprite;
  private currentBucket: ForecastBucket;

  public constructor(
    index: number,
    private readonly cellW: number,
    private readonly cellH: number,
    private readonly iconTextures: Record<WeatherIconKey, Texture>,
  ) {
    super({ label: `forecast-bucket-${index}` });
    this.currentBucket = bucketForSlot(seed, index);
    this.icon = new Sprite({
      texture: iconTextures.sun,
      label: `forecast-weather-icon-${index}`,
      roundPixels: true,
    });
    this.icon.anchor.set(0.5);
    this.icon.eventMode = "none";
    this.addChild(this.background, this.icon);
  }

  public get bucket(): ForecastBucket {
    return this.currentBucket;
  }

  public get slotIndex(): number {
    return this.currentBucket.slotIndex;
  }

  public setRelativeOffset(slotOffset: number): void {
    void slotOffset;
  }

  public update(bucket: ForecastBucket): void {
    this.currentBucket = bucket;
    this.background
      .clear()
      .rect(0, 0, this.cellW, this.cellH)
      .fill({ color: WEATHER_COLORS[bucket.icon] })
      .rect(0, 0, 2, this.cellH)
      .fill({ color: 0xffffff, alpha: 0.18 });

    this.icon.texture = this.iconTextures[bucket.icon];
    fitSprite(this.icon, 58, 64);
    this.icon.position.set(Math.round(this.cellW * 0.5), 42);
  }
}

function bucketForSlot(seedValue: string, slotIndex: number): ForecastBucket {
  const absoluteTimeSeconds = slotIndex * FORECAST_BUCKET_SECONDS;
  const sample = sampleWeather(seedValue, absoluteTimeSeconds);
  return {
    icon: sample.condition,
    absoluteTimeSeconds,
    slotIndex,
  };
}

function fitSprite(sprite: Sprite, maxWidth: number, maxHeight: number): void {
  const textureWidth = sprite.texture.width || 1;
  const textureHeight = sprite.texture.height || 1;
  const scale = Math.min(maxWidth / textureWidth, maxHeight / textureHeight);
  sprite.scale.set(scale);
}

function numberParam(name: string, fallback: number): number {
  const rawValue = searchParams.get(name);
  if (rawValue === null) {
    return fallback;
  }
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : fallback;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

async function loadWeatherIcons(): Promise<Record<WeatherIconKey, Texture>> {
  const entries = await Promise.all(
    Object.entries(WEATHER_ICON_URLS).map(async ([key, src]) => {
      const texture = await Assets.load<Texture>({ src, data: { scaleMode: "nearest" } });
      texture.source.scaleMode = "nearest";
      return [key, texture] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<WeatherIconKey, Texture>;
}

const iconTextures = await loadWeatherIcons();
const experiment = new WeatherTimelineExperiment(iconTextures);
app.stage.addChild(experiment);
experiment.resize(app.screen.width, app.screen.height);
app.ticker.stop();

app.renderer.on("resize", (width: number, height: number) => {
  experiment.resize(width, height);
});

const startedAtMs = performance.now();
let loopCount = 0;

function driveFrame(nowMs = performance.now()): void {
  try {
    loopCount += 1;
    const elapsedSeconds = Math.max(0, (nowMs - startedAtMs) / 1000);
    document.documentElement.dataset.loopCount = String(loopCount);
    document.documentElement.dataset.elapsedSeconds = elapsedSeconds.toFixed(3);
    document.documentElement.dataset.speed = speed.toFixed(2);
    experiment.setElapsedSeconds(elapsedSeconds);
    app.render();
  } catch (error) {
    document.documentElement.dataset.loopError = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

function animate(nowMs: number): void {
  driveFrame(nowMs);
  window.requestAnimationFrame(animate);
}

window.setInterval(() => driveFrame(), 1000 / 30);
window.requestAnimationFrame(animate);
