import { Container, Sprite, type Texture } from "pixi.js";

import type { NeedleLayout } from "../controlDeskLayout";

export class GaugeNeedle extends Container {
  private readonly needle?: Sprite;

  public constructor(texture: Texture | undefined, private readonly layout: NeedleLayout) {
    super({ label: "GaugeNeedle" });
    this.position.set(layout.center.x, layout.center.y);
    this.eventMode = "none";
    this.interactiveChildren = false;

    if (texture) {
      const needle = new Sprite({ texture, label: "gauge-needle-sprite" });
      needle.anchor.set(0.5, 0.9);
      needle.scale.set(layout.scale);
      this.needle = needle;
      this.addChild(needle);
    }
  }

  public update(value: number): void {
    const span = this.layout.maxValue - this.layout.minValue;
    const normalized = span === 0 ? 0 : Math.max(0, Math.min(1, (value - this.layout.minValue) / span));
    this.rotation = this.layout.minAngle + (this.layout.maxAngle - this.layout.minAngle) * normalized;
  }

  public debugNeedlePosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public debugNeedleRotation(): number {
    return this.rotation;
  }

  public hasSprite(): boolean {
    return this.needle !== undefined;
  }
}
