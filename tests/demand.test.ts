import { describe, expect, it } from "vitest";

import { computeDemand, demandLevelsAtTime, generateDemandSchedule } from "../src/gameplay/demand";
import { getPublicEventState } from "../src/gameplay/events";
import { createInitialMatchState } from "../src/gameplay/match";

describe("demand progression", () => {
  it("generates reproducible schedules from the same seed", () => {
    expect(generateDemandSchedule("demo-a")).toEqual(generateDemandSchedule("demo-a"));
    expect(createInitialMatchState({ seed: "demo-a" }).demandSchedule).toEqual(generateDemandSchedule("demo-a"));
  });

  it("varies schedules for different seeds", () => {
    expect(generateDemandSchedule("demo-a")).not.toEqual(generateDemandSchedule("demo-b"));
  });

  it("keeps each sector at level 2 before level 3", () => {
    const schedule = generateDemandSchedule("ordering-check");

    expect(schedule).toHaveLength(6);
    for (const sector of ["households", "business", "dataCenters"] as const) {
      const levelTwo = schedule.find((step) => step.sector === sector && step.level === 2);
      const levelThree = schedule.find((step) => step.sector === sector && step.level === 3);

      expect(levelTwo).toBeDefined();
      expect(levelThree).toBeDefined();
      expect(levelTwo?.timeSeconds).toBeLessThan(levelThree?.timeSeconds ?? 0);
    }
  });

  it("lands the final level-3 step near the 270s endpoint", () => {
    const schedule = generateDemandSchedule("final-timing");
    const lastStepTime = Math.max(...schedule.map((step) => step.timeSeconds));

    expect(lastStepTime).toBeGreaterThanOrEqual(260);
    expect(lastStepTime).toBeLessThanOrEqual(280);
  });

  it("computes exact MW totals for level states", () => {
    const baseline = computeDemand(getPublicEventState(0), {
      households: 1,
      business: 1,
      dataCenters: 1,
    });
    const levelTwo = computeDemand(getPublicEventState(0), {
      households: 2,
      business: 2,
      dataCenters: 2,
    });
    const levelThree = computeDemand(getPublicEventState(0), {
      households: 3,
      business: 3,
      dataCenters: 3,
    });

    expect(baseline).toMatchObject({ householdsMW: 80, businessMW: 15, dataCentersMW: 45, totalMW: 140 });
    expect(levelTwo).toMatchObject({ householdsMW: 100, businessMW: 35, dataCentersMW: 65, totalMW: 200 });
    expect(levelThree).toMatchObject({ householdsMW: 120, businessMW: 55, dataCentersMW: 85, totalMW: 260 });
  });

  it("starts at level 1 and reaches all level 3 after the schedule", () => {
    const schedule = generateDemandSchedule("levels-over-time");

    expect(demandLevelsAtTime(schedule, 0)).toEqual({ households: 1, business: 1, dataCenters: 1 });
    expect(demandLevelsAtTime(schedule, 290)).toEqual({ households: 3, business: 3, dataCenters: 3 });
  });
});
