import { describe, expect, it } from "vitest";

import { computeContractEfficiency, contractUtilizationEfficiency } from "../src/gameplay/efficiency";

describe("efficiency", () => {
  it("treats 70 MW on an 80 MW deterministic basis as near best efficiency", () => {
    expect(computeContractEfficiency({ currentContractLoadMW: 70, contractCapacityBasisMW: 80 })).toBeCloseTo(1);
  });

  it("penalizes heavily underused deterministic capacity", () => {
    const weak = computeContractEfficiency({ currentContractLoadMW: 30, contractCapacityBasisMW: 80 });
    const strong = computeContractEfficiency({ currentContractLoadMW: 70, contractCapacityBasisMW: 80 });

    expect(weak).toBeLessThan(strong);
  });

  it("returns the best zone from 85% through 98% utilization", () => {
    expect(contractUtilizationEfficiency(0.85)).toBe(1);
    expect(contractUtilizationEfficiency(0.98)).toBe(1);
  });

  it("returns weak efficiency above 105% utilization", () => {
    expect(contractUtilizationEfficiency(1.06)).toBe(0.45);
  });
});
