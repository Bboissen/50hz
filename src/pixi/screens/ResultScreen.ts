import { Container, Graphics, Text } from "pixi.js";

import type { FinalResult, MatchState } from "../../gameplay/types";
import { DESIGN_TOKENS } from "../tokens";

function resultText(text: string, x: number, y: number, size = 28): Text {
  const out = new Text({
    text,
    style: {
      fontFamily: DESIGN_TOKENS.typography.labelFamily,
      fontSize: size,
      fill: DESIGN_TOKENS.colors.paperTan,
      lineHeight: size * 1.45,
    },
  });
  out.position.set(x, y);
  return out;
}

export class ResultScreen extends Container {
  private readonly body = resultText("", 176, 236, 28);

  public constructor() {
    super();
    const g = new Graphics()
      .rect(0, 0, 1920, 1080)
      .fill({ color: DESIGN_TOKENS.colors.inkBlack })
      .rect(100, 92, 1720, 896)
      .fill({ color: 0x061008 })
      .stroke({ color: DESIGN_TOKENS.colors.phosphorGreen, width: 6, alpha: 0.45 })
      .rect(140, 132, 1640, 816)
      .stroke({ color: DESIGN_TOKENS.colors.fadedOlive, width: 3, alpha: 0.5 });
    this.addChild(g, resultText("MATCH REPORT", 176, 156, 48), this.body);
  }

  public update(result: FinalResult, state: MatchState): void {
    const outcome =
      result.reason === "player-reset-bankrupt"
        ? "PLAYER COULD NOT PAY BREAKER RESET"
        : result.reason === "rival-reset-bankrupt"
          ? "RIVAL COULD NOT PAY BREAKER RESET"
          : "MATCH CLOCK EXPIRED";
    this.body.text = [
      `WINNER: ${result.winner === "rival" ? "GRID-AI" : result.winner.toUpperCase()}`,
      `OUTCOME: ${outcome}`,
      `SCORE        YOU ${result.playerFinalScore.toFixed(0)} / GRID-AI ${result.rivalFinalScore.toFixed(0)}`,
      `EFFICIENCY   YOU ${(state.players.player.lastEfficiency * 100).toFixed(0)}% / GRID-AI ${(state.players.rival.lastEfficiency * 100).toFixed(0)}%`,
      `TARIFF       YOU ${state.players.player.lastPrice.toFixed(1)}c / GRID-AI ${state.players.rival.lastPrice.toFixed(1)}c`,
      `CUSTOMERS    YOU ${(state.players.player.subscribedLoadShare * 100).toFixed(0)}% / GRID-AI ${(state.players.rival.subscribedLoadShare * 100).toFixed(0)}%`,
      `STRIKES      YOU ${result.playerStrikes} / GRID-AI ${result.rivalStrikes}`,
      "",
      "CAUSE: EFFICIENCY LOWERS TARIFF, WINS CUSTOMERS,",
      "AND RAISES GRID PRESSURE.",
    ].join("\n");
  }
}
