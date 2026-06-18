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
  it("does not emit breaker reset commands", () => {
    const commands: PlayerCommand[] = [];
    const screen = new ProductionConsoleScreen((command) => commands.push(command), { texture: () => undefined });

    screen.update(trippedProductionState(0));
    screen.update(trippedProductionState(1));
    screen.deactivate();
    screen.update(trippedProductionState(2));

    expect(commands).toEqual([]);
  });

  it("continues rendering while hidden without reset side effects", () => {
    const commands: PlayerCommand[] = [];
    const screen = new ProductionConsoleScreen((command) => commands.push(command), { texture: () => undefined });

    screen.update(trippedProductionState(0));
    screen.visible = false;
    screen.update(trippedProductionState(1));

    expect(commands).toEqual([]);
  });
});
