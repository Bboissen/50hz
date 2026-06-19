import { describe, expect, it } from "vitest";

import { createLayoutEditorController } from "../src/ui/layoutEditor";
import type { ControlDeskLayoutEditorTarget } from "../src/pixi/screens/ControlDeskScreen";

describe("layout editor controller", () => {
  it("cycles targets, moves the selected item, resizes it, and exports JSON", () => {
    const targetValues = [
      { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      { x: 10, y: 20, scaleX: 1, scaleY: 1 },
    ];
    const selected: boolean[][] = [[], []];
    const targets: ControlDeskLayoutEditorTarget[] = targetValues.map((value, index) => ({
      id: `target.${index}`,
      label: `Target ${index}`,
      getValue: () => ({ ...value }),
      applyDelta: (delta) => {
        value.x += delta.x ?? 0;
        value.y += delta.y ?? 0;
        value.scaleX += delta.scale ?? 0;
        value.scaleY += delta.scale ?? 0;
      },
      setSelected: (isSelected) => selected[index].push(isSelected),
    }));
    const controller = createLayoutEditorController(targets);

    expect(controller.selectedIndex()).toBe(0);
    expect(controller.handleKey("Tab").handled).toBe(true);
    expect(controller.selectedIndex()).toBe(1);
    expect(controller.handleKey("ArrowRight", true).handled).toBe(true);
    expect(controller.handleKey("ArrowUp").handled).toBe(true);
    expect(controller.handleKey("E").handled).toBe(true);
    const exportResult = controller.handleKey("S");

    expect(selected[0].at(-1)).toBe(false);
    expect(selected[1].at(-1)).toBe(true);
    expect(targetValues[1]).toEqual({ x: 20, y: 19, scaleX: 1.02, scaleY: 1.02 });
    expect(JSON.parse(exportResult.exportText ?? "")).toMatchObject({
      "target.0": { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      "target.1": { x: 20, y: 19, scaleX: 1.02, scaleY: 1.02 },
    });

    controller.destroy();
    expect(selected[1].at(-1)).toBe(false);
  });
});
