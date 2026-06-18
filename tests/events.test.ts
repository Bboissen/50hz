import { describe, expect, it } from "vitest";

import { computeDemand } from "../src/gameplay/demand";
import { getPublicEventState } from "../src/gameplay/events";

describe("events", () => {
  it("warns before the football final impact", () => {
    const eventState = getPublicEventState(36);

    expect(eventState.tokens.some((token) => token.id === "footballFinal" && token.phase === "warning")).toBe(true);
  });

  it("applies football final demand during impact", () => {
    const baseline = computeDemand(getPublicEventState(0));
    const impact = computeDemand(getPublicEventState(43));

    expect(impact.householdsMW).toBeGreaterThan(baseline.householdsMW);
    expect(impact.totalMW).toBeGreaterThan(baseline.totalMW);
  });

  it("applies cloud front solar reduction during impact", () => {
    expect(getPublicEventState(71).solarFactorMultiplier).toBeLessThan(1);
  });
});
