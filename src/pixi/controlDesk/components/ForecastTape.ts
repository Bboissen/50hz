import { Container, Graphics, Sprite } from "pixi.js";

import { GAME_CONFIG } from "../../../gameplay/config";
import { sampleWeather, timeOfDayRatioAt, weatherSegmentSeconds, type WeatherCondition } from "../../../gameplay/weather";
import type { Rect } from "../controlDeskLayout";
import type { WeatherIconId, WeatherIconTextures } from "../weatherIconAssets";

export type ForecastTapeState = {
  seed: string;
  timeSeconds: number;
};

export type ForecastBucket = {
  condition: WeatherCondition;
  icon: WeatherIconId;
  absoluteTimeSeconds: number;
  slotIndex: number;
};

export type ForecastTapeDebugState = {
  offsetPixels: number;
  pointerX: number;
  pointerSlotIndex: number | undefined;
  pointerIcon: WeatherIconId | undefined;
  tileSlots: number[];
  tileXs: number[];
  tileIconSizes: Array<{ width: number; height: number }>;
  tileIconTints: number[];
  tileBackgroundSamples: Array<{ left: number; center: number; right: number }>;
  visibleSlots: number[];
  visibleIcons: WeatherIconId[];
};

export const FORECAST_BUCKET_SECONDS = weatherSegmentSeconds();
const FORECAST_VISIBLE_BUCKET_COUNT = GAME_CONFIG.weather.forecastOffsetsSeconds.length;
const FORECAST_TILE_COUNT = FORECAST_VISIBLE_BUCKET_COUNT + 2;
const SKY_GRADIENT_STEPS = 14;

const ICON_STYLES: Record<WeatherIconId, { tint: number; glowAlpha: number }> = {
  sun: { tint: 0xffffff, glowAlpha: 0 },
  moon: { tint: 0xfff2b4, glowAlpha: 0.12 },
  cloud: { tint: 0xf8fbff, glowAlpha: 0.32 },
  rain: { tint: 0xddefff, glowAlpha: 0.08 },
  wind: { tint: 0xf2fbff, glowAlpha: 0.38 },
  snow: { tint: 0xffffff, glowAlpha: 0.2 },
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
    const currentSlotIndex = Math.floor(state.timeSeconds / FORECAST_BUCKET_SECONDS);
    const firstSlotIndex = currentSlotIndex - 1;
    this.offsetPixels = positiveModulo(state.timeSeconds, FORECAST_BUCKET_SECONDS) / FORECAST_BUCKET_SECONDS * this.cellW;
    const buckets = Array.from({ length: FORECAST_TILE_COUNT }, (_, index) =>
      bucketForSlot(state.seed, firstSlotIndex + index),
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
    for (const tile of this.tileViews) {
      const slotOffset = tile.slotIndex - currentSlotIndex;
      const x = this.pointerX + slotOffset * this.cellW - this.offsetPixels;
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
    const pointerTile = ordered.find((tile) => this.pointerX >= tile.x && this.pointerX < tile.x + this.cellW);
    return {
      offsetPixels: this.offsetPixels,
      pointerX: this.pointerX,
      pointerSlotIndex: pointerTile?.slotIndex,
      pointerIcon: pointerTile?.bucket.icon,
      tileSlots: ordered.map((tile) => tile.slotIndex),
      tileXs: ordered.map((tile) => tile.x),
      tileIconSizes: ordered.map((tile) => tile.debugIconSize()),
      tileIconTints: ordered.map((tile) => tile.debugIconTint()),
      tileBackgroundSamples: ordered.map((tile) => tile.debugBackgroundSamples()),
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
  private readonly iconGlow: Sprite;
  private readonly icon: Sprite;
  private currentBucket: ForecastBucket = {
    condition: "sun",
    icon: "sun",
    absoluteTimeSeconds: 0,
    slotIndex: 0,
  };
  private renderedIcon?: WeatherIconId;
  private renderedBackgroundSignature = "";
  private backgroundSamples = {
    left: 0,
    center: 0,
    right: 0,
  };

  public constructor(
    index: number,
    private readonly cellW: number,
    private readonly cellH: number,
    private readonly iconTextures: WeatherIconTextures,
  ) {
    super({ label: `forecast-bucket-${index}` });
    this.iconGlow = new Sprite({
      texture: iconTextures.sun,
      label: `forecast-weather-icon-glow-${index}`,
      roundPixels: true,
    });
    this.icon = new Sprite({
      texture: iconTextures.sun,
      label: `forecast-weather-icon-${index}`,
      roundPixels: true,
    });
    this.iconGlow.anchor.set(0.5);
    this.iconGlow.eventMode = "none";
    this.icon.anchor.set(0.5);
    this.icon.eventMode = "none";
    this.addChild(this.background, this.iconGlow, this.icon);
  }

  public get bucket(): ForecastBucket {
    return this.currentBucket;
  }

  public get slotIndex(): number {
    return this.currentBucket.slotIndex;
  }

  public update(bucket: ForecastBucket): void {
    this.currentBucket = bucket;
    this.updateBackground(bucket);
    if (this.renderedIcon !== bucket.icon) {
      this.renderedIcon = bucket.icon;
      this.icon.texture = this.iconTextures[bucket.icon];
      this.iconGlow.texture = this.iconTextures[bucket.icon];
      fitSprite(this.icon, Math.min(58, this.cellW * 0.54), Math.min(64, Math.max(16, this.cellH - 5)));
      fitSprite(this.iconGlow, Math.min(66, this.cellW * 0.62), Math.min(72, Math.max(18, this.cellH + 3)));
      this.icon.position.set(Math.round(this.cellW * 0.5), Math.round(this.cellH * 0.5));
      this.iconGlow.position.copyFrom(this.icon.position);
    }
    const iconStyle = ICON_STYLES[bucket.icon];
    this.icon.tint = iconStyle.tint;
    this.iconGlow.tint = 0xffffff;
    this.iconGlow.alpha = iconStyle.glowAlpha;
    this.iconGlow.visible = iconStyle.glowAlpha > 0;
  }

  public debugIconSize(): { width: number; height: number } {
    return { width: this.icon.width, height: this.icon.height };
  }

  public debugIconTint(): number {
    return this.icon.tint as number;
  }

  public debugBackgroundSamples(): { left: number; center: number; right: number } {
    return { ...this.backgroundSamples };
  }

  private updateBackground(bucket: ForecastBucket): void {
    const left = skyColorAtTime(bucket.absoluteTimeSeconds);
    const center = skyColorAtTime(bucket.absoluteTimeSeconds + FORECAST_BUCKET_SECONDS / 2);
    const right = skyColorAtTime(bucket.absoluteTimeSeconds + FORECAST_BUCKET_SECONDS);
    const signature = `${left}:${center}:${right}`;
    this.backgroundSamples = { left, center, right };
    if (this.renderedBackgroundSignature === signature) {
      return;
    }
    this.renderedBackgroundSignature = signature;
    this.background.clear();
    for (let step = 0; step < SKY_GRADIENT_STEPS; step += 1) {
      const x = (this.cellW / SKY_GRADIENT_STEPS) * step;
      const w = Math.ceil(this.cellW / SKY_GRADIENT_STEPS) + 1;
      const ratio = step / Math.max(SKY_GRADIENT_STEPS - 1, 1);
      this.background
        .rect(x, 0, w, this.cellH)
        .fill({ color: skyColorAtTime(bucket.absoluteTimeSeconds + FORECAST_BUCKET_SECONDS * ratio) });
    }
    this.background
      .rect(0, 0, 2, this.cellH)
      .fill({ color: 0xffffff, alpha: 0.16 })
      .rect(0, 0, this.cellW, Math.max(2, this.cellH * 0.12))
      .fill({ color: 0xffffff, alpha: 0.12 })
      .rect(0, this.cellH - Math.max(2, this.cellH * 0.16), this.cellW, Math.max(2, this.cellH * 0.16))
      .fill({ color: 0x0b0e17, alpha: 0.18 });
  }
}

function bucketForSlot(seed: string, slotIndex: number): ForecastBucket {
  const absoluteTimeSeconds = slotIndex * FORECAST_BUCKET_SECONDS;
  const condition = sampleWeather(seed, absoluteTimeSeconds).condition;
  const icon = iconForConditionAtTime(condition, absoluteTimeSeconds);
  return {
    condition,
    icon,
    absoluteTimeSeconds,
    slotIndex,
  };
}

function iconForConditionAtTime(condition: WeatherCondition, absoluteTimeSeconds: number): WeatherIconId {
  if (condition === "sun" && timeOfDayRatioAt(absoluteTimeSeconds) > 0.5) {
    return "moon";
  }
  return condition;
}

function fitSprite(sprite: Sprite, maxWidth: number, maxHeight: number): void {
  const textureWidth = sprite.texture.width || 1;
  const textureHeight = sprite.texture.height || 1;
  const scale = Math.min(maxWidth / textureWidth, maxHeight / textureHeight);
  sprite.scale.set(scale);
}

function skyColorAtTime(timeSeconds: number): number {
  return gradientColorAt(timeOfDayRatioAt(timeSeconds));
}

function gradientColorAt(ratio: number): number {
  const stops = [
    { at: 0, color: 0x26304c },
    { at: 0.08, color: 0xc07a52 },
    { at: 0.18, color: 0xf0c06b },
    { at: 0.32, color: 0x9cc6d8 },
    { at: 0.5, color: 0xe28b5b },
    { at: 0.62, color: 0x4f607e },
    { at: 0.78, color: 0x182139 },
    { at: 1, color: 0x26304c },
  ] as const;
  const normalizedRatio = positiveModulo(ratio, 1);
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1]!;
    const next = stops[index]!;
    if (normalizedRatio <= next.at) {
      const localRatio = (normalizedRatio - previous.at) / Math.max(next.at - previous.at, Number.EPSILON);
      return mixColor(previous.color, next.color, localRatio);
    }
  }
  return stops[0].color;
}

function mixColor(from: number, to: number, ratio: number): number {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const fromRed = (from >> 16) & 0xff;
  const fromGreen = (from >> 8) & 0xff;
  const fromBlue = from & 0xff;
  const toRed = (to >> 16) & 0xff;
  const toGreen = (to >> 8) & 0xff;
  const toBlue = to & 0xff;
  const red = Math.round(fromRed + (toRed - fromRed) * clampedRatio);
  const green = Math.round(fromGreen + (toGreen - fromGreen) * clampedRatio);
  const blue = Math.round(fromBlue + (toBlue - fromBlue) * clampedRatio);
  return (red << 16) | (green << 8) | blue;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
