import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "../src/gameplay/config";
import { computeDemand } from "../src/gameplay/demand";
import { getPublicEventState } from "../src/gameplay/events";
import { sampleWeather } from "../src/gameplay/weather";

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

  it("rain and snow add a small household demand increase when wired into event demand", () => {
    const cycle = GAME_CONFIG.weather.dayCycleSeconds;
    const rainTime = cycle * 0.45;
    const snowTime = cycle * 0.85;
    const rain = sampleWeather(GAME_CONFIG.match.defaultSeed, rainTime);
    const snow = sampleWeather(GAME_CONFIG.match.defaultSeed, snowTime);
    const baseline = computeDemand(getPublicEventState(0));
    const rainDemand = computeDemand({
      ...getPublicEventState(rainTime),
      householdMultiplier: getPublicEventState(rainTime).householdMultiplier * rain.householdDemandMultiplier,
    });
    const snowDemand = computeDemand({
      ...getPublicEventState(snowTime),
      householdMultiplier: getPublicEventState(snowTime).householdMultiplier * snow.householdDemandMultiplier,
    });

    expect(rainDemand.householdsMW).toBeCloseTo(baseline.householdsMW * 1.03);
    expect(snowDemand.householdsMW).toBeCloseTo(baseline.householdsMW * 1.03);
  });
});
