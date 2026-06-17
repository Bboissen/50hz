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
  private readonly body = resultText("", 160, 190, 30);

  public constructor() {
    super();
    const g = new Graphics()
      .rect(0, 0, 1920, 1080)
      .fill({ color: DESIGN_TOKENS.colors.inkBlack })
      .roundRect(120, 110, 1680, 820, 18)
      .fill({ color: DESIGN_TOKENS.colors.panelGreen })
      .stroke({ color: DESIGN_TOKENS.colors.fadedOlive, width: 8 });
    this.addChild(g, resultText("MATCH RESULT", 160, 140, 44), this.body);
  }

  public update(result: FinalResult, state: MatchState): void {
    this.body.text = [
      `WINNER: ${result.winner.toUpperCase()}`,
      `FINAL SCORE: ${result.playerFinalScore.toFixed(0)} vs ${result.rivalFinalScore.toFixed(0)}`,
      `EFFICIENCY NOW: ${(state.players.player.lastEfficiency * 100).toFixed(0)}% vs ${(state.players.rival.lastEfficiency * 100).toFixed(0)}%`,
      `PRICE NOW: ${state.players.player.lastPrice.toFixed(1)} vs ${state.players.rival.lastPrice.toFixed(1)}`,
      `CUSTOMERS WON: ${(state.players.player.subscribedLoadShare * 100).toFixed(0)}% vs ${(state.players.rival.subscribedLoadShare * 100).toFixed(0)}%`,
      `REVENUE GENERATED: ${result.playerScore.toFixed(0)} vs ${result.rivalScore.toFixed(0)}`,
      `FIXED CONTRACT LOAD: ${state.players.player.activeContracts.length} active vs ${state.players.rival.activeContracts.length} active`,
      `STRIKES: ${result.playerStrikes} vs ${result.rivalStrikes}`,
      "",
      "CAUSE: BETTER EFFICIENCY LOWERS TARIFF, WINS CUSTOMERS,",
      "EARNS MORE REVENUE, AND RAISES GRID PRESSURE.",
    ].join("\n");
  }
}
