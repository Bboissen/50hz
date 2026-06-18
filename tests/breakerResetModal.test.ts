import { describe, expect, it } from "vitest";

import { createInitialMatchState, selectDispatchConsoleState } from "../src/gameplay/match";
import type { DispatchConsoleState, PlayerCommand } from "../src/gameplay/types";
import { BreakerResetModal } from "../src/pixi/screens/BreakerResetModal";

function dispatchStateWithBreaker(required: boolean): DispatchConsoleState {
  const state = createInitialMatchState();
  const tripped = {
    ...state,
    players: {
      ...state.players,
      player: {
        ...state.players.player,
        runtime: {
          ...state.players.player.runtime,
          breakerTrippedSeconds: required ? 8 : 0,
          lastBreakerReason: required ? ("underload" as const) : undefined,
        },
      },
    },
  };
  return selectDispatchConsoleState(tripped);
}

describe("BreakerResetModal", () => {
  it("stays hidden and inert when reset is not required", () => {
    const commands: PlayerCommand[] = [];
    const modal = new BreakerResetModal((command) => commands.push(command));
    const internals = modal as unknown as { resetArmed: boolean; holdingFuse: boolean };
    internals.resetArmed = true;
    internals.holdingFuse = true;

    modal.update(dispatchStateWithBreaker(false), 1);

    expect(modal.visible).toBe(false);
    expect(commands).toEqual([]);
    expect(internals.resetArmed).toBe(false);
    expect(internals.holdingFuse).toBe(false);
  });

  it("does not emit reset commands before both arming and holding", () => {
    const commands: PlayerCommand[] = [];
    const modal = new BreakerResetModal((command) => commands.push(command));
    const state = dispatchStateWithBreaker(true);
    const internals = modal as unknown as { resetArmed: boolean; holdingFuse: boolean };

    modal.update(state, 1);
    internals.resetArmed = true;
    internals.holdingFuse = false;
    modal.update(state, 1);
    internals.resetArmed = false;
    internals.holdingFuse = true;
    modal.update(state, 1);

    expect(modal.visible).toBe(true);
    expect(commands).toEqual([]);
  });

  it("emits holdBreakerReset while armed and held", () => {
    const commands: PlayerCommand[] = [];
    const modal = new BreakerResetModal((command) => commands.push(command));
    const internals = modal as unknown as { resetArmed: boolean; holdingFuse: boolean };

    internals.resetArmed = true;
    internals.holdingFuse = true;
    modal.update(dispatchStateWithBreaker(true), 0.75);

    expect(commands).toEqual([{ type: "holdBreakerReset", playerId: "player", seconds: 0.75 }]);
  });

  it("clears local interaction state when deactivated", () => {
    const modal = new BreakerResetModal(() => undefined);
    const internals = modal as unknown as { resetArmed: boolean; holdingFuse: boolean };
    internals.resetArmed = true;
    internals.holdingFuse = true;

    modal.deactivate();

    expect(internals.resetArmed).toBe(false);
    expect(internals.holdingFuse).toBe(false);
  });
});
