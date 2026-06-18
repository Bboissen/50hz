import { describe, expect, it } from "vitest";
import type { FederatedPointerEvent } from "pixi.js";

import { GAME_CONFIG } from "../src/gameplay/config";
import { createInitialMatchState, selectDispatchConsoleState, tickMatch } from "../src/gameplay/match";
import type { DispatchConsoleState, PlayerCommand } from "../src/gameplay/types";
import { ContractOfferModal } from "../src/pixi/screens/ContractOfferModal";

function dispatchStateWithOffer(): DispatchConsoleState {
  let state = createInitialMatchState();
  const targetTime = GAME_CONFIG.contracts.offerSchedule[0].startsAtSeconds + 0.1;
  while (state.timeSeconds < targetTime) {
    state = tickMatch(state, Math.min(0.25, targetTime - state.timeSeconds));
  }
  return selectDispatchConsoleState(state);
}

describe("ContractOfferModal", () => {
  it("stays hidden when no contract offer is active", () => {
    const modal = new ContractOfferModal(() => undefined);

    modal.update(selectDispatchConsoleState(createInitialMatchState()));

    expect(modal.visible).toBe(false);
  });

  it("shows active contract offers", () => {
    const modal = new ContractOfferModal(() => undefined);

    modal.update(dispatchStateWithOffer());

    expect(modal.visible).toBe(true);
  });

  it("stays hidden behind the breaker reset modal", () => {
    const modal = new ContractOfferModal(() => undefined);
    const state = dispatchStateWithOffer();

    modal.update({
      ...state,
      breakerResetRequired: true,
    });

    expect(modal.visible).toBe(false);
  });

  it("emits accept and decline commands from its buttons", () => {
    const commands: PlayerCommand[] = [];
    const modal = new ContractOfferModal((command) => commands.push(command));
    const state = dispatchStateWithOffer();

    modal.update(state);
    modal.children[3].emit("pointertap", {} as FederatedPointerEvent);
    modal.children[4].emit("pointertap", {} as FederatedPointerEvent);

    expect(commands).toEqual([
      { type: "acceptContract", playerId: "player", kind: "business" },
      { type: "declineContract", offerId: state.contractOffer!.id },
    ]);
  });
});
