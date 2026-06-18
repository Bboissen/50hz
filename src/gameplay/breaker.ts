import { GAME_CONFIG } from "./config";
import type { BreakerReason } from "./types";

export function computeSupplyDemandMismatch(generationMW: number, currentDemandMW: number): number {
  return (generationMW - currentDemandMW) / Math.max(currentDemandMW, 1);
}

export function updateBreakerRisk(args: {
  capacityUtilization: number;
  supplyDemandMismatch: number;
  capacityOverloadTimer: number;
  balanceBreakerTimer: number;
  dt: number;
}): {
  capacityOverloadTimer: number;
  balanceBreakerTimer: number;
  tripped: boolean;
  reason?: BreakerReason;
} {
  let capacityOverloadTimer = args.capacityOverloadTimer;
  let balanceBreakerTimer = args.balanceBreakerTimer;

  if (args.capacityUtilization > GAME_CONFIG.breaker.capacityOverloadInstantThreshold) {
    return {
      capacityOverloadTimer: 0,
      balanceBreakerTimer,
      tripped: true,
      reason: "capacity-overload",
    };
  }

  if (args.capacityUtilization > 1) {
    capacityOverloadTimer += args.dt;
    if (capacityOverloadTimer >= GAME_CONFIG.breaker.capacityOverloadBreakerSeconds) {
      return {
        capacityOverloadTimer,
        balanceBreakerTimer,
        tripped: true,
        reason: "capacity-overload",
      };
    }
  } else {
    capacityOverloadTimer = Math.max(0, capacityOverloadTimer - GAME_CONFIG.breaker.capacityOverloadRecoverySeconds * args.dt);
  }

  const mismatchMagnitude = Math.abs(args.supplyDemandMismatch);
  if (mismatchMagnitude > GAME_CONFIG.breaker.severeBalanceMismatch) {
    balanceBreakerTimer += args.dt * GAME_CONFIG.breaker.severeBalanceTimerMultiplier;
  } else if (mismatchMagnitude > GAME_CONFIG.breaker.safeBalanceBand) {
    balanceBreakerTimer += args.dt;
  } else {
    balanceBreakerTimer = Math.max(0, balanceBreakerTimer - GAME_CONFIG.breaker.balanceRecoverySeconds * args.dt);
  }

  if (balanceBreakerTimer >= GAME_CONFIG.breaker.balanceBreakerSeconds) {
    return {
      capacityOverloadTimer,
      balanceBreakerTimer,
      tripped: true,
      reason: args.supplyDemandMismatch < 0 ? "underload" : "overload",
    };
  }

  return {
    capacityOverloadTimer,
    balanceBreakerTimer,
    tripped: false,
  };
}
