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
import { createDebugPanel } from "./ui/debugPanel";
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
  let state: MatchState = createInitialMatchState({ seed: matchSeed });
  const app = await createPixiApp(root);
  const assets = await createAssetResolver();

  const dispatch = (command: PlayerCommand): void => {
    state = applyPlayerCommand(state, command);
  };

  const debugPanel = devMode
    ? createDebugPanel({
        onCommand: dispatch,
        onReset: () => {
          state = createInitialMatchState({ seed: matchSeed });
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

  let accumulator = 0;
  const fixedDt = 1 / GAME_CONFIG.match.tickRateHz;

  app.ticker.add((ticker) => {
    accumulator += Math.min(ticker.deltaMS / 1000, 0.1) * GAME_CONFIG.match.simulationSpeed;
    while (accumulator >= fixedDt) {
      for (const command of chooseBotCommands(state.players.rival)) {
        state = applyPlayerCommand(state, command);
      }
      state = tickMatch(state, fixedDt);
      accumulator -= fixedDt;
    }

    const dispatchState = selectDispatchConsoleState(state);
    const productionState = selectProductionConsoleState(state);
    screenManager.update({
      dispatch: dispatchState,
      production: productionState,
      result: computeFinalResult(state),
      match: state,
      isMatchOver: isMatchOver(state),
      dt: Math.min(ticker.deltaMS / 1000, 0.1),
    });
    debugPanel?.update(dispatchState, productionState, state.isPaused);
  });
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start 50Hz", error);
  root.textContent = "50Hz failed to start. Check the console for details.";
});
