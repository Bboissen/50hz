import { Circle, Container, Sprite, Text, type Texture } from "pixi.js";

import type { ThreePositionRotaryLayout } from "../controlDeskLayout";

export type ModeRotarySwitchOption<Mode extends string> = {
  mode: Mode;
  label: string;
  texture?: Texture;
  rotation: number;
  labelX: number;
};

export class ModeRotarySwitch<Mode extends string> extends Container {
  private readonly sprite?: Sprite;
  private selectedIndex = 0;
  private cycleDirection = 1;
  private dragStartX?: number;
  private visualRotation = 0;

  public constructor(
    private readonly options: ModeRotarySwitchOption<Mode>[],
    layout: ThreePositionRotaryLayout,
    fontFamily: string,
    private readonly onChange: (mode: Mode) => void,
  ) {
    super({ label: "ModeRotarySwitch" });
    this.position.set(layout.center.x, layout.center.y);
    this.eventMode = "none";
    this.interactiveChildren = false;
    this.hitArea = new Circle(0, 0, layout.radius);

    const texture = options[0]?.texture;
    if (texture) {
      const sprite = new Sprite({ texture, label: "mode-rotary-switch-sprite" });
      sprite.anchor.set(0.5);
      sprite.scale.set(layout.scale);
      this.sprite = sprite;
      this.addChild(sprite);
    }

    const labelPlacement = layout.labelPlacement ?? "below";
    const labelY = layout.labelY ?? (labelPlacement === "above" ? layout.center.y - layout.radius - 18 : layout.center.y + layout.radius + 18);
    for (const option of options) {
      const label = new Text({
        text: option.label,
        style: {
          fontFamily,
          fontSize: 18,
          fill: 0x1a130d,
          fontWeight: "700",
          align: "center",
        },
      });
      label.anchor.set(0.5, labelPlacement === "above" ? 1 : 0.5);
      label.position.set(option.labelX - layout.center.x, labelY - layout.center.y);
      this.addChild(label);
    }
  }

  public update(mode: Mode): void {
    const index = this.options.findIndex((option) => option.mode === mode);
    if (index >= 0) {
      this.applyIndex(index);
    }
  }

  public cycleFromCenter(): void {
    if (this.options.length < 2) {
      return;
    }
    if (this.selectedIndex >= this.options.length - 1) {
      this.cycleDirection = -1;
    } else if (this.selectedIndex <= 0) {
      this.cycleDirection = 1;
    }
    this.selectIndex(this.selectedIndex + this.cycleDirection);
  }

  public beginDrag(global: { x: number }): void {
    this.dragStartX = global.x;
  }

  public dragTo(global: { x: number }): void {
    if (this.dragStartX === undefined) {
      return;
    }
    const deltaX = global.x - this.dragStartX;
    if (Math.abs(deltaX) < 12) {
      return;
    }
    this.selectIndex(deltaX < 0 ? 0 : this.options.length - 1);
  }

  public endDrag(): void {
    this.dragStartX = undefined;
  }

  public debugSelectedMode(): Mode {
    return this.options[this.selectedIndex]?.mode ?? this.options[0]!.mode;
  }

  public debugTransform(): { x: number; y: number; rotation: number } {
    return { x: this.x, y: this.y, rotation: this.visualRotation };
  }

  public debugLabelTexts(): string[] {
    return this.children.filter((child): child is Text => child instanceof Text).map((child) => child.text);
  }

  public debugLabelFills(): unknown[] {
    return this.children.filter((child): child is Text => child instanceof Text).map((child) => child.style.fill);
  }

  public debugLabelRotations(): number[] {
    return this.children.filter((child): child is Text => child instanceof Text).map((child) => child.rotation);
  }

  public debugLabelPositions(): { x: number; y: number }[] {
    return this.children.filter((child): child is Text => child instanceof Text).map((child) => ({ x: child.x, y: child.y }));
  }

  public debugSelect(mode: Mode): void {
    const index = this.options.findIndex((option) => option.mode === mode);
    if (index >= 0) {
      this.selectIndex(index);
    }
  }

  private selectIndex(index: number): void {
    const clamped = Math.max(0, Math.min(this.options.length - 1, index));
    if (clamped === this.selectedIndex) {
      return;
    }
    this.applyIndex(clamped);
    this.onChange(this.options[this.selectedIndex]!.mode);
  }

  private applyIndex(index: number): void {
    this.selectedIndex = Math.max(0, Math.min(this.options.length - 1, index));
    const option = this.options[this.selectedIndex];
    if (!option) {
      return;
    }
    if (this.sprite && option.texture) {
      this.sprite.texture = option.texture;
    }
    this.visualRotation = option.rotation;
    if (this.sprite) {
      this.sprite.rotation = option.rotation;
    }
  }
}
