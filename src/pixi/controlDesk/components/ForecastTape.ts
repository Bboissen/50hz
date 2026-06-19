import { Container, Graphics, Sprite } from "pixi.js";

import { sampleWeather, type WeatherCondition } from "../../../gameplay/weather";
import type { Rect } from "../controlDeskLayout";
import type { WeatherIconTextures } from "../weatherIconAssets";

export type ForecastTapeState = {
  seed: string;
  timeSeconds: number;
};

export type ForecastBucket = {
  icon: WeatherCondition;
  absoluteTimeSeconds: number;
  slotIndex: number;
};

export type ForecastTapeDebugState = {
  offsetPixels: number;
  pointerX: number;
  tileSlots: number[];
  tileXs: number[];
  visibleSlots: number[];
  visibleIcons: WeatherCondition[];
};

export const FORECAST_BUCKET_SECONDS = 15;
const FORECAST_TILE_COUNT = 7;

const WEATHER_COLORS: Record<WeatherCondition, number> = {
  sun: 0x9fd7dc,
  cloud: 0x566375,
  rain: 0x455f6a,
  wind: 0x657ea1,
  snow: 0x607a8e,
};

const PIXEL = {
  black: 0x0d110e,
  screen: 0x16221a,
  copper: 0x8f4b24,
  amber: 0xf0b947,
};

export class ForecastTape extends Container {
  private readonly frame = new Graphics({ label: "forecast-tape-frame" });
  private readonly track = new Container({ label: "forecast-tape-moving-track" });
  private readonly trackMask = new Graphics({ label: "forecast-tape-mask" });
  private readonly marker = new Graphics({ label: "forecast-tape-marker" });
  private readonly tileViews: ForecastBucketView[];
  private readonly cellW: number;
  private readonly tileW: number;
  private readonly cellY: number;
  private readonly pointerX: number;
  private lastSeed = "";
  private nextSlotIndex = 0;
  private offsetPixels = 0;

  public constructor(private readonly bounds: Rect, iconTextures: WeatherIconTextures) {
    super({ label: "ForecastTape" });
    this.eventMode = "none";
    this.interactiveChildren = false;
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
    this.renderFrame();
    this.renderMask();
    this.renderMarker();
  }

  public update(state: ForecastTapeState): ForecastBucket[] {
    const currentSlotIndex = Math.floor(state.timeSeconds / FORECAST_BUCKET_SECONDS);
    const progress = positiveModulo(state.timeSeconds, FORECAST_BUCKET_SECONDS) / FORECAST_BUCKET_SECONDS;
    this.offsetPixels = progress * this.cellW;

    if (this.lastSeed !== state.seed || currentSlotIndex < this.minSlotIndex() || currentSlotIndex >= this.nextSlotIndex) {
      this.seedTiles(state.seed, currentSlotIndex);
    } else if (currentSlotIndex + FORECAST_TILE_COUNT > this.nextSlotIndex) {
      this.recycleTilesThrough(state.seed, currentSlotIndex + FORECAST_TILE_COUNT);
    }

    const visibleBuckets: ForecastBucket[] = [];
    for (const tile of this.tileViews) {
      const slotOffset = tile.slotIndex - currentSlotIndex;
      const x = this.bounds.x + 22 + slotOffset * this.cellW - this.offsetPixels;
      tile.position.set(Math.round(x), this.cellY);
      tile.visible = x + this.cellW > this.bounds.x + 22 && x < this.bounds.x + this.bounds.w - 22;
      if (tile.visible) {
        visibleBuckets.push(tile.bucket);
      }
    }

    return visibleBuckets.sort((a, b) => a.slotIndex - b.slotIndex);
  }

  public debugState(): ForecastTapeDebugState {
    const ordered = [...this.tileViews].sort((a, b) => a.slotIndex - b.slotIndex);
    const visible = ordered.filter((tile) => tile.visible);
    return {
      offsetPixels: this.offsetPixels,
      pointerX: this.pointerX,
      tileSlots: ordered.map((tile) => tile.slotIndex),
      tileXs: ordered.map((tile) => tile.x),
      visibleSlots: visible.map((tile) => tile.slotIndex),
      visibleIcons: visible.map((tile) => tile.bucket.icon),
    };
  }

  private seedTiles(seed: string, currentSlotIndex: number): void {
    this.lastSeed = seed;
    this.nextSlotIndex = currentSlotIndex;
    for (const tile of this.tileViews) {
      this.assignTile(seed, tile, this.nextSlotIndex);
      this.nextSlotIndex += 1;
    }
  }

  private recycleTilesThrough(seed: string, requiredNextSlotIndex: number): void {
    while (this.nextSlotIndex < requiredNextSlotIndex) {
      const oldestTile = this.tileViews.reduce((oldest, tile) => (tile.slotIndex < oldest.slotIndex ? tile : oldest));
      this.assignTile(seed, oldestTile, this.nextSlotIndex);
      this.nextSlotIndex += 1;
    }
  }

  private assignTile(seed: string, tile: ForecastBucketView, slotIndex: number): void {
    tile.update(bucketForSlot(seed, slotIndex));
  }

  private minSlotIndex(): number {
    return Math.min(...this.tileViews.map((tile) => tile.slotIndex));
  }

  private renderFrame(): void {
    const bounds = this.bounds;
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

  private renderMask(): void {
    const bounds = this.bounds;
    this.trackMask
      .clear()
      .rect(bounds.x + 22, bounds.y + 24, bounds.w - 44, bounds.h - 38)
      .fill({ color: 0xffffff });
  }

  private renderMarker(): void {
    const x = this.pointerX;
    const y = this.bounds.y - 10;
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
      .fill({ color: PIXEL.amber, alpha: 0.9 })
      .stroke({ color: PIXEL.black, width: 4 })
      .rect(x - 3, this.bounds.y + 24, 6, this.bounds.h - 56)
      .fill({ color: PIXEL.amber, alpha: 0.74 });
  }
}

class ForecastBucketView extends Container {
  private readonly background = new Graphics({ label: "forecast-bucket-background" });
  private readonly icon: Sprite;
  private currentBucket: ForecastBucket = {
    icon: "sun",
    absoluteTimeSeconds: 0,
    slotIndex: 0,
  };

  public constructor(
    index: number,
    private readonly cellW: number,
    private readonly cellH: number,
    private readonly iconTextures: WeatherIconTextures,
  ) {
    super({ label: `forecast-bucket-${index}` });
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

function bucketForSlot(seed: string, slotIndex: number): ForecastBucket {
  const absoluteTimeSeconds = slotIndex * FORECAST_BUCKET_SECONDS;
  const sample = sampleWeather(seed, absoluteTimeSeconds);
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

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
