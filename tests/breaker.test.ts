import { describe, expect, it } from "vitest";

import { updateBreakerRisk } from "../src/gameplay/breaker";

describe("breaker", () => {
  it("does not increase timer inside the +/-5% safe band", () => {
    const result = updateBreakerRisk({
      capacityUtilization: 0.9,
      supplyDemandMismatch: 0.04,
      capacityOverloadTimer: 0,
      balanceBreakerTimer: 0,
      dt: 1,
    });

    expect(result.balanceBreakerTimer).toBe(0);
    expect(result.tripped).toBe(false);
  });

  it("increases balance timer outside the safe band", () => {
    const result = updateBreakerRisk({
      capacityUtilization: 0.9,
      supplyDemandMismatch: 0.08,
      capacityOverloadTimer: 0,
      balanceBreakerTimer: 0,
      dt: 1,
    });

    expect(result.balanceBreakerTimer).toBeGreaterThan(0);
  });

  it("increases severe mismatch faster", () => {
    const normal = updateBreakerRisk({
      capacityUtilization: 0.9,
      supplyDemandMismatch: 0.08,
      capacityOverloadTimer: 0,
      balanceBreakerTimer: 0,
      dt: 1,
    });
    const severe = updateBreakerRisk({
      capacityUtilization: 0.9,
      supplyDemandMismatch: 0.2,
      capacityOverloadTimer: 0,
      balanceBreakerTimer: 0,
      dt: 1,
    });

    expect(severe.balanceBreakerTimer).toBeGreaterThan(normal.balanceBreakerTimer);
  });

  it("trips immediately above 105% capacity utilization", () => {
    const result = updateBreakerRisk({
      capacityUtilization: 1.051,
      supplyDemandMismatch: 0,
      capacityOverloadTimer: 0,
      balanceBreakerTimer: 0,
      dt: 0.1,
    });

    expect(result.tripped).toBe(true);
    expect(result.reason).toBe("capacity-overload");
  });

  it("trips after the timer in the 100%-105% capacity band", () => {
    const result = updateBreakerRisk({
      capacityUtilization: 1.02,
      supplyDemandMismatch: 0,
      capacityOverloadTimer: 2.5,
      balanceBreakerTimer: 0,
      dt: 0.6,
    });

    expect(result.tripped).toBe(true);
    expect(result.reason).toBe("capacity-overload");
  });
});
