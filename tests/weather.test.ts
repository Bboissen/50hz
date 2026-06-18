import { describe, expect, it } from "vitest";

import { windFactor } from "../src/gameplay/assets";
import { GAME_CONFIG } from "../src/gameplay/config";
import { forecastWeather, sampleWeather, solarFactorForTimeOfDay, timeOfDayRatioAt, weatherConditionAt } from "../src/gameplay/weather";

describe("weather", () => {
  it("maps one in-game day to one real-world minute at current simulation speed", () => {
    expect(GAME_CONFIG.weather.dayCycleSeconds / GAME_CONFIG.match.simulationSpeed).toBe(60);
  });

  it("advances time of day linearly through full repeated cycles", () => {
    const cycle = GAME_CONFIG.weather.dayCycleSeconds;

    expect(timeOfDayRatioAt(0)).toBeCloseTo(0);
    expect(timeOfDayRatioAt(cycle / 4)).toBeCloseTo(0.25);
    expect(timeOfDayRatioAt(cycle / 2)).toBeCloseTo(0.5);
    expect(timeOfDayRatioAt(cycle * 0.75)).toBeCloseTo(0.75);
    expect(timeOfDayRatioAt(cycle)).toBeCloseTo(timeOfDayRatioAt(0));
    expect(timeOfDayRatioAt(cycle * 2)).toBeCloseTo(timeOfDayRatioAt(0));
  });

  it("makes solar follow time of day and reach zero at night", () => {
    const seed = GAME_CONFIG.match.defaultSeed;
    const cycle = GAME_CONFIG.weather.dayCycleSeconds;
    const dawn = sampleWeather(seed, 0);
    const noon = sampleWeather(seed, cycle / 4);
    const night = sampleWeather(seed, cycle * 0.6);

    expect(dawn.solarFactor).toBe(0);
    expect(noon.solarFactor).toBeGreaterThan(dawn.solarFactor);
    expect(night.solarFactor).toBe(0);
    expect(solarFactorForTimeOfDay(0.25)).toBeCloseTo(1);
  });

  it("adds deterministic wind fluctuation that affects turbine output", () => {
    const seed = GAME_CONFIG.match.defaultSeed;
    const early = sampleWeather(seed, 10);
    const later = sampleWeather(seed, 70);

    expect(later.windKmh).not.toBeCloseTo(early.windKmh, 3);
    expect(windFactor(later.windKmh)).not.toBeCloseTo(windFactor(early.windKmh), 3);
    expect(sampleWeather(seed, 70).windKmh).toBe(later.windKmh);
  });

  it("applies readable weather condition effects", () => {
    const seed = GAME_CONFIG.match.defaultSeed;
    const cycle = GAME_CONFIG.weather.dayCycleSeconds;
    const cloud = sampleWeather(seed, cycle * 0.25);
    const rain = sampleWeather(seed, cycle * 0.45);
    const wind = sampleWeather(seed, cycle * 0.65);
    const snow = sampleWeather(seed, cycle * 0.85);

    expect(weatherConditionAt(cycle * 0.1)).toBe("sun");
    expect(cloud.solarFactor).toBeLessThan(solarFactorForTimeOfDay(cloud.timeOfDayRatio));
    expect(rain.solarFactor).toBeLessThan(solarFactorForTimeOfDay(rain.timeOfDayRatio));
    expect(rain.rainActive).toBe(true);
    expect(rain.householdDemandMultiplier).toBeCloseTo(1.03);
    expect(wind.windKmh).toBeGreaterThan(cloud.windKmh);
    expect(snow.householdDemandMultiplier).toBeCloseTo(1.03);
  });

  it("builds the forecast from actual sampled weather", () => {
    const seed = GAME_CONFIG.match.defaultSeed;
    const timeSeconds = 20;
    const forecast = forecastWeather(seed, timeSeconds);

    expect(forecast.map((token) => token.label)).toEqual(
      GAME_CONFIG.weather.forecastOffsetsSeconds.map((offset) => sampleWeather(seed, timeSeconds + offset).condition.toUpperCase()),
    );
  });
});
