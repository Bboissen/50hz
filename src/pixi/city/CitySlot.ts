import { Container, Sprite, type Texture } from "pixi.js";

import type { CityLevel, CitySlotConfig } from "./cityTypes";

export class CitySlot extends Container {
  private readonly sprite: Sprite;
  private currentLevel: CityLevel;

  public constructor(
    private readonly config: CitySlotConfig,
    private readonly textures: Record<CityLevel, Texture>,
  ) {
    super({ label: `city-slot-${config.id}` });
    this.position.set(config.x, config.y);
    this.scale.set(config.scale);
    this.zIndex = config.zIndex;
    this.currentLevel = config.defaultLevel;

    this.sprite = new Sprite({
      texture: textures[this.currentLevel],
      label: `city-slot-${config.id}-sprite`,
    });
    this.sprite.anchor.set(0.5);
    this.sprite.eventMode = "none";
    this.addChild(this.sprite);
  }

  public setLevel(level: CityLevel): void {
    if (!this.config.upgradeable || this.currentLevel === level) {
      return;
    }
    this.currentLevel = level;
    this.sprite.texture = this.textures[level];
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
}
