import { describe, expect, it } from "vitest";

import { applyPlayerCommand, selectProductionConsoleState } from "../src/gameplay/match";
import { createControlDeskPreviewState } from "../src/pixi/controlDesk/controlDeskPreviewState";

describe("control desk preview state", () => {
  it("starts as a deterministic frozen selector state with no active gameplay popups", () => {
    const first = createControlDeskPreviewState("desk-proof");
    const second = createControlDeskPreviewState("desk-proof");

    expect(first.match).toEqual(second.match);
    expect(first.dispatch.timeSeconds).toBe(90);
    expect(first.dispatch.contractOffer).toBeUndefined();
    expect(first.dispatch.breakerResetRequired).toBe(false);
    expect(first.production.currentDemandMW).toBeGreaterThan(0);
    expect(first.production.generationMW).toBeGreaterThan(0);
    expect(first.production.solarOutputMW).toBeGreaterThan(0);
  });

  it("accepts preview commands through selectors without advancing time or ticking outputs", () => {
    const preview = createControlDeskPreviewState("desk-command-proof");
    const next = applyPlayerCommand(preview.match, { type: "setNuclearTarget", playerId: "player", targetMW: 17.5 });
    const production = selectProductionConsoleState(next);

    expect(next.timeSeconds).toBe(preview.match.timeSeconds);
    expect(production.nuclearTargetMW).toBe(17.5);
    expect(production.nuclearOutputMW).toBe(preview.production.nuclearOutputMW);
  });
});
