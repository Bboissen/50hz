import { Container, Graphics, Text } from "pixi.js";

import type { AssetResolver } from "../assets";
import { DESIGN_TOKENS } from "../tokens";
import type { DispatchConsoleState, FinalResult, MatchState, PlayerCommand, ProductionConsoleState } from "../../gameplay/types";
import { DispatchConsoleScreen } from "./DispatchConsoleScreen";
import { ProductionConsoleScreen } from "./ProductionConsoleScreen";
import { ResultScreen } from "./ResultScreen";
import { ScreenTransition } from "./ScreenTransition";

type ScreenId = "dispatch" | "production" | "result";

function navButton(text: string, x: number, onTap: () => void): Container {
  const root = new Container();
  root.eventMode = "static";
  root.cursor = "pointer";
  root.on("pointertap", onTap);
  const g = new Graphics()
    .roundRect(x, 1008, 232, 48, 8)
    .fill({ color: DESIGN_TOKENS.colors.paperTan })
    .stroke({ color: DESIGN_TOKENS.colors.inkBlack, width: 3 });
  const label = new Text({
    text,
    style: {
      fontFamily: DESIGN_TOKENS.typography.labelFamily,
      fontSize: 18,
      fill: DESIGN_TOKENS.colors.inkBlack,
      fontWeight: "700",
    },
  });
  label.position.set(x + 14, 1021);
  root.addChild(g, label);
  return root;
}

export class ScreenManager extends Container {
  private active: ScreenId = "dispatch";
  private readonly dispatchScreen: DispatchConsoleScreen;
  private readonly productionScreen: ProductionConsoleScreen;
  private readonly resultScreen = new ResultScreen();
  private readonly transition = new ScreenTransition();

  public constructor(assets: AssetResolver, sink: (command: PlayerCommand) => void) {
    super();
    this.dispatchScreen = new DispatchConsoleScreen(assets, sink);
    this.productionScreen = new ProductionConsoleScreen(sink, assets);
    this.addChild(
      this.dispatchScreen,
      this.productionScreen,
      this.resultScreen,
      navButton("1 DISPATCH", 1330, () => this.switchTo("dispatch")),
      navButton("2 PRODUCTION", 1580, () => this.switchTo("production")),
      this.transition,
    );
    this.syncVisibility();
  }

  public handleKey(event: KeyboardEvent): void {
    if (event.key === "1") {
      this.switchTo("dispatch");
    } else if (event.key === "2") {
      this.switchTo("production");
    } else if (event.key === "Tab") {
      event.preventDefault();
      this.switchTo(this.active === "dispatch" ? "production" : "dispatch");
    }
  }

  public update(args: {
    dispatch: DispatchConsoleState;
    production: ProductionConsoleState;
    result: FinalResult;
    match: MatchState;
    isMatchOver: boolean;
    dt: number;
  }): void {
    if (args.isMatchOver && this.active !== "result") {
      this.switchTo("result");
    }
    this.dispatchScreen.update(args.dispatch);
    this.productionScreen.update(args.production);
    this.resultScreen.update(args.result, args.match);
    this.transition.update(args.dt);
  }

  private switchTo(screen: ScreenId): void {
    if (this.active === screen) {
      return;
    }
    this.active = screen;
    this.transition.trigger();
    this.syncVisibility();
  }

  private syncVisibility(): void {
    this.dispatchScreen.visible = this.active === "dispatch";
    this.productionScreen.visible = this.active === "production";
    this.resultScreen.visible = this.active === "result";
  }
}
