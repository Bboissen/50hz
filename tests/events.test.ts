import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "../src/gameplay/config";
import { computeDemand } from "../src/gameplay/demand";
import { buildEventTrace, getPublicEventState } from "../src/gameplay/events";
import { createInitialMatchState } from "../src/gameplay/match";
import { sampleWeather } from "../src/gameplay/weather";

describe("events", () => {
  it("warns before the football final impact", () => {
    const eventState = getPublicEventState(36);

    expect(eventState.tokens.some((token) => token.id === "footballFinal" && token.phase === "warning")).toBe(true);
  });

  it("applies football final demand during impact", () => {
    const baseline = computeDemand(getPublicEventState(0));
    const impact = computeDemand(getPublicEventState(47));

    expect(impact.householdsMW).toBeGreaterThan(baseline.householdsMW);
    expect(impact.totalMW).toBeGreaterThan(baseline.totalMW);
  });

  it("ramps public event demand instead of applying the full shock instantly", () => {
    const baseline = computeDemand(getPublicEventState(0));
    const ramping = computeDemand(getPublicEventState(43));
    const full = computeDemand(getPublicEventState(47));

    expect(ramping.householdsMW).toBeGreaterThan(baseline.householdsMW);
    expect(ramping.householdsMW).toBeLessThan(full.householdsMW);
    expect(full.householdsMW).toBeCloseTo(baseline.householdsMW * 1.25);
  });

  it("applies cloud front solar reduction during impact", () => {
    expect(getPublicEventState(71).solarFactorMultiplier).toBeLessThan(1);
    expect(getPublicEventState(71).solarFactorMultiplier).toBeGreaterThan(0.4);
    expect(getPublicEventState(75).solarFactorMultiplier).toBeCloseTo(0.4);
  });

  it("layers public demand multipliers on top of sector demand levels", () => {
    const baselineLevelThree = computeDemand(getPublicEventState(0), {
      households: 3,
      business: 3,
      dataCenters: 3,
    });
    const footballLevelThree = computeDemand(getPublicEventState(47), {
      households: 3,
      business: 3,
      dataCenters: 3,
    });

    expect(footballLevelThree.householdsMW).toBeCloseTo(120 * 1.25);
    expect(footballLevelThree.businessMW).toBe(baselineLevelThree.businessMW);
    expect(footballLevelThree.dataCentersMW).toBe(baselineLevelThree.dataCentersMW);
  });

  it("rain and snow add a small household demand increase when wired into event demand", () => {
    const rainTime = GAME_CONFIG.weather.conditionSegmentSeconds * 2 + 1;
    const snowTime = GAME_CONFIG.weather.conditionSegmentSeconds * 9 + 1;
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

    expect(rain.condition).toBe("rain");
    expect(snow.condition).toBe("snow");
    expect(rainDemand.householdsMW).toBeCloseTo(baseline.householdsMW * 1.03);
    expect(snowDemand.householdsMW).toBeCloseTo(baseline.householdsMW * 1.03);
  });

  it("builds the forecast trace from the deterministic event plan", () => {
    const state = createInitialMatchState();
    const trace = buildEventTrace({
      seed: state.seed,
      demandSchedule: state.demandSchedule,
      timeSeconds: 40,
      capacities: state.players.player.capacities,
      controls: state.players.player.controls,
    });

    expect(trace).toHaveLength(7);
    expect(trace[0].timeOffsetSeconds).toBe(0);
    expect(trace.some((point) => point.eventIntensity > 0)).toBe(true);
    expect(trace.some((point) => point.demandMW > trace[0].demandMW)).toBe(true);
  });
});
