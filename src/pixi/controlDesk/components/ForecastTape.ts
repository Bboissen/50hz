import { Container, Graphics, Sprite } from "pixi.js";

import { GAME_CONFIG } from "../../../gameplay/config";
import type { TimelineToken } from "../../../gameplay/types";
import { sampleWeather, type WeatherCondition } from "../../../gameplay/weather";
import type { Rect } from "../controlDeskLayout";
import type { WeatherIconTextures } from "../weatherIconAssets";

export type ForecastTapeState = {
  seed: string;
  timeSeconds: number;
  forecast?: TimelineToken[];
};

export type ForecastBucket = {
  icon: WeatherCondition;
  absoluteTimeSeconds: number;
  slotIndex: number;
};

export type ForecastTapeDebugState = {
  offsetPixels: number;
  pointerX: number;
  pointerSlotIndex: number | undefined;
  pointerIcon: WeatherCondition | undefined;
  tileSlots: number[];
  tileXs: number[];
  tileIconSizes: Array<{ width: number; height: number }>;
  visibleSlots: number[];
  visibleIcons: WeatherCondition[];
};

export const FORECAST_BUCKET_SECONDS = GAME_CONFIG.weather.forecastOffsetsSeconds[1] ?? GAME_CONFIG.weather.conditionSegmentSeconds;
const FORECAST_OFFSETS_SECONDS = GAME_CONFIG.weather.forecastOffsetsSeconds;
const FORECAST_TILE_OFFSETS_SECONDS = [
  ...FORECAST_OFFSETS_SECONDS,
  (FORECAST_OFFSETS_SECONDS.at(-1) ?? 0) + FORECAST_BUCKET_SECONDS,
];
const FORECAST_VISIBLE_BUCKET_COUNT = FORECAST_OFFSETS_SECONDS.length;
const FORECAST_TILE_COUNT = FORECAST_TILE_OFFSETS_SECONDS.length;

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
  private readonly cellH: number;
  private readonly leftPad: number;
  private readonly compact: boolean;
  private readonly pointerX: number;
  private offsetPixels = 0;
  private lastSignature = "";

  public constructor(private readonly bounds: Rect, iconTextures: WeatherIconTextures) {
    super({ label: "ForecastTape" });
    this.eventMode = "none";
    this.interactiveChildren = false;
    this.compact = bounds.h < 80;
    this.leftPad = this.compact ? 16 : 22;
    this.cellW = (bounds.w - this.leftPad * 2) / FORECAST_VISIBLE_BUCKET_COUNT;
    this.tileW = this.cellW - (this.compact ? 10 : 14);
    this.cellY = bounds.y + (this.compact ? 10 : 24);
    this.cellH = bounds.h - (this.compact ? 20 : 62);
    this.pointerX = bounds.x + this.leftPad + this.cellW * 0.5;
    this.tileViews = Array.from(
      { length: FORECAST_TILE_COUNT },
      (_, index) => new ForecastBucketView(index, this.tileW, this.cellH, iconTextures),
    );
    this.track.addChild(...this.tileViews);
    this.track.mask = this.trackMask;
    this.addChild(this.frame, this.track, this.trackMask, this.marker);
    this.renderFrame();
    this.renderMask();
    this.renderMarker();
  }

  public update(state: ForecastTapeState): ForecastBucket[] {
    this.offsetPixels = positiveModulo(state.timeSeconds, FORECAST_BUCKET_SECONDS) / FORECAST_BUCKET_SECONDS * this.cellW;
    const buckets = FORECAST_TILE_OFFSETS_SECONDS.map((offsetSeconds, index) =>
      bucketForOffset(state.seed, state.timeSeconds, offsetSeconds, index, state.forecast),
    );
    const signature = buckets.map((bucket) => `${bucket.slotIndex}:${bucket.icon}`).join("|");
    if (signature !== this.lastSignature) {
      this.lastSignature = signature;
      for (const [index, tile] of this.tileViews.entries()) {
        const bucket = buckets[index];
        if (bucket) {
          tile.update(bucket);
        }
      }
    }

    const visibleBuckets: ForecastBucket[] = [];
    for (const [index, tile] of this.tileViews.entries()) {
      const x = this.pointerX + index * this.cellW - this.offsetPixels;
      tile.position.set(Math.round(x), this.cellY);
      tile.visible = x + this.cellW > this.bounds.x + this.leftPad && x < this.bounds.x + this.bounds.w - this.leftPad;
      if (tile.visible) {
        visibleBuckets.push(tile.bucket);
      }
    }

    return visibleBuckets;
  }

  public debugState(): ForecastTapeDebugState {
    const ordered = [...this.tileViews].sort((a, b) => a.slotIndex - b.slotIndex);
    const visible = ordered.filter((tile) => tile.visible);
    const pointerTile = ordered.find((tile) => tile.slotIndex === 0);
    return {
      offsetPixels: this.offsetPixels,
      pointerX: this.pointerX,
      pointerSlotIndex: pointerTile?.slotIndex,
      pointerIcon: pointerTile?.bucket.icon,
      tileSlots: ordered.map((tile) => tile.slotIndex),
      tileXs: ordered.map((tile) => tile.x),
      tileIconSizes: ordered.map((tile) => tile.debugIconSize()),
      visibleSlots: visible.map((tile) => tile.slotIndex),
      visibleIcons: visible.map((tile) => tile.bucket.icon),
    };
  }

  private renderFrame(): void {
    const bounds = this.bounds;
    const innerPad = this.compact ? 6 : 10;
    this.frame
      .clear()
      .rect(bounds.x, bounds.y, bounds.w, bounds.h)
      .fill({ color: PIXEL.black })
      .rect(bounds.x + innerPad, bounds.y + innerPad, bounds.w - innerPad * 2, bounds.h - innerPad * 2)
      .fill({ color: PIXEL.copper })
      .rect(bounds.x + this.leftPad, this.cellY, bounds.w - this.leftPad * 2, this.cellH)
      .fill({ color: PIXEL.screen })
      .rect(bounds.x + this.leftPad, bounds.y + bounds.h - (this.compact ? 12 : 32), bounds.w - this.leftPad * 2, this.compact ? 5 : 14)
      .fill({ color: 0x5b2a19 });
  }

  private renderMask(): void {
    const bounds = this.bounds;
    this.trackMask
      .clear()
      .rect(bounds.x + this.leftPad, this.cellY, bounds.w - this.leftPad * 2, this.cellH)
      .fill({ color: 0xffffff });
  }

  private renderMarker(): void {
    const x = this.pointerX;
    const y = this.bounds.y + (this.compact ? -2 : -10);
    const markerHalfWidth = this.compact ? 14 : 24;
    const markerTabHeight = this.compact ? 14 : 26;
    const markerPointHeight = this.compact ? 24 : 42;
    this.marker
      .clear()
      .moveTo(x - markerHalfWidth, y)
      .lineTo(x + markerHalfWidth, y)
      .lineTo(x + markerHalfWidth, y + markerTabHeight)
      .lineTo(x + 5, y + markerTabHeight)
      .lineTo(x, y + markerPointHeight)
      .lineTo(x - 5, y + markerTabHeight)
      .lineTo(x - markerHalfWidth, y + markerTabHeight)
      .closePath()
      .fill({ color: PIXEL.amber, alpha: 0.9 })
      .stroke({ color: PIXEL.black, width: this.compact ? 3 : 4 })
      .rect(x - 2, this.cellY, 4, this.cellH)
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
  private renderedIcon?: WeatherCondition;

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
    if (this.renderedIcon === bucket.icon) {
      return;
    }
    this.renderedIcon = bucket.icon;
    this.background
      .clear()
      .rect(0, 0, this.cellW, this.cellH)
      .fill({ color: WEATHER_COLORS[bucket.icon] })
      .rect(0, 0, 2, this.cellH)
      .fill({ color: 0xffffff, alpha: 0.18 });

    this.icon.texture = this.iconTextures[bucket.icon];
    fitSprite(this.icon, Math.min(58, this.cellW * 0.54), Math.min(64, Math.max(16, this.cellH - 5)));
    this.icon.position.set(Math.round(this.cellW * 0.5), Math.round(this.cellH * 0.5));
  }

  public debugIconSize(): { width: number; height: number } {
    return { width: this.icon.width, height: this.icon.height };
  }
}

function bucketForOffset(
  seed: string,
  timeSeconds: number,
  offsetSeconds: number,
  index: number,
  forecast: TimelineToken[] | undefined,
): ForecastBucket {
  const token = forecast?.find((item) => Math.abs(item.remainingSeconds - offsetSeconds) < 0.001);
  const absoluteTimeSeconds = timeSeconds + offsetSeconds;
  const icon = weatherConditionFromToken(token) ?? sampleWeather(seed, absoluteTimeSeconds).condition;
  return {
    icon,
    absoluteTimeSeconds,
    slotIndex: index === 0 ? 0 : offsetSeconds,
  };
}

function weatherConditionFromToken(token: TimelineToken | undefined): WeatherCondition | undefined {
  if (
    token?.id === "sun" ||
    token?.id === "cloud" ||
    token?.id === "rain" ||
    token?.id === "wind" ||
    token?.id === "snow"
  ) {
    return token.id;
  }
  return undefined;
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
