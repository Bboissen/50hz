import { createGameMenu } from "./ui/gameMenu";
import "./styles.css";

import type { GameRuntime } from "./gameRuntime";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Missing #app root element");
}

const root = appRoot;
let runtime: GameRuntime | undefined;
let runtimeLoad: Promise<GameRuntime> | undefined;

const startRuntime = async (): Promise<void> => {
  if (runtime) {
    runtime.resetMatch();
    return;
  }
  if (runtimeLoad) {
    return;
  }
  gameMenu.hide();
  runtimeLoad = import("./gameRuntime")
    .then((module) => module.startGameRuntime(root, gameMenu))
    .then((loadedRuntime) => {
      runtime = loadedRuntime;
      return loadedRuntime;
    })
    .catch((error: unknown) => {
      console.error("Failed to start 50Hz", error);
      root.textContent = "50Hz failed to start. Check the console for details.";
      throw error;
    })
    .finally(() => {
      runtimeLoad = undefined;
    });
  await runtimeLoad;
};

const gameMenu = createGameMenu({
  onPlay: () => {
    void startRuntime();
  },
  onContinue: () => runtime?.continueMatch(),
  onReplay: () => {
    void startRuntime();
  },
  onMainMenu: () => {
    if (runtime) {
      runtime.returnToMainMenu();
      return;
    }
    gameMenu.showStart();
  },
});

const searchParams = new URLSearchParams(window.location.search);
const devMode = searchParams.get("dev") === "1";
const cityEditorMode = searchParams.get("cityEditor") === "1";
const layoutEditorMode = devMode && searchParams.get("layoutEdit") === "1";
const editorMode = cityEditorMode || layoutEditorMode;
const autoStart = searchParams.get("play") === "1" || devMode || editorMode;

if (autoStart) {
  void startRuntime();
} else {
  gameMenu.showStart();
}
