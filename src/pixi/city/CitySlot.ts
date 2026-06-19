import { Container, Sprite, Texture } from "pixi.js";

import type { CityLevel, CitySlotConfig } from "./cityTypes";

export class CitySlot extends Container {
  private readonly sprite: Sprite;
  private readonly normalizedSize: { width: number; height: number };
  private currentLevel: CityLevel;

  public constructor(
    private readonly config: CitySlotConfig,
    private readonly textures: Partial<Record<CityLevel, Texture>>,
  ) {
    super({ label: `city-slot-${config.id}` });
    this.position.set(config.x, config.y);
    this.scale.set(config.scale);
    this.zIndex = config.zIndex;
    this.currentLevel = config.defaultLevel;
    this.normalizedSize = normalizedTextureSize(textures);

    this.sprite = new Sprite({
      texture: textures[this.currentLevel] ?? Texture.EMPTY,
      label: `city-slot-${config.id}-sprite`,
    });
    this.sprite.anchor.set(0.5);
    this.sprite.eventMode = "none";
    this.addChild(this.sprite);
    this.normalizeSpriteSize();
  }

  public setLevel(level: CityLevel): void {
    if (!this.config.upgradeable || this.currentLevel === level) {
      return;
    }
    this.currentLevel = level;
    const texture = this.textures[level];
    if (!texture) {
      return;
    }
    this.sprite.texture = texture;
    this.normalizeSpriteSize();
  }

  public setTexture(level: CityLevel, texture: Texture): void {
    this.textures[level] = texture;
    if (this.currentLevel !== level) {
      return;
    }
    this.sprite.texture = texture;
    this.normalizeSpriteSize();
  }

  public level(): CityLevel {
    return this.currentLevel;
  }

  public setEditorTransform(config: { x: number; y: number; scale: number; zIndex: number }): void {
    this.position.set(config.x, config.y);
    this.scale.set(config.scale);
    this.zIndex = config.zIndex;
  }

  public slotId(): string {
    return this.config.id;
  }

  public debugRenderedSize(): { width: number; height: number } {
    return {
      width: this.sprite.width,
      height: this.sprite.height,
    };
  }

  private normalizeSpriteSize(): void {
    this.sprite.width = this.normalizedSize.width;
    this.sprite.height = this.normalizedSize.height;
  }
}

function normalizedTextureSize(textures: Partial<Record<CityLevel, Texture>>): { width: number; height: number } {
  return Object.values(textures).reduce(
    (size, texture) => ({
      width: Math.max(size.width, texture.width || 1),
      height: Math.max(size.height, texture.height || 1),
    }),
    { width: 1, height: 1 },
  );
}
