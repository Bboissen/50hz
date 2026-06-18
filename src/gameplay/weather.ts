import { GAME_CONFIG } from "./config";
import { clamp } from "./math";

export type WeatherSample = {
  solarFactor: number;
  windKmh: number;
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

export function sampleWeather(seed: string, timeSeconds: number): WeatherSample {
  const renewable = GAME_CONFIG.assets.renewable;
  const matchProgress = clamp(timeSeconds / GAME_CONFIG.match.durationSeconds, 0, 1);
  const daylightCurve = Math.sin(matchProgress * Math.PI);
  const solarFactor = clamp(0.1 + Math.pow(Math.max(0, daylightCurve), 1.35) * 0.9, 0, 1);

  const windKmh =
    renewable.windDefaultKmh +
    seededWave(seed, timeSeconds, "front", 95) * 7 +
    seededWave(seed, timeSeconds, "local", 31) * 4 +
    seededGust(seed, timeSeconds) * 6;

  return {
    solarFactor,
    windKmh: clamp(windKmh, renewable.windCutInKmh - 4, renewable.windCutOutKmh - 15),
  };
}
