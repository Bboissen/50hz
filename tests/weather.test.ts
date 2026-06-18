import { describe, expect, it } from "vitest";

import { windFactor } from "../src/gameplay/assets";
import { GAME_CONFIG } from "../src/gameplay/config";
import { sampleWeather } from "../src/gameplay/weather";

describe("weather", () => {
  it("makes solar follow time of day during the match", () => {
    const seed = GAME_CONFIG.match.defaultSeed;
    const morning = sampleWeather(seed, 0);
    const noon = sampleWeather(seed, GAME_CONFIG.match.durationSeconds / 2);
    const evening = sampleWeather(seed, GAME_CONFIG.match.durationSeconds);

    expect(noon.solarFactor).toBeGreaterThan(morning.solarFactor);
    expect(noon.solarFactor).toBeGreaterThan(evening.solarFactor);
  });

  it("adds deterministic wind fluctuation that affects turbine output", () => {
    const seed = GAME_CONFIG.match.defaultSeed;
    const early = sampleWeather(seed, 10);
    const later = sampleWeather(seed, 70);

    expect(later.windKmh).not.toBeCloseTo(early.windKmh, 3);
    expect(windFactor(later.windKmh)).not.toBeCloseTo(windFactor(early.windKmh), 3);
    expect(sampleWeather(seed, 70).windKmh).toBe(later.windKmh);
  });
});
