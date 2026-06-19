import { describe, expect, it } from "vitest";

import { computeFinalResult, createInitialMatchState } from "../src/gameplay/match";
import { summarizeFinalResult } from "../src/ui/gameMenu";

describe("game menu summaries", () => {
  it("formats the endgame result from final match state", () => {
    const state = createInitialMatchState();
    const result = computeFinalResult(state);

    expect(summarizeFinalResult(result, state)).toMatchObject({
      outcome: "The match clock expired.",
      rows: expect.arrayContaining([
        { label: "Final score", you: result.playerFinalScore.toFixed(0), opponent: result.rivalFinalScore.toFixed(0) },
        { label: "Customers", you: "50%", opponent: "50%" },
        { label: "Strikes", you: "0", opponent: "0" },
      ]),
    });
  });

  it("labels reset bankruptcy as a lost grid", () => {
    const state = {
      ...createInitialMatchState(),
      gameOverReason: "player-reset-bankrupt" as const,
    };

    expect(summarizeFinalResult(computeFinalResult(state), state)).toMatchObject({
      headline: "Grid Lost",
      outcome: "You could not pay the breaker reset.",
    });
  });
});
