import type { CityScene } from "../pixi/city/CityScene";
import {
  applyCityEditorCommand,
  CITY_EDITOR_ELEMENT_IDS,
  createDefaultCityEditorState,
  normalizeCityEditorLayoutDepth,
  serializeCityEditorConfig,
  type CityEditorCommand,
  type CityEditorState,
} from "../pixi/city/cityEditorLayout";

const STORAGE_KEY = "50hz.cityEditor.layout.v1";

export type CityEditorController = {
  element: HTMLElement;
  destroy: () => void;
};

export function createCityEditor(options: { scene: CityScene }): CityEditorController {
  let state = loadState();
  const element = document.createElement("aside");
  element.className = "city-editor";
  const title = document.createElement("h2");
  title.textContent = "City Editor";
  const selected = document.createElement("output");
  selected.className = "city-editor__selected";
  const values = document.createElement("output");
  values.className = "city-editor__values";
  const exportBox = document.createElement("textarea");
  exportBox.className = "city-editor__export";
  exportBox.readOnly = true;
  exportBox.spellcheck = false;

  const copyButton = button("Copy config", async () => {
    exportBox.select();
    await navigator.clipboard?.writeText(exportBox.value);
  });
  const layerDownButton = button("Layer -", () => {
    state = applyCityEditorCommand(state, { type: "layer", dz: -10 });
    sync();
  });
  const layerUpButton = button("Layer +", () => {
    state = applyCityEditorCommand(state, { type: "layer", dz: 10 });
    sync();
  });
  const resetButton = button("Reset layout", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = createDefaultCityEditorState();
    sync();
  });

  element.append(title, selected, values, exportBox, layerDownButton, layerUpButton, copyButton, resetButton);
  document.body.appendChild(element);

  const onKeyDown = (event: KeyboardEvent): void => {
    const command = commandFromKey(event);
    if (!command) {
      return;
    }
    event.preventDefault();
    state = applyCityEditorCommand(state, command);
    sync();
  };
  window.addEventListener("keydown", onKeyDown);

  const sync = (): void => {
    const selectedId = CITY_EDITOR_ELEMENT_IDS[state.selectedIndex] ?? CITY_EDITOR_ELEMENT_IDS[0];
    const config = state.layout[selectedId];
    options.scene.applyEditorLayout(state.layout);
    options.scene.setEditorSelection(selectedId, state.debugVisible);
    selected.textContent = selectedId;
    values.textContent = `x=${config.x} y=${config.y} scale=${config.scale} z=${config.zIndex}`;
    exportBox.value = serializeCityEditorConfig(state.layout);
    element.dataset.selected = selectedId;
    element.dataset.x = String(config.x);
    element.dataset.y = String(config.y);
    element.dataset.scale = String(config.scale);
    element.dataset.debug = String(state.debugVisible);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };
  sync();

  return {
    element,
    destroy: () => {
      window.removeEventListener("keydown", onKeyDown);
      element.remove();
    },
  };
}

function commandFromKey(event: KeyboardEvent): CityEditorCommand | undefined {
  if (event.key === "Tab") {
    return { type: event.shiftKey ? "previous" : "next" };
  }
  const move = event.shiftKey ? 10 : 1;
  if (event.key === "ArrowUp") {
    return { type: "move", dx: 0, dy: -move };
  }
  if (event.key === "ArrowDown") {
    return { type: "move", dx: 0, dy: move };
  }
  if (event.key === "ArrowLeft") {
    return { type: "move", dx: -move, dy: 0 };
  }
  if (event.key === "ArrowRight") {
    return { type: "move", dx: move, dy: 0 };
  }
  if (event.key.toLowerCase() === "q") {
    return { type: "scale", delta: -0.005 };
  }
  if (event.key.toLowerCase() === "e") {
    return { type: "scale", delta: 0.005 };
  }
  if (event.key === "[" || event.key === "PageDown") {
    return { type: "layer", dz: event.shiftKey ? -100 : -10 };
  }
  if (event.key === "]" || event.key === "PageUp") {
    return { type: "layer", dz: event.shiftKey ? 100 : 10 };
  }
  if (event.key.toLowerCase() === "d") {
    return { type: "toggleDebug" };
  }
  return undefined;
}

function loadState(): CityEditorState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultCityEditorState();
    }
    const parsed = JSON.parse(stored) as CityEditorState;
    if (!parsed.layout || typeof parsed.selectedIndex !== "number") {
      return createDefaultCityEditorState();
    }
    return {
      ...parsed,
      layout: normalizeCityEditorLayoutDepth(parsed.layout),
    };
  } catch {
    return createDefaultCityEditorState();
  }
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
}
