import { describe, expect, it, vi } from "vitest";

import { createInitialMatchState, computeFinalResult, selectDispatchConsoleState, selectProductionConsoleState, tickMatch } from "../src/gameplay/match";
import { BreakerResetModal } from "../src/pixi/screens/BreakerResetModal";
import { ContractOfferModal } from "../src/pixi/screens/ContractOfferModal";
import { ControlDeskScreen } from "../src/pixi/screens/ControlDeskScreen";
import { ResultScreen } from "../src/pixi/screens/ResultScreen";
import { ScreenManager } from "../src/pixi/screens/ScreenManager";

const assets = {
  texture: () => undefined,
  fontFamily: "Courier New, monospace",
};

describe("ScreenManager", () => {
  it("uses the control desk as the default runtime screen", () => {
    const manager = new ScreenManager(assets, () => undefined);
    const internals = manager as unknown as { active: string };

    expect(internals.active).toBe("desk");
    expect(manager.children.some((child) => child instanceof ControlDeskScreen)).toBe(true);
    expect(manager.children).toHaveLength(5);
  });

  it("ignores legacy screen-switching shortcuts", () => {
    const manager = new ScreenManager(assets, () => undefined);
    const internals = manager as unknown as { active: string };
    const event = (key: string) => ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent;

    manager.handleKey(event("1"));
    manager.handleKey(event("2"));
    manager.handleKey(event("Tab"));

    expect(internals.active).toBe("desk");
  });

  it("keeps contract and breaker modals layered over the desk", () => {
    const manager = new ScreenManager(assets, () => undefined);
    const contractState = tickMatch(createInitialMatchState(), 3.2);

    manager.update({
      dispatch: selectDispatchConsoleState(contractState),
      production: selectProductionConsoleState(contractState),
      result: computeFinalResult(contractState),
      match: contractState,
      isMatchOver: false,
      dt: 0,
    });

    const deskIndex = manager.children.findIndex((child) => child instanceof ControlDeskScreen);
    const contractModal = manager.children.find((child) => child instanceof ContractOfferModal) as ContractOfferModal | undefined;
    const breakerModal = manager.children.find((child) => child instanceof BreakerResetModal) as BreakerResetModal | undefined;
    expect(contractModal?.visible).toBe(true);
    expect(breakerModal?.visible).toBe(false);
    expect(manager.children.indexOf(contractModal!)).toBeGreaterThan(deskIndex);

    const state = createInitialMatchState();
    const breakerState = {
      ...state,
      players: {
        ...state.players,
        player: {
          ...state.players.player,
          runtime: {
            ...state.players.player.runtime,
            breakerTrippedSeconds: 8,
            lastBreakerReason: "underload" as const,
          },
        },
      },
    };

    manager.update({
      dispatch: selectDispatchConsoleState(breakerState),
      production: selectProductionConsoleState(breakerState),
      result: computeFinalResult(breakerState),
      match: breakerState,
      isMatchOver: false,
      dt: 1,
    });

    expect(contractModal?.visible).toBe(false);
    expect(breakerModal?.visible).toBe(true);
    expect(manager.children.indexOf(breakerModal!)).toBeGreaterThan(deskIndex);
  });

  it("layers the result screen over the desk at match end", () => {
    const manager = new ScreenManager(assets, () => undefined);
    const internals = manager as unknown as { active: string };
    const state = createInitialMatchState();

    manager.update({
      dispatch: selectDispatchConsoleState(state),
      production: selectProductionConsoleState(state),
      result: computeFinalResult(state),
      match: state,
      isMatchOver: true,
      dt: 0,
    });

    const desk = manager.children.find((child) => child instanceof ControlDeskScreen);
    const result = manager.children.find((child) => child instanceof ResultScreen);
    expect(internals.active).toBe("result");
    expect(desk?.visible).toBe(true);
    expect(result?.visible).toBe(true);
    expect(manager.children.indexOf(result!)).toBeGreaterThan(manager.children.indexOf(desk!));
  });
});
