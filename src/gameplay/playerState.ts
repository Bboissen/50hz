import { GAME_CONFIG } from "./config";
import type { CardKind, PlayerId, PlayerState, UpgradeKind } from "./types";

const emptyUpgradePurchases = (): Record<UpgradeKind, number> => ({
  renewable: 0,
  thermal: 0,
  nuclear: 0,
  waterDam: 0,
});

const emptyCardCooldowns = (): Record<CardKind, number> => ({
  demandResponse: 0,
  cloudFront: 0,
  windStorm: 0,
});

export function createInitialPlayerState(id: PlayerId): PlayerState {
  const capacities = {
    gridCapacityMW: GAME_CONFIG.assets.gridCapacityMW,
    nuclearCapacityMW: GAME_CONFIG.assets.nuclear.capacityMW,
    thermalCapacityMW: GAME_CONFIG.assets.thermal.capacityMW,
    solarPeakMW: GAME_CONFIG.assets.renewable.solarPeakMW,
    windPeakMW: GAME_CONFIG.assets.renewable.windPeakMW,
    waterDamCapacityMWh: GAME_CONFIG.assets.waterDam.capacityMWh,
    waterDamMaxPowerMW: GAME_CONFIG.assets.waterDam.maxPowerMW,
  };

  const emptyOutputs = {
    nuclearOutputMW: GAME_CONFIG.assets.nuclear.initialOutputMW,
    thermalOutputMW: 0,
    solarOutputMW: 0,
    windOutputMW: 0,
    damOutputMW: 0,
    damAbsorbMW: 0,
    rawProductionMW: GAME_CONFIG.assets.nuclear.initialOutputMW,
    deliveredSupplyMW: GAME_CONFIG.assets.nuclear.initialOutputMW,
    thermalHeat: 0,
    storedWaterMWh: capacities.waterDamCapacityMWh * GAME_CONFIG.assets.waterDam.initialStoredRatio,
  };

  return {
    id,
    cash: GAME_CONFIG.players.startingCash,
    score: GAME_CONFIG.players.startingScore,
    strikes: GAME_CONFIG.players.startingStrikes,
    subscribedLoadShare: GAME_CONFIG.players.startingSubscribedLoadShare,
    targetMarketShare: GAME_CONFIG.players.startingSubscribedLoadShare,
    controls: {
      nuclearTargetMW: GAME_CONFIG.assets.nuclear.initialOutputMW,
      thermalThrottle: 0,
      waterDamMode: "hold",
      windEnabled: true,
    },
    capacities,
    runtime: {
      nuclearOutputMW: GAME_CONFIG.assets.nuclear.initialOutputMW,
      thermalHeat: 0,
      storedWaterMWh: emptyOutputs.storedWaterMWh,
      capacityOverloadTimer: 0,
      balanceBreakerTimer: 0,
      breakerTrippedSeconds: 0,
      breakerResetHoldSeconds: 0,
    },
    activeContracts: [],
    upgradesInProgress: [],
    upgradePurchases: emptyUpgradePurchases(),
    cardCooldowns: emptyCardCooldowns(),
    incomingAttacks: [],
    demandResponseSeconds: 0,
    lastCashGain: 0,
    lastEfficiency: 1,
    lastPrice: GAME_CONFIG.market.minPrice,
    lastMargin: 1,
    lastContractLoadMW: 0,
    lastContractCapacityBasisMW: 1,
    lastCurrentDemandMW: 0,
    lastSupplyDemandMismatch: 0,
    lastCapacityUtilization: 0,
    lastOutputs: emptyOutputs,
  };
}
