import { Container, Graphics, Text } from "pixi.js";

import type { AssetResolver } from "../assets";
import { DESIGN_TOKENS } from "../tokens";
import type { DispatchConsoleState, FinalResult, MatchState, PlayerCommand, ProductionConsoleState } from "../../gameplay/types";
import { BreakerResetModal } from "./BreakerResetModal";
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
    .rect(x, 1004, 232, 52)
    .fill({ color: 0x0d110e })
    .rect(x + 6, 1010, 220, 40)
    .fill({ color: DESIGN_TOKENS.colors.paperTan })
    .rect(x + 12, 1016, 208, 4)
    .fill({ color: 0xf0dfaa, alpha: 0.45 })
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
  label.position.set(x + 18, 1022);
  root.addChild(g, label);
  return root;
}

export class ScreenManager extends Container {
  private active: ScreenId = "dispatch";
  private readonly dispatchScreen: DispatchConsoleScreen;
  private readonly productionScreen: ProductionConsoleScreen;
  private readonly resultScreen = new ResultScreen();
  private readonly transition = new ScreenTransition();
  private readonly breakerResetModal: BreakerResetModal;

  public constructor(assets: AssetResolver, sink: (command: PlayerCommand) => void) {
    super();
    this.dispatchScreen = new DispatchConsoleScreen(assets, sink);
    this.productionScreen = new ProductionConsoleScreen(sink, assets);
    this.breakerResetModal = new BreakerResetModal(sink);
    this.addChild(
      this.dispatchScreen,
      this.productionScreen,
      this.resultScreen,
      navButton("1 DISPATCH", 1330, () => this.switchTo("dispatch")),
      navButton("2 PRODUCTION", 1580, () => this.switchTo("production")),
      this.transition,
      this.breakerResetModal,
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
    } else if (args.dispatch.breakerResetRequired && this.active !== "dispatch") {
      this.switchTo("dispatch");
    }
    this.dispatchScreen.update(args.dispatch);
    this.productionScreen.update(args.production);
    this.resultScreen.update(args.result, args.match);
    this.transition.update(args.dt);
    this.breakerResetModal.update(args.dispatch, args.dt);
  }

  private switchTo(screen: ScreenId): void {
    if (this.active === screen) {
      return;
    }
    if (this.active === "production") {
      this.productionScreen.deactivate();
    }
    this.active = screen;
    this.transition.trigger();
    this.syncVisibility();
  }

  private syncVisibility(): void {
    this.dispatchScreen.visible = this.active === "dispatch";
    this.productionScreen.visible = this.active === "production";
    this.resultScreen.visible = this.active === "result";
    if (this.active === "result") {
      this.breakerResetModal.deactivate();
    }
  }
}
