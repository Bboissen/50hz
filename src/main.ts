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
  const autoStart = searchParams.get("play") === "1" || devMode || cityEditorMode;
  let state: MatchState = createInitialMatchState({ seed: matchSeed });
  let phase: "menu" | "playing" | "ended" | "editing" = cityEditorMode ? "editing" : autoStart ? "playing" : "menu";
  const app = await createPixiApp(root);
  const assets = await createAssetResolver();
  let accumulator = 0;

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
          phase = cityEditorMode ? "editing" : "playing";
        },
      })
    : undefined;
  if (debugPanel) {
    root.appendChild(debugPanel.element);
  }
  const screenManager = new ScreenManager(assets, dispatch, {
    showReferenceOverlay: searchParams.get("deskRef") === "1",
    showLayoutDebug: searchParams.get("layoutDebug") === "1",
  });
  app.stage.addChild(screenManager);
  window.addEventListener("keydown", (event) => screenManager.handleKey(event));
  const editorScene = cityEditorMode ? screenManager.cityEditorScene() : undefined;
  if (editorScene) {
    createCityEditor({ scene: editorScene });
  }
  if (devMode && searchParams.get("layoutEdit") === "1") {
    const layoutEditor = createLayoutEditor({ targets: screenManager.createLayoutEditorTargets() });
    root.appendChild(layoutEditor.element);
  }

  const resetMatch = (): void => {
    state = createInitialMatchState({ seed: matchSeed });
    accumulator = 0;
    phase = "playing";
    gameMenu.hide();
  };
  const gameMenu = createGameMenu({
    onPlay: resetMatch,
    onReplay: resetMatch,
  });
  if (!autoStart) {
    gameMenu.showStart();
  }

  const fixedDt = 1 / GAME_CONFIG.match.tickRateHz;

  app.ticker.add((ticker) => {
    const frameDt = Math.min(ticker.deltaMS / 1000, 0.1);
    document.documentElement.dataset.appPhase = phase;
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
  });
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start 50Hz", error);
  root.textContent = "50Hz failed to start. Check the console for details.";
});
