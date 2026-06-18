import { GAME_CONFIG } from "./config";
import { clamp01 } from "./math";
import type { CardKind, IncomingAttack, PlayerId, PlayerState } from "./types";

export function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "player" ? "rival" : "player";
}

export function canPlayCard(player: PlayerState, kind: CardKind): boolean {
  return player.cash >= GAME_CONFIG.cards[kind].cost && player.cardCooldowns[kind] <= 0;
}

export function applyCardCostAndCooldown(player: PlayerState, kind: CardKind): PlayerState {
  if (!canPlayCard(player, kind)) {
    return player;
  }

  return {
    ...player,
    cash: player.cash - GAME_CONFIG.cards[kind].cost,
    cardCooldowns: {
      ...player.cardCooldowns,
      [kind]: GAME_CONFIG.cards[kind].cooldownSeconds,
    },
  };
}

export function applyDemandResponse(player: PlayerState): PlayerState {
  const next = applyCardCostAndCooldown(player, "demandResponse");
  if (next === player) {
    return player;
  }

  return {
    ...next,
    demandResponseSeconds: GAME_CONFIG.cards.demandResponse.durationSeconds,
    subscribedLoadShare: clamp01(next.subscribedLoadShare - GAME_CONFIG.cards.demandResponse.sharePenalty),
  };
}

export function createIncomingAttack(kind: Extract<CardKind, "cloudFront" | "windStorm">): IncomingAttack {
  return {
    kind,
    warningRemainingSeconds: GAME_CONFIG.cards[kind].warningSeconds,
    activeRemainingSeconds: GAME_CONFIG.cards[kind].durationSeconds,
  };
}

export function tickCards(player: PlayerState, dt: number): PlayerState {
  const cardCooldowns = { ...player.cardCooldowns };
  for (const key of Object.keys(cardCooldowns) as CardKind[]) {
    cardCooldowns[key] = Math.max(0, cardCooldowns[key] - dt);
  }

  const incomingAttacks = player.incomingAttacks
    .map((attack) => {
      if (attack.warningRemainingSeconds > 0) {
        return {
          ...attack,
          warningRemainingSeconds: Math.max(0, attack.warningRemainingSeconds - dt),
        };
      }

      return {
        ...attack,
        activeRemainingSeconds: Math.max(0, attack.activeRemainingSeconds - dt),
      };
    })
    .filter((attack) => attack.warningRemainingSeconds > 0 || attack.activeRemainingSeconds > 0);

  return {
    ...player,
    cardCooldowns,
    incomingAttacks,
    demandResponseSeconds: Math.max(0, player.demandResponseSeconds - dt),
  };
}
