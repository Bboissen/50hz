import { Container, Graphics, Sprite, Texture, type Texture as TextureType } from "pixi.js";

import type { LedStripLayout } from "../controlDeskLayout";

export type LedSpriteTextures = {
  base?: TextureType;
  green?: TextureType;
  orange?: TextureType;
  red?: TextureType;
  blue?: TextureType;
};

export type LedColorKey = "green" | "orange" | "red" | "blue";

export class SpriteLedStrip extends Container {
  private readonly litSprites: Sprite[] = [];
  private readonly fallbackGraphics = new Graphics({ label: "test-fallback-leds" });
  private activeCount = 0;
  private activeColors: LedColorKey[] = [];

  public constructor(
    private readonly layout: LedStripLayout,
    private readonly textures: LedSpriteTextures,
    private readonly options: { allowTestFallback?: boolean } = {},
  ) {
    super({ label: "SpriteLedStrip" });
    this.position.set(layout.x, layout.y);
    this.eventMode = "none";
    this.interactiveChildren = false;

    if (textures.base) {
      const base = new Sprite({ texture: textures.base, label: "led-strip-base" });
      base.width = layout.w;
      base.height = layout.h;
      this.addChild(base);
    }

    const totalLitWidth = layout.cells * layout.litCell.w + (layout.cells - 1) * layout.litCell.gap;
    const totalLitHeight = layout.cells * layout.litCell.h + (layout.cells - 1) * layout.litCell.gap;
    const horizontalInset = Math.max(0, (layout.w - totalLitWidth) / 2);
    const verticalInset = Math.max(0, (layout.h - totalLitHeight) / 2);
    for (let index = 0; index < layout.cells; index += 1) {
      const sprite = new Sprite({ texture: Texture.EMPTY, label: "lit-led-sprite" });
      sprite.visible = false;
      sprite.width = layout.litCell.w;
      sprite.height = layout.litCell.h;
      if (layout.orientation === "horizontal") {
        sprite.position.set(
          horizontalInset + index * (layout.litCell.w + layout.litCell.gap),
          Math.max(0, (layout.h - layout.litCell.h) / 2),
        );
      } else {
        sprite.position.set(
          Math.max(0, (layout.w - layout.litCell.w) / 2),
          verticalInset + (layout.cells - 1 - index) * (layout.litCell.h + layout.litCell.gap),
        );
      }
      this.litSprites.push(sprite);
      this.addChild(sprite);
    }

    if (options.allowTestFallback) {
      this.addChild(this.fallbackGraphics);
    }
  }

  public update(valueRatio: number, mode: LedColorKey | "threshold" = "threshold"): void {
    const clamped = Math.max(0, Math.min(1, valueRatio));
    this.activeCount = Math.round(clamped * this.layout.cells);
    this.activeColors = [];
    this.fallbackGraphics.clear();

    for (let index = 0; index < this.litSprites.length; index += 1) {
      const sprite = this.litSprites[index];
      const isActive = index < this.activeCount;
      const color = mode === "threshold" ? this.colorForIndex(index) : mode;
      this.activeColors.push(color);
      sprite.visible = isActive && this.textures[color] !== undefined;
      if (this.textures[color]) {
        sprite.texture = this.textures[color];
      }
      if (isActive && this.options.allowTestFallback && !this.textures[color]) {
        this.fallbackGraphics
          .rect(sprite.x, sprite.y, this.layout.litCell.w, this.layout.litCell.h)
          .fill({ color: this.hexFor(color) });
      }
    }
  }

  public debugActiveCount(): number {
    return this.activeCount;
  }

  public debugActiveColors(): LedColorKey[] {
    return this.activeColors.slice(0, this.activeCount);
  }

  private colorForIndex(index: number): LedColorKey {
    const ratio = (index + 1) / this.layout.cells;
    if (ratio > 0.82) {
      return "red";
    }
    if (ratio > 0.58) {
      return "orange";
    }
    return "green";
  }

  private hexFor(color: LedColorKey): number {
    if (color === "red") {
      return 0xf05245;
    }
    if (color === "orange") {
      return 0xf4a340;
    }
    if (color === "blue") {
      return 0x5ca9ff;
    }
    return 0x5ef06b;
  }
}
