import { updateAssetOutputs } from "./assets";
import { updateBreakerRisk, computeSupplyDemandMismatch } from "./breaker";
import { applyCardCostAndCooldown, applyDemandResponse, createIncomingAttack, opponentOf, tickCards } from "./cards";
import { GAME_CONFIG } from "./config";
import { acceptContract, tickContracts } from "./contracts";
import { computeDemand } from "./demand";
import {
  contractCapacityBasisMW,
  computeContractEfficiency,
  currentContractLoadMW,
  deterministicMaxCapacityMW,
} from "./efficiency";
import { getPublicEventState } from "./events";
import { clamp, clamp01 } from "./math";
import { priceFromEfficiency, updateSubscribedLoadShare } from "./market";
import { createInitialPlayerState } from "./playerState";
import { computeRevenueTick } from "./revenue";
import { buyUpgrade, tickUpgrades } from "./upgrades";
import type {
  BreakerReason,
  CardKind,
  DerivedPlayerStats,
  DispatchConsoleState,
  FinalResult,
  MatchState,
  PlayerCommand,
  PlayerId,
  PlayerState,
  ProductionConsoleState,
} from "./types";

export function createInitialMatchState(): MatchState {
  return {
    timeSeconds: 0,
    isPaused: false,
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

export function applyPlayerCommand(state: MatchState, command: PlayerCommand): MatchState {
  if (command.type === "pause") {
    return { ...state, isPaused: true };
  }
  if (command.type === "resume") {
    return { ...state, isPaused: false };
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

  if (command.type === "shedLoad") {
    return updatePlayer(state, applyDemandResponse(player));
  }

  if (command.type === "buyUpgrade") {
    return updatePlayer(state, buyUpgrade(player, command.kind));
  }

  if (command.type === "acceptContract") {
    return updatePlayer(state, acceptContract(player, command.kind, Math.floor(state.timeSeconds)));
  }

  const withCost = applyCardCostAndCooldown(player, command.kind);
  if (withCost === player) {
    return state;
  }

  if (command.kind === "demandResponse") {
    return updatePlayer(state, applyDemandResponse(player));
  }

  const opponentId = opponentOf(command.playerId);
  const opponent = state.players[opponentId];
  return {
    ...state,
    players: {
      ...state.players,
      [command.playerId]: withCost,
      [opponentId]: {
        ...opponent,
        incomingAttacks: [...opponent.incomingAttacks, createIncomingAttack(command.kind as Extract<CardKind, "cloudFront" | "windStorm">)],
      },
    },
  };
}

function applyStrike(player: PlayerState, reason: BreakerReason): PlayerState {
  const contractPenalty = player.activeContracts.reduce((sum, contract) => sum + contract.strikeScorePenalty, 0);
  return {
    ...player,
    strikes: player.strikes + 1,
    cash: player.cash - GAME_CONFIG.strike.cashPenalty,
    score: player.score - contractPenalty,
    subscribedLoadShare: player.subscribedLoadShare * (1 - GAME_CONFIG.strike.subscriberLossRatio),
    runtime: {
      ...player.runtime,
      breakerTrippedSeconds: GAME_CONFIG.breaker.breakerTripSeconds,
      capacityOverloadTimer: 0,
      balanceBreakerTimer: 0,
      lastBreakerReason: reason,
    },
  };
}

function tickOnePlayer(player: PlayerState, totalDemandMW: number, solarFactor: number, windKmh: number, dt: number): PlayerState {
  let next = tickContracts(tickCards(tickUpgrades(player, dt), dt), dt);
  next = {
    ...next,
    runtime: {
      ...next.runtime,
      breakerTrippedSeconds: Math.max(0, next.runtime.breakerTrippedSeconds - dt),
    },
  };

  const customerDemandMW = totalDemandMW * next.subscribedLoadShare;
  const fixedLoadMW = next.activeContracts.reduce((sum, contract) => sum + contract.loadMW, 0);
  const demandResponseMultiplier = next.demandResponseSeconds > 0 ? GAME_CONFIG.cards.demandResponse.demandMultiplier : 1;
  const currentDemandMW = customerDemandMW * demandResponseMultiplier + fixedLoadMW;
  const assets = updateAssetOutputs({
    capacities: next.capacities,
    runtime: next.runtime,
    controls: next.controls,
    currentDemandMW,
    dt,
    solarFactor,
    windKmh,
    incomingAttacks: next.incomingAttacks,
  });

  next = {
    ...next,
    runtime: assets.runtime,
    lastOutputs: assets.outputs,
    lastCurrentDemandMW: currentDemandMW,
  };

  const renewableOutputMW = assets.outputs.solarOutputMW + assets.outputs.windOutputMW;
  const contractLoadMW = currentContractLoadMW(totalDemandMW, next.subscribedLoadShare, next.activeContracts);
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
  const supplyDemandMismatch = computeSupplyDemandMismatch(assets.outputs.deliveredSupplyMW, currentDemandMW);

  if (next.runtime.breakerTrippedSeconds <= 0) {
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

  return {
    ...next,
    lastEfficiency: efficiency,
    lastPrice: priceFromEfficiency(efficiency),
    lastContractLoadMW: contractLoadMW,
    lastContractCapacityBasisMW: basisMW,
    lastCapacityUtilization: capacityUtilization,
    lastSupplyDemandMismatch: supplyDemandMismatch,
  };
}

export function tickMatch(state: MatchState, dt = 1 / GAME_CONFIG.match.tickRateHz): MatchState {
  if (state.isPaused || isMatchOver(state)) {
    return state;
  }

  const nextTime = state.timeSeconds + dt;
  const publicEvents = getPublicEventState(nextTime);
  const demand = computeDemand(publicEvents);
  const solarFactor = GAME_CONFIG.assets.renewable.solarDefaultFactor * publicEvents.solarFactorMultiplier;
  const windKmh = publicEvents.windKmhOverride ?? GAME_CONFIG.assets.renewable.windDefaultKmh;

  let player = tickOnePlayer(state.players.player, demand.totalMW, solarFactor, windKmh, dt);
  let rival = tickOnePlayer(state.players.rival, demand.totalMW, solarFactor, windKmh, dt);
  const revenue = computeRevenueTick({
    efficiency: player.lastEfficiency,
    opponentEfficiency: rival.lastEfficiency,
    totalDemandMW: demand.totalMW,
    dt,
  });

  const playerMaxShare = deterministicMaxCapacityMW(player.capacities) / Math.max(demand.totalMW, 1);
  const rivalMaxShare = deterministicMaxCapacityMW(rival.capacities) / Math.max(demand.totalMW, 1);

  player = {
    ...player,
    cash: player.cash + revenue.cashGainA,
    score: player.score + revenue.cashGainA,
    targetMarketShare: revenue.targetShareA,
    subscribedLoadShare: updateSubscribedLoadShare(player.subscribedLoadShare, revenue.targetShareA, dt, playerMaxShare),
    lastCashGain: revenue.cashGainA,
    lastPrice: revenue.priceA,
    lastMargin: revenue.marginA,
  };
  rival = {
    ...rival,
    cash: rival.cash + revenue.cashGainB,
    score: rival.score + revenue.cashGainB,
    targetMarketShare: revenue.targetShareB,
    subscribedLoadShare: updateSubscribedLoadShare(rival.subscribedLoadShare, revenue.targetShareB, dt, rivalMaxShare),
    lastCashGain: revenue.cashGainB,
    lastPrice: revenue.priceB,
    lastMargin: revenue.marginB,
  };

  return {
    timeSeconds: nextTime,
    isPaused: false,
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

export function selectDispatchConsoleState(state: MatchState): DispatchConsoleState {
  const player = state.players.player;
  const rival = state.players.rival;
  const events = getPublicEventState(state.timeSeconds);
  const demand = computeDemand(events);

  return {
    cash: player.cash,
    score: player.score,
    strikes: player.strikes,
    timeSeconds: state.timeSeconds,
    playerEfficiency: player.lastEfficiency,
    rivalEfficiency: rival.lastEfficiency,
    playerTariffCents: player.lastPrice,
    rivalTariffCents: rival.lastPrice,
    playerSubscribedLoadShare: player.subscribedLoadShare,
    playerTargetMarketShare: player.targetMarketShare,
    cityDemandMW: demand.totalMW,
    currentContractLoadMW: player.lastContractLoadMW,
    contractCapacityBasisMW: player.lastContractCapacityBasisMW,
    deliveredSupplyMW: player.lastOutputs.deliveredSupplyMW,
    currentDemandMW: player.lastCurrentDemandMW,
    capacityUtilization: player.lastCapacityUtilization,
    supplyDemandMismatch: player.lastSupplyDemandMismatch,
    capacityZone: capacityZone(player.lastCapacityUtilization, player.runtime.breakerTrippedSeconds),
    balanceZone: balanceZone(player.lastSupplyDemandMismatch),
    breakerTimer: Math.max(player.runtime.balanceBreakerTimer, player.runtime.capacityOverloadTimer),
    activeEventLabel: state.activeEvents[0]?.label ?? "BASELINE",
  };
}

export function selectProductionConsoleState(state: MatchState): ProductionConsoleState {
  const dispatch = selectDispatchConsoleState(state);
  const player = state.players.player;
  return {
    ...dispatch,
    nuclearTargetMW: player.controls.nuclearTargetMW,
    nuclearOutputMW: player.runtime.nuclearOutputMW,
    thermalThrottle: player.controls.thermalThrottle,
    thermalHeat: player.runtime.thermalHeat,
    storedWaterMWh: player.runtime.storedWaterMWh,
    waterDamMode: player.controls.waterDamMode,
    windEnabled: player.controls.windEnabled,
  };
}

export function isMatchOver(state: MatchState): boolean {
  return state.timeSeconds >= GAME_CONFIG.match.durationSeconds;
}

export function computeFinalResult(state: MatchState): FinalResult {
  const playerFinalScore = state.players.player.score - state.players.player.strikes * GAME_CONFIG.strike.scorePenalty;
  const rivalFinalScore = state.players.rival.score - state.players.rival.strikes * GAME_CONFIG.strike.scorePenalty;
  return {
    winner: playerFinalScore === rivalFinalScore ? "tie" : playerFinalScore > rivalFinalScore ? "player" : "rival",
    playerFinalScore,
    rivalFinalScore,
    playerScore: state.players.player.score,
    rivalScore: state.players.rival.score,
    playerStrikes: state.players.player.strikes,
    rivalStrikes: state.players.rival.strikes,
  };
}
