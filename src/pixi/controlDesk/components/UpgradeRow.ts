import { Container, Sprite, Text, type Texture } from "pixi.js";

import type { PlantUpgradeState, PlayerCommand } from "../../../gameplay/types";
import type { AssetResolver } from "../../assets";
import type { UpgradeRowLayout } from "../controlDeskLayout";
import { HitZone } from "./HitZone";
import { SpriteLedStrip } from "./SpriteLedStrip";

export class UpgradeRow extends Container {
  public readonly plantKey: PlantUpgradeState["key"];
  private readonly labelNode: Text;
  private readonly strip: SpriteLedStrip;
  private readonly arrow?: Sprite;
  private state?: PlantUpgradeState;

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
        fontSize: 18,
        fill: 0x1a130d,
        fontWeight: "700",
      },
    });
    this.labelNode.position.set(layout.label.x, layout.label.y);
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

    this.addChild(this.labelNode, this.strip);
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
    this.labelNode.text = `${state.shortLabel} L${displayedLevel} ${state.statusText}`;
    this.strip.update(displayedLevel / state.maxLevel, "green");
    if (this.arrow) {
      this.arrow.alpha = state.isMaxed ? 0.28 : 1;
    }
  }

  public debugActiveLedCount(): number {
    return this.strip.debugActiveCount();
  }

  public debugLabelText(): string {
    return this.labelNode.text;
  }

  public debugActiveLedColors(): string[] {
    return this.strip.debugActiveColors();
  }

  public debugLabelFill(): unknown {
    return this.labelNode.style.fill;
  }

  public debugArrowAlpha(): number | undefined {
    return this.arrow?.alpha;
  }
}
