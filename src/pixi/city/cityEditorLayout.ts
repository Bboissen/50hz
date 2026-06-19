import {
  CITY_DECORATION_CONFIGS,
  CITY_SLOT_CONFIGS,
  TERRAIN_TILE_CONFIGS,
  WORLD_CAMERA,
} from "./citySceneConfig";
import type { CitySlotId } from "./cityTypes";

export type CityEditorElementId = "terrain" | "openAiSign" | CitySlotId;

export type CityEditorElementConfig = {
  id: CityEditorElementId;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
};

export type CityEditorLayout = Record<CityEditorElementId, CityEditorElementConfig>;

export const CITY_EDITOR_ELEMENT_IDS = [
  "terrain",
  "openAiSign",
  "dam",
  "nuclear",
  "wind",
  "solar",
  "thermal",
  "business",
  "household",
  "datacenter",
] as const satisfies readonly CityEditorElementId[];

export type CityEditorState = {
  selectedIndex: number;
  debugVisible: boolean;
  layout: CityEditorLayout;
};

export type CityEditorCommand =
  | { type: "next" }
  | { type: "previous" }
  | { type: "move"; dx: number; dy: number }
  | { type: "scale"; delta: number }
  | { type: "layer"; dz: number }
  | { type: "toggleDebug" };

const TERRAIN_Z_INDEX = -10_000;

export function createDefaultCityEditorState(): CityEditorState {
  return {
    selectedIndex: 0,
    debugVisible: true,
    layout: createDefaultCityEditorLayout(),
  };
}

export function createDefaultCityEditorLayout(): CityEditorLayout {
  const terrain = TERRAIN_TILE_CONFIGS[0];
  const openAiSign = CITY_DECORATION_CONFIGS.find((config) => config.id === "openAiSign");
  if (!terrain || !openAiSign) {
    throw new Error("City editor requires terrain and openAiSign configs");
  }

  return {
    terrain: editable("terrain", terrain),
    openAiSign: editable("openAiSign", openAiSign),
    ...Object.fromEntries(CITY_SLOT_CONFIGS.map((config) => [config.id, editable(config.id, config)])),
  } as CityEditorLayout;
}

export function applyCityEditorCommand(state: CityEditorState, command: CityEditorCommand): CityEditorState {
  const selectedId = CITY_EDITOR_ELEMENT_IDS[state.selectedIndex] ?? CITY_EDITOR_ELEMENT_IDS[0];
  const selected = state.layout[selectedId];

  if (command.type === "next" || command.type === "previous") {
    const direction = command.type === "next" ? 1 : -1;
    return {
      ...state,
      selectedIndex: positiveModulo(state.selectedIndex + direction, CITY_EDITOR_ELEMENT_IDS.length),
    };
  }

  if (command.type === "toggleDebug") {
    return { ...state, debugVisible: !state.debugVisible };
  }

  if (command.type === "move") {
    const layerOffset = selected.id === "terrain" ? 0 : selected.zIndex - automaticDepthIndex(selected);
    return replaceSelected(state, withAutomaticDepth({
      ...selected,
      x: round3(selected.x + command.dx),
      y: round3(selected.y + command.dy),
    }, layerOffset));
  }

  if (command.type === "layer") {
    if (selected.id === "terrain") {
      return state;
    }
    return replaceSelected(state, {
      ...selected,
      zIndex: round3(selected.zIndex + command.dz),
    });
  }

  return replaceSelected(state, {
    ...selected,
    scale: Math.max(0.001, round4(selected.scale + command.delta)),
  });
}

export function serializeCityEditorConfig(layout: CityEditorLayout): string {
  const normalizedLayout = normalizeCityEditorLayoutDepth(layout);
  const slotById = new Map(CITY_SLOT_CONFIGS.map((config) => [config.id, config]));

  return [
    `export const WORLD_CAMERA = ${inlineObject(WORLD_CAMERA)};`,
    "",
    "export const TERRAIN_TILE_CONFIGS = [",
    `  ${inlineObject(withoutId(normalizedLayout.terrain))},`,
    "] as const;",
    "",
    "export const CITY_DECORATION_CONFIGS = [",
    `  ${inlineObject(normalizedLayout.openAiSign)},`,
    "] as const;",
    "",
    "export const CITY_SLOT_CONFIGS: readonly CitySlotConfig[] = [",
    ...CITY_EDITOR_ELEMENT_IDS.filter(isSlotId).map((slotId) => {
      const base = slotById.get(slotId);
      const edited = normalizedLayout[slotId];
      return `  ${inlineObject({
        id: slotId,
        upgradeable: base?.upgradeable ?? true,
        x: edited.x,
        y: edited.y,
        scale: edited.scale,
        zIndex: edited.zIndex,
        defaultLevel: base?.defaultLevel ?? 1,
      })},`;
    }),
    "] as const;",
  ].join("\n");
}

export function normalizeCityEditorLayoutDepth(layout: CityEditorLayout): CityEditorLayout {
  return Object.fromEntries(
    CITY_EDITOR_ELEMENT_IDS.map((elementId) => [elementId, clampDepth(layout[elementId])]),
  ) as CityEditorLayout;
}

function editable(id: CityEditorElementId, config: { x: number; y: number; scale: number; zIndex: number }): CityEditorElementConfig {
  return withAutomaticDepth({
    id,
    x: config.x,
    y: config.y,
    scale: config.scale,
    zIndex: config.zIndex,
  });
}

function replaceSelected(state: CityEditorState, config: CityEditorElementConfig): CityEditorState {
  return {
    ...state,
    layout: {
      ...state.layout,
      [config.id]: config,
    },
  };
}

function isSlotId(id: CityEditorElementId): id is CitySlotId {
  return id !== "terrain" && id !== "openAiSign";
}

function inlineObject(value: Record<string, unknown>): string {
  return `{ ${Object.entries(value)
    .map(([key, entry]) => `${key}: ${typeof entry === "string" ? JSON.stringify(entry) : String(entry)}`)
    .join(", ")} }`;
}

function withoutId(config: CityEditorElementConfig): Omit<CityEditorElementConfig, "id"> {
  const { id: _id, ...rest } = config;
  return rest;
}

function clampDepth(config: CityEditorElementConfig): CityEditorElementConfig {
  if (config.id === "terrain") {
    return { ...config, zIndex: TERRAIN_Z_INDEX };
  }
  return { ...config, zIndex: Math.max(TERRAIN_Z_INDEX + 1, round3(config.zIndex)) };
}

function withAutomaticDepth(config: CityEditorElementConfig, layerOffset = 0): CityEditorElementConfig {
  if (config.id === "terrain") {
    return { ...config, zIndex: TERRAIN_Z_INDEX };
  }
  return { ...config, zIndex: round3(automaticDepthIndex(config) + layerOffset) };
}

function automaticDepthIndex(config: Pick<CityEditorElementConfig, "x" | "y">): number {
  return round3(config.x - config.y);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
