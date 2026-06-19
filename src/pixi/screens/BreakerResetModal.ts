import { Container, Graphics, Text } from "pixi.js";

import type { DispatchConsoleState, PlayerCommand } from "../../gameplay/types";
import { DESIGN_TOKENS } from "../tokens";

type CommandSink = (command: PlayerCommand) => void;

const PIXEL = {
  black: 0x0d110e,
  dark: 0x111711,
  steel: 0x8f9389,
  steelDark: 0x555b57,
  steelLight: 0xc4c8bc,
  hazard: 0xf2c85b,
  hazardDark: 0x2d2f2a,
  cream: 0xf4e8bd,
  red: DESIGN_TOKENS.colors.overloadRed,
  green: DESIGN_TOKENS.colors.phosphorGreen,
  amber: DESIGN_TOKENS.colors.amberWarn,
  smoke: DESIGN_TOKENS.colors.smokeGrey,
};

function makeLabel(text: string, size = 18, color = PIXEL.cream, align: "left" | "center" | "right" = "left"): Text {
  return new Text({
    text,
    style: {
      fontFamily: DESIGN_TOKENS.typography.labelFamily,
      fontSize: size,
      fill: color,
      fontWeight: "700",
      align,
      letterSpacing: 0,
    },
  });
}

function addLabel(parent: Container, text: string, x: number, y: number, size = 18, color = PIXEL.cream, align: "left" | "center" | "right" = "left"): Text {
  const label = makeLabel(text, size, color, align);
  label.position.set(Math.round(x), Math.round(y));
  parent.addChild(label);
  return label;
}

export class BreakerResetModal extends Container {
  private readonly g = new Graphics();
  private readonly labels = new Container();
  private resetArmed = false;
  private holdingFuse = false;

  public constructor(private readonly sink: CommandSink) {
    super();
    this.visible = false;
    this.eventMode = "static";
    this.cursor = "default";
    this.addChild(this.g, this.labels);
    this.addHitZones();
  }

  public update(state: DispatchConsoleState, dt: number): void {
    const isRequired = state.breakerResetRequired;
    if (!isRequired) {
      this.resetArmed = false;
      this.holdingFuse = false;
      this.visible = false;
      return;
    }

    this.visible = true;
    if (this.resetArmed && this.holdingFuse && state.canAffordBreakerReset && dt > 0) {
      this.sink({ type: "holdBreakerReset", playerId: "player", seconds: dt });
    }
    this.renderPanel(state);
  }

  public deactivate(): void {
    this.resetArmed = false;
    this.holdingFuse = false;
  }

  private addHitZones(): void {
    const switchZone = new Container();
    switchZone.eventMode = "static";
    switchZone.cursor = "pointer";
    switchZone.on("pointertap", () => {
      this.resetArmed = !this.resetArmed;
      if (!this.resetArmed) {
        this.holdingFuse = false;
      }
    });
    switchZone.addChild(new Graphics().rect(622, 260, 380, 370).fill({ color: 0xffffff, alpha: 0.001 }));

    const fuseZone = new Container();
    fuseZone.eventMode = "static";
    fuseZone.cursor = "pointer";
    fuseZone.on("pointerdown", () => {
      if (this.resetArmed) {
        this.holdingFuse = true;
      }
    });
    const stopHold = (): void => {
      this.holdingFuse = false;
    };
    fuseZone.on("pointerup", stopHold);
    fuseZone.on("pointerupoutside", stopHold);
    fuseZone.on("pointercancel", stopHold);
    fuseZone.addChild(new Graphics().circle(1130, 442, 126).fill({ color: 0xffffff, alpha: 0.001 }));

    this.addChild(switchZone, fuseZone);
  }

  private renderPanel(state: DispatchConsoleState): void {
    this.labels.removeChildren();
    const progress = state.breakerResetProgress;
    this.g
      .clear()
      .rect(0, 0, 1920, 1080)
      .fill({ color: PIXEL.black, alpha: 0.58 })
      .rect(486, 150, 948, 780)
      .fill({ color: PIXEL.black })
      .rect(506, 170, 908, 740)
      .fill({ color: 0x242a23 })
      .stroke({ color: PIXEL.red, width: 8 })
      .rect(538, 202, 844, 76)
      .fill({ color: 0x1a211b })
      .stroke({ color: PIXEL.red, width: 4 });

    addLabel(this.labels, "BREAKER RESET REQUIRED", 574, 222, 34, PIXEL.red);
    addLabel(this.labels, this.resetArmed ? "BREAKER ARMED" : "FLIP SWITCH TO ON", 646, 690, 24, this.resetArmed ? PIXEL.green : PIXEL.amber);
    addLabel(this.labels, state.canAffordBreakerReset ? "HOLD FUSE BUTTON" : "CASH SHORT", 1014, 690, 24, state.canAffordBreakerReset ? PIXEL.green : PIXEL.red);
    addLabel(this.labels, state.breakerStatusText, 650, 832, 20, PIXEL.cream);

    this.renderHazardSwitch(632, 304, 340, 340);
    this.renderFuseButton(1130, 452, 112, progress, state.canAffordBreakerReset);
    this.renderProgressBar(646, 770, 628, 34, progress, state.canAffordBreakerReset);
  }

  private renderHazardSwitch(x: number, y: number, w: number, h: number): void {
    this.g.rect(x, y, w, h).fill({ color: PIXEL.hazard }).stroke({ color: PIXEL.black, width: 6 });
    for (let stripe = -60; stripe < w + h; stripe += 58) {
      this.g
        .moveTo(x + stripe, y)
        .lineTo(x + stripe + 34, y)
        .lineTo(x + stripe - h + 34, y + h)
        .lineTo(x + stripe - h, y + h)
        .closePath()
        .fill({ color: PIXEL.hazardDark, alpha: 0.9 });
    }
    this.g
      .rect(x + 56, y + 34, w - 112, h - 72)
      .fill({ color: PIXEL.steel })
      .stroke({ color: PIXEL.black, width: 7 })
      .rect(x + 76, y + 54, w - 152, 26)
      .fill({ color: PIXEL.steelLight, alpha: 0.52 })
      .rect(x + 92, y + h - 48, w - 184, 18)
      .fill({ color: PIXEL.steelDark, alpha: 0.42 });

    this.g
      .rect(x + 88, y + 18, w - 176, 34)
      .fill({ color: PIXEL.black })
      .rect(x + 112, y + 22, w - 224, 26)
      .fill({ color: PIXEL.steelLight });

    const handleY = this.resetArmed ? y + h - 138 : y + 88;
    this.g
      .rect(x + 82, handleY, 40, 112)
      .fill({ color: PIXEL.steelDark })
      .stroke({ color: PIXEL.black, width: 5 })
      .rect(x + w - 122, handleY, 40, 112)
      .fill({ color: PIXEL.steelDark })
      .stroke({ color: PIXEL.black, width: 5 })
      .rect(x + 106, handleY + 26, w - 212, 62)
      .fill({ color: this.resetArmed ? PIXEL.green : PIXEL.steelLight })
      .stroke({ color: PIXEL.black, width: 5 });

    addLabel(this.labels, "OFF", x + 138, y + 72, 34, this.resetArmed ? PIXEL.steelDark : PIXEL.red, "center");
    if (this.resetArmed) {
      addLabel(this.labels, "ON", x + 146, handleY + 38, 34, PIXEL.black, "center");
    } else {
      addLabel(this.labels, "ON", x + 150, y + h - 112, 34, PIXEL.black, "center");
    }
    this.g.rect(x + 118, y + h - 28, w - 236, 18).fill({ color: PIXEL.cream }).stroke({ color: PIXEL.black, width: 3 });
    addLabel(this.labels, "FUSE", x + 144, y + h - 26, 10, PIXEL.black);
  }

  private renderFuseButton(cx: number, cy: number, radius: number, progress: number, canReset: boolean): void {
    const pressOffset = this.holdingFuse ? 8 : 0;
    const fill = canReset ? PIXEL.green : PIXEL.smoke;
    this.g.circle(cx + 22, cy + 22, radius).fill({ color: 0x000000, alpha: 0.32 });
    this.g.circle(cx, cy + pressOffset, radius).fill({ color: PIXEL.black }).circle(cx, cy + pressOffset, radius - 14).fill({
      color: fill,
      alpha: this.resetArmed ? 1 : 0.38,
    });
    for (let tick = 0; tick < 18; tick += 1) {
      const angle = (tick / 18) * Math.PI * 2;
      const inner = radius - 30;
      const outer = radius - 18;
      this.g
        .moveTo(cx + Math.cos(angle) * inner, cy + pressOffset + Math.sin(angle) * inner)
        .lineTo(cx + Math.cos(angle) * outer, cy + pressOffset + Math.sin(angle) * outer)
        .stroke({ color: PIXEL.black, width: 3, alpha: 0.45 });
    }
    if (progress > 0) {
      this.g
        .moveTo(cx + radius + 12, cy + pressOffset)
        .arc(cx, cy + pressOffset, radius + 12, 0, Math.PI * 2 * Math.min(1, progress))
        .stroke({ color: PIXEL.green, width: 10 });
    }
    addLabel(this.labels, "HOLD", cx - 44, cy + pressOffset - 12, 24, PIXEL.black);
  }

  private renderProgressBar(x: number, y: number, w: number, h: number, progress: number, canReset: boolean): void {
    this.g
      .rect(x, y, w, h)
      .fill({ color: PIXEL.black })
      .rect(x + 6, y + 6, (w - 12) * Math.min(1, progress), h - 12)
      .fill({ color: canReset ? PIXEL.green : PIXEL.red });
    addLabel(this.labels, `${Math.round(progress * 100)}%`, x + w + 18, y + 4, 20, canReset ? PIXEL.green : PIXEL.red);
  }
}
