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
  showPause: () => void;
  showEnd: (result: FinalResult, state: MatchState) => void;
  hide: () => void;
};

export type HowToPlayImage = {
  src: string;
  alt: string;
  size: "wide" | "medium" | "tall" | "strip";
};

export type HowToPlayGeneratedVisual = "weatherTape";

export type HowToPlayPanel = {
  title: string;
  copy: string[];
  images: HowToPlayImage[];
  visual?: HowToPlayGeneratedVisual;
};

export type HowToPlaySlide = {
  title: string;
  panels: HowToPlayPanel[];
};

const HOW_TO_PLAY_IMAGE_URLS = {
  contracts: new URL("../../How_to_illustrations/contracts.png", import.meta.url).href,
  demandForecast: new URL("../../How_to_illustrations/demand_forecast.png", import.meta.url).href,
  gauges: new URL("../../How_to_illustrations/gauges.png", import.meta.url).href,
  productionPanel: new URL("../../How_to_illustrations/production_panel.png", import.meta.url).href,
  reset: new URL("../../How_to_illustrations/reset.png", import.meta.url).href,
  upgrades: new URL("../../How_to_illustrations/upgrades.png", import.meta.url).href,
  worldCup: new URL("../../How_to_illustrations/worldcup.png", import.meta.url).href,
} as const;

const WEATHER_TUTORIAL_ICON_URLS = {
  cloud: "/assets/runtime/icons/weather/cloud.webp",
  moon: "/assets/runtime/icons/weather/moon.webp",
  rain: "/assets/runtime/icons/weather/rain.webp",
  snow: "/assets/runtime/icons/weather/snow.webp",
  sun: "/assets/runtime/icons/weather/sun.webp",
  wind: "/assets/runtime/icons/weather/wind.webp",
} as const;

type WeatherTutorialIcon = keyof typeof WEATHER_TUTORIAL_ICON_URLS;

const WEATHER_TUTORIAL_SEGMENTS: Array<{
  icon: WeatherTutorialIcon;
  label: string;
  note: string;
  phase: string;
}> = [
  { icon: "sun", label: "Dawn", note: "solar wakes", phase: "dawn" },
  { icon: "cloud", label: "Cloud", note: "solar capped", phase: "day" },
  { icon: "wind", label: "Wind", note: "turbine band", phase: "day" },
  { icon: "rain", label: "Rain", note: "dam fill", phase: "sunset" },
  { icon: "snow", label: "Snow", note: "load rises", phase: "dusk" },
  { icon: "moon", label: "Night", note: "solar off", phase: "night" },
];

export const HOW_TO_PLAY_SLIDES: HowToPlaySlide[] = [
  {
    title: "Balance the city",
    panels: [
      {
        title: "Goal",
        copy: ["Keep generation close to city load in real time. The gauges show supply, load, and the MW gap."],
        images: [
          {
            src: HOW_TO_PLAY_IMAGE_URLS.gauges,
            alt: "Two analog gauges showing generation, load, and the power delta",
            size: "wide",
          },
        ],
      },
      {
        title: "Grow capacity",
        copy: ["Upgrade reactor, boiler, renewables, and dam capacity as the city grows."],
        images: [
          {
            src: HOW_TO_PLAY_IMAGE_URLS.upgrades,
            alt: "Upgrade rack listing reactor, boiler, renewable, and dam levels",
            size: "medium",
          },
        ],
      },
      {
        title: "Match demand",
        copy: [
          "Use the production controls to match demand. Nuclear is slow, boiler is fast, renewables follow weather, and the dam buffers peaks.",
        ],
        images: [
          {
            src: HOW_TO_PLAY_IMAGE_URLS.productionPanel,
            alt: "Production panel with reactor, boiler, wind, solar, and dam controls",
            size: "tall",
          },
        ],
      },
    ],
  },
  {
    title: "Read what is coming",
    panels: [
      {
        title: "Demand forecast",
        copy: [
          "Watch the load forecast before demand jumps. Public events, like a football final, can push many homes onto the grid at once.",
        ],
        images: [
          {
            src: HOW_TO_PLAY_IMAGE_URLS.demandForecast,
            alt: "Demand forecast monitor showing the load curve for the next 30 seconds",
            size: "medium",
          },
          {
            src: HOW_TO_PLAY_IMAGE_URLS.worldCup,
            alt: "Incident warning for a football final demand spike",
            size: "strip",
          },
        ],
      },
      {
        title: "Weather tape",
        copy: [
          "Read the weather tape as time of day plus weather. The sky band moves from dawn to day, sunset, and night; moon replaces sun at night.",
          "Sun feeds solar, rain fills the dam, wind only helps inside the turbine band, and snow or rain can raise household load.",
        ],
        images: [],
        visual: "weatherTape",
      },
    ],
  },
  {
    title: "Survive pressure",
    panels: [
      {
        title: "Breaker reset",
        copy: ["If the grid trips, reconnect it from the breaker reset panel. Keep enough cash to pay the reset cost."],
        images: [
          {
            src: HOW_TO_PLAY_IMAGE_URLS.reset,
            alt: "Breaker reset panel with an armed switch, fuse hold button, and reset progress",
            size: "wide",
          },
        ],
      },
      {
        title: "Contracts",
        copy: ["Contracts add fixed company demand on top of city load. They pay better, but a strike is expensive."],
        images: [
          {
            src: HOW_TO_PLAY_IMAGE_URLS.contracts,
            alt: "Business contract offer showing load, reward, strike penalty, accept, and decline",
            size: "wide",
          },
        ],
      },
      {
        title: "Operator tips",
        copy: [
          "Do not upgrade too early; unused capacity still costs money.",
          "Nuclear changes slowly, thermal reacts fast, renewables are weather-driven.",
          "Higher efficiency lowers your price and improves your score.",
        ],
        images: [],
      },
    ],
  },
];

export function createGameMenu(options: {
  onPlay: () => void;
  onContinue: () => void;
  onReplay: () => void;
  onMainMenu: () => void;
}): GameMenu {
  const overlay = document.createElement("section");
  overlay.className = "game-menu";
  overlay.setAttribute("aria-live", "polite");

  const panel = document.createElement("div");
  panel.className = "game-menu__panel";
  overlay.appendChild(panel);

  document.body.appendChild(overlay);
  let panelMode: "start" | "pause" | "howto" | "end" = "start";
  let howToReturnMode: "start" | "pause" = "start";
  let howToSlideIndex = 0;

  const setButton = (label: string, onClick: () => void): HTMLButtonElement => {
    const button = document.createElement("button");
    button.className = "game-menu__button";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  };

  const setPanelMode = (mode: "start" | "pause" | "howto" | "end"): void => {
    panelMode = mode;
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

  const renderStartHero = (): HTMLElement => {
    const hero = document.createElement("div");
    hero.className = "game-menu__hero";

    const copy = document.createElement("div");
    copy.className = "game-menu__hero-copy";

    const title = document.createElement("h1");
    title.className = "game-menu__title";
    title.textContent = "50Hz";

    const status = document.createElement("p");
    status.className = "game-menu__status";
    status.textContent = "BALANCE TODAY, POWER TOMORROW";

    copy.append(title, status);
    hero.append(copy);
    return hero;
  };

  const renderGithubLink = (): HTMLAnchorElement => {
    const link = document.createElement("a");
    link.className = "game-menu__github-link";
    link.href = "https://github.com/Bboissen/50hz";
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute("aria-label", "Open 50Hz on GitHub");
    link.innerHTML = `
      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56v-2.14c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.67.79.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
      </svg>
    `;
    return link;
  };

  const renderWeatherTapeTutorial = (): HTMLElement => {
    const tape = document.createElement("div");
    tape.className = "game-menu__weather-tape";
    tape.setAttribute(
      "aria-label",
      "Weather tape example showing dawn, day, sunset, night, sun, cloud, wind, rain, snow, and moon",
    );

    const track = document.createElement("div");
    track.className = "game-menu__weather-tape-track";

    const marker = document.createElement("div");
    marker.className = "game-menu__weather-tape-marker";
    track.appendChild(marker);

    for (const segment of WEATHER_TUTORIAL_SEGMENTS) {
      const tile = document.createElement("div");
      tile.className = `game-menu__weather-tape-tile game-menu__weather-tape-tile--${segment.phase}`;

      const icon = document.createElement("img");
      icon.className = `game-menu__weather-tape-icon game-menu__weather-tape-icon--${segment.icon}`;
      icon.src = WEATHER_TUTORIAL_ICON_URLS[segment.icon];
      icon.alt = "";
      icon.decoding = "async";
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.className = "game-menu__weather-tape-label";
      label.textContent = segment.label;

      const note = document.createElement("span");
      note.className = "game-menu__weather-tape-note";
      note.textContent = segment.note;

      tile.append(icon, label, note);
      track.appendChild(tile);
    }

    const ticks = document.createElement("div");
    ticks.className = "game-menu__weather-tape-ticks";
    for (const tick of ["0s", "+15s", "+30s", "+45s"]) {
      const label = document.createElement("span");
      label.textContent = tick;
      ticks.appendChild(label);
    }

    tape.append(track, ticks);
    return tape;
  };

  const renderHowToPanel = (tutorialPanel: HowToPlayPanel): HTMLElement => {
    const card = document.createElement("article");
    const hasMedia = tutorialPanel.images.length > 0 || tutorialPanel.visual !== undefined;
    card.className = hasMedia ? "game-menu__howto-card" : "game-menu__howto-card game-menu__howto-card--tips";

    const heading = document.createElement("h3");
    heading.textContent = tutorialPanel.title;

    const copy = document.createElement("div");
    copy.className = "game-menu__howto-copy";
    if (!hasMedia) {
      const tips = document.createElement("ul");
      tips.className = "game-menu__howto-tip-list";
      for (const paragraph of tutorialPanel.copy) {
        const item = document.createElement("li");
        item.textContent = paragraph;
        tips.appendChild(item);
      }
      copy.appendChild(tips);
    } else {
      for (const paragraph of tutorialPanel.copy) {
        const text = document.createElement("p");
        text.textContent = paragraph;
        copy.appendChild(text);
      }
    }

    card.append(heading, copy);

    if (hasMedia) {
      const media = document.createElement("div");
      media.className = "game-menu__howto-media";
      for (const image of tutorialPanel.images) {
        const figure = document.createElement("figure");
        figure.className = `game-menu__howto-figure game-menu__howto-figure--${image.size}`;
        const element = document.createElement("img");
        element.src = image.src;
        element.alt = image.alt;
        element.decoding = "async";
        figure.appendChild(element);
        media.appendChild(figure);
      }
      if (tutorialPanel.visual === "weatherTape") {
        media.appendChild(renderWeatherTapeTutorial());
      }
      card.appendChild(media);
    }

    return card;
  };

  const renderStart = (): void => {
    panel.replaceChildren();
    setPanelMode("start");

    const actions = document.createElement("div");
    actions.className = "game-menu__actions";
    actions.append(
      setButton("Start Game", options.onPlay),
      setButton("How to Play", () => {
        howToReturnMode = "start";
        howToSlideIndex = 0;
        renderHowToPlay();
      }),
    );

    panel.append(renderStartHero(), actions, renderGithubLink());
    overlay.classList.add("is-visible");
  };

  const renderPause = (): void => {
    panel.replaceChildren();
    setPanelMode("pause");
    appendTopFrame("", "Paused", "GRID HOLD");

    const pauseBody = document.createElement("div");
    pauseBody.className = "game-menu__pause";

    const status = document.createElement("p");
    status.className = "game-menu__pause-status";
    status.textContent = "Simulation stopped. Resume when ready.";

    const actions = document.createElement("div");
    actions.className = "game-menu__actions game-menu__actions--pause";
    const howTo = setButton("How to Play", () => {
      howToReturnMode = "pause";
      howToSlideIndex = 0;
      renderHowToPlay();
    });
    actions.append(howTo, setButton("Continue", options.onContinue), setButton("Restart", options.onReplay), setButton("Quit", options.onMainMenu));

    pauseBody.append(status, actions);
    panel.appendChild(pauseBody);
    overlay.classList.add("is-visible");
  };

  const renderHowToPlay = (): void => {
    panel.replaceChildren();
    setPanelMode("howto");
    const slide = HOW_TO_PLAY_SLIDES[howToSlideIndex];
    appendTopFrame("", "How to Play", `SCREEN ${howToSlideIndex + 1} / ${HOW_TO_PLAY_SLIDES.length}`);

    const tutorial = document.createElement("div");
    tutorial.className = "game-menu__howto";

    const header = document.createElement("div");
    header.className = "game-menu__howto-header";
    const slideNumber = document.createElement("span");
    slideNumber.className = "game-menu__howto-number";
    slideNumber.textContent = String(howToSlideIndex + 1).padStart(2, "0");
    const heading = document.createElement("h2");
    heading.textContent = slide.title;
    header.append(slideNumber, heading);

    const panels = document.createElement("div");
    panels.className = `game-menu__howto-grid game-menu__howto-grid--${slide.panels.length}`;
    for (const tutorialPanel of slide.panels) {
      panels.appendChild(renderHowToPanel(tutorialPanel));
    }

    tutorial.append(header, panels);

    const actions = document.createElement("div");
    actions.className = "game-menu__actions game-menu__actions--tutorial";
    const previous = setButton("Previous", () => {
      howToSlideIndex = Math.max(0, howToSlideIndex - 1);
      renderHowToPlay();
    });
    previous.disabled = howToSlideIndex === 0;
    const next = setButton("Next", () => {
      howToSlideIndex = Math.min(HOW_TO_PLAY_SLIDES.length - 1, howToSlideIndex + 1);
      renderHowToPlay();
    });
    next.disabled = howToSlideIndex === HOW_TO_PLAY_SLIDES.length - 1;
    const returnAction = howToReturnMode === "pause" ? renderPause : renderStart;
    const playActionLabel = howToReturnMode === "pause" ? "Continue" : "Start Game";
    const playAction = howToReturnMode === "pause" ? options.onContinue : options.onPlay;
    actions.append(setButton("Back", returnAction), previous, next, setButton(playActionLabel, playAction));

    panel.append(tutorial, actions);
  };

  window.addEventListener("keydown", (event) => {
    if (panelMode !== "howto" || !overlay.classList.contains("is-visible")) {
      return;
    }
    if (event.key === "ArrowLeft" && howToSlideIndex > 0) {
      event.preventDefault();
      howToSlideIndex -= 1;
      renderHowToPlay();
    }
    if (event.key === "ArrowRight" && howToSlideIndex < HOW_TO_PLAY_SLIDES.length - 1) {
      event.preventDefault();
      howToSlideIndex += 1;
      renderHowToPlay();
    }
  });

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
    actions.className = "game-menu__actions game-menu__actions--split";
    actions.append(setButton("Replay", options.onReplay), setButton("Main Menu", options.onMainMenu));

    panel.append(table, actions);
    overlay.classList.add("is-visible");
  };

  return {
    showStart: renderStart,
    showPause: renderPause,
    showEnd: renderEnd,
    hide: () => {
      overlay.classList.remove("is-visible");
    },
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
        you: `₽${player.lastPrice.toFixed(1)}/kWh`,
        opponent: `₽${rival.lastPrice.toFixed(1)}/kWh`,
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
