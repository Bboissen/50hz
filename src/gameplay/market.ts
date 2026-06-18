import { GAME_CONFIG } from "./config";
import { clamp, clamp01, moveTowards } from "./math";

export function priceFromEfficiency(efficiency: number): number {
  const e = clamp01(efficiency);
  return GAME_CONFIG.market.maxPrice - (GAME_CONFIG.market.maxPrice - GAME_CONFIG.market.minPrice) * e;
}

export function attractionFromPrice(price: number): number {
  return Math.pow(1 / Math.max(price, 1), GAME_CONFIG.market.priceElasticity);
}

export function targetMarketShare(priceA: number, priceB: number): number {
  const attractionA = attractionFromPrice(priceA);
  const attractionB = attractionFromPrice(priceB);
  return attractionA / Math.max(attractionA + attractionB, Number.EPSILON);
}

export function marginFromEfficiency(efficiency: number): number {
  const e = clamp01(efficiency);
  return GAME_CONFIG.market.minMargin + (GAME_CONFIG.market.maxMargin - GAME_CONFIG.market.minMargin) * e;
}

export function updateSubscribedLoadShare(
  current: number,
  target: number,
  dt: number,
  maxNormalShare: number = GAME_CONFIG.market.maxShare,
): number {
  const boundedTarget = clamp(target, GAME_CONFIG.market.minShare, Math.min(GAME_CONFIG.market.maxShare, maxNormalShare));
  return moveTowards(current, boundedTarget, GAME_CONFIG.market.maxShareChangePerSecond * dt);
}
