import { updateAssetOutputs, windFactor } from "./assets";
import { updateBreakerRisk, computeSupplyDemandMismatch } from "./breaker";
import { GAME_CONFIG } from "./config";
import { acceptContract, tickContracts } from "./contracts";
import { generateDemandSchedule } from "./demand";
import {
  contractCapacityBasisMW,
  computeContractEfficiency,
  currentContractLoadMW,
  deterministicMaxCapacityMW,
} from "./efficiency";
import { buildEventTrace, forecastEventQueue, sampleEventEnvironment } from "./events";
import { clamp, clamp01 } from "./math";
import { priceFromEfficiency, updateSubscribedLoadShare } from "./market";
import { createInitialPlayerState } from "./playerState";
import { buildPlantUpgradeStates } from "./plants";
import { computeRevenueTick } from "./revenue";
import { buyUpgrade, tickUpgrades } from "./upgrades";
import { forecastWeather } from "./weather";
import type {
  ActiveContractState,
  BreakerLifecycleState,
  BreakerReason,
  BreakerRiskSource,
  BreakerTripSummary,
  ContractKind,
  ContractOffer,
  ContractOfferState,
  DerivedPlayerStats,
  DispatchConsoleState,
  FinalResult,
  MatchState,
  MatchSeed,
  PlayerCommand,
  PlayerId,
  PlayerState,
  SectorVisualState,
  ProductionConsoleState,
} from "./types";

function createInitialContractOffers(): ContractOffer[] {
  return GAME_CONFIG.contracts.offerSchedule.map((offer) => ({
    ...offer,
    status: "pending",
    remainingSeconds: GAME_CONFIG.contracts.offerWindowSeconds,
  }));
}

export function createInitialMatchState(options: { seed?: MatchSeed } = {}): MatchState {
  const seed = options.seed ?? GAME_CONFIG.match.defaultSeed;
  return {
    seed,
    demandSchedule: generateDemandSchedule(seed),
    contractOffers: createInitialContractOffers(),
    timeSeconds: 0,
    isPaused: false,
    gameOverReason: undefined,
    activeEvents: [],
    players: {
      player: createInitialPlayerState("player"),
      rival: createInitialPlayerState("rival"),
    },
  };
}

function updatePlayer(state: MatchState, player: PlayerState): MatchState {
  return {
    ...state,
    players: {
      ...state.players,
      [player.id]: player,
    },
  };
}

function contractTitle(kind: ContractKind): string {
  return kind === "business" ? "BUSINESS CONTRACT" : "DATA CONTRACT";
}

function updateContractOfferStatus(
  state: MatchState,
  offerId: string,
  status: ContractOffer["status"],
): MatchState {
  return {
    ...state,
    contractOffers: state.contractOffers.map((offer) => (offer.id === offerId ? { ...offer, status } : offer)),
  };
}

export function applyPlayerCommand(state: MatchState, command: PlayerCommand): MatchState {
  if (command.type === "pause") {
    return { ...state, isPaused: true };
  }
  if (command.type === "resume") {
    return { ...state, isPaused: false };
  }

  if (command.type === "declineContract") {
    const offer = state.contractOffers.find((candidate) => candidate.id === command.offerId && candidate.status === "active");
    return offer ? updateContractOfferStatus(state, offer.id, "declined") : state;
  }

  const player = state.players[command.playerId];
  if (command.type === "setNuclearTarget") {
    return updatePlayer(state, {
      ...player,
      controls: {
        ...player.controls,
        nuclearTargetMW: clamp(command.targetMW, 0, player.capacities.nuclearCapacityMW),
      },
    });
  }

  if (command.type === "setThermalThrottle") {
    return updatePlayer(state, {
      ...player,
      controls: {
        ...player.controls,
        thermalThrottle: clamp01(command.throttle),
      },
    });
  }

  if (command.type === "setWaterDamMode") {
    return updatePlayer(state, {
      ...player,
      controls: {
        ...player.controls,
        waterDamMode: command.mode,
      },
    });
  }

  if (command.type === "setWindEnabled") {
    return updatePlayer(state, {
      ...player,
      controls: {
        ...player.controls,
        windEnabled: command.enabled,
      },
    });
  }

  if (command.type === "setGodMode") {
    return updatePlayer(state, {
      ...player,
      devGodMode: command.enabled,
      runtime: {
        ...player.runtime,
        capacityOverloadTimer: 0,
        balanceBreakerTimer: 0,
        breakerTrippedSeconds: command.enabled ? 0 : player.runtime.breakerTrippedSeconds,
        breakerResetHoldSeconds: 0,
        breakerTripFlashSeconds: 0,
        breakerRecoveredPulseSeconds: 0,
        gridShutdownReliefSeconds: command.enabled ? 0 : player.runtime.gridShutdownReliefSeconds,
      },
    });
  }

  if (command.type === "holdBreakerReset") {
    if (player.runtime.breakerTrippedSeconds <= 0) {
      return updatePlayer(state, {
        ...player,
        runtime: {
          ...player.runtime,
          breakerResetHoldSeconds: 0,
        },
      });
    }

    const breakerResetHoldSeconds = player.runtime.breakerResetHoldSeconds + command.seconds;
    const resetComplete = breakerResetHoldSeconds >= BREAKER_RESET_HOLD_SECONDS;
    if (resetComplete && player.cash < GAME_CONFIG.breaker.resetCost) {
      return updatePlayer(
        {
          ...state,
          gameOverReason: player.id === "player" ? "player-reset-bankrupt" : "rival-reset-bankrupt",
        },
        {
          ...player,
          runtime: {
            ...player.runtime,
            breakerResetHoldSeconds,
          },
        },
      );
    }
    return updatePlayer(state, {
      ...player,
      cash: resetComplete ? player.cash - GAME_CONFIG.breaker.resetCost : player.cash,
      runtime: {
        ...player.runtime,
        breakerResetHoldSeconds: resetComplete ? 0 : breakerResetHoldSeconds,
        breakerTrippedSeconds: resetComplete ? 0 : player.runtime.breakerTrippedSeconds,
        breakerTripFlashSeconds: 0,
        breakerRecoveredPulseSeconds: resetComplete ? BREAKER_RECOVERED_PULSE_SECONDS : 0,
        gridShutdownReliefSeconds: resetComplete
          ? GAME_CONFIG.breaker.gridShutdownReliefSeconds
          : player.runtime.gridShutdownReliefSeconds,
      },
    });
  }

  if (command.type === "buyUpgrade") {
    return updatePlayer(state, buyUpgrade(player, command.kind));
  }

  if (command.type === "acceptContract") {
    const offer = state.contractOffers.find((candidate) => candidate.kind === command.kind && candidate.status === "active");
    if (!offer) {
      return state;
    }
    return updateContractOfferStatus(
      updatePlayer(state, acceptContract(player, command.kind, Math.floor(state.timeSeconds))),
      offer.id,
      "accepted",
    );
  }

  if (command.type === "forceAcceptContract") {
    return updatePlayer(state, acceptContract(player, command.kind, Math.floor(state.timeSeconds)));
  }

  return state;
}

const BREAKER_RESET_HOLD_SECONDS = 2;
const BREAKER_TRIP_FLASH_SECONDS = 0.75;
const BREAKER_RECOVERED_PULSE_SECONDS = 1.25;

function gridDownOutputsFrom(player: PlayerState): PlayerState["lastOutputs"] {
  return {
    ...player.lastOutputs,
    nuclearOutputMW: 0,
    thermalOutputMW: 0,
    solarOutputMW: 0,
    windOutputMW: 0,
    damOutputMW: 0,
    damAbsorbMW: 0,
    rawProductionMW: 0,
    deliveredSupplyMW: 0,
    plantStates: {
      nuclear: "gridDown",
      thermal: "gridDown",
      solar: "gridDown",
      wind: "gridDown",
      waterDam: "gridDown",
    },
  };
}

function applyStrike(player: PlayerState, reason: BreakerReason): PlayerState {
  const contractPenalty = player.activeContracts.reduce((sum, contract) => sum + contract.strikeScorePenalty, 0);
  const totalScorePenalty = GAME_CONFIG.strike.scorePenalty + contractPenalty;
  const tripSummary: BreakerTripSummary = {
    reason,
    cashPenalty: GAME_CONFIG.strike.cashPenalty,
    subscriberLossRatio: GAME_CONFIG.strike.subscriberLossRatio,
    strikeScorePenalty: GAME_CONFIG.strike.scorePenalty,
    contractScorePenalty: contractPenalty,
    totalScorePenalty,
  };
  return {
    ...player,
    strikes: player.strikes + 1,
    cash: player.cash - GAME_CONFIG.strike.cashPenalty,
    score: player.score - totalScorePenalty,
    subscribedLoadShare: player.subscribedLoadShare * (1 - GAME_CONFIG.strike.subscriberLossRatio),
    runtime: {
      ...player.runtime,
      breakerTrippedSeconds: GAME_CONFIG.breaker.breakerTripSeconds,
      breakerResetHoldSeconds: 0,
      breakerTripFlashSeconds: BREAKER_TRIP_FLASH_SECONDS,
      breakerRecoveredPulseSeconds: 0,
      gridShutdownReliefSeconds: GAME_CONFIG.breaker.gridShutdownReliefSeconds,
      capacityOverloadTimer: 0,
      balanceBreakerTimer: 0,
      lastBreakerReason: reason,
      lastBreakerTripSummary: tripSummary,
    },
  };
}

function tickOnePlayer(
  player: PlayerState,
  totalDemandMW: number,
  solarFactor: number,
  windKmh: number,
  rainActive: boolean,
  dt: number,
): PlayerState {
  let next = tickUpgrades(player, dt);
  next = {
    ...next,
    runtime: {
      ...next.runtime,
      breakerTripFlashSeconds: Math.max(0, next.runtime.breakerTripFlashSeconds - dt),
      breakerRecoveredPulseSeconds: Math.max(0, next.runtime.breakerRecoveredPulseSeconds - dt),
      gridShutdownReliefSeconds:
        next.runtime.breakerTrippedSeconds > 0
          ? next.runtime.gridShutdownReliefSeconds
          : Math.max(0, next.runtime.gridShutdownReliefSeconds - dt),
      breakerResetHoldSeconds: next.runtime.breakerTrippedSeconds > 0 ? next.runtime.breakerResetHoldSeconds : 0,
    },
  };

  const customerDemandMW = totalDemandMW * next.subscribedLoadShare;
  const fixedLoadMW = next.activeContracts.reduce((sum, contract) => sum + contract.loadMW, 0);
  const nominalDemandMW = customerDemandMW + fixedLoadMW;
  const gridDown = next.runtime.breakerTrippedSeconds > 0;
  const inShutdownRelief = next.runtime.gridShutdownReliefSeconds > 0;
  const assets = updateAssetOutputs({
    capacities: next.capacities,
    runtime: next.runtime,
    controls: next.controls,
    currentDemandMW: gridDown ? 0 : nominalDemandMW,
    dt,
    solarFactor,
    windKmh,
    rainActive,
  });

  next = {
    ...next,
    runtime: assets.runtime,
    lastOutputs: assets.outputs,
  };

  const renewableOutputMW = assets.outputs.solarOutputMW + assets.outputs.windOutputMW;
  const currentDemandMW = inShutdownRelief ? assets.outputs.rawProductionMW : nominalDemandMW;
  const contractLoadMW = inShutdownRelief ? currentDemandMW : currentContractLoadMW(totalDemandMW, next.subscribedLoadShare, next.activeContracts);
  const basisMW = contractCapacityBasisMW({
    capacities: next.capacities,
    activeContracts: next.activeContracts,
    currentRenewableOutputMW: renewableOutputMW,
  });
  const efficiency = computeContractEfficiency({
    currentContractLoadMW: contractLoadMW,
    contractCapacityBasisMW: basisMW,
  });
  const capacityUtilization = contractLoadMW / Math.max(basisMW, 1);
  const supplyDemandMismatch = computeSupplyDemandMismatch(assets.outputs.rawProductionMW, currentDemandMW);

  if (next.devGodMode) {
    next = {
      ...next,
      runtime: {
        ...next.runtime,
        capacityOverloadTimer: 0,
        balanceBreakerTimer: 0,
        breakerTrippedSeconds: 0,
        breakerResetHoldSeconds: 0,
        breakerTripFlashSeconds: 0,
        gridShutdownReliefSeconds: 0,
      },
    };
  } else if (inShutdownRelief) {
    next = {
      ...next,
      runtime: {
        ...next.runtime,
        capacityOverloadTimer: 0,
        balanceBreakerTimer: 0,
      },
    };
  } else if (next.runtime.breakerTrippedSeconds <= 0) {
    const breaker = updateBreakerRisk({
      capacityUtilization,
      supplyDemandMismatch,
      capacityOverloadTimer: next.runtime.capacityOverloadTimer,
      balanceBreakerTimer: next.runtime.balanceBreakerTimer,
      dt,
    });
    next = {
      ...next,
      runtime: {
        ...next.runtime,
        capacityOverloadTimer: breaker.capacityOverloadTimer,
        balanceBreakerTimer: breaker.balanceBreakerTimer,
      },
    };
    if (breaker.tripped && breaker.reason) {
      next = applyStrike(next, breaker.reason);
    }
  }

  if (next.runtime.breakerTrippedSeconds > 0) {
    const gridDownOutputs = gridDownOutputsFrom({ ...next, lastOutputs: assets.outputs });
    return {
      ...next,
      lastOutputs: gridDownOutputs,
      lastCurrentDemandMW: 0,
      lastEfficiency: 0,
      lastPrice: priceFromEfficiency(0),
      lastContractLoadMW: 0,
      lastContractCapacityBasisMW: basisMW,
      lastCapacityUtilization: 0,
      lastSupplyDemandMismatch: 0,
    };
  }

  next = tickContracts(next, dt);

  return {
    ...next,
    lastCurrentDemandMW: currentDemandMW,
    lastEfficiency: efficiency,
    lastPrice: priceFromEfficiency(efficiency),
    lastContractLoadMW: contractLoadMW,
    lastContractCapacityBasisMW: basisMW,
    lastCapacityUtilization: capacityUtilization,
    lastSupplyDemandMismatch: supplyDemandMismatch,
  };
}

function tickContractOffers(
  offers: ContractOffer[],
  timeSeconds: number,
  dt: number,
  pauseActiveOffer: boolean,
): ContractOffer[] {
  return offers.map((offer) => {
    if (offer.status === "pending" && timeSeconds >= offer.startsAtSeconds) {
      return {
        ...offer,
        status: "active",
        remainingSeconds: GAME_CONFIG.contracts.offerWindowSeconds,
      };
    }

    if (offer.status !== "active" || pauseActiveOffer) {
      return offer;
    }

    const remainingSeconds = offer.remainingSeconds - dt;
    return remainingSeconds <= 0
      ? {
          ...offer,
          status: "declined",
          remainingSeconds: 0,
        }
      : {
          ...offer,
          remainingSeconds,
        };
  });
}

export function tickMatch(state: MatchState, dt = 1 / GAME_CONFIG.match.tickRateHz): MatchState {
  if (state.isPaused || isMatchOver(state)) {
    return state;
  }

  const nextTime = state.timeSeconds + dt;
  const environment = sampleEventEnvironment({
    seed: state.seed,
    demandSchedule: state.demandSchedule,
    timeSeconds: nextTime,
  });
  const { publicEvents, weather, demand, solarFactor, windKmh } = environment;

  let player = tickOnePlayer(state.players.player, demand.totalMW, solarFactor, windKmh, weather.rainActive, dt);
  let rival = tickOnePlayer(state.players.rival, demand.totalMW, solarFactor, windKmh, weather.rainActive, dt);
  const revenue = computeRevenueTick({
    efficiency: player.lastEfficiency,
    opponentEfficiency: rival.lastEfficiency,
    totalDemandMW: demand.totalMW,
    dt,
  });
  const playerCashGain = player.runtime.breakerTrippedSeconds > 0 ? 0 : revenue.cashGainA;
  const rivalCashGain = rival.runtime.breakerTrippedSeconds > 0 ? 0 : revenue.cashGainB;

  const playerMaxShare = deterministicMaxCapacityMW(player.capacities) / Math.max(demand.totalMW, 1);
  const rivalMaxShare = deterministicMaxCapacityMW(rival.capacities) / Math.max(demand.totalMW, 1);

  player = {
    ...player,
    cash: player.cash + playerCashGain,
    score: player.score + playerCashGain,
    targetMarketShare: revenue.targetShareA,
    subscribedLoadShare: updateSubscribedLoadShare(player.subscribedLoadShare, revenue.targetShareA, dt, playerMaxShare),
    lastCashGain: playerCashGain,
    lastPrice: revenue.priceA,
    lastMargin: revenue.marginA,
  };
  rival = {
    ...rival,
    cash: rival.cash + rivalCashGain,
    score: rival.score + rivalCashGain,
    targetMarketShare: revenue.targetShareB,
    subscribedLoadShare: updateSubscribedLoadShare(rival.subscribedLoadShare, revenue.targetShareB, dt, rivalMaxShare),
    lastCashGain: rivalCashGain,
    lastPrice: revenue.priceB,
    lastMargin: revenue.marginB,
  };

  const gameOverReason =
    state.gameOverReason ??
    (player.runtime.breakerTrippedSeconds > 0 && player.cash < GAME_CONFIG.breaker.resetCost
      ? "player-reset-bankrupt"
      : rival.runtime.breakerTrippedSeconds > 0 && rival.cash < GAME_CONFIG.breaker.resetCost
        ? "rival-reset-bankrupt"
        : undefined);

  return {
    seed: state.seed,
    demandSchedule: state.demandSchedule,
    contractOffers: tickContractOffers(state.contractOffers, nextTime, dt, player.runtime.breakerTrippedSeconds > 0),
    timeSeconds: nextTime,
    isPaused: false,
    gameOverReason,
    activeEvents: publicEvents.tokens,
    players: {
      player,
      rival,
    },
  };
}

export function selectPlayerDerivedStats(state: MatchState, playerId: PlayerId): DerivedPlayerStats {
  const player = state.players[playerId];
  return {
    efficiency: player.lastEfficiency,
    price: player.lastPrice,
    margin: player.lastMargin,
    targetMarketShare: player.targetMarketShare,
    subscribedLoadShare: player.subscribedLoadShare,
    currentContractLoadMW: player.lastContractLoadMW,
    contractCapacityBasisMW: player.lastContractCapacityBasisMW,
    currentDemandMW: player.lastCurrentDemandMW,
    capacityUtilization: player.lastCapacityUtilization,
    supplyDemandMismatch: player.lastSupplyDemandMismatch,
    outputs: player.lastOutputs,
  };
}

function totalMaxCapacityForPlayer(player: PlayerState): number {
  return Math.min(
    player.capacities.gridCapacityMW,
    player.capacities.nuclearCapacityMW +
      player.capacities.thermalCapacityMW +
      player.lastOutputs.solarOutputMW +
      player.lastOutputs.windOutputMW +
      player.capacities.waterDamMaxPowerMW,
  );
}

function capacityZone(utilization: number, breakerSeconds: number): DispatchConsoleState["capacityZone"] {
  if (breakerSeconds > 0) {
    return "trip";
  }
  if (utilization < 0.7) {
    return "idle";
  }
  if (utilization < 0.85) {
    return "safe";
  }
  if (utilization <= 0.98) {
    return "efficient";
  }
  if (utilization <= 1) {
    return "strain";
  }
  return "tripRisk";
}

function balanceZone(mismatch: number): DispatchConsoleState["balanceZone"] {
  if (mismatch < -GAME_CONFIG.breaker.severeBalanceMismatch) {
    return "severeUnderload";
  }
  if (mismatch < -GAME_CONFIG.breaker.safeBalanceBand) {
    return "underload";
  }
  if (mismatch > GAME_CONFIG.breaker.severeBalanceMismatch) {
    return "severeOverload";
  }
  if (mismatch > GAME_CONFIG.breaker.safeBalanceBand) {
    return "overload";
  }
  return "lock";
}

function breakerRiskSource(player: PlayerState): BreakerRiskSource {
  if (player.runtime.capacityOverloadTimer >= player.runtime.balanceBreakerTimer && player.runtime.capacityOverloadTimer > 0) {
    return "capacity";
  }
  if (player.runtime.balanceBreakerTimer > 0) {
    return "balance";
  }
  return "none";
}

function breakerLifecycle(player: PlayerState): BreakerLifecycleState {
  if (player.devGodMode) {
    return "safe";
  }
  if (player.runtime.breakerRecoveredPulseSeconds > 0) {
    return "recovered";
  }
  if (player.runtime.breakerTrippedSeconds > 0 && player.runtime.breakerResetHoldSeconds > 0) {
    return "reset-progress";
  }
  if (player.runtime.breakerTrippedSeconds > 0 && player.runtime.breakerTripFlashSeconds > 0) {
    return "tripped";
  }
  if (player.runtime.breakerTrippedSeconds > 0) {
    return "awaiting-reset";
  }
  if (player.runtime.gridShutdownReliefSeconds > 0) {
    return "recovered";
  }
  if (player.runtime.capacityOverloadTimer > 0 || player.runtime.balanceBreakerTimer > 0) {
    return "warning";
  }
  return "safe";
}

function breakerStatusText(player: PlayerState): string {
  if (player.devGodMode) {
    return "GOD MODE: BREAKER BYPASSED";
  }
  const lifecycle = breakerLifecycle(player);
  const reason = player.runtime.lastBreakerReason?.replace("-", " ").toUpperCase() ?? "UNKNOWN";
  if (lifecycle === "tripped") {
    return `GRID DOWN: ${reason}`;
  }
  if (lifecycle === "awaiting-reset") {
    return `RESET REQUIRED: ${reason} / COST ${GAME_CONFIG.breaker.resetCost}`;
  }
  if (lifecycle === "reset-progress") {
    if (player.cash < GAME_CONFIG.breaker.resetCost) {
      return `RESET BLOCKED: NEED ${GAME_CONFIG.breaker.resetCost}`;
    }
    return `RESET HOLD ${(player.runtime.breakerResetHoldSeconds / BREAKER_RESET_HOLD_SECONDS * 100).toFixed(0)}%`;
  }
  if (lifecycle === "recovered") {
    return player.runtime.gridShutdownReliefSeconds > 0
      ? `NETWORK RESET COMPLETE / RELIEF ${player.runtime.gridShutdownReliefSeconds.toFixed(0)}s`
      : "NETWORK RESET COMPLETE";
  }
  if (player.runtime.capacityOverloadTimer > 0) {
    return `CAPACITY RISK ${player.runtime.capacityOverloadTimer.toFixed(1)}s`;
  }
  if (player.runtime.balanceBreakerTimer > 0) {
    return `BALANCE RISK ${player.runtime.balanceBreakerTimer.toFixed(1)}s`;
  }
  return "BREAKER SAFE";
}

export function selectDispatchConsoleState(state: MatchState): DispatchConsoleState {
  const player = state.players.player;
  const rival = state.players.rival;
  const environment = sampleEventEnvironment({
    seed: state.seed,
    demandSchedule: state.demandSchedule,
    timeSeconds: state.timeSeconds,
  });
  const demand = environment.demand;
  const deterministicMaxMW = deterministicMaxCapacityMW(player.capacities);
  const totalMaxMW = totalMaxCapacityForPlayer(player);
  const breakerLifecycleState = breakerLifecycle(player);
  const isGridDown = player.runtime.breakerTrippedSeconds > 0;
  const inShutdownRelief = player.runtime.gridShutdownReliefSeconds > 0;
  const effectiveLoadShare = inShutdownRelief ? player.lastContractLoadMW / Math.max(demand.totalMW, 1) : player.subscribedLoadShare;
  const effectiveTargetShare = inShutdownRelief ? effectiveLoadShare : player.targetMarketShare;
  const activeEventId = state.activeEvents[0]?.id;
  const sectors: Record<"homes" | "services" | "dataCenters", SectorVisualState> = {
    homes: {
      demandLevel: demand.levels.households,
      isSpiking: state.activeEvents.some((event) => event.id === "footballFinal" && event.phase === "impact"),
      isDemandCritical: demand.levels.households === 3 || demand.householdsMW > GAME_CONFIG.demand.sectors.householdsMW[2],
      isBrownedOut: isGridDown || (player.strikes > 0 && player.lastSupplyDemandMismatch < -0.15),
      activeEventId,
    },
    services: {
      demandLevel: demand.levels.business,
      isSpiking: false,
      isDemandCritical: demand.levels.business === 3,
      isBrownedOut: isGridDown,
      activeEventId: undefined,
    },
    dataCenters: {
      demandLevel: demand.levels.dataCenters,
      isSpiking: state.activeEvents.some((event) => event.id === "dataCenterBurst" && event.phase === "impact"),
      isDemandCritical: demand.levels.dataCenters === 3 || demand.dataCentersMW > GAME_CONFIG.demand.sectors.dataCentersMW[2],
      isBrownedOut: isGridDown || (player.strikes > 0 && player.lastSupplyDemandMismatch < -0.15),
      activeEventId,
    },
  };
  const activeOffer = state.contractOffers.find((offer) => offer.status === "active");
  const fixedLoadMW = player.activeContracts.reduce((sum, contract) => sum + contract.loadMW, 0);
  const contractOffer: ContractOfferState | undefined = activeOffer
    ? {
        id: activeOffer.id,
        kind: activeOffer.kind,
        title: contractTitle(activeOffer.kind),
        loadMW: GAME_CONFIG.contracts.types[activeOffer.kind].loadMW,
        durationSeconds: GAME_CONFIG.contracts.types[activeOffer.kind].durationSeconds,
        completionCashReward: GAME_CONFIG.contracts.types[activeOffer.kind].completionCashReward,
        strikeScorePenalty: GAME_CONFIG.contracts.types[activeOffer.kind].strikeScorePenalty,
        remainingSeconds: activeOffer.remainingSeconds,
        countdownRatio: Math.max(0, Math.min(1, activeOffer.remainingSeconds / GAME_CONFIG.contracts.offerWindowSeconds)),
      }
    : undefined;
  const activeContracts: ActiveContractState[] = player.activeContracts.map((contract) => ({
    id: contract.id,
    kind: contract.kind,
    title: contractTitle(contract.kind),
    loadMW: contract.loadMW,
    remainingSeconds: contract.remainingSeconds,
  }));

  return {
    cash: player.cash,
    score: player.score,
    strikes: player.strikes,
    timeSeconds: state.timeSeconds,
    playerEfficiency: player.lastEfficiency,
    playerTariffCents: player.lastPrice,
    rivalTariffCents: rival.lastPrice,
    playerSubscribedLoadShare: effectiveLoadShare,
    playerTargetMarketShare: effectiveTargetShare,
    cityDemandMW: demand.totalMW,
    currentContractLoadMW: player.lastContractLoadMW,
    contractCapacityBasisMW: player.lastContractCapacityBasisMW,
    deterministicMaxCapacityMW: deterministicMaxMW,
    totalMaxCapacityMW: totalMaxMW,
    gridCapacityMW: player.capacities.gridCapacityMW,
    generationMW: player.lastOutputs.rawProductionMW,
    deliveredSupplyMW: player.lastOutputs.deliveredSupplyMW,
    currentDemandMW: player.lastCurrentDemandMW,
    capacityUtilization: player.lastCapacityUtilization,
    supplyDemandMismatch: player.lastSupplyDemandMismatch,
    capacityZone: capacityZone(player.lastCapacityUtilization, player.runtime.breakerTrippedSeconds),
    balanceZone: balanceZone(player.lastSupplyDemandMismatch),
    breakerTimer: Math.max(player.runtime.balanceBreakerTimer, player.runtime.capacityOverloadTimer),
    balanceBreakerTimer: player.runtime.balanceBreakerTimer,
    capacityOverloadTimer: player.runtime.capacityOverloadTimer,
    breakerRiskSource: breakerRiskSource(player),
    breakerLifecycle: breakerLifecycleState,
    breakerTripReason: player.runtime.lastBreakerReason,
    breakerResetRequired: isGridDown,
    breakerResetProgress: Math.min(1, player.runtime.breakerResetHoldSeconds / BREAKER_RESET_HOLD_SECONDS),
    breakerResetCost: GAME_CONFIG.breaker.resetCost,
    canAffordBreakerReset: player.cash >= GAME_CONFIG.breaker.resetCost,
    gridShutdownReliefSeconds: player.runtime.gridShutdownReliefSeconds,
    isGridDown,
    devGodMode: player.devGodMode,
    breakerStatusText: breakerStatusText(player),
    lastBreakerTripSummary: player.runtime.lastBreakerTripSummary,
    activeEventLabel: state.activeEvents[0]?.label ?? "BASELINE",
    plants: buildPlantUpgradeStates(player),
    sectors,
    forecast: forecastWeather(state.seed, state.timeSeconds),
    incidents: forecastEventQueue(state.timeSeconds),
    eventTrace: buildEventTrace({
      seed: state.seed,
      demandSchedule: state.demandSchedule,
      timeSeconds: state.timeSeconds,
      capacities: player.capacities,
      controls: player.controls,
      subscribedLoadShare: isGridDown ? 0 : player.subscribedLoadShare,
      fixedLoadMW: isGridDown ? 0 : fixedLoadMW,
    }),
    contractOffer,
    activeContracts,
  };
}

export function selectProductionConsoleState(state: MatchState): ProductionConsoleState {
  const dispatch = selectDispatchConsoleState(state);
  const player = state.players.player;
  const environment = sampleEventEnvironment({
    seed: state.seed,
    demandSchedule: state.demandSchedule,
    timeSeconds: state.timeSeconds,
  });
  return {
    ...dispatch,
    matchSeed: state.seed,
    currentWeather: environment.weather,
    currentWindKmh: environment.windKmh,
    windPotentialMW: player.capacities.windPeakMW * windFactor(environment.windKmh),
    rainActive: environment.weather.rainActive,
    solarFactor: environment.solarFactor,
    timeOfDayRatio: environment.weather.timeOfDayRatio,
    nuclearTargetMW: player.controls.nuclearTargetMW,
    nuclearOutputMW: player.lastOutputs.nuclearOutputMW,
    thermalThrottle: player.controls.thermalThrottle,
    thermalHeat: player.runtime.thermalHeat,
    thermalOutputMW: player.lastOutputs.thermalOutputMW,
    solarOutputMW: player.lastOutputs.solarOutputMW,
    windOutputMW: player.lastOutputs.windOutputMW,
    damOutputMW: player.lastOutputs.damOutputMW,
    damAbsorbMW: player.lastOutputs.damAbsorbMW,
    storedWaterMWh: player.runtime.storedWaterMWh,
    waterDamCapacityMWh: player.capacities.waterDamCapacityMWh,
    waterDamMaxPowerMW: player.capacities.waterDamMaxPowerMW,
    nuclearCapacityMW: player.capacities.nuclearCapacityMW,
    thermalCapacityMW: player.capacities.thermalCapacityMW,
    solarPeakMW: player.capacities.solarPeakMW,
    windPeakMW: player.capacities.windPeakMW,
    waterDamMode: player.controls.waterDamMode,
    windEnabled: player.controls.windEnabled,
    breakerTrippedSeconds: player.runtime.breakerTrippedSeconds,
    breakerResetProgress: Math.min(1, player.runtime.breakerResetHoldSeconds / BREAKER_RESET_HOLD_SECONDS),
    plantStates: player.lastOutputs.plantStates,
    gameOverReason: state.gameOverReason,
  };
}

export function isMatchOver(state: MatchState): boolean {
  return state.gameOverReason !== undefined || state.timeSeconds >= GAME_CONFIG.match.durationSeconds;
}

export function computeFinalResult(state: MatchState): FinalResult {
  const playerFinalScore = state.players.player.score;
  const rivalFinalScore = state.players.rival.score;
  const winner =
    state.gameOverReason === "player-reset-bankrupt"
      ? "rival"
      : state.gameOverReason === "rival-reset-bankrupt"
        ? "player"
        : playerFinalScore === rivalFinalScore
          ? "tie"
          : playerFinalScore > rivalFinalScore
            ? "player"
            : "rival";
  return {
    winner,
    reason: state.gameOverReason ?? "time",
    playerFinalScore,
    rivalFinalScore,
    playerScore: state.players.player.score,
    rivalScore: state.players.rival.score,
    playerStrikes: state.players.player.strikes,
    rivalStrikes: state.players.rival.strikes,
  };
}
