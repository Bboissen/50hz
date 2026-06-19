import { describe, expect, it } from "vitest";

import {
  applyCityEditorCommand,
  CITY_EDITOR_ELEMENT_IDS,
  createDefaultCityEditorState,
  normalizeCityEditorLayoutDepth,
  serializeCityEditorConfig,
} from "../src/pixi/city/cityEditorLayout";

describe("city editor layout", () => {
  it("cycles selection with wrapping", () => {
    const initial = createDefaultCityEditorState();
    const previous = applyCityEditorCommand(initial, { type: "previous" });

    expect(initial.layout.terrain.id).toBe("terrain");
    expect(previous.selectedIndex).toBe(CITY_EDITOR_ELEMENT_IDS.length - 1);
    expect(CITY_EDITOR_ELEMENT_IDS[previous.selectedIndex]).toBe("datacenter");
    expect(applyCityEditorCommand(previous, { type: "next" }).selectedIndex).toBe(0);
  });

  it("moves and scales only the selected element", () => {
    let state = createDefaultCityEditorState();
    const terrainBefore = state.layout.terrain;
    const damBefore = state.layout.dam;

    state = applyCityEditorCommand(state, { type: "move", dx: 10, dy: -4 });
    state = applyCityEditorCommand(state, { type: "scale", delta: 0.005 });

    expect(state.layout.terrain).toMatchObject({
      x: terrainBefore.x + 10,
      y: terrainBefore.y - 4,
      scale: terrainBefore.scale + 0.005,
    });
    expect(state.layout.dam).toEqual(damBefore);
  });

  it("exports a pasteable citySceneConfig snippet", () => {
    const state = applyCityEditorCommand(createDefaultCityEditorState(), { type: "move", dx: 1, dy: 0 });
    const snippet = serializeCityEditorConfig(state.layout);

    expect(snippet).toContain("export const WORLD_CAMERA");
    expect(snippet).toContain("export const TERRAIN_TILE_CONFIGS");
    expect(snippet).toContain("export const CITY_DECORATION_CONFIGS");
    expect(snippet).toContain("export const CITY_SLOT_CONFIGS");
    expect(snippet).toContain(`x: ${state.layout.terrain.x}`);
  });

  it("derives render depth from the bottom-left to top-right diagonal", () => {
    const state = createDefaultCityEditorState();
    const layout = normalizeCityEditorLayoutDepth({
      ...state.layout,
      solar: { ...state.layout.solar, x: 300, y: 900, zIndex: 9999 },
      business: { ...state.layout.business, x: 1600, y: 400, zIndex: -9999 },
    });

    expect(layout.terrain.zIndex).toBe(-40);
    expect(layout.solar.zIndex).toBe(-600);
    expect(layout.business.zIndex).toBe(1200);
    expect(layout.business.zIndex).toBeGreaterThan(layout.solar.zIndex);
  });
});
