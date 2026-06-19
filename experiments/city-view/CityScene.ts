import { Container, Graphics, Sprite, type Texture } from "pixi.js";

import {
  CITY_DECORATION_CONFIGS,
  CITY_SLOT_CONFIGS,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  DESK_VIEWPORT,
  TERRAIN_TILE_CONFIGS,
  WORLD_CAMERA,
} from "./citySceneConfig";
import { CitySlot } from "./CitySlot";
import type { CityLevel, CitySlotId, CityViewState, UpgradeableCitySlotId } from "./cityTypes";

export type CitySceneTextures = {
  terrain: Texture;
  deskFrame: Texture;
  openAiSign: Texture;
  slots: Record<CitySlotId, Record<CityLevel, Texture>>;
};

export class CityScene extends Container {
  private readonly designRoot = new Container({ label: "city-view-design-root" });
  private readonly viewportLayer = new Container({ label: "city-view-viewport-layer" });
  private readonly world = new Container({ label: "city-view-world" });
  private readonly debugLayer = new Graphics({ label: "city-view-debug-layer" });
  private readonly slots = new Map<CitySlotId, CitySlot>();
  private readonly viewportMask = new Graphics({ label: "city-view-mask" });
  private debugVisible = false;
  private selectedSlot: UpgradeableCitySlotId = "household";

  public constructor(textures: CitySceneTextures) {
    super({ label: "city-view-root" });

    this.designRoot.addChild(this.viewportLayer, this.viewportMask, new Sprite({
      texture: textures.deskFrame,
      label: "city-view-desk-frame",
    }), this.debugLayer);

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

    for (const config of CITY_SLOT_CONFIGS) {
      const slot = new CitySlot(config, textures.slots[config.id]);
      this.slots.set(config.id, slot);
      this.world.addChild(slot);
    }

    this.addChild(this.designRoot);
    this.redrawMask();
    this.redrawDebug();
  }

  public resize(width: number, height: number): void {
    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    this.designRoot.scale.set(scale);
    this.designRoot.position.set(
      Math.round((width - DESIGN_WIDTH * scale) / 2),
      Math.round((height - DESIGN_HEIGHT * scale) / 2),
    );
  }

  public setSlotLevel(slotId: CitySlotId, level: CityLevel): void {
    this.slots.get(slotId)?.setLevel(level);
  }

  public setLevels(levels: CityViewState): void {
    for (const [slotId, level] of Object.entries(levels) as Array<[UpgradeableCitySlotId, CityLevel]>) {
      this.setSlotLevel(slotId, level);
    }
  }

  public selectSlot(slotId: UpgradeableCitySlotId): void {
    this.selectedSlot = slotId;
    this.redrawDebug();
  }

  public selectedSlotId(): UpgradeableCitySlotId {
    return this.selectedSlot;
  }

  public setSelectedSlotLevel(level: CityLevel): void {
    this.setSlotLevel(this.selectedSlot, level);
  }

  public adjustSelectedSlotLevel(delta: -1 | 1): void {
    const current = this.slots.get(this.selectedSlot)?.level() ?? 3;
    const next = wrapLevel(current + delta);
    this.setSelectedSlotLevel(next);
  }

  public toggleDebug(): void {
    this.debugVisible = !this.debugVisible;
    this.redrawDebug();
  }

  public debugState(): Record<string, string> {
    const state: Record<string, string> = {
      assetCount: String(this.slots.size * 3 + 3),
      cameraScale: WORLD_CAMERA.scale.toFixed(2),
      deskFramed: "true",
      openAiSign: "true",
      selectedSlot: this.selectedSlot,
      viewport: `${DESK_VIEWPORT.x},${DESK_VIEWPORT.y},${DESK_VIEWPORT.w},${DESK_VIEWPORT.h}`,
    };

    for (const [slotId, slot] of this.slots) {
      state[`slot-${slotId}-level`] = String(slot.level());
    }

    return state;
  }

  private redrawMask(): void {
    this.viewportMask.clear();
    this.viewportMask
      .rect(DESK_VIEWPORT.x, DESK_VIEWPORT.y, DESK_VIEWPORT.w, DESK_VIEWPORT.h)
      .fill({ color: 0xffffff, alpha: 1 });
  }

  private redrawDebug(): void {
    this.debugLayer.clear();
    if (!this.debugVisible) {
      return;
    }

    this.debugLayer
      .rect(DESK_VIEWPORT.x, DESK_VIEWPORT.y, DESK_VIEWPORT.w, DESK_VIEWPORT.h)
      .stroke({ color: 0xffd447, alpha: 0.95, width: 3 });

    for (const slot of this.slots.values()) {
      const bounds = this.slotScreenPoint(slot);
      const isSelected = slot.slotId() === this.selectedSlot;
      this.debugLayer
        .moveTo(bounds.x - 12, bounds.y)
        .lineTo(bounds.x + 12, bounds.y)
        .moveTo(bounds.x, bounds.y - 12)
        .lineTo(bounds.x, bounds.y + 12)
        .stroke({ color: isSelected ? 0xff5038 : 0x8dfc7a, alpha: 0.95, width: isSelected ? 4 : 2 })
        .circle(bounds.x, bounds.y, isSelected ? 18 : 12)
        .stroke({ color: isSelected ? 0xff5038 : 0x8dfc7a, alpha: 0.85, width: 2 });
    }
  }

  private slotScreenPoint(slot: CitySlot): { x: number; y: number } {
    return {
      x: WORLD_CAMERA.x + slot.x * WORLD_CAMERA.scale,
      y: WORLD_CAMERA.y + slot.y * WORLD_CAMERA.scale,
    };
  }
}

function wrapLevel(level: number): CityLevel {
  if (level > 3) {
    return 1;
  }
  if (level < 1) {
    return 3;
  }
  return level as CityLevel;
}
