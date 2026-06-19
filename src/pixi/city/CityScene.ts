import { Container, Graphics, Sprite, type Texture } from "pixi.js";

import { AnimatedTurbineField, type WindFarmVisualState } from "./AnimatedTurbineField";
import {
  CITY_DECORATION_CONFIGS,
  CITY_SLOT_CONFIGS,
  DESK_VIEWPORT,
  TERRAIN_TILE_CONFIGS,
  WORLD_CAMERA,
} from "./citySceneConfig";
import { CitySlot } from "./CitySlot";
import type { CityLevel, CitySectorOverlayState, CitySectorSlotId, CitySlotId, CityViewState } from "./cityTypes";
import { DamWaterObject, type DamWaterTextures, type DamWaterVisualState } from "./DamWaterObject";

export type CitySceneTextures = {
  terrain: Texture;
  openAiSign: Texture;
  damWater: DamWaterTextures;
  windFrames: Texture[];
  slots: Record<CitySlotId, Record<CityLevel, Texture>>;
};

export class CityScene extends Container {
  private readonly viewportLayer = new Container({ label: "city-view-viewport-layer" });
  private readonly world = new Container({ label: "city-view-world" });
  private readonly slots = new Map<CitySlotId, CitySlot>();
  private readonly damWater: DamWaterObject;
  private readonly turbineField: AnimatedTurbineField;
  private readonly viewportMask = new Graphics({ label: "city-view-mask" });
  private readonly brownoutOverlay = new Graphics({ label: "city-view-brownout-overlay" });
  private readonly sectorOverlay = new Graphics({ label: "city-view-sector-overlay" });
  private sectorOverlays: CityViewState["sectorOverlays"] = emptySectorOverlays();
  private sectorOverlayAlpha: Record<CitySectorSlotId, number> = {
    household: 0,
    business: 0,
    datacenter: 0,
  };
  private animationSeconds = 0;

  public constructor(textures: CitySceneTextures) {
    super({ label: "city-view-root" });
    this.eventMode = "none";
    this.interactiveChildren = false;

    this.viewportLayer.mask = this.viewportMask;
    this.viewportLayer.addChild(this.world);
    this.world.sortableChildren = true;
    this.world.position.set(WORLD_CAMERA.x, WORLD_CAMERA.y);
    this.world.scale.set(WORLD_CAMERA.scale);

    for (const terrainConfig of TERRAIN_TILE_CONFIGS) {
      const terrain = new Sprite({ texture: textures.terrain, label: "city-view-terrain" });
      terrain.anchor.set(0.5);
      terrain.position.set(terrainConfig.x, terrainConfig.y);
      terrain.scale.set(terrainConfig.scale);
      terrain.zIndex = terrainConfig.zIndex;
      terrain.eventMode = "none";
      this.world.addChild(terrain);
    }

    for (const decorationConfig of CITY_DECORATION_CONFIGS) {
      const decoration = new Sprite({
        texture: textures.openAiSign,
        label: `city-view-decoration-${decorationConfig.id}`,
      });
      decoration.anchor.set(0.5);
      decoration.position.set(decorationConfig.x, decorationConfig.y);
      decoration.scale.set(decorationConfig.scale);
      decoration.zIndex = decorationConfig.zIndex;
      decoration.eventMode = "none";
      this.world.addChild(decoration);
    }

    const damConfig = CITY_SLOT_CONFIGS.find((config) => config.id === "dam");
    this.damWater = new DamWaterObject(textures.damWater);
    if (damConfig) {
      this.damWater.position.set(damConfig.x, damConfig.y);
      this.damWater.scale.set(damConfig.scale);
      this.damWater.zIndex = damConfig.zIndex - 0.5;
      this.world.addChild(this.damWater);
    }
    const windConfig = CITY_SLOT_CONFIGS.find((config) => config.id === "wind");
    this.turbineField = new AnimatedTurbineField(textures.windFrames);
    if (windConfig) {
      this.turbineField.position.set(windConfig.x, windConfig.y);
      this.turbineField.scale.set(windConfig.scale);
      this.turbineField.zIndex = windConfig.zIndex + 0.5;
      this.world.addChild(this.turbineField);
    }

    for (const config of CITY_SLOT_CONFIGS) {
      const slot = new CitySlot(config, textures.slots[config.id]);
      this.slots.set(config.id, slot);
      this.world.addChild(slot);
    }
    this.sectorOverlay.zIndex = 2_000;
    this.world.addChild(this.sectorOverlay);

    this.addChild(this.viewportLayer, this.viewportMask, this.brownoutOverlay);
    this.renderMask();
    this.renderBrownout(false);
    this.renderSectorOverlays();
  }

  public setLevels(levels: CityViewState["levels"]): void {
    for (const [slotId, level] of Object.entries(levels) as Array<[CitySlotId, CityLevel]>) {
      this.slots.get(slotId)?.setLevel(level);
    }
  }

  public setViewState(state: CityViewState): void {
    this.setLevels(state.levels);
    this.sectorOverlays = cloneSectorOverlays(state.sectorOverlays);
    this.renderBrownout(state.brownout);
    this.renderSectorOverlays();
  }

  public setDamWaterVisualState(state: DamWaterVisualState): void {
    this.damWater.setVisualState(state);
  }

  public setWindFarmVisualState(state: WindFarmVisualState): void {
    this.turbineField.setVisualState(state);
  }

  public tick(deltaMS: number): void {
    this.animationSeconds += Math.max(0, Math.min(deltaMS, 100)) / 1000;
    this.damWater.tick(deltaMS);
    this.turbineField.tick(deltaMS);
    this.renderSectorOverlays();
  }

  public debugSlotLevel(slotId: CitySlotId): CityLevel | undefined {
    return this.slots.get(slotId)?.level();
  }

  public debugDamWaterState(): DamWaterVisualState {
    return this.damWater.debugState();
  }

  public debugActiveTurbineCount(): number {
    return this.turbineField.debugActiveTurbineCount();
  }

  public debugWindFramePosition(): number {
    return this.turbineField.debugFramePosition();
  }

  public debugSectorOverlayState(slotId: CitySectorSlotId): CitySectorOverlayState {
    return { ...this.sectorOverlays[slotId] };
  }

  public debugSectorOverlayAlpha(slotId: CitySectorSlotId): number {
    return this.sectorOverlayAlpha[slotId];
  }

  private renderMask(): void {
    this.viewportMask.clear();
    this.viewportMask
      .rect(DESK_VIEWPORT.x, DESK_VIEWPORT.y, DESK_VIEWPORT.w, DESK_VIEWPORT.h)
      .fill({ color: 0xffffff, alpha: 1 });
  }

  private renderBrownout(active: boolean): void {
    this.brownoutOverlay.clear();
    if (!active) {
      return;
    }
    this.brownoutOverlay
      .rect(DESK_VIEWPORT.x, DESK_VIEWPORT.y, DESK_VIEWPORT.w, DESK_VIEWPORT.h)
      .fill({ color: 0x070b09, alpha: 0.46 });
  }

  private renderSectorOverlays(): void {
    this.sectorOverlay.clear();
    for (const slotId of ["household", "business", "datacenter"] as const) {
      const state = this.sectorOverlays[slotId];
      const config = CITY_SLOT_CONFIGS.find((slot) => slot.id === slotId);
      if (!config) {
        continue;
      }
      const active = state.isSpiking || state.isDemandCritical || state.isBrownedOut;
      if (!active) {
        this.sectorOverlayAlpha[slotId] = 0;
        continue;
      }

      const pulse = state.isSpiking ? 0.5 + Math.sin(this.animationSeconds * Math.PI * 5) * 0.5 : 0.45;
      const alpha = state.isBrownedOut ? 0.34 : state.isDemandCritical ? 0.24 + pulse * 0.16 : 0.16 + pulse * 0.18;
      const color = state.isBrownedOut ? 0x050808 : state.isDemandCritical ? 0xff3a35 : 0xf0b947;
      this.sectorOverlayAlpha[slotId] = alpha;
      this.sectorOverlay
        .rect(config.x - 150, config.y - 138, 300, 228)
        .fill({ color, alpha: state.isBrownedOut ? alpha : alpha * 0.45 })
        .stroke({ color, alpha: Math.min(0.9, alpha + 0.2), width: state.isDemandCritical ? 5 : 3 });
    }
  }
}

function emptySectorOverlays(): CityViewState["sectorOverlays"] {
  return {
    household: { isSpiking: false, isDemandCritical: false, isBrownedOut: false },
    business: { isSpiking: false, isDemandCritical: false, isBrownedOut: false },
    datacenter: { isSpiking: false, isDemandCritical: false, isBrownedOut: false },
  };
}

function cloneSectorOverlays(overlays: CityViewState["sectorOverlays"]): CityViewState["sectorOverlays"] {
  return {
    household: { ...overlays.household },
    business: { ...overlays.business },
    datacenter: { ...overlays.datacenter },
  };
}
