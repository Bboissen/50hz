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

  it("layers public demand multipliers on top of sector demand levels", () => {
    const baselineLevelThree = computeDemand(getPublicEventState(0), {
      households: 3,
      business: 3,
      dataCenters: 3,
    });
    const footballLevelThree = computeDemand(getPublicEventState(43), {
      households: 3,
      business: 3,
      dataCenters: 3,
    });

    expect(footballLevelThree.householdsMW).toBeCloseTo(120 * 1.25);
    expect(footballLevelThree.businessMW).toBe(baselineLevelThree.businessMW);
    expect(footballLevelThree.dataCentersMW).toBe(baselineLevelThree.dataCentersMW);
  });
});
