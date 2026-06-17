import { marginFromEfficiency, priceFromEfficiency, targetMarketShare } from "./market";

import { GAME_CONFIG } from "./config";

export type RevenueTick = {
  priceA: number;
  priceB: number;
  targetShareA: number;
  targetShareB: number;
  cashGainA: number;
  cashGainB: number;
  marginA: number;
  marginB: number;
};

export function computeRevenueTick(args: {
  efficiency: number;
  opponentEfficiency: number;
  totalDemandMW: number;
  dt?: number;
}): RevenueTick {
  const priceA = priceFromEfficiency(args.efficiency);
  const priceB = priceFromEfficiency(args.opponentEfficiency);
  const targetShareA = targetMarketShare(priceA, priceB);
  const targetShareB = 1 - targetShareA;
  const marginA = marginFromEfficiency(args.efficiency);
  const marginB = marginFromEfficiency(args.opponentEfficiency);
  const tickScale = args.dt ?? 1;

  return {
    priceA,
    priceB,
    targetShareA,
    targetShareB,
    marginA,
    marginB,
    cashGainA: args.totalDemandMW * targetShareA * priceA * GAME_CONFIG.market.moneyScale * marginA * tickScale,
    cashGainB: args.totalDemandMW * targetShareB * priceB * GAME_CONFIG.market.moneyScale * marginB * tickScale,
  };
}
