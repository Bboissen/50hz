import { GAME_CONFIG } from "./config";
import { clamp } from "./math";
import type { TimelineToken } from "./types";

export type WeatherCondition = "sun" | "cloud" | "rain" | "wind" | "snow";

export type WeatherSample = {
  condition: WeatherCondition;
  timeOfDayRatio: number;
  solarFactor: number;
  windKmh: number;
  rainActive: boolean;
  householdDemandMultiplier: number;
};

function hash01(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function seededWave(seed: string, timeSeconds: number, salt: string, periodSeconds: number): number {
  const phase = hash01(`${seed}:${salt}:phase`) * Math.PI * 2;
  return Math.sin((timeSeconds / periodSeconds) * Math.PI * 2 + phase);
}

function seededGust(seed: string, timeSeconds: number): number {
  const segmentSeconds = 12;
  const segment = Math.floor(timeSeconds / segmentSeconds);
  const ratio = smoothstep((timeSeconds - segment * segmentSeconds) / segmentSeconds);
  const from = hash01(`${seed}:gust:${segment}`) * 2 - 1;
  const to = hash01(`${seed}:gust:${segment + 1}`) * 2 - 1;
  return from + (to - from) * ratio;
}

export function timeOfDayRatioAt(timeSeconds: number): number {
  const cycleSeconds = GAME_CONFIG.weather.dayCycleSeconds;
  return (((timeSeconds % cycleSeconds) + cycleSeconds) % cycleSeconds) / cycleSeconds;
}

export function solarFactorForTimeOfDay(timeOfDayRatio: number): number {
  if (timeOfDayRatio > 0.5) {
    return 0;
  }
  return Math.sin((timeOfDayRatio / 0.5) * Math.PI);
}

export function weatherConditionAt(timeSeconds: number): WeatherCondition {
  const cycleSeconds = GAME_CONFIG.weather.dayCycleSeconds;
  const cyclePosition = ((timeSeconds % cycleSeconds) + cycleSeconds) % cycleSeconds;
  const segmentSeconds = cycleSeconds / 5;
  if (cyclePosition < segmentSeconds) {
    return "sun";
  }
  if (cyclePosition < segmentSeconds * 2) {
    return "cloud";
  }
  if (cyclePosition < segmentSeconds * 3) {
    return "rain";
  }
  if (cyclePosition < segmentSeconds * 4) {
    return "wind";
  }
  return "snow";
}

function solarMultiplierForCondition(condition: WeatherCondition): number {
  if (condition === "cloud") {
    return 0.55;
  }
  if (condition === "rain") {
    return 0.35;
  }
  if (condition === "snow") {
    return 0.25;
  }
  if (condition === "wind") {
    return 0.85;
  }
  return 1;
}

function windDeltaKmhForCondition(condition: WeatherCondition): number {
  if (condition === "wind") {
    return 18;
  }
  if (condition === "rain") {
    return 4;
  }
  if (condition === "snow") {
    return -5;
  }
  if (condition === "cloud") {
    return -2;
  }
  return 0;
}

export function sampleWeather(seed: string, timeSeconds: number): WeatherSample {
  const renewable = GAME_CONFIG.assets.renewable;
  const condition = weatherConditionAt(timeSeconds);
  const timeOfDayRatio = timeOfDayRatioAt(timeSeconds);
  const solarFactor = solarFactorForTimeOfDay(timeOfDayRatio) * solarMultiplierForCondition(condition);

  const windKmh =
    renewable.windDefaultKmh +
    seededWave(seed, timeSeconds, "front", 95) * 7 +
    seededWave(seed, timeSeconds, "local", 31) * 4 +
    seededGust(seed, timeSeconds) * 6 +
    windDeltaKmhForCondition(condition);

  return {
    condition,
    timeOfDayRatio,
    solarFactor: clamp(solarFactor, 0, 1),
    windKmh: clamp(windKmh, renewable.windCutInKmh - 4, renewable.windCutOutKmh - 15),
    rainActive: condition === "rain",
    householdDemandMultiplier:
      condition === "rain" || condition === "snow" ? GAME_CONFIG.weather.rainSnowHouseholdMultiplier : 1,
  };
}

export function forecastWeather(seed: string, timeSeconds: number): TimelineToken[] {
  return GAME_CONFIG.weather.forecastOffsetsSeconds.map((offsetSeconds) => {
    const sample = sampleWeather(seed, timeSeconds + offsetSeconds);
    return {
      id: sample.condition,
      label: sample.condition.toUpperCase(),
      phase: offsetSeconds === 0 ? "impact" : "warning",
      remainingSeconds: offsetSeconds,
    };
  });
}
