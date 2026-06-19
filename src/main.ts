import { createGameMenu } from "./ui/gameMenu";
import "./styles.css";

import type { GameRuntime, GameRuntimeWarmup } from "./gameRuntime";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Missing #app root element");
}

const root = appRoot;
let runtime: GameRuntime | undefined;
let runtimeLoad: Promise<GameRuntime> | undefined;
let runtimeModuleLoad: Promise<typeof import("./gameRuntime")> | undefined;
let runtimeWarmupLoad: Promise<GameRuntimeWarmup> | undefined;
let runtimeWarmupReady = false;

const ensureRuntimeModule = (): Promise<typeof import("./gameRuntime")> => {
  runtimeModuleLoad ??= import("./gameRuntime").catch((error: unknown) => {
    runtimeModuleLoad = undefined;
    throw error;
  });
  return runtimeModuleLoad;
};

const ensureRuntimeWarmup = (): Promise<GameRuntimeWarmup> => {
  if (!runtimeWarmupLoad) {
    runtimeWarmupReady = false;
    runtimeWarmupLoad = ensureRuntimeModule()
      .then((module) => module.preloadGameRuntime())
      .then((prepared) => {
        runtimeWarmupReady = true;
        return prepared;
      })
      .catch((error: unknown) => {
        runtimeWarmupLoad = undefined;
        runtimeWarmupReady = false;
        throw error;
      });
  }
  return runtimeWarmupLoad;
};

const showStartMenu = (): void => {
  gameMenu.showStart();
  void ensureRuntimeWarmup().catch((error: unknown) => {
    console.warn("Failed to warm 50Hz startup", error);
  });
};

const startRuntime = async (): Promise<void> => {
  if (runtime) {
    runtime.resetMatch();
    return;
  }
  if (runtimeLoad) {
    if (!runtimeWarmupReady) {
      gameMenu.showLoading();
    }
    await runtimeLoad;
    return;
  }
  if (!runtimeWarmupReady) {
    gameMenu.showLoading();
  }
  runtimeLoad = (async () => {
    const runtimeModule = await ensureRuntimeModule();
    const warmup = await ensureRuntimeWarmup();
    const loadedRuntime = await runtimeModule.startGameRuntime(root, gameMenu, warmup);
    runtime = loadedRuntime;
    gameMenu.hide();
    return loadedRuntime;
  })()
    .catch((error: unknown) => {
      console.error("Failed to start 50Hz", error);
      gameMenu.hide();
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
    showStartMenu();
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
  showStartMenu();
}
