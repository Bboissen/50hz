import { Container } from "pixi.js";

import type { AssetResolver } from "../assets";
import type { CityScene } from "../city/CityScene";
import type { DispatchConsoleState, FinalResult, MatchState, PlayerCommand, ProductionConsoleState } from "../../gameplay/types";
import { BreakerResetModal } from "./BreakerResetModal";
import { ContractOfferModal } from "./ContractOfferModal";
import { ControlDeskScreen, type ControlDeskLayoutEditorTarget } from "./ControlDeskScreen";
import { ResultScreen } from "./ResultScreen";
import { ScreenTransition } from "./ScreenTransition";

type ScreenId = "desk" | "result";
type ScreenManagerOptions = {
  showReferenceOverlay?: boolean;
  showLayoutDebug?: boolean;
};

export class ScreenManager extends Container {
  private active: ScreenId = "desk";
  private readonly controlDeskScreen: ControlDeskScreen;
  private readonly resultScreen: ResultScreen;
  private readonly transition = new ScreenTransition();
  private readonly contractOfferModal: ContractOfferModal;
  private readonly breakerResetModal: BreakerResetModal;

  public constructor(assets: AssetResolver, sink: (command: PlayerCommand) => void, options: ScreenManagerOptions = {}) {
    super();
    this.controlDeskScreen = new ControlDeskScreen(assets, sink, {
      showReferenceOverlay: options.showReferenceOverlay,
      showLayoutDebug: options.showLayoutDebug,
    });
    this.resultScreen = new ResultScreen();
    this.contractOfferModal = new ContractOfferModal(sink);
    this.breakerResetModal = new BreakerResetModal(sink);
    this.addChild(this.controlDeskScreen, this.transition, this.resultScreen, this.contractOfferModal, this.breakerResetModal);
    this.syncVisibility();
  }

  public handleKey(_event: KeyboardEvent): void {
    return;
  }

  public update(args: {
    dispatch: DispatchConsoleState;
    production: ProductionConsoleState;
    result: FinalResult;
    match: MatchState;
    isMatchOver: boolean;
    dt: number;
  }): void {
    if (args.isMatchOver) {
      this.switchTo("result");
    } else {
      this.switchTo("desk");
    }
    this.controlDeskScreen.update(args.production);
    this.controlDeskScreen.animate(args.dt);
    this.resultScreen.update(args.result, args.match);
    this.transition.update(args.dt);
    if (this.active === "result") {
      this.contractOfferModal.deactivate();
      this.breakerResetModal.deactivate();
    } else {
      this.contractOfferModal.update(args.dispatch);
      this.breakerResetModal.update(args.dispatch, args.dt);
    }
  }

  public animate(dt: number): void {
    this.controlDeskScreen.animate(dt);
  }

  public cityEditorScene(): CityScene | undefined {
    return this.controlDeskScreen.cityEditorScene();
  }

  public createLayoutEditorTargets(): ControlDeskLayoutEditorTarget[] {
    return this.controlDeskScreen.createLayoutEditorTargets();
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
    this.controlDeskScreen.visible = true;
    this.resultScreen.visible = this.active === "result";
    if (this.active === "result") {
      this.contractOfferModal.deactivate();
      this.breakerResetModal.deactivate();
    }
  }
}
