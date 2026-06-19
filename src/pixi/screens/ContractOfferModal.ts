import { Container, Graphics, Text } from "pixi.js";

import type { ContractOfferState, DispatchConsoleState, PlayerCommand } from "../../gameplay/types";
import { DESIGN_TOKENS } from "../tokens";

type CommandSink = (command: PlayerCommand) => void;

const PIXEL = {
  black: 0x0d110e,
  panel: 0x20291f,
  paper: 0xd8c992,
  paperDark: 0xa99a67,
  cream: 0xf4e8bd,
  green: DESIGN_TOKENS.colors.phosphorGreen,
  amber: DESIGN_TOKENS.colors.amberWarn,
  red: DESIGN_TOKENS.colors.overloadRed,
  cyan: DESIGN_TOKENS.colors.dataCyan,
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
      wordWrap: true,
    },
  });
}

function addLabel(
  parent: Container,
  text: string,
  x: number,
  y: number,
  size = 18,
  color = PIXEL.cream,
  align: "left" | "center" | "right" = "left",
): Text {
  const label = makeLabel(text, size, color, align);
  label.position.set(Math.round(x), Math.round(y));
  parent.addChild(label);
  return label;
}

export class ContractOfferModal extends Container {
  private readonly g = new Graphics();
  private readonly labels = new Container();
  private latestOffer: ContractOfferState | undefined;

  public constructor(private readonly sink: CommandSink) {
    super();
    this.visible = false;
    this.eventMode = "static";
    this.cursor = "default";
    this.addChild(this.g, this.labels);
    this.addHitZones();
  }

  public update(state: DispatchConsoleState): void {
    if (!state.contractOffer || state.breakerResetRequired) {
      this.latestOffer = undefined;
      this.visible = false;
      return;
    }

    this.latestOffer = state.contractOffer;
    this.visible = true;
    this.renderPanel(state.contractOffer);
  }

  public deactivate(): void {
    this.latestOffer = undefined;
    this.visible = false;
  }

  private addHitZones(): void {
    this.addChild(new Graphics().rect(0, 0, 1920, 1080).fill({ color: 0xffffff, alpha: 0.001 }));
    this.addButton(630, 714, 286, 74, () => {
      if (this.latestOffer) {
        this.sink({ type: "acceptContract", playerId: "player", kind: this.latestOffer.kind });
      }
    });
    this.addButton(1004, 714, 286, 74, () => {
      if (this.latestOffer) {
        this.sink({ type: "declineContract", offerId: this.latestOffer.id });
      }
    });
  }

  private addButton(x: number, y: number, w: number, h: number, onTap: () => void): void {
    const hit = new Container();
    hit.eventMode = "static";
    hit.cursor = "pointer";
    hit.on("pointertap", onTap);
    hit.addChild(new Graphics().rect(x, y, w, h).fill({ color: 0xffffff, alpha: 0.001 }));
    this.addChild(hit);
  }

  private renderPanel(offer: ContractOfferState): void {
    this.labels.removeChildren();
    const seconds = Math.max(0, Math.ceil(offer.remainingSeconds));
    const loadLabel = `${offer.loadMW} MW`;
    const rewardLabel = `+${offer.completionCashReward}`;
    const strikeLabel = `-${offer.strikeScorePenalty}`;
    const countdownColor = seconds <= 2 ? PIXEL.red : PIXEL.amber;

    this.g
      .clear()
      .rect(0, 0, 1920, 1080)
      .fill({ color: PIXEL.black, alpha: 0.48 })
      .rect(500, 210, 920, 660)
      .fill({ color: PIXEL.black })
      .stroke({ color: PIXEL.amber, width: 7 })
      .rect(524, 234, 872, 612)
      .fill({ color: PIXEL.panel })
      .stroke({ color: PIXEL.paperDark, width: 4 })
      .rect(560, 270, 800, 110)
      .fill({ color: 0x071009 })
      .stroke({ color: PIXEL.amber, width: 4 })
      .rect(584, 420, 752, 202)
      .fill({ color: PIXEL.paper })
      .stroke({ color: PIXEL.black, width: 6 })
      .rect(614, 456, 196, 124)
      .fill({ color: 0xebdca1 })
      .stroke({ color: PIXEL.black, width: 4 })
      .rect(862, 456, 196, 124)
      .fill({ color: 0xebdca1 })
      .stroke({ color: PIXEL.black, width: 4 })
      .rect(1110, 456, 196, 124)
      .fill({ color: 0xebdca1 })
      .stroke({ color: PIXEL.black, width: 4 });

    addLabel(this.labels, "FIXED CONTRACT", 600, 292, 18, PIXEL.amber);
    addLabel(this.labels, offer.title, 600, 324, 26, PIXEL.cream);
    addLabel(this.labels, "AUTO DECLINE", 1094, 306, 18, countdownColor);
    addLabel(this.labels, `${seconds}s`, 1094, 336, 20, countdownColor);

    this.g
      .rect(584, 392, 752, 16)
      .fill({ color: PIXEL.black })
      .rect(592, 397, 736 * offer.countdownRatio, 5)
      .fill({ color: seconds <= 2 ? PIXEL.red : PIXEL.green });

    addLabel(this.labels, "LOAD", 650, 470, 17, PIXEL.black);
    addLabel(this.labels, loadLabel, 650, 518, 28, PIXEL.black);
    addLabel(this.labels, "REWARD", 898, 470, 17, PIXEL.black);
    addLabel(this.labels, rewardLabel, 912, 518, 28, PIXEL.black);
    addLabel(this.labels, "STRIKE", 1146, 470, 17, PIXEL.red);
    addLabel(this.labels, strikeLabel, 1158, 518, 28, PIXEL.red);
    addLabel(this.labels, `${offer.durationSeconds}s FIXED TERM / NON-CANCELLABLE`, 650, 642, 16, PIXEL.cream);

    this.renderButton(630, 714, 286, 74, "ACCEPT", PIXEL.green);
    this.renderButton(1004, 714, 286, 74, "DECLINE", PIXEL.smoke);
  }

  private renderButton(x: number, y: number, w: number, h: number, text: string, fill: number): void {
    this.g
      .rect(x, y, w, h)
      .fill({ color: PIXEL.black })
      .rect(x + 8, y + 8, w - 16, h - 16)
      .fill({ color: fill })
      .stroke({ color: PIXEL.black, width: 4 });
    addLabel(this.labels, text, x + w / 2 - 54, y + 28, 24, PIXEL.black);
  }
}
