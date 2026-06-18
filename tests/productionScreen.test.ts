import { describe, expect, it } from "vitest";

import { createInitialMatchState, selectProductionConsoleState } from "../src/gameplay/match";
import type { PlayerCommand, ProductionConsoleState } from "../src/gameplay/types";
import { ProductionConsoleScreen } from "../src/pixi/screens/ProductionConsoleScreen";

function trippedProductionState(timeSeconds: number): ProductionConsoleState {
  const state = createInitialMatchState();
  const tripped = {
    ...state,
    timeSeconds,
    players: {
      ...state.players,
      player: {
        ...state.players.player,
        runtime: {
          ...state.players.player.runtime,
          breakerTrippedSeconds: 8,
        },
      },
    },
  };
  return selectProductionConsoleState(tripped);
}

describe("ProductionConsoleScreen", () => {
  it("clears held reset input when deactivated", () => {
    const commands: PlayerCommand[] = [];
    const screen = new ProductionConsoleScreen((command) => commands.push(command), { texture: () => undefined });
    const internals = screen as unknown as { resetHeld: boolean };

    screen.update(trippedProductionState(0));
    internals.resetHeld = true;
    screen.update(trippedProductionState(1));

    expect(commands).toEqual([{ type: "holdBreakerReset", playerId: "player", seconds: 1 }]);

    screen.deactivate();
    screen.update(trippedProductionState(2));

    expect(commands).toHaveLength(1);
  });

  it("does not emit reset commands while hidden", () => {
    const commands: PlayerCommand[] = [];
    const screen = new ProductionConsoleScreen((command) => commands.push(command), { texture: () => undefined });
    const internals = screen as unknown as { resetHeld: boolean };

    screen.update(trippedProductionState(0));
    screen.visible = false;
    internals.resetHeld = true;
    screen.update(trippedProductionState(1));

    expect(commands).toEqual([]);
  });
});
