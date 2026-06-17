import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "../src/gameplay/config";
import { attractionFromPrice, priceFromEfficiency } from "../src/gameplay/market";
import { computeRevenueTick } from "../src/gameplay/revenue";

describe("economy", () => {
  it("lowers price as efficiency rises", () => {
    expect(priceFromEfficiency(0.9)).toBeLessThan(priceFromEfficiency(0.6));
  });

  it("gives higher cash gain to the higher-efficiency player in the same tick", () => {
    const result = computeRevenueTick({
      efficiency: 0.9,
      opponentEfficiency: 0.6,
      totalDemandMW: 140,
    });

    expect(result.priceA).toBeLessThan(result.priceB);
    expect(result.cashGainA).toBeGreaterThan(result.cashGainB);
  });

  it("uses price elasticity greater than one", () => {
    expect(GAME_CONFIG.market.priceElasticity).toBeGreaterThan(1);
  });

  it("makes lower prices more attractive", () => {
    expect(attractionFromPrice(75)).toBeGreaterThan(attractionFromPrice(90));
  });
});
