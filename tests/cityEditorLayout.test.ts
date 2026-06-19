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

  it("keeps terrain behind every editable city element", () => {
    const layout = normalizeCityEditorLayoutDepth(createDefaultCityEditorState().layout);

    expect(layout.terrain.zIndex).toBe(-10_000);
    for (const elementId of CITY_EDITOR_ELEMENT_IDS.filter((id) => id !== "terrain")) {
      expect(layout[elementId].zIndex).toBeGreaterThan(layout.terrain.zIndex);
    }
  });

  it("allows city element layer edits while keeping terrain fixed", () => {
    let state = createDefaultCityEditorState();
    state = applyCityEditorCommand(state, { type: "layer", dz: 50 });
    expect(state.layout.terrain.zIndex).toBe(-10_000);

    while (CITY_EDITOR_ELEMENT_IDS[state.selectedIndex] !== "solar") {
      state = applyCityEditorCommand(state, { type: "next" });
    }
    const beforeLayer = state.layout.solar.zIndex;
    state = applyCityEditorCommand(state, { type: "layer", dz: 50 });

    expect(state.layout.solar.zIndex).toBe(beforeLayer + 50);
  });

  it("preserves manual layer offsets when moving an element", () => {
    let state = createDefaultCityEditorState();
    while (CITY_EDITOR_ELEMENT_IDS[state.selectedIndex] !== "solar") {
      state = applyCityEditorCommand(state, { type: "next" });
    }

    state = applyCityEditorCommand(state, { type: "layer", dz: 50 });
    const before = state.layout.solar;
    state = applyCityEditorCommand(state, { type: "move", dx: 10, dy: -5 });

    expect(state.layout.solar.zIndex).toBe(before.zIndex + 15);
  });
});
