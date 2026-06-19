import { Circle, Container, Sprite, type Texture } from "pixi.js";

import type { WaterDamMode } from "../../../gameplay/types";
import type { ThreePositionRotaryLayout } from "../controlDeskLayout";

export type ThreePositionRotaryTextures = {
  fill?: Texture;
  hold?: Texture;
  drain?: Texture;
};

export class ThreePositionRotary extends Container {
  private readonly sprite?: Sprite;
  private mode: WaterDamMode = "hold";

  public constructor(
    private readonly textures: ThreePositionRotaryTextures,
    layout: ThreePositionRotaryLayout,
  ) {
    super({ label: "ThreePositionRotary" });
    this.position.set(layout.center.x, layout.center.y);
    this.eventMode = "none";
    this.interactiveChildren = false;
    this.hitArea = new Circle(0, 0, layout.radius);

    const texture = textures.hold ?? textures.fill ?? textures.drain;
    if (texture) {
      const sprite = new Sprite({ texture, label: "dam-three-position-sprite" });
      sprite.anchor.set(0.5);
      sprite.scale.set(layout.scale);
      this.sprite = sprite;
      this.addChild(sprite);
    }
  }

  public update(mode: WaterDamMode): void {
    this.mode = mode;
    if (this.sprite) {
      this.sprite.texture = mode === "fill" ? (this.textures.fill ?? this.sprite.texture) : mode === "drain" ? (this.textures.drain ?? this.sprite.texture) : (this.textures.hold ?? this.sprite.texture);
    }
    this.rotation = mode === "fill" ? -0.42 : mode === "drain" ? 0.42 : 0;
  }

  public debugSelectedMode(): WaterDamMode {
    return this.mode;
  }

  public debugTransform(): { x: number; y: number; rotation: number } {
    return { x: this.x, y: this.y, rotation: this.rotation };
  }
}
