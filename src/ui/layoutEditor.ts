import type { ControlDeskLayoutEditorTarget } from "../pixi/screens/ControlDeskScreen";

export type LayoutEditor = {
  element: HTMLElement;
  destroy: () => void;
};

export type LayoutEditorController = {
  selectedIndex: () => number;
  handleKey: (key: string, shiftKey?: boolean) => { handled: boolean; exportText?: string };
  exportJson: () => string;
  destroy: () => void;
};

export function createLayoutEditorController(
  targets: ControlDeskLayoutEditorTarget[],
  onChange: (target: ControlDeskLayoutEditorTarget | undefined) => void = () => undefined,
): LayoutEditorController {
  let selectedIndex = 0;

  const syncSelection = (): void => {
    targets.forEach((target, index) => target.setSelected(index === selectedIndex));
    onChange(targets[selectedIndex]);
  };

  const exportJson = (): string => JSON.stringify(Object.fromEntries(targets.map((target) => [target.id, target.getValue()])), null, 2);

  const handleKey = (key: string, shiftKey = false): { handled: boolean; exportText?: string } => {
    const target = targets[selectedIndex];
    if (!target) {
      return { handled: false };
    }
    const step = shiftKey ? 10 : 1;
    if (key === "Tab") {
      targets[selectedIndex]?.setSelected(false);
      selectedIndex = (selectedIndex + (shiftKey ? -1 : 1) + targets.length) % targets.length;
      syncSelection();
      return { handled: true };
    }
    const deltas: Record<string, { x?: number; y?: number; scale?: number }> = {
      ArrowLeft: { x: -step },
      ArrowRight: { x: step },
      ArrowUp: { y: -step },
      ArrowDown: { y: step },
      q: { scale: -0.02 },
      Q: { scale: -0.02 },
      e: { scale: 0.02 },
      E: { scale: 0.02 },
    };
    const delta = deltas[key];
    if (delta) {
      target.applyDelta(delta);
      syncSelection();
      return { handled: true };
    }
    if (key === "s" || key === "S") {
      return { handled: true, exportText: exportJson() };
    }
    return { handled: false };
  };

  syncSelection();

  return {
    selectedIndex: () => selectedIndex,
    handleKey,
    exportJson,
    destroy: () => targets[selectedIndex]?.setSelected(false),
  };
}

export function createLayoutEditor(options: {
  targets: ControlDeskLayoutEditorTarget[];
  writeText?: (text: string) => Promise<void> | void;
}): LayoutEditor {
  const { targets } = options;

  const element = document.createElement("section");
  element.className = "layout-editor";

  const title = document.createElement("h2");
  title.textContent = "Layout edit";
  const selected = document.createElement("div");
  selected.className = "layout-editor__selected";
  const values = document.createElement("pre");
  values.className = "layout-editor__values";
  const exportArea = document.createElement("textarea");
  exportArea.className = "layout-editor__export";
  exportArea.readOnly = true;
  const hint = document.createElement("p");
  hint.className = "layout-editor__hint";
  hint.textContent = "Tab select | arrows move | Shift x10 | Q/E size | S export";
  element.append(title, selected, values, hint, exportArea);

  const controller = createLayoutEditorController(targets, (target) => {
    if (!target) {
      selected.textContent = "No targets";
      values.textContent = "";
      return;
    }
    selected.textContent = target.label;
    values.textContent = JSON.stringify({ [target.id]: target.getValue() }, null, 2);
  });

  const exportLayout = async (text: string): Promise<void> => {
    exportArea.value = text;
    const writer = options.writeText ?? navigator.clipboard?.writeText?.bind(navigator.clipboard);
    if (writer) {
      try {
        await writer(text);
      } catch (error) {
        console.warn("50Hz layout editor clipboard export failed", error);
      }
    }
    console.info("50Hz layout editor export", JSON.parse(text) as unknown);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLSelectElement) {
      return;
    }
    const result = controller.handleKey(event.key, event.shiftKey);
    if (result.handled) {
      event.preventDefault();
    }
    if (result.exportText) {
      void exportLayout(result.exportText);
    }
  };

  window.addEventListener("keydown", handleKeyDown, { capture: true });

  return {
    element,
    destroy: () => {
      controller.destroy();
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      element.remove();
    },
  };
}
