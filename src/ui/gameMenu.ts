import type { FinalResult, MatchState } from "../gameplay/types";

export type GameMenuSummary = {
  headline: string;
  outcome: string;
  rows: Array<{
    label: string;
    you: string;
    opponent: string;
  }>;
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

  const setPanelMode = (mode: "start" | "howto" | "end"): void => {
    panel.className = `game-menu__panel game-menu__panel--${mode}`;
  };

  const appendTopFrame = (eyebrow: string, titleText: string, statusText: string): void => {
    const title = document.createElement("h1");
    title.className = "game-menu__title";
    title.textContent = titleText;

    const status = document.createElement("p");
    status.className = "game-menu__status";
    status.textContent = statusText;

    if (eyebrow) {
      const topLine = document.createElement("div");
      topLine.className = "game-menu__topline";
      topLine.textContent = eyebrow;
      panel.appendChild(topLine);
    }
    panel.append(title, status);
  };

  const renderPixelPlant = (): HTMLElement => {
    const plant = document.createElement("div");
    plant.className = "game-menu__pixel-plant";
    plant.setAttribute("aria-hidden", "true");
    for (const className of [
      "game-menu__wind",
      "game-menu__solar",
      "game-menu__tower",
      "game-menu__factory",
      "game-menu__pylon",
      "game-menu__city",
    ]) {
      const shape = document.createElement("span");
      shape.className = className;
      plant.appendChild(shape);
    }
    return plant;
  };

  const renderStart = (): void => {
    panel.replaceChildren();
    setPanelMode("start");
    appendTopFrame("", "50Hz", "BALANCE TODAY, POWER TOMORROW");

    const actions = document.createElement("div");
    actions.className = "game-menu__actions";
    actions.append(setButton("Start Game", options.onPlay), setButton("How to Play", renderHowToPlay));

    panel.append(renderPixelPlant(), actions);
    overlay.classList.add("is-visible");
  };

  const renderHowToPlay = (): void => {
    panel.replaceChildren();
    setPanelMode("howto");
    appendTopFrame("", "How to Play", "THREE RULES BEFORE GRID LOAD");

    const steps = document.createElement("div");
    steps.className = "game-menu__steps";
    for (const [index, title, text] of [
      ["01", "Balance Load", "Match generation to city load with reactor, boiler, wind, and dam controls."],
      ["02", "Win Demand", "High efficiency lowers tariff, attracts customers, and grows revenue."],
      ["03", "Survive Pressure", "Contracts and breaker trips are manual emergencies. React before the grid goes dark."],
    ] as const) {
      const step = document.createElement("article");
      step.className = "game-menu__step";
      const number = document.createElement("span");
      number.className = "game-menu__step-number";
      number.textContent = index;
      const heading = document.createElement("h2");
      heading.textContent = title;
      const copy = document.createElement("p");
      copy.textContent = text;
      step.append(number, heading, copy);
      steps.appendChild(step);
    }

    const actions = document.createElement("div");
    actions.className = "game-menu__actions game-menu__actions--split";
    actions.append(setButton("Back", renderStart), setButton("Start Game", options.onPlay));

    panel.append(steps, actions);
  };

  const renderEnd = (result: FinalResult, state: MatchState): void => {
    const summary = summarizeFinalResult(result, state);
    panel.replaceChildren();
    setPanelMode("end");
    appendTopFrame("MATCH REPORT", summary.headline, summary.outcome);

    const table = document.createElement("div");
    table.className = "game-menu__stats";
    for (const label of ["STAT", "YOU", "GRID-AI"]) {
      const cell = document.createElement("b");
      cell.textContent = label;
      table.appendChild(cell);
    }
    for (const row of summary.rows) {
      for (const value of [row.label, row.you, row.opponent]) {
        const cell = document.createElement("span");
        cell.textContent = value;
        table.appendChild(cell);
      }
    }

    const actions = document.createElement("div");
    actions.className = "game-menu__actions";
    actions.append(setButton("Replay", options.onReplay));

    panel.append(table, actions);
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
    rows: [
      {
        label: "Final score",
        you: result.playerFinalScore.toFixed(0),
        opponent: result.rivalFinalScore.toFixed(0),
      },
      {
        label: "Efficiency",
        you: `${(player.lastEfficiency * 100).toFixed(0)}%`,
        opponent: `${(rival.lastEfficiency * 100).toFixed(0)}%`,
      },
      {
        label: "Tariff",
        you: `${player.lastPrice.toFixed(1)}c`,
        opponent: `${rival.lastPrice.toFixed(1)}c`,
      },
      {
        label: "Customers",
        you: `${(player.subscribedLoadShare * 100).toFixed(0)}%`,
        opponent: `${(rival.subscribedLoadShare * 100).toFixed(0)}%`,
      },
      {
        label: "Revenue score",
        you: result.playerScore.toFixed(0),
        opponent: result.rivalScore.toFixed(0),
      },
      {
        label: "Active contracts",
        you: String(player.activeContracts.length),
        opponent: String(rival.activeContracts.length),
      },
      {
        label: "Strikes",
        you: String(result.playerStrikes),
        opponent: String(result.rivalStrikes),
      },
    ],
  };
}
