import { Circle, Point, Rectangle, Texture } from "pixi.js";
import { describe, expect, it } from "vitest";

import { createInitialMatchState, selectProductionConsoleState } from "../src/gameplay/match";
import type { PlayerCommand, ProductionConsoleState } from "../src/gameplay/types";
import type { AssetResolver, PixiAssetKey } from "../src/pixi/assets";
import { CONTROL_DESK_LAYOUT, type ControlDeskLayout } from "../src/pixi/controlDesk/controlDeskLayout";
import { Backplate } from "../src/pixi/controlDesk/components/Backplate";
import { GaugeNeedle } from "../src/pixi/controlDesk/components/GaugeNeedle";
import { HitZone } from "../src/pixi/controlDesk/components/HitZone";
import { ModeRotarySwitch } from "../src/pixi/controlDesk/components/ModeRotarySwitch";
import { SpriteLedStrip } from "../src/pixi/controlDesk/components/SpriteLedStrip";
import { TextReadout } from "../src/pixi/controlDesk/components/TextReadout";
import { UpgradeRow } from "../src/pixi/controlDesk/components/UpgradeRow";
import { ControlDeskScreen } from "../src/pixi/screens/ControlDeskScreen";

function recordingAssets(enabled: Partial<Record<PixiAssetKey, boolean>> = {}): { calls: PixiAssetKey[]; resolver: AssetResolver } {
  const calls: PixiAssetKey[] = [];
  return {
    calls,
    resolver: {
      texture: (key: PixiAssetKey) => {
        calls.push(key);
        return enabled[key] ? Texture.EMPTY : undefined;
      },
      fontFamily: "Courier New, monospace",
    },
  };
}

function productionState(): ProductionConsoleState {
  return selectProductionConsoleState(createInitialMatchState());
}

describe("ControlDeskScreen", () => {
  it("builds the required sprite-overlay control desk layers", () => {
    const { resolver } = recordingAssets({ desk_background: true });
    const screen = new ControlDeskScreen(resolver, () => undefined);

    expect(screen.label).toBe("ControlDeskRoot");
    expect(screen.debugComponentLabels()).toEqual([
      "DeskBackplateLayer",
      "StaticTextLayer",
      "InstrumentOverlayLayer",
      "HitZoneLayer",
      "AlignmentDebugLayer",
      "ReferenceOverlayLayer",
    ]);
    expect(screen.deskBackplateLayer.children).toHaveLength(1);
    expect(screen.deskBackplateLayer.children[0]?.label).toBe("DeskBackplate");
    expect(screen.deskBackplateLayer.children[0]?.children).toHaveLength(1);
    expect(screen.deskBackplateLayer.children[0]?.children[0]?.label).toBe("desk-background-sprite");
  });

  it("does not render the full reference PNG unless explicitly requested", () => {
    const { calls, resolver } = recordingAssets({
      desk_background: true,
      desk_reference_full_clean: true,
    });
    const screen = new ControlDeskScreen(resolver, () => undefined, { showReferenceOverlay: false });

    screen.update(productionState());

    expect(calls).not.toContain("desk_reference_full_clean");
    expect(screen.referenceOverlayLayer.children).toHaveLength(0);
  });

  it("renders full_clean only in a non-interactive reference overlay", () => {
    const { calls, resolver } = recordingAssets({
      desk_background: true,
      desk_reference_full_clean: true,
    });
    const screen = new ControlDeskScreen(resolver, () => undefined, { showReferenceOverlay: true });

    expect(calls).toContain("desk_reference_full_clean");
    expect(screen.referenceOverlayLayer.eventMode).toBe("none");
    expect(screen.referenceOverlayLayer.interactiveChildren).toBe(false);
    expect(screen.referenceOverlayLayer.children[0]?.label).toBe("desk-full-clean-reference-only");
  });

  it("emits production control commands from sprite-backed controls", () => {
    const commands: PlayerCommand[] = [];
    const { resolver } = recordingAssets({ knob: true });
    const screen = new ControlDeskScreen(resolver, (command) => commands.push(command));

    screen.update(productionState());
    screen.debugControls().reactor.debugAdjustBy(-0.25);
    screen.debugControls().boiler.debugAdjustBy(0.12);
    screen.debugControls().wind.debugSelect("off");

    expect(commands).toContainEqual({ type: "setNuclearTarget", playerId: "player", targetMW: 26.25 });
    expect(commands).toContainEqual({ type: "setThermalThrottle", playerId: "player", throttle: 0.5 });
    expect(commands).toContainEqual({ type: "setWindEnabled", playerId: "player", enabled: false });
  });

  it("maps transparent knob hit zones to incremental drag adjustments", () => {
    const commands: PlayerCommand[] = [];
    const { resolver } = recordingAssets({ knob: true });
    const screen = new ControlDeskScreen(resolver, (command) => commands.push(command));
    const state = productionState();

    screen.update(state);
    screen.hitZoneLayer.children[0]?.emit("pointerdown", { global: new Point(1588, 136) } as never);
    screen.hitZoneLayer.children[0]?.emit("globalpointermove", { global: new Point(1570, 118) } as never);
    screen.hitZoneLayer.children[0]?.emit("pointerup", { global: new Point(1570, 118) } as never);
    screen.hitZoneLayer.children[1]?.emit("pointerdown", { global: new Point(1767, 136) } as never);
    screen.hitZoneLayer.children[1]?.emit("globalpointermove", { global: new Point(1749, 154) } as never);
    screen.hitZoneLayer.children[1]?.emit("pointerup", { global: new Point(1749, 154) } as never);

    const nuclearCommand = commands.find((command) => command.type === "setNuclearTarget");
    const thermalCommand = commands.find((command) => command.type === "setThermalThrottle");
    expect(nuclearCommand?.targetMW).toBeLessThan(state.nuclearTargetMW);
    expect(thermalCommand?.throttle).toBeGreaterThan(state.thermalThrottle);
  });

  it("cycles wind and water-dam commands from transparent switch taps", () => {
    const commands: PlayerCommand[] = [];
    const { resolver } = recordingAssets({ knob: true, rotary_left: true, rotary_center: true, rotary_right: true });
    const screen = new ControlDeskScreen(resolver, (command) => commands.push(command));

    screen.update(productionState());
    screen.hitZoneLayer.children[2]?.emit("pointertap", {} as never);
    screen.hitZoneLayer.children[4]?.emit("pointertap", {} as never);
    screen.hitZoneLayer.children[4]?.emit("pointertap", {} as never);
    screen.hitZoneLayer.children[4]?.emit("pointertap", {} as never);

    expect(commands).toContainEqual({ type: "setWindEnabled", playerId: "player", enabled: false });
    expect(commands).toContainEqual({ type: "setWaterDamMode", playerId: "player", mode: "drain" });
    expect(commands).toContainEqual({ type: "setWaterDamMode", playerId: "player", mode: "hold" });
    expect(commands).toContainEqual({ type: "setWaterDamMode", playerId: "player", mode: "fill" });
  });

  it("drags wind and water-dam switches left or right from the center", () => {
    const commands: PlayerCommand[] = [];
    const { resolver } = recordingAssets({ rotary_left: true, rotary_center: true, rotary_right: true });
    const screen = new ControlDeskScreen(resolver, (command) => commands.push(command));

    screen.update(productionState());
    screen.hitZoneLayer.children[2]?.emit("pointerdown", { global: new Point(1560, 390) } as never);
    screen.hitZoneLayer.children[2]?.emit("globalpointermove", { global: new Point(1508, 390) } as never);
    screen.hitZoneLayer.children[2]?.emit("pointerup", { global: new Point(1508, 390) } as never);
    screen.hitZoneLayer.children[4]?.emit("pointerdown", { global: new Point(1735, 562) } as never);
    screen.hitZoneLayer.children[4]?.emit("globalpointermove", { global: new Point(1800, 562) } as never);
    screen.hitZoneLayer.children[4]?.emit("pointerup", { global: new Point(1800, 562) } as never);

    expect(commands).toContainEqual({ type: "setWindEnabled", playerId: "player", enabled: false });
    expect(commands).toContainEqual({ type: "setWaterDamMode", playerId: "player", mode: "drain" });
  });

  it("emits existing upgrade commands from affordable upgrade-row hit zones", () => {
    const commands: PlayerCommand[] = [];
    const { resolver } = recordingAssets({ upgrade_arrow: true, led_empty_3: true, led_blue: true });
    const screen = new ControlDeskScreen(resolver, (command) => commands.push(command));
    const state = productionState();

    screen.update(state);
    const rows = screen.instrumentOverlayLayer.children.filter((child): child is UpgradeRow => child instanceof UpgradeRow);
    for (const row of rows) {
      row.children.find((child): child is HitZone => child instanceof HitZone)?.emit("pointertap", {} as never);
    }

    const expectedCommands = rows
      .map((row) => state.plants[row.plantKey])
      .filter((plant) => plant.canAfford && !plant.isMaxed && !plant.isBuilding)
      .map((plant) => ({ type: "buyUpgrade" as const, playerId: "player" as const, kind: plant.kind }));
    expect(commands).toEqual(expectedCommands);
  });

  it("draws the forecast oscilloscope range, current marker, and forecast curve", () => {
    const { resolver } = recordingAssets();
    const screen = new ControlDeskScreen(resolver, () => undefined);

    screen.update(productionState());

    expect(screen.debugForecastFeatures()).toEqual({
      hasCurrentMarker: true,
      hasRangeBand: true,
      hasForecastCurve: true,
      hasScanAnimation: true,
    });
    expect(screen.debugForecastAnimationPhase()).toBe(0);
    screen.animate(0.25);
    expect(screen.debugForecastAnimationPhase()).toBe(0.1);
  });

  it("shows the player versus rival subscribed-load share in the desk-top HUD", () => {
    const { resolver } = recordingAssets();
    const screen = new ControlDeskScreen(resolver, () => undefined);

    screen.update(productionState());

    expect(screen.debugReadoutText("share")).toBe("SHARE YOU 50% RIVAL 50%");
    expect(screen.debugReadoutText("weather")).toContain("WEATHER");
    expect(screen.debugReadoutText("reactor")).toMatch(/MW$/);
    expect(screen.debugReadoutText("boiler")).toMatch(/MW$/);
    expect(screen.debugReadoutText("wind")).toMatch(/MW$/);
    expect(screen.debugReadoutText("solar")).toMatch(/MW$/);
    expect(screen.debugReadoutText("dam")).toMatch(/MW$/);
  });

  it("keeps wind resource LEDs stable when the switch disconnects wind from the grid", () => {
    const { resolver } = recordingAssets({ led_empty_10: true, led_green: true });
    const screen = new ControlDeskScreen(resolver, () => undefined);
    const state = productionState();

    screen.update(state);
    const connectedCount = screen.debugWindLedCount();
    screen.update({ ...state, windEnabled: false, windOutputMW: 0, generationMW: state.generationMW - state.windOutputMW });

    expect(screen.debugWindLedCount()).toBe(connectedCount);
    expect(screen.debugReadoutText("wind")).toBe(`WIND OFF ${state.windOutputMW.toFixed(0)} MW`);
  });

  it("keeps top-level LED strips on the declared manifest coordinates only", () => {
    const { resolver } = recordingAssets({
      led_empty_10: true,
      led_green: true,
      led_orange: true,
      led_red: true,
      led_blue: true,
    });
    const screen = new ControlDeskScreen(resolver, () => undefined);

    const stripPositions = screen.instrumentOverlayLayer.children
      .filter((child): child is SpriteLedStrip => child instanceof SpriteLedStrip)
      .map((strip) => ({ x: strip.position.x, y: strip.position.y }));

    expect(stripPositions).toEqual(Object.values(CONTROL_DESK_LAYOUT.ledStrips).map((strip) => ({ x: strip.x, y: strip.y })));
  });

  it("keeps upgrade row labels compact enough for the authored rack", () => {
    const { resolver } = recordingAssets();
    const screen = new ControlDeskScreen(resolver, () => undefined);

    screen.update(productionState());

    const rowLabels = screen.instrumentOverlayLayer.children
      .filter((child): child is UpgradeRow => child instanceof UpgradeRow)
      .map((child) => child.debugLabelText());
    expect(rowLabels).toContain("DAM L1 20MWh");
    expect(rowLabels.every((label) => !label.includes("/"))).toBe(true);
    expect(CONTROL_DESK_LAYOUT.upgradeRows.at(-1)?.label.y).toBeLessThanOrEqual(900);
    expect(CONTROL_DESK_LAYOUT.upgradeRows.at(-1)?.hitZone.y).toBeLessThanOrEqual(870);
  });

  it("uses black text for desk labels and green LEDs for upgrade levels", () => {
    const { resolver } = recordingAssets();
    const screen = new ControlDeskScreen(resolver, () => undefined);

    screen.update(productionState());

    const rows = screen.instrumentOverlayLayer.children.filter((child): child is UpgradeRow => child instanceof UpgradeRow);
    expect(screen.debugReadoutFill("cash")).toBe(0x1a130d);
    expect(rows.map((row) => row.debugLabelFill())).toEqual([0x1a130d, 0x1a130d, 0x1a130d, 0x1a130d]);
    expect(rows.flatMap((row) => row.debugActiveLedColors()).every((color) => color === "green")).toBe(true);
    expect(screen.debugControls().wind.debugLabelFills()).toEqual([0x1a130d, 0x1a130d]);
    expect(screen.debugControls().dam.debugLabelFills()).toEqual([0x1a130d, 0x1a130d, 0x1a130d]);
  });

  it("shows purchased upgrade levels immediately without dimming other upgrade arrows", () => {
    const { resolver } = recordingAssets({ upgrade_arrow: true });
    const screen = new ControlDeskScreen(resolver, () => undefined);
    const state = productionState();
    const nextPlants = {
      ...state.plants,
      reactor: {
        ...state.plants.reactor,
        purchasedLevel: 2 as const,
        isBuilding: true,
        canAfford: false,
        statusText: "BUILD 5s",
      },
      boiler: {
        ...state.plants.boiler,
        canAfford: false,
      },
    };

    screen.update({ ...state, plants: nextPlants });
    const rows = screen.instrumentOverlayLayer.children.filter((child): child is UpgradeRow => child instanceof UpgradeRow);

    expect(rows[0]?.debugLabelText()).toContain("L2");
    expect(rows[0]?.debugActiveLedCount()).toBe(2);
    expect(rows[1]?.debugArrowAlpha()).toBe(1);
  });

  it("uses the injected layout for placement instead of component-local positions", () => {
    const customLayout: ControlDeskLayout = {
      ...CONTROL_DESK_LAYOUT,
      backplate: { x: 11, y: 12, w: 111, h: 112 },
      ledStrips: {
        ...CONTROL_DESK_LAYOUT.ledStrips,
        reactor: { ...CONTROL_DESK_LAYOUT.ledStrips.reactor, x: 301, y: 302 },
      },
      knobs: {
        ...CONTROL_DESK_LAYOUT.knobs,
        reactor: {
          ...CONTROL_DESK_LAYOUT.knobs.reactor,
          center: { x: 401, y: 402 },
        },
      },
      text: {
        ...CONTROL_DESK_LAYOUT.text,
        cash: { ...CONTROL_DESK_LAYOUT.text.cash, x: 601, y: 602 },
      },
      hitZones: {
        ...CONTROL_DESK_LAYOUT.hitZones,
        reactor: { x: 501, y: 502, r: 33 },
      },
    };
    const { resolver } = recordingAssets({ desk_background: true, led_empty_10: true });
    const screen = new ControlDeskScreen(resolver, () => undefined, { layout: customLayout });
    const backplate = screen.deskBackplateLayer.children[0] as Backplate;
    const ledStrip = screen.instrumentOverlayLayer.children.find(
      (child): child is SpriteLedStrip => child instanceof SpriteLedStrip && child.x === customLayout.ledStrips.reactor.x,
    );
    const reactorHitZone = screen.hitZoneLayer.children[0] as HitZone | undefined;

    expect(backplate.sprite?.position.x).toBe(customLayout.backplate.x);
    expect(backplate.sprite?.position.y).toBe(customLayout.backplate.y);
    expect(backplate.sprite?.width).toBe(customLayout.backplate.w);
    expect(backplate.sprite?.height).toBe(customLayout.backplate.h);
    expect(ledStrip?.position.y).toBe(customLayout.ledStrips.reactor.y);
    expect(screen.debugControls().reactor.debugTransform()).toMatchObject(customLayout.knobs.reactor.center);
    expect(screen.debugReadoutPosition("cash")).toEqual({ x: customLayout.text.cash.x, y: customLayout.text.cash.y });
    expect(reactorHitZone?.position.x).toBe(customLayout.hitZones.reactor.x);
    expect(reactorHitZone?.position.y).toBe(customLayout.hitZones.reactor.y);
  });

  it("keeps alignment and hit-zone debug visuals opt-in", () => {
    const { resolver } = recordingAssets();
    const normalScreen = new ControlDeskScreen(resolver, () => undefined);
    const debugScreen = new ControlDeskScreen(resolver, () => undefined, { showLayoutDebug: true });

    expect(normalScreen.alignmentDebugLayer.children).toHaveLength(0);
    expect(normalScreen.hitZoneLayer.children.every((child) => child.children.length === 0)).toBe(true);
    expect(debugScreen.alignmentDebugLayer.children.length).toBeGreaterThan(0);
    expect(debugScreen.hitZoneLayer.children.every((child) => child.children.length > 0)).toBe(true);
  });
});

describe("control desk sprite components", () => {
  it("renders the backplate as exactly one non-interactive sprite", () => {
    const backplate = new Backplate(Texture.EMPTY, CONTROL_DESK_LAYOUT.backplate);

    expect(backplate.children).toHaveLength(1);
    expect(backplate.eventMode).toBe("none");
    expect(backplate.interactiveChildren).toBe(false);
    expect(backplate.sprite?.label).toBe("desk-background-sprite");
    expect(backplate.sprite?.eventMode).toBe("none");
    expect(backplate.sprite?.position.x).toBe(CONTROL_DESK_LAYOUT.backplate.x);
    expect(backplate.sprite?.position.y).toBe(CONTROL_DESK_LAYOUT.backplate.y);
    expect(backplate.sprite?.width).toBe(CONTROL_DESK_LAYOUT.backplate.w);
    expect(backplate.sprite?.height).toBe(CONTROL_DESK_LAYOUT.backplate.h);
  });

  it("does not draw a procedural fallback desk when the backplate texture is missing", () => {
    const backplate = new Backplate(undefined, CONTROL_DESK_LAYOUT.backplate);

    expect(backplate.children).toHaveLength(0);
    expect(backplate.sprite).toBeUndefined();
  });

  it("maps LED strip values through green, orange, and red sprites", () => {
    const strip = new SpriteLedStrip(CONTROL_DESK_LAYOUT.ledStrips.reactor, {
      base: Texture.EMPTY,
      green: Texture.EMPTY,
      orange: Texture.EMPTY,
      red: Texture.EMPTY,
    });

    strip.update(1);

    expect(strip.debugActiveCount()).toBe(10);
    expect(strip.debugActiveColors()[0]).toBe("green");
    expect(strip.debugActiveColors()[6]).toBe("orange");
    expect(strip.debugActiveColors()[9]).toBe("red");
  });

  it("does not add procedural LED fallback graphics when sprites are available", () => {
    const strip = new SpriteLedStrip(CONTROL_DESK_LAYOUT.ledStrips.reactor, {
      base: Texture.EMPTY,
      green: Texture.EMPTY,
      orange: Texture.EMPTY,
      red: Texture.EMPTY,
    });

    strip.update(1);

    expect(strip.children.map((child) => child.label)).not.toContain("test-fallback-leds");
  });

  it("rotates gauge needles without moving their pivot", () => {
    const gauge = new GaugeNeedle(Texture.EMPTY, CONTROL_DESK_LAYOUT.gauges.capacity);

    gauge.update(0.2);
    const firstPosition = gauge.debugNeedlePosition();
    const firstRotation = gauge.debugNeedleRotation();
    gauge.update(1.1);

    expect(gauge.hasSprite()).toBe(true);
    expect(gauge.debugNeedlePosition()).toEqual(firstPosition);
    expect(gauge.debugNeedleRotation()).not.toBe(firstRotation);
  });

  it("keeps the dam rotary centered across all modes", () => {
    const dam = new ModeRotarySwitch(
      [
        { mode: "fill", label: "FILL", texture: Texture.EMPTY, rotation: -0.42, labelX: CONTROL_DESK_LAYOUT.knobs.dam.center.x - 76 },
        { mode: "hold", label: "HOLD", texture: Texture.EMPTY, rotation: 0, labelX: CONTROL_DESK_LAYOUT.knobs.dam.center.x },
        { mode: "drain", label: "DRAIN", texture: Texture.EMPTY, rotation: 0.42, labelX: CONTROL_DESK_LAYOUT.knobs.dam.center.x + 82 },
      ],
      CONTROL_DESK_LAYOUT.knobs.dam,
      "Courier New, monospace",
      () => undefined,
    );

    dam.update("fill");
    const fillTransform = dam.debugTransform();
    dam.update("drain");
    const drainTransform = dam.debugTransform();

    expect(dam.debugSelectedMode()).toBe("drain");
    expect(dam.debugLabelTexts()).toEqual(["FILL", "HOLD", "DRAIN"]);
    expect(dam.debugLabelRotations()).toEqual([0, 0, 0]);
    expect(drainTransform.x).toBe(fillTransform.x);
    expect(drainTransform.y).toBe(fillTransform.y);
    expect(drainTransform.rotation).not.toBe(fillTransform.rotation);
  });

  it("updates text readouts only when rendered text changes", () => {
    const readout = new TextReadout(CONTROL_DESK_LAYOUT.text.cash, "Courier New, monospace");

    readout.update("CASH EUR 80");
    const firstUpdateCount = readout.debugRenderedUpdateCount();
    readout.update("CASH EUR 80");
    readout.update("CASH EUR 85");

    expect(firstUpdateCount).toBe(1);
    expect(readout.debugRenderedUpdateCount()).toBe(2);
    expect(readout.debugText()).toBe("CASH EUR 85");
  });

  it("keeps hit zones invisible outside layout debug while preserving explicit hit areas", () => {
    const rectZone = new HitZone(CONTROL_DESK_LAYOUT.hitZones.wind, () => undefined, false);
    const circleZone = new HitZone(CONTROL_DESK_LAYOUT.hitZones.reactor, () => undefined, false);

    expect(rectZone.eventMode).toBe("static");
    expect(circleZone.eventMode).toBe("static");
    expect(rectZone.children).toHaveLength(0);
    expect(circleZone.children).toHaveLength(0);
    expect(rectZone.hitArea).toBeInstanceOf(Rectangle);
    expect(circleZone.hitArea).toBeInstanceOf(Circle);
  });

  it("draws hit zone outlines only for layout debug", () => {
    const debugZone = new HitZone(CONTROL_DESK_LAYOUT.hitZones.wind, () => undefined, true);

    expect(debugZone.children).toHaveLength(1);
  });
});
