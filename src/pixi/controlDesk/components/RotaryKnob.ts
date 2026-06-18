import { Circle, Container, FederatedPointerEvent, Sprite, type Texture } from "pixi.js";

import type { RotaryLayout } from "../controlDeskLayout";

export class RotaryKnob extends Container {
  private normalized = 0;
  private lastDragAngle?: number;

  public constructor(
    texture: Texture | undefined,
    private readonly layout: RotaryLayout,
    private readonly onAdjust: (deltaRatio: number) => void,
  ) {
    super({ label: "RotaryKnob" });
    this.position.set(layout.center.x, layout.center.y);
    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea = new Circle(0, 0, layout.radius);

    if (texture) {
      const knob = new Sprite({ texture, label: "rotary-knob-sprite" });
      knob.anchor.set(0.5);
      knob.scale.set(layout.scale);
      this.addChild(knob);
    }

    this.on("pointerdown", (event: FederatedPointerEvent) => this.beginAdjustment(event.global));
    this.on("globalpointermove", (event: FederatedPointerEvent) => this.adjustToGlobalPoint(event.global));
    this.on("pointerup", () => this.endAdjustment());
    this.on("pointerupoutside", () => this.endAdjustment());
  }

  public update(valueRatio: number): void {
    this.normalized = Math.max(0, Math.min(1, valueRatio));
    this.rotation = this.layout.minAngle + (this.layout.maxAngle - this.layout.minAngle) * this.normalized;
  }

  public debugSetNormalized(valueRatio: number): void {
    this.update(valueRatio);
  }

  public debugAdjustBy(deltaRatio: number): void {
    this.applyAdjustment(deltaRatio);
  }

  public beginAdjustment(global: { x: number; y: number }): void {
    const local = this.toLocal(global);
    this.lastDragAngle = Math.atan2(local.y, local.x);
  }

  public adjustToGlobalPoint(global: { x: number; y: number }): void {
    if (this.lastDragAngle === undefined) {
      return;
    }
    const local = this.toLocal(global);
    const angle = Math.atan2(local.y, local.x);
    const delta = wrapAngle(angle - this.lastDragAngle);
    if (Math.abs(delta) < 0.02) {
      return;
    }
    this.lastDragAngle = angle;
    this.applyAdjustment(delta / (this.layout.maxAngle - this.layout.minAngle));
  }

  public endAdjustment(): void {
    this.lastDragAngle = undefined;
  }

  public debugSetFromLocalPoint(x: number, y: number): void {
    this.lastDragAngle = 0;
    const angle = Math.atan2(y, x);
    this.applyAdjustment(wrapAngle(angle) / (this.layout.maxAngle - this.layout.minAngle));
    this.endAdjustment();
  }

  public debugTransform(): { x: number; y: number; rotation: number } {
    return { x: this.x, y: this.y, rotation: this.rotation };
  }

  private applyAdjustment(deltaRatio: number): void {
    this.update(this.normalized + deltaRatio);
    this.onAdjust(deltaRatio);
  }
}

function wrapAngle(angle: number): number {
  if (angle > Math.PI) {
    return angle - Math.PI * 2;
  }
  if (angle < -Math.PI) {
    return angle + Math.PI * 2;
  }
  return angle;
}
