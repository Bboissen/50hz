import { describe, expect, it, vi } from "vitest";

import { createInitialMatchState, computeFinalResult, selectDispatchConsoleState, selectProductionConsoleState } from "../src/gameplay/match";
import { BreakerResetModal } from "../src/pixi/screens/BreakerResetModal";
import { ContractOfferModal } from "../src/pixi/screens/ContractOfferModal";
import { ControlDeskScreen } from "../src/pixi/screens/ControlDeskScreen";
import { ProductionConsoleScreen } from "../src/pixi/screens/ProductionConsoleScreen";
import { ScreenManager } from "../src/pixi/screens/ScreenManager";

const assets = {
  texture: () => undefined,
  fontFamily: "Courier New, monospace",
};

describe("ScreenManager", () => {
  it("keeps the legacy production screen available outside design mode", () => {
    const manager = new ScreenManager(assets, () => undefined);
    const internals = manager as unknown as { active: string };
    const event = (key: string) => ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent;

    manager.handleKey(event("2"));
    expect(internals.active).toBe("production");
    manager.handleKey(event("Tab"));
    expect(internals.active).toBe("dispatch");
    expect(manager.children.some((child) => child instanceof ProductionConsoleScreen)).toBe(true);
  });

  it("keeps modals and result screen layered over the single main screen", () => {
    const manager = new ScreenManager(assets, () => undefined);
    const state = createInitialMatchState();

    manager.update({
      dispatch: selectDispatchConsoleState(state),
      production: selectProductionConsoleState(state),
      result: computeFinalResult(state),
      match: state,
      isMatchOver: false,
      dt: 0,
    });

    expect(manager.children.length).toBeGreaterThanOrEqual(5);
  });

  it("suppresses gameplay modals and result routing in design mode", () => {
    const manager = new ScreenManager(assets, () => undefined, { designMode: true });
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
      isMatchOver: true,
      dt: 1,
    });

    const internals = manager as unknown as { active: string };
    const breakerModal = manager.children.find((child) => child instanceof BreakerResetModal) as BreakerResetModal | undefined;
    const contractModal = manager.children.find((child) => child instanceof ContractOfferModal) as ContractOfferModal | undefined;

    expect(internals.active).toBe("desk");
    expect(manager.children.some((child) => child instanceof ControlDeskScreen)).toBe(true);
    expect(manager.children.some((child) => child instanceof ProductionConsoleScreen)).toBe(false);
    expect(breakerModal).toBeUndefined();
    expect(contractModal).toBeUndefined();
  });

  it("ignores legacy production shortcuts in design mode", () => {
    const manager = new ScreenManager(assets, () => undefined, { designMode: true });
    const internals = manager as unknown as { active: string };
    const event = (key: string) => ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent;

    manager.handleKey(event("2"));
    manager.handleKey(event("Tab"));

    expect(internals.active).toBe("desk");
  });
});
