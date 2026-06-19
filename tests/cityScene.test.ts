import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { Texture, TextureSource } from "pixi.js";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { createInitialMatchState, selectProductionConsoleState } from "../src/gameplay/match";
import { AnimatedTurbineField } from "../src/pixi/city/AnimatedTurbineField";
import { CITY_ASSET_SOURCES, CITY_LEVELS, CITY_SLOT_IDS } from "../src/pixi/city/cityAssets";
import { CityScene, type CitySceneTextures } from "../src/pixi/city/CityScene";
import { CITY_DECORATION_CONFIGS, CITY_SLOT_CONFIGS, TERRAIN_TILE_CONFIGS } from "../src/pixi/city/citySceneConfig";
import type { CityLevel, CitySlotId } from "../src/pixi/city/cityTypes";
import { cityViewStateFromProductionState, selectDamWaterVisualState, selectWindFarmVisualState } from "../src/pixi/city/cityState";

function repoPath(publicPath: string): string {
  return join(process.cwd(), publicPath.replace(/^\//, ""));
}

function productionState() {
  return selectProductionConsoleState(createInitialMatchState());
}

function cityTextures(): CitySceneTextures {
  const slots = {} as Record<CitySlotId, Record<CityLevel, Texture>>;
  for (const slotId of CITY_SLOT_IDS) {
    const levels = {} as Record<CityLevel, Texture>;
    for (const level of CITY_LEVELS) {
      levels[level] = Texture.EMPTY;
    }
    slots[slotId] = levels;
  }
  return {
    terrain: Texture.EMPTY,
    openAiSign: Texture.EMPTY,
    damWater: {
      upstreamTopMask: Texture.EMPTY,
      upstreamSideMask: Texture.EMPTY,
      downstreamMask: Texture.EMPTY,
    },
    windFrames: Array.from({ length: 8 }, () => Texture.EMPTY),
    slots,
  };
}

function textureWithSize(width: number, height: number): Texture {
  return new Texture({ source: new TextureSource({ width, height }) });
}

describe("city view production integration", () => {
  it("maps selector sector and plant levels to city slots", () => {
    const state = productionState();
    const view = cityViewStateFromProductionState({
      ...state,
      sectors: {
        ...state.sectors,
        homes: { ...state.sectors.homes, demandLevel: 2, isSpiking: true, activeEventId: "footballFinal" },
        services: { ...state.sectors.services, demandLevel: 3, isDemandCritical: true },
        dataCenters: { ...state.sectors.dataCenters, demandLevel: 1, isBrownedOut: true },
      },
      plants: {
        ...state.plants,
        reactor: { ...state.plants.reactor, level: 1, purchasedLevel: 3 },
        boiler: { ...state.plants.boiler, level: 2, purchasedLevel: 3 },
        renewables: { ...state.plants.renewables, level: 3 },
        waterDam: { ...state.plants.waterDam, level: 2 },
      },
    });

    expect(view.levels).toMatchObject({
      household: 2,
      business: 3,
      datacenter: 1,
      nuclear: 1,
      thermal: 2,
      solar: 3,
      wind: 3,
      dam: 2,
    });
    expect(view.sectorOverlays.household).toMatchObject({ isSpiking: true, activeEventId: "footballFinal" });
    expect(view.sectorOverlays.business).toMatchObject({ isDemandCritical: true });
    expect(view.sectorOverlays.datacenter).toMatchObject({ isBrownedOut: true });
  });

  it("clamps grid-down sector level 0 without inventing level 0 textures", () => {
    const state = productionState();
    const view = cityViewStateFromProductionState({
      ...state,
      sectors: {
        ...state.sectors,
        homes: { ...state.sectors.homes, demandLevel: 0 },
      },
    });

    expect(view.levels.household).toBe(1);
    expect(view.brownout).toBe(true);
    expect(view.sectorOverlays.household.isBrownedOut).toBe(true);
  });

  it("selects dam water visual state from gameplay dam fields", () => {
    const state = productionState();
    const visual = selectDamWaterVisualState({
      ...state,
      storedWaterMWh: 10,
      waterDamCapacityMWh: 20,
      damOutputMW: 7.5,
      damAbsorbMW: 3,
      waterDamMaxPowerMW: 15,
      rainActive: true,
      isGridDown: true,
      timeOfDayRatio: 0.75,
    });

    expect(visual).toEqual({
      levelRatio: 0.5,
      outputRatio: 0.5,
      absorbRatio: 0.2,
      rainActive: true,
      isGridDown: true,
      timeOfDayRatio: 0.75,
    });
  });

  it("selects wind farm visual state from gameplay wind fields", () => {
    const state = productionState();
    const visual = selectWindFarmVisualState({
      ...state,
      windOutputMW: 5,
      windPotentialMW: 12,
      windPeakMW: 15,
      windEnabled: true,
      currentWindKmh: 44,
      plantStates: { ...state.plantStates, wind: "gridDown" },
      plants: {
        ...state.plants,
        renewables: { ...state.plants.renewables, level: 3 },
      },
    });

    expect(visual).toEqual({
      renewableLevel: 3,
      windOutputMW: 5,
      windPotentialMW: 12,
      windPeakMW: 15,
      windEnabled: true,
      windPlantOnline: false,
      currentWindKmh: 44,
    });
  });

  it("declares existing alpha PNGs for every production city asset", async () => {
    for (const [key, publicPath] of Object.entries(CITY_ASSET_SOURCES)) {
      const path = repoPath(publicPath);
      expect(existsSync(path), key).toBe(true);
      expect(Array.from(readFileSync(path).subarray(1, 4)), key).toEqual([0x50, 0x4e, 0x47]);
      expect((await sharp(path).metadata()).hasAlpha, key).toBe(true);
    }
  });

  it("swaps independent slot levels through CityScene.setLevels", () => {
    const scene = new CityScene(cityTextures());

    scene.setLevels({
      household: 3,
      business: 2,
      datacenter: 1,
      nuclear: 2,
      thermal: 1,
      solar: 3,
      wind: 2,
      dam: 1,
    });

    expect(scene.debugSlotLevel("household")).toBe(3);
    expect(scene.debugSlotLevel("business")).toBe(2);
    expect(scene.debugSlotLevel("nuclear")).toBe(2);
    scene.setLevels({ ...cityViewStateFromProductionState(productionState()).levels, household: 1 });
    expect(scene.debugSlotLevel("household")).toBe(1);
    expect(scene.debugSlotLevel("business")).toBe(1);
  });

  it("keeps each city slot rendered at one stable size across levels", () => {
    const textures = cityTextures();
    textures.slots.nuclear = {
      1: textureWithSize(918, 514),
      2: textureWithSize(1211, 674),
      3: textureWithSize(1213, 770),
    };
    textures.slots.thermal = {
      1: textureWithSize(1348, 735),
      2: textureWithSize(1350, 787),
      3: textureWithSize(1352, 785),
    };
    textures.slots.wind = {
      1: textureWithSize(1432, 830),
      2: textureWithSize(1432, 822),
      3: textureWithSize(1430, 826),
    };
    const scene = new CityScene(textures);

    for (const slotId of ["nuclear", "thermal", "wind"] as const) {
      scene.setLevels({ ...cityViewStateFromProductionState(productionState()).levels, [slotId]: 1 });
      const first = scene.debugSlotRenderedSize(slotId);
      scene.setLevels({ ...cityViewStateFromProductionState(productionState()).levels, [slotId]: 2 });
      const second = scene.debugSlotRenderedSize(slotId);
      scene.setLevels({ ...cityViewStateFromProductionState(productionState()).levels, [slotId]: 3 });
      const third = scene.debugSlotRenderedSize(slotId);

      expect(second).toEqual(first);
      expect(third).toEqual(first);
    }
  });

  it("pulses sector overlays without changing baseline level textures", () => {
    const scene = new CityScene(cityTextures());

    scene.setViewState({
      levels: {
        ...cityViewStateFromProductionState(productionState()).levels,
        household: 2,
        business: 3,
      },
      brownout: false,
      sectorOverlays: {
        household: { isSpiking: true, isDemandCritical: false, isBrownedOut: false, activeEventId: "footballFinal" },
        business: { isSpiking: false, isDemandCritical: true, isBrownedOut: false },
        datacenter: { isSpiking: false, isDemandCritical: false, isBrownedOut: false },
      },
    });
    const householdAlpha = scene.debugSectorOverlayAlpha("household");

    scene.tick(100);

    expect(scene.debugSlotLevel("household")).toBe(2);
    expect(scene.debugSlotLevel("business")).toBe(3);
    expect(scene.debugSectorOverlayState("household")).toMatchObject({
      isSpiking: true,
      activeEventId: "footballFinal",
    });
    expect(scene.debugSectorOverlayAlpha("household")).not.toBe(householdAlpha);
    expect(scene.debugSectorOverlayAlpha("business")).toBeGreaterThan(0);
    expect(scene.debugSectorOverlayAlpha("datacenter")).toBe(0);
  });

  it("updates dam water state without changing dam upgrade level", () => {
    const scene = new CityScene(cityTextures());

    scene.setLevels({ ...cityViewStateFromProductionState(productionState()).levels, dam: 2 });
    scene.setDamWaterVisualState({
      levelRatio: 0.82,
      outputRatio: 0.6,
      absorbRatio: 0,
      rainActive: false,
      isGridDown: false,
      timeOfDayRatio: 0.25,
    });

    expect(scene.debugSlotLevel("dam")).toBe(2);
    expect(scene.debugDamWaterState()).toMatchObject({
      levelRatio: 0.82,
      outputRatio: 0.6,
      absorbRatio: 0,
    });

    scene.setDamWaterVisualState({
      levelRatio: 0.1,
      outputRatio: 0,
      absorbRatio: 1,
      rainActive: true,
      isGridDown: true,
      timeOfDayRatio: 0.8,
    });
    expect(scene.debugSlotLevel("dam")).toBe(2);
    expect(scene.debugDamWaterState()).toMatchObject({
      levelRatio: 0.1,
      absorbRatio: 1,
      isGridDown: true,
    });
  });

  it("activates turbine count by renewable level and only animates valid output", () => {
    const field = new AnimatedTurbineField(Array.from({ length: 8 }, () => Texture.EMPTY));

    field.setVisualState({
      renewableLevel: 1,
      windOutputMW: 0,
      windPotentialMW: 10,
      windPeakMW: 15,
      windEnabled: true,
      windPlantOnline: true,
      currentWindKmh: 30,
    });
    field.tick(1000);
    expect(field.debugActiveTurbineCount()).toBe(2);
    expect(field.debugVisibleMountIndices()).toEqual([1, 3]);
    expect(field.debugFramePosition()).toBe(0);

    field.setVisualState({
      renewableLevel: 2,
      windOutputMW: 0,
      windPotentialMW: 10,
      windPeakMW: 15,
      windEnabled: false,
      windPlantOnline: true,
      currentWindKmh: 30,
    });
    field.tick(1000);
    expect(field.debugActiveTurbineCount()).toBe(3);
    expect(field.debugVisibleMountIndices()).toEqual([0, 1, 3]);
    expect(field.debugFramePosition()).toBe(0);

    field.setVisualState({
      renewableLevel: 3,
      windOutputMW: 3,
      windPotentialMW: 10,
      windPeakMW: 15,
      windEnabled: true,
      windPlantOnline: true,
      currentWindKmh: 30,
    });
    field.tick(1000);
    const slowPosition = field.debugFramePosition();
    expect(field.debugActiveTurbineCount()).toBe(4);
    expect(field.debugVisibleMountIndices()).toEqual([0, 1, 2, 3]);
    expect(slowPosition).toBeGreaterThan(0);

    field.setVisualState({
      renewableLevel: 3,
      windOutputMW: 12,
      windPotentialMW: 12,
      windPeakMW: 15,
      windEnabled: true,
      windPlantOnline: true,
      currentWindKmh: 44,
    });
    field.tick(1000);
    expect(field.debugFramePosition() - slowPosition).toBeGreaterThan(slowPosition);
  });

  it("keeps the turbine field empty-safe when optional frame assets are missing", () => {
    const field = new AnimatedTurbineField([]);

    field.setVisualState({
      renewableLevel: 3,
      windOutputMW: 10,
      windPotentialMW: 12,
      windPeakMW: 15,
      windEnabled: true,
      windPlantOnline: true,
      currentWindKmh: 44,
    });

    expect(() => field.tick(1000)).not.toThrow();
    expect(field.debugActiveTurbineCount()).toBe(0);
    expect(field.debugFirstFrameIndex()).toBe(0);
  });

  it("keeps production city code independent from experiment sources", () => {
    const productionFiles = [
      "src/pixi/city/CityScene.ts",
      "src/pixi/city/CitySlot.ts",
      "src/pixi/city/cityAssets.ts",
      "src/pixi/city/citySceneConfig.ts",
      "src/pixi/city/cityState.ts",
    ];
    const forbiddenExperimentPath = ["experiments", "city-view"].join("/");

    for (const file of productionFiles) {
      expect(readFileSync(join(process.cwd(), file), "utf8"), file).not.toContain(forbiddenExperimentPath);
    }
  });

  it("uses the edited city composition with terrain behind all objects", () => {
    const slotScale = Object.fromEntries(CITY_SLOT_CONFIGS.map((slot) => [slot.id, slot.scale]));
    const terrain = TERRAIN_TILE_CONFIGS[0];
    const openAiSign = CITY_DECORATION_CONFIGS.find((decoration) => decoration.id === "openAiSign");
    const cityZIndexes = [
      ...CITY_SLOT_CONFIGS.map((slot) => slot.zIndex),
      ...(openAiSign ? [openAiSign.zIndex] : []),
    ];

    expect(terrain.zIndex).toBe(-10_000);
    expect(Math.min(...cityZIndexes)).toBeGreaterThan(terrain.zIndex);
    expect(CITY_SLOT_CONFIGS.map((slot) => slot.id)).toEqual([
      "dam",
      "nuclear",
      "wind",
      "solar",
      "thermal",
      "business",
      "household",
      "datacenter",
    ]);
    expect(slotScale).toMatchObject({
      dam: 0.2975,
      nuclear: 0.505,
      wind: 0.38,
      solar: 0.38,
      thermal: 0.396,
      business: 0.32,
      household: 0.3125,
      datacenter: 0.3545,
    });
    expect(openAiSign?.scale).toBe(0.2255);
    expect(openAiSign?.zIndex).toBeLessThan(CITY_SLOT_CONFIGS.find((slot) => slot.id === "nuclear")?.zIndex ?? Number.NEGATIVE_INFINITY);
    expect(openAiSign?.zIndex).toBeLessThan(CITY_SLOT_CONFIGS.find((slot) => slot.id === "business")?.zIndex ?? Number.NEGATIVE_INFINITY);
  });
});
