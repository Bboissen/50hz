import { Circle, Container, FederatedPointerEvent, Graphics, Rectangle } from "pixi.js";

import type { CircleLayout, Rect } from "../controlDeskLayout";

export type HitZoneCallbacks =
  | ((event: FederatedPointerEvent) => void)
  | {
      tap?: (event: FederatedPointerEvent) => void;
      down?: (event: FederatedPointerEvent) => void;
      move?: (event: FederatedPointerEvent) => void;
      up?: (event: FederatedPointerEvent) => void;
    };

export class HitZone extends Container {
  public constructor(shape: Rect | CircleLayout, callbacks: HitZoneCallbacks, showDebug: boolean) {
    super({ label: "HitZone" });
    this.eventMode = "static";
    this.cursor = "pointer";
    const handlers = typeof callbacks === "function" ? { tap: callbacks } : callbacks;
    if (handlers.tap) {
      this.on("pointertap", handlers.tap);
    }
    if (handlers.down) {
      this.on("pointerdown", handlers.down);
    }
    if (handlers.move) {
      this.on("globalpointermove", handlers.move);
    }
    if (handlers.up) {
      this.on("pointerup", handlers.up);
      this.on("pointerupoutside", handlers.up);
    }

    if ("r" in shape) {
      this.position.set(shape.x, shape.y);
      this.hitArea = new Circle(0, 0, shape.r);
      if (showDebug) {
        this.addChild(new Graphics().circle(0, 0, shape.r).stroke({ color: 0x44d7ff, alpha: 0.65, width: 2 }));
      }
    } else {
      this.position.set(shape.x, shape.y);
      this.hitArea = new Rectangle(0, 0, shape.w, shape.h);
      if (showDebug) {
        this.addChild(new Graphics().rect(0, 0, shape.w, shape.h).stroke({ color: 0x44d7ff, alpha: 0.65, width: 2 }));
      }
    }
  }
}
