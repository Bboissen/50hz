import { describe, expect, it } from "vitest";

import { computeFinalResult, createInitialMatchState } from "../src/gameplay/match";
import { HOW_TO_PLAY_SLIDES, WEATHER_TUTORIAL_ICON_URLS, summarizeFinalResult } from "../src/ui/gameMenu";

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

describe("how to play slides", () => {
  it("defines the three tutorial screens in order", () => {
    expect(HOW_TO_PLAY_SLIDES.map((slide) => slide.title)).toEqual([
      "Balance the city",
      "Read what is coming",
      "Survive pressure",
    ]);
  });

  it("keeps every tutorial image accessible", () => {
    const images = HOW_TO_PLAY_SLIDES.flatMap((slide) => slide.panels.flatMap((panel) => panel.images));

    expect(images.length).toBeGreaterThan(0);
    expect(images.every((image) => image.src.length > 0)).toBe(true);
    expect(images.every((image) => image.alt.length > 0)).toBe(true);
  });

  it("uses optimized WebP tutorial images", () => {
    const images = HOW_TO_PLAY_SLIDES.flatMap((slide) => slide.panels.flatMap((panel) => panel.images));

    expect(images.length).toBeGreaterThan(0);
    expect(images.every((image) => image.src.includes("/assets/runtime/how-to/"))).toBe(true);
    expect(images.every((image) => image.src.endsWith(".webp"))).toBe(true);
  });

  it("uses a generated weather tape on the second tutorial screen", () => {
    const weatherPanel = HOW_TO_PLAY_SLIDES[1]?.panels.find((panel) => panel.title === "Weather tape");

    expect(weatherPanel).toBeDefined();
    expect(weatherPanel?.visual).toBe("weatherTape");
    expect(weatherPanel?.images).toEqual([]);
  });

  it("loads weather tape icons from the authored icon pack", () => {
    expect(Object.keys(WEATHER_TUTORIAL_ICON_URLS).sort()).toEqual([
      "cloud",
      "moon",
      "rain",
      "snow",
      "sun",
      "wind",
    ]);

    for (const [icon, url] of Object.entries(WEATHER_TUTORIAL_ICON_URLS)) {
      expect(url, icon).toContain(`/assets/icons/weather/${icon}.png`);
      expect(url, icon).not.toContain("/assets/runtime/icons/weather/");
    }
  });
});
