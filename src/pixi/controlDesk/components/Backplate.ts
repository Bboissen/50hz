import { Container, Sprite, type Texture } from "pixi.js";

import type { Rect } from "../controlDeskLayout";

export class Backplate extends Container {
  public readonly sprite?: Sprite;

  public constructor(texture: Texture | undefined, layout: Rect) {
    super({ label: "DeskBackplate" });
    this.eventMode = "none";
    this.interactiveChildren = false;

    if (!texture) {
      return;
    }

    const sprite = new Sprite({ texture, label: "desk-background-sprite" });
    sprite.position.set(layout.x, layout.y);
    sprite.width = layout.w;
    sprite.height = layout.h;
    sprite.eventMode = "none";
    this.sprite = sprite;
    this.addChild(sprite);
  }
}
