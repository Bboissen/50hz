import { Ticker } from "pixi.js";

import { chooseBotCommands } from "./gameplay/bot";
import { GAME_CONFIG } from "./gameplay/config";
import {
  applyPlayerCommand,
  computeFinalResult,
  createInitialMatchState,
  isMatchOver,
  selectDispatchConsoleState,
  selectProductionConsoleState,
  tickMatch,
} from "./gameplay/match";
import type { MatchState, PlayerCommand } from "./gameplay/types";
import { createAssetResolver, type AssetResolver } from "./pixi/assets";
import { createPixiApp } from "./pixi/createPixiApp";
import { ScreenManager } from "./pixi/screens/ScreenManager";
import { createCityEditor } from "./ui/cityEditor";
import { createDebugPanel } from "./ui/debugPanel";
import type { GameMenu } from "./ui/gameMenu";
import { createLayoutEditor } from "./ui/layoutEditor";

export type GameRuntime = {
  resetMatch: () => void;
  continueMatch: () => void;
  pauseMatch: () => void;
  returnToMainMenu: () => void;
};

export type GameRuntimeWarmup = {
  assets: AssetResolver;
};

export async function preloadGameRuntime(): Promise<GameRuntimeWarmup> {
  return {
    assets: await createAssetResolver(),
  };
}

export async function startGameRuntime(
  root: HTMLElement,
  gameMenu: GameMenu,
  warmup?: GameRuntimeWarmup,
): Promise<GameRuntime> {
  const searchParams = new URLSearchParams(window.location.search);
  const matchSeed = searchParams.get("seed") ?? undefined;
  const devMode = searchParams.get("dev") === "1";
  const cityEditorMode = searchParams.get("cityEditor") === "1";
  const layoutEditorMode = devMode && searchParams.get("layoutEdit") === "1";
  const editorMode = cityEditorMode || layoutEditorMode;
  let state: MatchState = createInitialMatchState({ seed: matchSeed });
  let phase: "menu" | "playing" | "ended" | "editing" = editorMode ? "editing" : "playing";
  const appPromise = createPixiApp(root);
  const assetsPromise = warmup?.assets ?? createAssetResolver();
  const [app, assets] = await Promise.all([appPromise, assetsPromise]);
  let accumulator = 0;
  let lastDocumentPhase = "";

  const dispatch = (command: PlayerCommand): void => {
    if (phase !== "playing") {
      return;
    }
    state = applyPlayerCommand(state, command);
  };

  const debugPanel = devMode
    ? createDebugPanel({
        onCommand: dispatch,
        onReset: () => {
          state = createInitialMatchState({ seed: matchSeed });
          accumulator = 0;
          phase = editorMode ? "editing" : "playing";
        },
      })
    : undefined;
  if (debugPanel) {
    root.appendChild(debugPanel.element);
  }
  const screenManager = new ScreenManager(assets, dispatch, {
    showLayoutDebug: searchParams.get("layoutDebug") === "1",
  });
  app.stage.addChild(screenManager);
  window.addEventListener("keydown", (event) => screenManager.handleKey(event));
  const editorScene = cityEditorMode ? screenManager.cityEditorScene() : undefined;
  if (editorScene) {
    createCityEditor({ scene: editorScene });
  }
  if (layoutEditorMode) {
    const layoutEditor = createLayoutEditor({ targets: screenManager.createLayoutEditorTargets() });
    root.appendChild(layoutEditor.element);
  }

  const updateDocumentPhase = (): void => {
    if (lastDocumentPhase === phase) {
      return;
    }
    document.documentElement.dataset.appPhase = phase;
    lastDocumentPhase = phase;
  };
  const renderCurrentFrame = (frameDt: number): void => {
    updateDocumentPhase();
    if (phase === "playing" && !state.isPaused) {
      accumulator += frameDt * GAME_CONFIG.match.simulationSpeed;
      while (accumulator >= fixedDt) {
        for (const command of chooseBotCommands(state.players.rival)) {
          state = applyPlayerCommand(state, command);
        }
        state = tickMatch(state, fixedDt);
        accumulator -= fixedDt;
      }
    }

    const dispatchState = selectDispatchConsoleState(state);
    const productionState = selectProductionConsoleState(state);
    const result = computeFinalResult(state);
    const matchOver = isMatchOver(state);
    if (phase === "playing" && matchOver) {
      phase = "ended";
      updateDocumentPhase();
      gameMenu.showEnd(result, state);
    }
    screenManager.update({
      dispatch: dispatchState,
      production: productionState,
      result,
      match: state,
      isMatchOver: matchOver,
      dt: phase === "editing" || state.isPaused ? 0 : frameDt,
    });
    debugPanel?.update(dispatchState, productionState, state.isPaused);
  };
  const resetMatch = (): void => {
    state = createInitialMatchState({ seed: matchSeed });
    accumulator = 0;
    phase = editorMode ? "editing" : "playing";
    gameMenu.hide();
    Ticker.system.start();
    app.start();
  };
  const continueMatch = (): void => {
    if (phase !== "playing") {
      return;
    }
    state = applyPlayerCommand(state, { type: "resume" });
    gameMenu.hide();
    Ticker.system.start();
    app.start();
  };
  const pauseMatch = (): void => {
    if (phase !== "playing" || isMatchOver(state)) {
      return;
    }
    state = applyPlayerCommand(state, { type: "pause" });
    renderCurrentFrame(0);
    gameMenu.showPause();
    app.render();
    app.stop();
    Ticker.system.stop();
  };
  const returnToMainMenu = (): void => {
    state = createInitialMatchState({ seed: matchSeed });
    accumulator = 0;
    phase = "menu";
    gameMenu.showStart();
    renderCurrentFrame(0);
    app.render();
    app.stop();
    Ticker.system.stop();
  };
  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return;
    }
    if (event.key !== "Escape" && event.code !== "KeyP") {
      return;
    }
    if (phase !== "playing" || isMatchOver(state)) {
      return;
    }
    event.preventDefault();
    if (state.isPaused) {
      continueMatch();
      return;
    }
    pauseMatch();
  });

  const fixedDt = 1 / GAME_CONFIG.match.tickRateHz;

  app.ticker.add((ticker) => {
    const frameDt = Math.min(ticker.deltaMS / 1000, 0.1);
    renderCurrentFrame(frameDt);
    if (phase === "ended") {
      app.render();
      app.stop();
      Ticker.system.stop();
    }
  });

  renderCurrentFrame(0);
  app.render();
  if (phase === "playing" || phase === "editing") {
    Ticker.system.start();
    app.start();
  } else {
    app.stop();
    Ticker.system.stop();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      app.stop();
      Ticker.system.stop();
      return;
    }
    if ((phase === "playing" && !state.isPaused) || phase === "editing") {
      Ticker.system.start();
      app.start();
    } else {
      renderCurrentFrame(0);
      app.render();
      Ticker.system.stop();
    }
  });

  return {
    resetMatch,
    continueMatch,
    pauseMatch,
    returnToMainMenu,
  };
}
