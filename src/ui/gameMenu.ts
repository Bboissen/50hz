import type { FinalResult, MatchState } from "../gameplay/types";

export type GameMenuSummary = {
  headline: string;
  outcome: string;
  scoreLine: string;
  efficiencyLine: string;
  customerLine: string;
  strikeLine: string;
};

export type GameMenu = {
  showStart: () => void;
  showEnd: (result: FinalResult, state: MatchState) => void;
  hide: () => void;
};

export function createGameMenu(options: { onPlay: () => void; onReplay: () => void }): GameMenu {
  const overlay = document.createElement("section");
  overlay.className = "game-menu";
  overlay.setAttribute("aria-live", "polite");

  const panel = document.createElement("div");
  panel.className = "game-menu__panel";
  overlay.appendChild(panel);

  document.body.appendChild(overlay);

  const setButton = (label: string, onClick: () => void): HTMLButtonElement => {
    const button = document.createElement("button");
    button.className = "game-menu__button";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  };

  const renderStart = (): void => {
    panel.replaceChildren();
    const title = document.createElement("h1");
    title.className = "game-menu__title";
    title.textContent = "50Hz";
    const status = document.createElement("p");
    status.className = "game-menu__status";
    status.textContent = "GRID DUEL CONTROL ROOM";
    panel.append(title, status, setButton("Play game", options.onPlay));
    overlay.classList.add("is-visible");
  };

  const renderEnd = (result: FinalResult, state: MatchState): void => {
    const summary = summarizeFinalResult(result, state);
    panel.replaceChildren();
    const title = document.createElement("h1");
    title.className = "game-menu__title";
    title.textContent = summary.headline;
    const outcome = document.createElement("p");
    outcome.className = "game-menu__status";
    outcome.textContent = summary.outcome;

    const list = document.createElement("dl");
    list.className = "game-menu__summary";
    for (const [label, value] of [
      ["Final score", summary.scoreLine],
      ["Efficiency", summary.efficiencyLine],
      ["Customers", summary.customerLine],
      ["Strikes", summary.strikeLine],
    ] as const) {
      const term = document.createElement("dt");
      term.textContent = label;
      const detail = document.createElement("dd");
      detail.textContent = value;
      list.append(term, detail);
    }

    panel.append(title, outcome, list, setButton("Replay", options.onReplay));
    overlay.classList.add("is-visible");
  };

  return {
    showStart: renderStart,
    showEnd: renderEnd,
    hide: () => overlay.classList.remove("is-visible"),
  };
}

export function summarizeFinalResult(result: FinalResult, state: MatchState): GameMenuSummary {
  const player = state.players.player;
  const rival = state.players.rival;
  const headline =
    result.winner === "tie"
      ? "Grid Draw"
      : result.winner === "player"
        ? "Grid Won"
        : "Grid Lost";
  const outcome =
    result.reason === "player-reset-bankrupt"
      ? "You could not pay the breaker reset."
      : result.reason === "rival-reset-bankrupt"
        ? "The rival grid could not pay the breaker reset."
        : "The match clock expired.";

  return {
    headline,
    outcome,
    scoreLine: `${result.playerFinalScore.toFixed(0)} / ${result.rivalFinalScore.toFixed(0)}`,
    efficiencyLine: `${(player.lastEfficiency * 100).toFixed(0)}% / ${(rival.lastEfficiency * 100).toFixed(0)}%`,
    customerLine: `${(player.subscribedLoadShare * 100).toFixed(0)}% / ${(rival.subscribedLoadShare * 100).toFixed(0)}%`,
    strikeLine: `${result.playerStrikes} / ${result.rivalStrikes}`,
  };
}
