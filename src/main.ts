import { chooseBotCommands } from "./gameplay/bot";
import {
  applyPlayerCommand,
  createInitialMatchState,
  selectDispatchConsoleState,
  selectProductionConsoleState,
  tickMatch,
} from "./gameplay/match";
import type { MatchState, PlayerCommand } from "./gameplay/types";
import { createPixiApp } from "./pixi/createPixiApp";
import { MinimalGameView } from "./pixi/MinimalGameView";
import { createDebugPanel } from "./ui/debugPanel";
import "./styles.css";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Missing #app root element");
}

const root = appRoot;

async function bootstrap(): Promise<void> {
  let state: MatchState = createInitialMatchState();
  const app = await createPixiApp(root);
  const view = new MinimalGameView();
  app.stage.addChild(view);

  const dispatch = (command: PlayerCommand): void => {
    state = applyPlayerCommand(state, command);
  };

  const debugPanel = createDebugPanel({
    onCommand: dispatch,
    onReset: () => {
      state = createInitialMatchState();
    },
  });
  root.appendChild(debugPanel.element);

  let accumulator = 0;
  const fixedDt = 1 / 30;

  app.ticker.add((ticker) => {
    accumulator += Math.min(ticker.deltaMS / 1000, 0.1);
    while (accumulator >= fixedDt) {
      for (const command of chooseBotCommands(state.players.rival)) {
        state = applyPlayerCommand(state, command);
      }
      state = tickMatch(state, fixedDt);
      accumulator -= fixedDt;
    }

    const dispatchState = selectDispatchConsoleState(state);
    const productionState = selectProductionConsoleState(state);
    view.update(dispatchState);
    debugPanel.update(dispatchState, productionState, state.isPaused);
  });
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start 50Hz", error);
  root.textContent = "50Hz failed to start. Check the console for details.";
});
