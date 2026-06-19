import "./styles.css";
import { Application, Assets, type Texture } from "pixi.js";

import {
  CITY_LEVELS,
  CITY_SLOT_ASSET_URLS,
  CITY_STATIC_ASSET_URLS,
  UPGRADEABLE_CITY_SLOT_IDS,
} from "./assetManifest";
import { CityScene, type CitySceneTextures } from "./CityScene";
import type { CityLevel, CitySlotId, CityViewState, UpgradeableCitySlotId } from "./cityTypes";

const mount = document.querySelector<HTMLElement>("#pixi-stage");
if (!mount) {
  throw new Error("Missing #pixi-stage mount");
}

const app = new Application();
await app.init({
  resizeTo: mount,
  background: "#101711",
  antialias: false,
  autoDensity: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
});
mount.appendChild(app.canvas);

const textures = await loadCitySceneTextures();
const scene = new CityScene(textures);
app.stage.addChild(scene);
scene.resize(app.screen.width, app.screen.height);
scene.setLevels(readInitialLevels());
syncDocumentState(scene);

app.renderer.on("resize", (width: number, height: number) => {
  scene.resize(width, height);
});

window.addEventListener("keydown", (event) => {
  const slotId = keyToSlotId(event.key);
  if (slotId) {
    event.preventDefault();
    scene.selectSlot(slotId);
    syncDocumentState(scene);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    scene.adjustSelectedSlotLevel(1);
    syncDocumentState(scene);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    scene.adjustSelectedSlotLevel(-1);
    syncDocumentState(scene);
  } else if (event.key === "1" || event.key === "2" || event.key === "3") {
    event.preventDefault();
    scene.setSelectedSlotLevel(Number(event.key) as CityLevel);
    syncDocumentState(scene);
  } else if (event.key.toLowerCase() === "d") {
    event.preventDefault();
    scene.toggleDebug();
    syncDocumentState(scene);
  }
});

async function loadCitySceneTextures(): Promise<CitySceneTextures> {
  const [terrain, deskFrame] = await Promise.all([
    loadTexture(CITY_STATIC_ASSET_URLS.terrain),
    loadTexture(CITY_STATIC_ASSET_URLS.deskFrame),
  ]);
  const openAiSign = await loadTexture(CITY_STATIC_ASSET_URLS.openAiSign);

  const slots = {} as Record<CitySlotId, Record<CityLevel, Texture>>;
  await Promise.all(
    Object.entries(CITY_SLOT_ASSET_URLS).map(async ([slotId, levelUrls]) => {
      const levelTextures = {} as Record<CityLevel, Texture>;
      await Promise.all(
        CITY_LEVELS.map(async (level) => {
          levelTextures[level] = await loadTexture(levelUrls[level]);
        }),
      );
      slots[slotId as CitySlotId] = levelTextures;
    }),
  );

  return { terrain, deskFrame, openAiSign, slots };
}

async function loadTexture(src: string): Promise<Texture> {
  const texture = await Assets.load<Texture>({ src, data: { scaleMode: "nearest" } });
  texture.source.scaleMode = "nearest";
  return texture;
}

function readInitialLevels(): CityViewState {
  const searchParams = new URLSearchParams(window.location.search);
  const levels: CityViewState = {};

  for (const slotId of UPGRADEABLE_CITY_SLOT_IDS) {
    const level = parseCityLevel(searchParams.get(slotId));
    if (level) {
      levels[slotId] = level;
    }
  }

  return levels;
}

function parseCityLevel(value: string | null): CityLevel | undefined {
  if (value === "1" || value === "2" || value === "3") {
    return Number(value) as CityLevel;
  }
  return undefined;
}

function keyToSlotId(key: string): UpgradeableCitySlotId | undefined {
  const normalized = key.toLowerCase();
  const byKey: Partial<Record<string, UpgradeableCitySlotId>> = {
    h: "household",
    b: "business",
    c: "datacenter",
    n: "nuclear",
    t: "thermal",
    s: "solar",
    w: "wind",
    m: "dam",
  };
  return byKey[normalized];
}

function syncDocumentState(cityScene: CityScene): void {
  const root = document.documentElement;
  root.dataset.experimentReady = "true";
  const state = cityScene.debugState();

  for (const [key, value] of Object.entries(state)) {
    root.dataset[toDatasetKey(key)] = value;
  }
}

function toDatasetKey(key: string): string {
  return key.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}
