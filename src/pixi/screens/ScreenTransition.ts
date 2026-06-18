import { Container, Graphics } from "pixi.js";

import { DESIGN_TOKENS } from "../tokens";

export class ScreenTransition extends Container {
  private readonly overlay = new Graphics();
  private elapsedSeconds = 1;

  public constructor() {
    super();
    this.addChild(this.overlay);
  }

  public trigger(): void {
    this.elapsedSeconds = 0;
  }

  public update(dt: number): void {
    this.elapsedSeconds += dt;
    const progress = Math.min(1, this.elapsedSeconds / 0.3);
    const alpha = progress >= 1 ? 0 : 0.82 * (1 - Math.abs(progress - 0.5) * 2);
    const wipeX = 1920 * progress;
    this.overlay
      .clear()
      .rect(0, 0, 1920, 1080)
      .fill({ color: DESIGN_TOKENS.colors.inkBlack, alpha })
      .rect(wipeX - 180, 0, 180, 1080)
      .fill({ color: DESIGN_TOKENS.colors.phosphorGreen, alpha: alpha * 0.28 });
  }
}
