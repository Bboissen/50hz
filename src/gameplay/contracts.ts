import { GAME_CONFIG } from "./config";
import type { ActiveContract, ContractKind, PlayerState } from "./types";

export function createContract(kind: ContractKind, sequence: number): ActiveContract {
  const config = GAME_CONFIG.contracts[kind];
  return {
    id: `${kind}-${sequence}`,
    kind,
    loadMW: config.loadMW,
    remainingSeconds: config.durationSeconds,
    completionCashReward: config.completionCashReward,
    strikeScorePenalty: config.strikeScorePenalty,
  };
}

export function acceptContract(player: PlayerState, kind: ContractKind, sequence: number): PlayerState {
  return {
    ...player,
    activeContracts: [...player.activeContracts, createContract(kind, sequence)],
  };
}

export function tickContracts(player: PlayerState, dt: number): PlayerState {
  let reward = 0;
  const activeContracts: ActiveContract[] = [];

  for (const contract of player.activeContracts) {
    const remainingSeconds = contract.remainingSeconds - dt;
    if (remainingSeconds <= 0) {
      reward += contract.completionCashReward;
    } else {
      activeContracts.push({ ...contract, remainingSeconds });
    }
  }

  return {
    ...player,
    cash: player.cash + reward,
    score: player.score + reward,
    activeContracts,
  };
}
