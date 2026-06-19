import { Container, Sprite, Text, type Texture } from "pixi.js";

import type { PlantUpgradeState, PlayerCommand } from "../../../gameplay/types";
import type { AssetResolver } from "../../assets";
import type { UpgradeRowLayout } from "../controlDeskLayout";
import { HitZone } from "./HitZone";
import { SpriteLedStrip } from "./SpriteLedStrip";

export class UpgradeRow extends Container {
  public readonly plantKey: PlantUpgradeState["key"];
  private readonly labelNode: Text;
  private readonly priceNode: Text;
  private readonly strip: SpriteLedStrip;
  private readonly arrow?: Sprite;
  private state?: PlantUpgradeState;
  private lastLabelText = "";
  private lastPriceText = "";
  private lastArrowAlpha = Number.NaN;

  public constructor(
    layout: UpgradeRowLayout,
    assets: AssetResolver,
    sink: (command: PlayerCommand) => void,
    fontFamily: string,
    showDebug: boolean,
  ) {
    super({ label: `UpgradeRow:${layout.key}` });
    this.plantKey = layout.key;
    this.eventMode = "passive";
    this.labelNode = new Text({
      text: "",
      style: {
        fontFamily,
        fontSize: 21,
        fill: 0x1a130d,
        fontWeight: "900",
      },
    });
    this.labelNode.position.set(layout.label.x, layout.label.y);
    this.priceNode = new Text({
      text: "",
      style: {
        fontFamily,
        fontSize: layout.price.fontSize,
        fill: 0x1a130d,
        fontWeight: "900",
        align: layout.price.align ?? "right",
        wordWrap: layout.price.maxWidth !== undefined,
        wordWrapWidth: layout.price.maxWidth,
      },
    });
    this.priceNode.anchor.set(1, 0);
    this.priceNode.position.set(layout.price.x + (layout.price.maxWidth ?? 0), layout.price.y);
    this.strip = new SpriteLedStrip(layout.ledStrip, {
      base: assets.texture("led_empty_3"),
      green: assets.texture("led_green"),
      orange: assets.texture("led_orange"),
      red: assets.texture("led_red"),
      blue: assets.texture("led_blue"),
    });

    const arrowTexture: Texture | undefined = assets.texture("upgrade_arrow");
    if (arrowTexture) {
      this.arrow = new Sprite({ texture: arrowTexture, label: "upgrade-arrow-sprite" });
      this.arrow.anchor.set(0.5);
      this.arrow.scale.set(layout.upgradeArrow.scale);
      this.arrow.position.set(layout.upgradeArrow.x, layout.upgradeArrow.y);
    }

    this.addChild(this.labelNode, this.priceNode, this.strip);
    if (this.arrow) {
      this.addChild(this.arrow);
    }
    this.addChild(
      new HitZone(
        layout.hitZone,
        () => {
          if (this.state?.canAfford && !this.state.isMaxed && !this.state.isBuilding) {
            sink({ type: "buyUpgrade", playerId: "player", kind: this.state.kind });
          }
        },
        showDebug,
      ),
    );
  }

  public update(state: PlantUpgradeState): void {
    this.state = state;
    const displayedLevel = Math.max(state.level, state.purchasedLevel);
    const nextLabelText = `${state.shortLabel} L${displayedLevel}`;
    if (this.lastLabelText !== nextLabelText) {
      this.lastLabelText = nextLabelText;
      this.labelNode.text = nextLabelText;
    }
    if (this.lastPriceText !== state.statusText) {
      this.lastPriceText = state.statusText;
      this.priceNode.text = state.statusText;
    }
    this.strip.update(displayedLevel / state.maxLevel, "green");
    if (this.arrow) {
      const nextArrowAlpha = state.isMaxed ? 0.28 : 1;
      if (this.lastArrowAlpha !== nextArrowAlpha) {
        this.lastArrowAlpha = nextArrowAlpha;
        this.arrow.alpha = nextArrowAlpha;
      }
    }
  }

  public debugActiveLedCount(): number {
    return this.strip.debugActiveCount();
  }

  public debugLabelText(): string {
    return this.labelNode.text;
  }

  public debugPriceText(): string {
    return this.priceNode.text;
  }

  public debugActiveLedColors(): string[] {
    return this.strip.debugActiveColors();
  }

  public debugLabelFill(): unknown {
    return this.labelNode.style.fill;
  }

  public debugPriceFill(): unknown {
    return this.priceNode.style.fill;
  }

  public debugArrowAlpha(): number | undefined {
    return this.arrow?.alpha;
  }
}
