import { Ticker } from "pixi.js";

import { chooseBotCommands } from "./gameplay/bot";
import {
  applyPlayerCommand,
  createInitialMatchState,
  computeFinalResult,
  selectDispatchConsoleState,
  selectProductionConsoleState,
  isMatchOver,
  tickMatch,
} from "./gameplay/match";
import { GAME_CONFIG } from "./gameplay/config";
import type { MatchState, PlayerCommand } from "./gameplay/types";
import { createAssetResolver } from "./pixi/assets";
import { createPixiApp } from "./pixi/createPixiApp";
import { ScreenManager } from "./pixi/screens/ScreenManager";
import { createCityEditor } from "./ui/cityEditor";
import { createDebugPanel } from "./ui/debugPanel";
import { createGameMenu } from "./ui/gameMenu";
import { createLayoutEditor } from "./ui/layoutEditor";
import "./styles.css";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Missing #app root element");
}

const root = appRoot;

async function bootstrap(): Promise<void> {
  const searchParams = new URLSearchParams(window.location.search);
  const matchSeed = searchParams.get("seed") ?? undefined;
  const devMode = searchParams.get("dev") === "1";
  const cityEditorMode = searchParams.get("cityEditor") === "1";
  const layoutEditorMode = devMode && searchParams.get("layoutEdit") === "1";
  const editorMode = cityEditorMode || layoutEditorMode;
  const autoStart = searchParams.get("play") === "1" || devMode || editorMode;
  let state: MatchState = createInitialMatchState({ seed: matchSeed });
  let phase: "menu" | "playing" | "ended" | "editing" = editorMode ? "editing" : autoStart ? "playing" : "menu";
  const app = await createPixiApp(root);
  const assets = await createAssetResolver();
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
    if (phase === "playing") {
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
      dt: phase === "editing" ? 0 : frameDt,
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
  const gameMenu = createGameMenu({
    onPlay: resetMatch,
    onReplay: resetMatch,
    onMainMenu: returnToMainMenu,
  });
  if (!autoStart) {
    gameMenu.showStart();
  }

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
    if (phase === "playing" || phase === "editing") {
      Ticker.system.start();
      app.start();
    } else {
      renderCurrentFrame(0);
      app.render();
      Ticker.system.stop();
    }
  });
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start 50Hz", error);
  root.textContent = "50Hz failed to start. Check the console for details.";
});
