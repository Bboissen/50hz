import { Container, Text } from "pixi.js";

import type { TextLayout } from "../controlDeskLayout";

export class TextReadout extends Container {
  private readonly textNode: Text;
  private lastText = "";
  private renderedUpdateCount = 0;

  public constructor(layout: TextLayout, fontFamily: string) {
    super({ label: "TextReadout" });
    this.position.set(layout.x, layout.y);
    this.eventMode = "none";
    this.interactiveChildren = false;
    this.textNode = new Text({
      text: "",
      style: {
        fontFamily,
        fontSize: layout.fontSize,
        fill: 0x1a130d,
        fontWeight: "700",
        align: layout.align ?? "left",
        wordWrap: layout.maxWidth !== undefined,
        wordWrapWidth: layout.maxWidth,
      },
    });
    this.addChild(this.textNode);
  }

  public update(text: string): void {
    if (text === this.lastText) {
      return;
    }
    this.lastText = text;
    this.textNode.text = text;
    this.renderedUpdateCount += 1;
  }

  public debugText(): string {
    return this.lastText;
  }

  public debugRenderedUpdateCount(): number {
    return this.renderedUpdateCount;
  }

  public debugFill(): unknown {
    return this.textNode.style.fill;
  }
}
