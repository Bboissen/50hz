import { Circle, Point, Rectangle, Texture } from "pixi.js";
import { describe, expect, it } from "vitest";

import { createInitialMatchState, selectProductionConsoleState } from "../src/gameplay/match";
import type { PlayerCommand, ProductionConsoleState } from "../src/gameplay/types";
import { sampleWeather } from "../src/gameplay/weather";
import type { AssetResolver, PixiAssetKey } from "../src/pixi/assets";
import { CITY_ASSET_SOURCES } from "../src/pixi/city/cityAssets";
import { DESK_VIEWPORT } from "../src/pixi/city/citySceneConfig";
import { FORECAST_BUCKET_SECONDS, ForecastTape } from "../src/pixi/controlDesk/components/ForecastTape";
import { CONTROL_DESK_LAYOUT, type ControlDeskLayout } from "../src/pixi/controlDesk/controlDeskLayout";
import { Backplate } from "../src/pixi/controlDesk/components/Backplate";
import { GaugeNeedle } from "../src/pixi/controlDesk/components/GaugeNeedle";
import { HitZone } from "../src/pixi/controlDesk/components/HitZone";
import { ModeRotarySwitch } from "../src/pixi/controlDesk/components/ModeRotarySwitch";
import { RotaryKnob } from "../src/pixi/controlDesk/components/RotaryKnob";
import { SpriteLedStrip } from "../src/pixi/controlDesk/components/SpriteLedStrip";
import { TextReadout } from "../src/pixi/controlDesk/components/TextReadout";
import { UpgradeRow } from "../src/pixi/controlDesk/components/UpgradeRow";
import { WEATHER_ICON_ASSET_SOURCES, WEATHER_ICON_CONDITIONS, type WeatherIconTextures } from "../src/pixi/controlDesk/weatherIconAssets";
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

function enabledWeatherIcons(): Partial<Record<PixiAssetKey, boolean>> {
  return Object.fromEntries(Object.keys(WEATHER_ICON_ASSET_SOURCES).map((key) => [key, true])) as Partial<Record<PixiAssetKey, boolean>>;
}

function emptyWeatherIconTextures(): WeatherIconTextures {
  return Object.fromEntries(WEATHER_ICON_CONDITIONS.map((condition) => [condition, Texture.EMPTY])) as WeatherIconTextures;
}

function deskGlobalPoint(point: { x: number; y: number }): Point {
  return deskGlobalPointFor(CONTROL_DESK_LAYOUT, point);
}

function deskGlobalPointFor(layout: ControlDeskLayout, point: { x: number; y: number }): Point {
  const transform = layout.deskTransform;
  return new Point(point.x * transform.scaleX + transform.x, point.y * transform.scaleY + transform.y);
}

describe("ControlDeskScreen", () => {
  it("builds the required sprite-overlay control desk layers", () => {
    const { resolver } = recordingAssets({ desk_background: true });
    const screen = new ControlDeskScreen(resolver, () => undefined);

    expect(screen.label).toBe("ControlDeskRoot");
    expect(screen.debugComponentLabels()).toEqual(["DeskContentLayer", "TopStatusLayer", "LayoutSelectionLayer"]);
    expect(screen.deskContentLayer.children.map((child) => child.label)).toEqual([
      "WorldViewportLayer",
      "DeskBackplateLayer",
      "StaticTextLayer",
      "InstrumentOverlayLayer",
      "HitZoneLayer",
      "AlignmentDebugLayer",
      "ReferenceOverlayLayer",
    ]);
    expect(screen.deskContentLayer.position.y).toBe(CONTROL_DESK_LAYOUT.deskTransform.y);
    expect(screen.deskContentLayer.scale.y).toBeCloseTo(CONTROL_DESK_LAYOUT.deskTransform.scaleY);
    expect(screen.deskBackplateLayer.children).toHaveLength(1);
    expect(screen.deskBackplateLayer.children[0]?.label).toBe("DeskBackplate");
    expect(screen.deskBackplateLayer.children[0]?.children).toHaveLength(1);
    expect(screen.deskBackplateLayer.children[0]?.children[0]?.label).toBe("desk-background-sprite");
  });

  it("mounts the production city scene behind the desk when city textures are loaded", () => {
    const cityTextures = Object.fromEntries(
      Object.keys(CITY_ASSET_SOURCES).map((key) => [key, true]),
    ) as Partial<Record<PixiAssetKey, boolean>>;
    const { resolver } = recordingAssets({ ...cityTextures, desk_background: true });
    const screen = new ControlDeskScreen(resolver, () => undefined);
    const state = productionState();

    screen.update(state);

    expect(screen.worldViewportLayer.children[0]?.label).toBe("city-view-root");
    expect(screen.debugCitySlotLevel("household")).toBe(state.sectors.homes.demandLevel);
    expect(screen.debugCitySlotLevel("business")).toBe(state.sectors.services.demandLevel);
    expect(screen.debugCitySlotLevel("datacenter")).toBe(state.sectors.dataCenters.demandLevel);
    expect(screen.debugCitySlotLevel("nuclear")).toBe(state.plants.reactor.level);
    expect(screen.debugCitySlotLevel("thermal")).toBe(state.plants.boiler.level);
    expect(screen.debugCitySlotLevel("solar")).toBe(state.plants.renewables.level);
    expect(screen.debugCitySlotLevel("wind")).toBe(state.plants.renewables.level);
    expect(screen.debugCitySlotLevel("dam")).toBe(state.plants.waterDam.level);
  });

  it("forwards selector state to city, dam, and wind visuals without mutating gameplay state during animation", () => {
    const cityTextures = Object.fromEntries(
      Object.keys(CITY_ASSET_SOURCES).map((key) => [key, true]),
    ) as Partial<Record<PixiAssetKey, boolean>>;
    const { resolver } = recordingAssets({ ...cityTextures, desk_background: true });
    const screen = new ControlDeskScreen(resolver, () => undefined);
    const state: ProductionConsoleState = {
      ...productionState(),
      storedWaterMWh: 14,
      waterDamCapacityMWh: 20,
      damOutputMW: 9,
      damAbsorbMW: 0,
      waterDamMaxPowerMW: 15,
      rainActive: true,
      timeOfDayRatio: 0.4,
      windOutputMW: 10,
      windPotentialMW: 12,
      windPeakMW: 15,
      windEnabled: true,
      currentWindKmh: 42,
      plants: {
        ...productionState().plants,
        renewables: { ...productionState().plants.renewables, level: 3 },
      },
      sectors: {
        ...productionState().sectors,
        homes: {
          ...productionState().sectors.homes,
          isSpiking: true,
          activeEventId: "footballFinal",
        },
        dataCenters: {
          ...productionState().sectors.dataCenters,
          isDemandCritical: true,
        },
      },
      plantStates: {
        ...productionState().plantStates,
        wind: "online",
      },
    };
    const serializedState = JSON.stringify(state);

    screen.update(state);

    expect(screen.debugDamWaterState()).toMatchObject({
      levelRatio: 0.7,
      outputRatio: 0.6,
      rainActive: true,
      timeOfDayRatio: 0.4,
    });
    expect(screen.debugActiveTurbineCount()).toBe(4);
    expect(screen.debugCitySectorOverlayState("household")).toMatchObject({
      isSpiking: true,
      activeEventId: "footballFinal",
    });
    expect(screen.debugCitySectorOverlayState("datacenter")).toMatchObject({
      isDemandCritical: true,
    });
    const frameBefore = screen.debugWindFramePosition();
    screen.animate(1);

    expect(screen.debugWindFramePosition()).toBeGreaterThan(frameBefore ?? 0);
    expect(screen.debugDamWaterState()).toMatchObject({
      levelRatio: 0.7,
      outputRatio: 0.6,
    });
    expect(JSON.stringify(state)).toBe(serializedState);
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
    screen.hitZoneLayer.children[0]?.emit("pointerdown", { global: deskGlobalPoint({ x: 1588, y: 136 }) } as never);
    screen.hitZoneLayer.children[0]?.emit("globalpointermove", { global: deskGlobalPoint({ x: 1550, y: 170 }) } as never);
    screen.hitZoneLayer.children[0]?.emit("pointerup", { global: deskGlobalPoint({ x: 1550, y: 170 }) } as never);
    screen.hitZoneLayer.children[1]?.emit("pointerdown", { global: deskGlobalPoint({ x: 1767, y: 136 }) } as never);
    screen.hitZoneLayer.children[1]?.emit("globalpointermove", { global: deskGlobalPoint({ x: 1800, y: 96 }) } as never);
    screen.hitZoneLayer.children[1]?.emit("pointerup", { global: deskGlobalPoint({ x: 1800, y: 96 }) } as never);

    const nuclearCommand = commands.find((command) => command.type === "setNuclearTarget");
    const thermalCommand = commands.find((command) => command.type === "setThermalThrottle");
    expect(nuclearCommand?.targetMW).toBeLessThan(state.nuclearTargetMW);
    expect(thermalCommand?.throttle).toBeGreaterThan(state.thermalThrottle);
  });

  it("ignores transparent switch hover movement until the pointer is pressed", () => {
    const commands: PlayerCommand[] = [];
    const { resolver } = recordingAssets({ knob: true, rotary_left: true, rotary_center: true, rotary_right: true });
    const screen = new ControlDeskScreen(resolver, (command) => commands.push(command));

    screen.update(productionState());
    screen.hitZoneLayer.children[2]?.emit("globalpointermove", { global: deskGlobalPoint({ x: 1200, y: 136 }) } as never);
    screen.hitZoneLayer.children[2]?.emit("globalpointermove", { global: deskGlobalPoint({ x: 1000, y: 136 }) } as never);

    expect(commands).toEqual([]);

    screen.hitZoneLayer.children[2]?.emit("pointerdown", { global: deskGlobalPoint({ x: 1200, y: 136 }) } as never);
    screen.hitZoneLayer.children[2]?.emit("globalpointermove", { global: deskGlobalPoint({ x: 1000, y: 136 }) } as never);

    expect(commands).toEqual([]);

    screen.hitZoneLayer.children[2]?.emit("pointerup", { global: deskGlobalPoint({ x: 1000, y: 136 }) } as never);

    expect(commands).toContainEqual({ type: "setWindEnabled", playerId: "player", enabled: false });
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
    const windCenter = CONTROL_DESK_LAYOUT.knobs.windSwitch.center;
    const damCenter = CONTROL_DESK_LAYOUT.knobs.dam.center;
    screen.hitZoneLayer.children[2]?.emit("pointerdown", { global: deskGlobalPoint(windCenter) } as never);
    screen.hitZoneLayer.children[2]?.emit("globalpointermove", { global: deskGlobalPoint({ x: windCenter.x - 52, y: windCenter.y }) } as never);
    screen.hitZoneLayer.children[2]?.emit("pointerup", { global: deskGlobalPoint({ x: windCenter.x - 52, y: windCenter.y }) } as never);
    screen.hitZoneLayer.children[4]?.emit("pointerdown", { global: deskGlobalPoint(damCenter) } as never);
    screen.hitZoneLayer.children[4]?.emit("globalpointermove", { global: deskGlobalPoint({ x: damCenter.x + 65, y: damCenter.y }) } as never);
    screen.hitZoneLayer.children[4]?.emit("pointerup", { global: deskGlobalPoint({ x: damCenter.x + 65, y: damCenter.y }) } as never);

    expect(commands).toContainEqual({ type: "setWindEnabled", playerId: "player", enabled: false });
    expect(commands).toContainEqual({ type: "setWaterDamMode", playerId: "player", mode: "drain" });
  });

  it("shows the post-reset safety net cooldown meter", () => {
    const { resolver } = recordingAssets();
    const screen = new ControlDeskScreen(resolver, () => undefined);

    screen.update({ ...productionState(), gridShutdownReliefSeconds: 10 });

    expect(screen.debugSafetyNetCooldownState()).toMatchObject({
      visible: true,
      text: "Reset safety net - 10s left to match the demand",
      barRatio: 10 / 15,
    });
    expect(screen.topStatusLayer.children.map((child) => child.label)).toContain("SafetyNetCooldown");
    expect(screen.debugInstrumentChildLabels()).not.toContain("SafetyNetCooldown");
    expect(screen.debugSafetyNetCooldownState().bounds).toMatchObject({
      x: DESK_VIEWPORT.x + DESK_VIEWPORT.w / 2 - 385,
      y: CONTROL_DESK_LAYOUT.deskTransform.y + (DESK_VIEWPORT.y + DESK_VIEWPORT.h) * CONTROL_DESK_LAYOUT.deskTransform.scaleY - 58,
      w: 770,
      h: 50,
    });

    screen.update({ ...productionState(), gridShutdownReliefSeconds: 0 });

    expect(screen.debugSafetyNetCooldownState()).toMatchObject({
      visible: false,
      text: "",
      barRatio: 0,
    });
  });

  it("keeps knob drags stable when the whole desk is moved and resized", () => {
    const commands: PlayerCommand[] = [];
    const customLayout: ControlDeskLayout = {
      ...CONTROL_DESK_LAYOUT,
      deskTransform: { x: 80, y: 42, scaleX: 0.72, scaleY: 0.63 },
    };
    const { resolver } = recordingAssets({ knob: true });
    const screen = new ControlDeskScreen(resolver, (command) => commands.push(command), { layout: customLayout });
    const state = productionState();

    screen.update(state);
    screen.hitZoneLayer.children[0]?.emit("pointerdown", { global: deskGlobalPointFor(customLayout, { x: 1588, y: 136 }) } as never);
    screen.hitZoneLayer.children[0]?.emit("globalpointermove", { global: deskGlobalPointFor(customLayout, { x: 1550, y: 170 }) } as never);
    screen.hitZoneLayer.children[0]?.emit("pointerup", { global: deskGlobalPointFor(customLayout, { x: 1550, y: 170 }) } as never);

    const nuclearCommand = commands.find((command) => command.type === "setNuclearTarget");
    expect(nuclearCommand?.targetMW).toBeLessThan(state.nuclearTargetMW);
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

  it("renders a moving weather forecast tape from deterministic sampled weather", () => {
    const seed = "forecast-tape-proof";
    const { resolver } = recordingAssets(enabledWeatherIcons());
    const screen = new ControlDeskScreen(resolver, () => undefined);
    const baseState = { ...productionState(), matchSeed: seed, timeSeconds: 0 };

    screen.update(baseState);
    const first = screen.debugForecastTapeState();
    screen.update({ ...baseState, timeSeconds: FORECAST_BUCKET_SECONDS / 2 });
    const second = screen.debugForecastTapeState();

    expect(first?.pointerX).toBe(second?.pointerX);
    expect(first?.offsetPixels).toBe(0);
    expect(second?.offsetPixels).toBeGreaterThan(0);
    expect(second?.tileXs).not.toEqual(first?.tileXs);
    expect(second?.visibleIcons).toEqual(
      second?.visibleSlots.map((slotIndex) => sampleWeather(seed, slotIndex * FORECAST_BUCKET_SECONDS).condition),
    );
  });

  it("renders the bottom-right power demand forecast with a static supply marker", () => {
    const { resolver } = recordingAssets();
    const screen = new ControlDeskScreen(resolver, () => undefined);
    const state = {
      ...productionState(),
      currentDemandMW: 100,
      generationMW: 103,
      eventTrace: [
        { timeOffsetSeconds: 0, demandMW: 100, renewableSupplyMW: 0, eventIntensity: 0 },
        { timeOffsetSeconds: 15, demandMW: 124, renewableSupplyMW: 0, eventIntensity: 0 },
        { timeOffsetSeconds: 30, demandMW: 112, renewableSupplyMW: 0, eventIntensity: 0 },
      ],
    };

    screen.update(state);
    const first = screen.debugDemandForecastMonitorState();
    screen.update({
      ...state,
      eventTrace: [
        { timeOffsetSeconds: 0, demandMW: 98, renewableSupplyMW: 0, eventIntensity: 0 },
        { timeOffsetSeconds: 15, demandMW: 118, renewableSupplyMW: 0, eventIntensity: 0 },
        { timeOffsetSeconds: 30, demandMW: 106, renewableSupplyMW: 0, eventIntensity: 0 },
      ],
    });
    const second = screen.debugDemandForecastMonitorState();

    expect(first?.plot).toEqual({
      x: CONTROL_DESK_LAYOUT.demandMonitor.x + 30,
      y: CONTROL_DESK_LAYOUT.demandMonitor.y + 60,
      w: CONTROL_DESK_LAYOUT.demandMonitor.w - 60,
      h: CONTROL_DESK_LAYOUT.demandMonitor.h - 108,
    });
    expect(first?.demandPoints).toHaveLength(3);
    expect(first?.supplyPoint.x).toBe(second?.supplyPoint.x);
    expect(first?.safeRange.minY).not.toBe(first?.safeRange.maxY);
  });

  it("marks forecast points that carry breaker risk", () => {
    const { resolver } = recordingAssets();
    const screen = new ControlDeskScreen(resolver, () => undefined);

    screen.update({
      ...productionState(),
      currentDemandMW: 100,
      generationMW: 103,
      eventTrace: [
        { timeOffsetSeconds: 0, demandMW: 100, renewableSupplyMW: 0, eventIntensity: 0 },
        {
          timeOffsetSeconds: 15,
          demandMW: 118,
          renewableSupplyMW: 0,
          eventIntensity: 0,
          breakerRiskSource: "capacity",
          breakerTimer: 1.5,
        },
        {
          timeOffsetSeconds: 30,
          demandMW: 130,
          renewableSupplyMW: 0,
          eventIntensity: 0,
          breakerRiskSource: "capacity",
          breakerWouldTrip: true,
        },
      ],
    });

    expect(screen.debugDemandForecastMonitorState()?.riskMarkers.map((marker) => marker.level)).toEqual(["warning", "trip"]);
  });

  it("plots current generation on the forecast line when live supply matches live load", () => {
    const { resolver } = recordingAssets();
    const screen = new ControlDeskScreen(resolver, () => undefined);

    screen.update({
      ...productionState(),
      currentDemandMW: 100,
      generationMW: 100,
      eventTrace: [
        { timeOffsetSeconds: 0, demandMW: 100, renewableSupplyMW: 0, eventIntensity: 0 },
        { timeOffsetSeconds: 15, demandMW: 112, renewableSupplyMW: 0, eventIntensity: 0 },
        { timeOffsetSeconds: 30, demandMW: 124, renewableSupplyMW: 0, eventIntensity: 0 },
      ],
    });

    const monitor = screen.debugDemandForecastMonitorState();

    expect(monitor?.supplyPoint).toEqual(monitor?.demandPoints[0]);
  });

  it("recycles forecast tape tiles while keeping stable slot indices", () => {
    const seed = "forecast-recycle-proof";
    const tape = new ForecastTape(CONTROL_DESK_LAYOUT.forecast.plot, emptyWeatherIconTextures());

    tape.update({ seed, timeSeconds: 0 });
    const initial = tape.debugState();
    tape.update({ seed, timeSeconds: FORECAST_BUCKET_SECONDS * 9 + 3 });
    const recycled = tape.debugState();

    expect(initial.tileSlots).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(recycled.tileSlots).toEqual([9, 10, 11, 12, 13, 14, 15]);
    expect(recycled.pointerX).toBe(initial.pointerX);
    expect(recycled.visibleIcons).toEqual(
      recycled.visibleSlots.map((slotIndex) => sampleWeather(seed, slotIndex * FORECAST_BUCKET_SECONDS).condition),
    );
  });

  it("shows compact event and city-level readouts in the desk-top HUD", () => {
    const { resolver } = recordingAssets();
    const screen = new ControlDeskScreen(resolver, () => undefined);

    screen.update(productionState());

    expect(screen.debugReadoutText("incidents")).toContain("INCIDENT");
    expect(screen.debugReadoutText("city")).toMatch(/^House LVL\d Business LVL\d Data Center LVL\d$/);
    expect(screen.debugReadoutText("load")).toMatch(/^GEN \d+ \/ LOAD \d+ \/ DELTA [+-]?\d+ MW$/);
    expect(screen.debugReadoutText("reactor")).toMatch(/MW$/);
    expect(screen.debugReadoutText("boiler")).toMatch(/MW$/);
    expect(screen.debugReadoutText("wind")).toMatch(/MW$/);
    expect(screen.debugReadoutText("solar")).toMatch(/MW$/);
    expect(screen.debugReadoutText("dam")).toMatch(/MW$/);
  });

  it("shows selector-owned readouts instead of alternate UI calculations", () => {
    const { resolver } = recordingAssets({ led_empty_10: true, led_green: true });
    const screen = new ControlDeskScreen(resolver, () => undefined);
    const state = {
      ...productionState(),
      currentDemandMW: 95,
      generationMW: 120,
      deliveredSupplyMW: 80,
      currentWeather: {
        ...productionState().currentWeather,
        condition: "wind" as const,
      },
      currentWindKmh: 36,
      windOutputMW: 0,
      windPotentialMW: 11,
      windPeakMW: 15,
      nuclearTargetMW: 20,
      nuclearOutputMW: 35,
      thermalThrottle: 0.75,
      thermalOutputMW: 17,
      thermalCapacityMW: 100,
      solarFactor: 0.25,
      solarOutputMW: 3,
      solarPeakMW: 10,
      damOutputMW: 7,
      damAbsorbMW: 0,
    };

    screen.update(state);

    expect(screen.debugReadoutText("generation")).toBe("GEN 120.0 MW");
    expect(screen.debugReadoutText("city")).toBe("House LVL1 Business LVL1 Data Center LVL1");
    expect(screen.debugReadoutText("reactor")).toBe("REACT 35/20 MW");
    expect(screen.debugReadoutText("boiler")).toBe("BOILER 17 MW");
    expect(screen.debugReadoutText("wind")).toBe("WIND 36K 0/11MW");
    expect(screen.debugReadoutText("solar")).toBe("SOLAR 3/10 MW");
    expect(screen.debugReadoutText("dam")).toBe("DAM OUT 7 MW");
    expect(screen.debugReactorLedCount()).toBe(6);

    screen.update({ ...state, damOutputMW: 0, damAbsorbMW: 5 });
    expect(screen.debugReadoutText("dam")).toBe("DAM FILL 5 MW");
  });

  it("keeps wind resource LEDs selector-driven when the switch disconnects wind from the grid", () => {
    const { resolver } = recordingAssets({ led_empty_10: true, led_green: true });
    const screen = new ControlDeskScreen(resolver, () => undefined);
    const state = {
      ...productionState(),
      windOutputMW: 9,
      windPotentialMW: 9,
      windPeakMW: 15,
      currentWindKmh: 32,
    };

    screen.update(state);
    const connectedCount = screen.debugWindLedCount();
    screen.update({ ...state, windEnabled: false, windOutputMW: 0, generationMW: state.generationMW - state.windOutputMW });

    expect(screen.debugWindLedCount()).toBe(connectedCount);
    expect(screen.debugReadoutText("wind")).toBe("WIND 32K 0/9MW");
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

  it("keeps upgrade row labels compact enough for the authored rack while showing costs", () => {
    const { resolver } = recordingAssets();
    const screen = new ControlDeskScreen(resolver, () => undefined);

    screen.update(productionState());

    const rowLabels = screen.instrumentOverlayLayer.children
      .filter((child): child is UpgradeRow => child instanceof UpgradeRow)
      .map((child) => child.debugLabelText());
    const rowPrices = screen.instrumentOverlayLayer.children
      .filter((child): child is UpgradeRow => child instanceof UpgradeRow)
      .map((child) => child.debugPriceText());
    expect(rowLabels).toContain("DAM L1");
    expect(rowLabels).toContain("REACTOR L1");
    expect(rowLabels).toContain("BOILER L1");
    expect(rowPrices).toContain("€50");
    expect(rowPrices).toContain("€85");
    expect(rowPrices).toContain("€40");
    expect(rowPrices.every((price) => /€\d+|BUILD \d+s|MAX/.test(price))).toBe(true);
    expect(rowLabels.every((label) => !label.includes("/"))).toBe(true);
    expect(rowLabels.every((label) => !label.includes("€"))).toBe(true);
    expect(CONTROL_DESK_LAYOUT.upgradeRows.every((row) => row.price.x + (row.price.maxWidth ?? 0) <= 462)).toBe(true);
    expect(CONTROL_DESK_LAYOUT.upgradeRows.every((row) => row.price.x > row.upgradeArrow.x)).toBe(true);
    expect(CONTROL_DESK_LAYOUT.upgradeRows.at(-1)?.label.y).toBeLessThanOrEqual(900);
    expect(CONTROL_DESK_LAYOUT.upgradeRows.at(-1)?.hitZone.y).toBeLessThanOrEqual(870);
  });

  it("keeps single-line right-tower readouts from wrapping", () => {
    expect(CONTROL_DESK_LAYOUT.text.reactor.maxWidth).toBeUndefined();
    expect(CONTROL_DESK_LAYOUT.text.wind.maxWidth).toBeUndefined();
    expect(CONTROL_DESK_LAYOUT.text.solar.maxWidth).toBeUndefined();
    expect(CONTROL_DESK_LAYOUT.text.boiler.maxWidth).toBeGreaterThanOrEqual(210);
  });

  it("uses black text for desk labels and green LEDs for upgrade levels", () => {
    const { resolver } = recordingAssets();
    const screen = new ControlDeskScreen(resolver, () => undefined);

    screen.update(productionState());

    const rows = screen.instrumentOverlayLayer.children.filter((child): child is UpgradeRow => child instanceof UpgradeRow);
    expect(screen.debugReadoutFill("cash")).toBe(0x1a130d);
    expect(rows.map((row) => row.debugLabelFill())).toEqual([0x1a130d, 0x1a130d, 0x1a130d, 0x1a130d]);
    expect(rows.map((row) => row.debugPriceFill())).toEqual([0x1a130d, 0x1a130d, 0x1a130d, 0x1a130d]);
    expect(rows.flatMap((row) => row.debugActiveLedColors()).every((color) => color === "green")).toBe(true);
    expect(screen.debugControls().wind.debugLabelFills()).toEqual([0x1a130d, 0x1a130d]);
    expect(screen.debugControls().wind.debugLabelPositions().every((position) => position.y < 0)).toBe(true);
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
    expect(rows[0]?.debugPriceText()).toBe("BUILD 5s");
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

  it("exposes right-tower hardware as direct layout-editor targets", () => {
    const { resolver } = recordingAssets({ led_empty_10: true, knob: true, rotary_left: true, rotary_right: true, rotary_center: true });
    const screen = new ControlDeskScreen(resolver, () => undefined);

    const targetIds = screen.createLayoutEditorTargets().map((target) => target.id);

    expect(targetIds).toEqual(
      expect.arrayContaining([
        "led.reactor",
        "led.boiler",
        "led.wind",
        "led.solar",
        "led.dam",
        "knob.reactor",
        "knob.boiler",
        "switch.wind",
        "switch.dam",
      ]),
    );
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

  it("does not render a procedural fallback desk when the backplate texture is missing", () => {
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

  it("maps knob drags to predictable up-right increase and down-left decrease gestures", () => {
    const deltas: number[] = [];
    const knob = new RotaryKnob(Texture.EMPTY, CONTROL_DESK_LAYOUT.knobs.boiler, (deltaRatio) => deltas.push(deltaRatio));

    knob.update(0.5);
    knob.adjustToGlobalPoint({ x: 1800, y: 96 });

    expect(deltas).toEqual([]);

    knob.beginAdjustment({ x: 1767, y: 136 });
    knob.adjustToGlobalPoint({ x: 1800, y: 96 });
    knob.endAdjustment();
    knob.beginAdjustment({ x: 1767, y: 136 });
    knob.adjustToGlobalPoint({ x: 1730, y: 176 });

    expect(deltas[0]).toBeGreaterThan(0);
    expect(deltas[1]).toBeLessThan(0);
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
    expect(dam.debugLabelPositions().every((position) => position.y < 0)).toBe(true);
    expect(drainTransform.x).toBe(fillTransform.x);
    expect(drainTransform.y).toBe(fillTransform.y);
    expect(drainTransform.rotation).not.toBe(fillTransform.rotation);
  });

  it("does not start rotary switch drags from movement alone", () => {
    const commands: string[] = [];
    const dam = new ModeRotarySwitch(
      [
        { mode: "fill", label: "FILL", texture: Texture.EMPTY, rotation: -0.42, labelX: CONTROL_DESK_LAYOUT.knobs.dam.center.x - 76 },
        { mode: "hold", label: "HOLD", texture: Texture.EMPTY, rotation: 0, labelX: CONTROL_DESK_LAYOUT.knobs.dam.center.x },
        { mode: "drain", label: "DRAIN", texture: Texture.EMPTY, rotation: 0.42, labelX: CONTROL_DESK_LAYOUT.knobs.dam.center.x + 82 },
      ],
      CONTROL_DESK_LAYOUT.knobs.dam,
      "Courier New, monospace",
      (mode) => commands.push(mode),
    );

    dam.update("hold");
    dam.dragTo({ x: CONTROL_DESK_LAYOUT.knobs.dam.center.x });
    dam.dragTo({ x: CONTROL_DESK_LAYOUT.knobs.dam.center.x + 82 });

    expect(dam.debugSelectedMode()).toBe("hold");
    expect(commands).toEqual([]);

    dam.beginDrag({ x: CONTROL_DESK_LAYOUT.knobs.dam.center.x });
    dam.dragTo({ x: CONTROL_DESK_LAYOUT.knobs.dam.center.x + 82 });

    expect(dam.debugSelectedMode()).toBe("drain");
    expect(commands).toEqual([]);

    dam.endDrag();

    expect(commands).toEqual(["drain"]);
  });

  it("can preview and commit the middle dam rotary slot on release", () => {
    const commands: string[] = [];
    const dam = new ModeRotarySwitch(
      [
        { mode: "fill", label: "FILL", texture: Texture.EMPTY, rotation: -0.42, labelX: CONTROL_DESK_LAYOUT.knobs.dam.center.x - 76 },
        { mode: "hold", label: "HOLD", texture: Texture.EMPTY, rotation: 0, labelX: CONTROL_DESK_LAYOUT.knobs.dam.center.x },
        { mode: "drain", label: "DRAIN", texture: Texture.EMPTY, rotation: 0.42, labelX: CONTROL_DESK_LAYOUT.knobs.dam.center.x + 82 },
      ],
      CONTROL_DESK_LAYOUT.knobs.dam,
      "Courier New, monospace",
      (mode) => commands.push(mode),
    );

    dam.update("drain");
    dam.beginDrag({ x: CONTROL_DESK_LAYOUT.knobs.dam.center.x + 82 });
    dam.dragTo({ x: CONTROL_DESK_LAYOUT.knobs.dam.center.x });

    expect(dam.debugSelectedMode()).toBe("hold");
    expect(commands).toEqual([]);

    dam.endDrag();

    expect(commands).toEqual(["hold"]);
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

  it("forwards hit-zone global movement only during an active press", () => {
    const events: string[] = [];
    const zone = new HitZone(
      CONTROL_DESK_LAYOUT.hitZones.wind,
      {
        down: () => events.push("down"),
        move: () => events.push("move"),
        up: () => events.push("up"),
      },
      false,
    );

    zone.emit("globalpointermove", { global: new Point(10, 10) } as never);
    zone.emit("pointerdown", { global: new Point(10, 10) } as never);
    zone.emit("globalpointermove", { global: new Point(20, 10) } as never);
    zone.emit("pointerup", { global: new Point(20, 10) } as never);
    zone.emit("globalpointermove", { global: new Point(30, 10) } as never);

    expect(events).toEqual(["down", "move", "up"]);
  });

  it("renders hit zone outlines only for layout debug", () => {
    const debugZone = new HitZone(CONTROL_DESK_LAYOUT.hitZones.wind, () => undefined, true);

    expect(debugZone.children).toHaveLength(1);
  });
});
