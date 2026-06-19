import { Container, Graphics, Sprite, Text } from "pixi.js";

import { GAME_CONFIG } from "../../gameplay/config";
import type { PlayerCommand, ProductionConsoleState, WaterDamMode } from "../../gameplay/types";
import type { AssetResolver } from "../assets";
import { CityScene } from "../city/CityScene";
import { citySceneTexturesFromResolver } from "../city/cityAssets";
import { cityViewStateFromProductionState, selectDamWaterVisualState, selectWindFarmVisualState } from "../city/cityState";
import type { CitySectorOverlayState, CitySectorSlotId, CitySlotId } from "../city/cityTypes";
import type { DamWaterVisualState } from "../city/DamWaterObject";
import { CONTROL_DESK_LAYOUT, type CircleLayout, type ControlDeskLayout, type Point, type Rect } from "../controlDesk/controlDeskLayout";
import { Backplate } from "../controlDesk/components/Backplate";
import { DemandForecastMonitor, type DemandForecastMonitorDebugState } from "../controlDesk/components/DemandForecastMonitor";
import { ForecastTape, type ForecastTapeDebugState } from "../controlDesk/components/ForecastTape";
import { GaugeNeedle } from "../controlDesk/components/GaugeNeedle";
import { HitZone } from "../controlDesk/components/HitZone";
import { ModeRotarySwitch } from "../controlDesk/components/ModeRotarySwitch";
import { RotaryKnob } from "../controlDesk/components/RotaryKnob";
import { SpriteLedStrip } from "../controlDesk/components/SpriteLedStrip";
import { TextReadout } from "../controlDesk/components/TextReadout";
import { UpgradeRow } from "../controlDesk/components/UpgradeRow";
import { weatherIconTexturesFromResolver } from "../controlDesk/weatherIconAssets";

export type ControlDeskScreenOptions = {
  layout?: ControlDeskLayout;
  showReferenceOverlay?: boolean;
  showLayoutDebug?: boolean;
};

export type ControlDeskLayoutEditorValue = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
};

export type ControlDeskLayoutEditorTarget = {
  id: string;
  label: string;
  getValue: () => ControlDeskLayoutEditorValue;
  applyDelta: (delta: { x?: number; y?: number; scale?: number }) => void;
  setSelected: (selected: boolean) => void;
};

type ReadoutKey = keyof ControlDeskLayout["text"];
type WindSwitchMode = "off" | "on";

export class ControlDeskScreen extends Container {
  public readonly deskContentLayer = new Container({ label: "DeskContentLayer" });
  public readonly topStatusLayer = new Container({ label: "TopStatusLayer" });
  public readonly worldViewportLayer = new Container({ label: "WorldViewportLayer" });
  public readonly deskBackplateLayer = new Container({ label: "DeskBackplateLayer" });
  public readonly staticTextLayer = new Container({ label: "StaticTextLayer" });
  public readonly instrumentOverlayLayer = new Container({ label: "InstrumentOverlayLayer" });
  public readonly hitZoneLayer = new Container({ label: "HitZoneLayer" });
  public readonly alignmentDebugLayer = new Container({ label: "AlignmentDebugLayer" });
  public readonly referenceOverlayLayer = new Container({ label: "ReferenceOverlayLayer" });
  public readonly layoutSelectionLayer = new Graphics({ label: "LayoutSelectionLayer" });

  private readonly layout: ControlDeskLayout;
  private readonly coordinateMapper: DeskCoordinateMapper;
  private readonly capacityNeedle: GaugeNeedle;
  private readonly supplyDeltaNeedle: GaugeNeedle;
  private readonly reactorStrip: SpriteLedStrip;
  private readonly boilerStrip: SpriteLedStrip;
  private readonly windStrip: SpriteLedStrip;
  private readonly solarStrip: SpriteLedStrip;
  private readonly damStrip: SpriteLedStrip;
  private readonly reactorKnob: RotaryKnob;
  private readonly boilerKnob: RotaryKnob;
  private readonly windSwitch: ModeRotarySwitch<WindSwitchMode>;
  private readonly damRotary: ModeRotarySwitch<WaterDamMode>;
  private readonly forecastTape?: ForecastTape;
  private readonly demandMonitor: DemandForecastMonitor;
  private readonly safetyNetCooldown = new Container({ label: "SafetyNetCooldown" });
  private readonly safetyNetCooldownBar = new Graphics({ label: "SafetyNetCooldownBar" });
  private readonly safetyNetCooldownLabel: Text;
  private safetyNetCooldownRatio = 0;
  private readonly upgradeRows: UpgradeRow[];
  private readonly readouts = new Map<ReadoutKey, TextReadout>();
  private readonly cityScene?: CityScene;
  private selectedLayoutTarget?: Container;
  private latestState?: ProductionConsoleState;

  public constructor(
    private readonly assets: AssetResolver,
    private readonly sink: (command: PlayerCommand) => void,
    options: ControlDeskScreenOptions = {},
  ) {
    super({ label: "ControlDeskRoot" });
    this.layout = options.layout ?? CONTROL_DESK_LAYOUT;
    this.eventMode = "passive";

    this.referenceOverlayLayer.eventMode = "none";
    this.referenceOverlayLayer.interactiveChildren = false;
    this.alignmentDebugLayer.eventMode = "none";
    this.alignmentDebugLayer.interactiveChildren = false;
    this.topStatusLayer.eventMode = "none";
    this.topStatusLayer.interactiveChildren = false;
    this.layoutSelectionLayer.eventMode = "none";
    this.layoutSelectionLayer.interactiveChildren = false;
    this.deskContentLayer.position.set(this.layout.deskTransform.x, this.layout.deskTransform.y);
    this.deskContentLayer.scale.set(this.layout.deskTransform.scaleX, this.layout.deskTransform.scaleY);
    this.coordinateMapper = new DeskCoordinateMapper(this.deskContentLayer);

    const cityTextures = citySceneTexturesFromResolver(assets);
    if (cityTextures) {
      this.cityScene = new CityScene(cityTextures);
      this.worldViewportLayer.addChild(this.cityScene);
    }
    this.deskBackplateLayer.addChild(new Backplate(assets.texture("desk_background"), this.layout.backplate));
    this.deskContentLayer.addChild(
      this.worldViewportLayer,
      this.deskBackplateLayer,
      this.staticTextLayer,
      this.instrumentOverlayLayer,
      this.hitZoneLayer,
      this.alignmentDebugLayer,
      this.referenceOverlayLayer,
    );
    this.addChild(this.deskContentLayer, this.topStatusLayer, this.layoutSelectionLayer);

    this.capacityNeedle = new GaugeNeedle(assets.texture("gauge_needle"), this.layout.gauges.capacity);
    this.supplyDeltaNeedle = new GaugeNeedle(assets.texture("gauge_needle"), this.layout.gauges.supplyDelta);
    this.reactorStrip = this.createLedStrip("reactor", 10);
    this.boilerStrip = this.createLedStrip("boiler", 10);
    this.windStrip = this.createLedStrip("wind", 10);
    this.solarStrip = this.createLedStrip("solar", 10);
    this.damStrip = this.createLedStrip("dam", 10);
    this.reactorKnob = new RotaryKnob(assets.texture("knob"), this.layout.knobs.reactor, (deltaRatio) => {
      const state = this.latestState;
      if (!state) {
        return;
      }
      this.sink({
        type: "setNuclearTarget",
        playerId: "player",
        targetMW: clamp(state.nuclearTargetMW + deltaRatio * state.nuclearCapacityMW, 0, state.nuclearCapacityMW),
      });
    });
    this.boilerKnob = new RotaryKnob(assets.texture("knob"), this.layout.knobs.boiler, (deltaRatio) => {
      const state = this.latestState;
      if (!state) {
        return;
      }
      this.sink({ type: "setThermalThrottle", playerId: "player", throttle: clamp(state.thermalThrottle + deltaRatio, 0, 1) });
    });
    this.windSwitch = new ModeRotarySwitch<WindSwitchMode>(
      [
        { mode: "off", label: "OFF", texture: assets.texture("rotary_left"), rotation: -0.42, labelX: this.layout.knobs.windSwitch.center.x - 34 },
        { mode: "on", label: "ON", texture: assets.texture("rotary_right"), rotation: 0.42, labelX: this.layout.knobs.windSwitch.center.x + 44 },
      ],
      this.layout.knobs.windSwitch,
      assets.fontFamily,
      (mode) => this.sink({ type: "setWindEnabled", playerId: "player", enabled: mode === "on" }),
    );
    this.damRotary = new ModeRotarySwitch<WaterDamMode>(
      [
        { mode: "fill", label: "FILL", texture: assets.texture("rotary_left"), rotation: -0.42, labelX: this.layout.knobs.dam.center.x - 76 },
        { mode: "hold", label: "HOLD", texture: assets.texture("rotary_center"), rotation: 0, labelX: this.layout.knobs.dam.center.x },
        { mode: "drain", label: "DRAIN", texture: assets.texture("rotary_right"), rotation: 0.42, labelX: this.layout.knobs.dam.center.x + 82 },
      ],
      this.layout.knobs.dam,
      assets.fontFamily,
      (mode) => this.sink({ type: "setWaterDamMode", playerId: "player", mode }),
    );
    const weatherIconTextures = weatherIconTexturesFromResolver(assets);
    if (weatherIconTextures) {
      this.forecastTape = new ForecastTape(this.layout.forecast.plot, weatherIconTextures);
    }
    this.demandMonitor = new DemandForecastMonitor(this.layout.demandMonitor, assets.fontFamily);
    this.safetyNetCooldownLabel = new Text({
      text: "",
      style: {
        fontFamily: assets.fontFamily,
        fontSize: 22,
        fill: 0x101711,
        fontWeight: "700",
      },
    });
    this.safetyNetCooldownLabel.position.set(876, 740);
    this.safetyNetCooldown.addChild(this.safetyNetCooldownBar, this.safetyNetCooldownLabel);
    this.upgradeRows = this.layout.upgradeRows.map(
      (row) => new UpgradeRow(row, assets, sink, assets.fontFamily, options.showLayoutDebug === true),
    );

    this.instrumentOverlayLayer.addChild(
      this.reactorStrip,
      this.boilerStrip,
      this.windStrip,
      this.solarStrip,
      this.damStrip,
      this.capacityNeedle,
      this.supplyDeltaNeedle,
      this.reactorKnob,
      this.boilerKnob,
      this.windSwitch,
      this.damRotary,
      this.demandMonitor,
      this.safetyNetCooldown,
      ...this.upgradeRows,
    );

    this.topStatusLayer.addChild(createTopStatusBand(this.layout.topStatusBand));
    if (this.forecastTape) {
      this.topStatusLayer.addChild(this.forecastTape);
    }
    for (const key of Object.keys(this.layout.text) as ReadoutKey[]) {
      const readout = new TextReadout(this.layout.text[key], assets.fontFamily);
      this.readouts.set(key, readout);
      if (TOP_STATUS_READOUT_KEYS.has(key)) {
        this.topStatusLayer.addChild(readout);
      } else {
        this.staticTextLayer.addChild(readout);
      }
    }

    this.addHitZones(options.showLayoutDebug === true);
    if (options.showReferenceOverlay) {
      this.addReferenceOverlay();
    }
    if (options.showLayoutDebug) {
      this.addLayoutDebug();
    }
  }

  public update(state: ProductionConsoleState): void {
    this.latestState = state;
    this.cityScene?.setViewState(cityViewStateFromProductionState(state));
    this.cityScene?.setDamWaterVisualState(selectDamWaterVisualState(state));
    this.cityScene?.setWindFarmVisualState(selectWindFarmVisualState(state));
    this.capacityNeedle.update(state.capacityUtilization);
    this.supplyDeltaNeedle.update(state.supplyDemandMismatch);
    this.reactorStrip.update(state.nuclearCapacityMW === 0 ? 0 : state.nuclearTargetMW / state.nuclearCapacityMW);
    this.boilerStrip.update(state.thermalThrottle);
    this.windStrip.update(state.windPeakMW === 0 ? 0 : state.windPotentialMW / state.windPeakMW, "green");
    this.solarStrip.update(state.solarFactor, "green");
    this.damStrip.update(state.storedWaterMWh / Math.max(1, state.waterDamCapacityMWh), "blue");
    this.reactorKnob.update(state.nuclearCapacityMW === 0 ? 0 : state.nuclearTargetMW / state.nuclearCapacityMW);
    this.boilerKnob.update(state.thermalThrottle);
    this.windSwitch.update(state.windEnabled ? "on" : "off");
    this.damRotary.update(state.waterDamMode);
    this.forecastTape?.update({ seed: state.matchSeed, timeSeconds: state.timeSeconds });
    this.updateSafetyNetCooldown(state.gridShutdownReliefSeconds);
    this.demandMonitor.update({
      eventTrace: state.eventTrace,
      generationMW: state.generationMW,
      currentDemandMW: state.currentDemandMW,
      safeBalanceBand: GAME_CONFIG.breaker.safeBalanceBand,
    });
    for (const row of this.upgradeRows) {
      row.update(state.plants[row.plantKey]);
    }

    this.readouts.get("cash")?.update(`CASH ${Math.floor(state.cash)}`);
    this.readouts.get("score")?.update(`SCORE ${Math.floor(state.score)}`);
    this.readouts.get("tariff")?.update(`TARIFF ${state.playerTariffCents.toFixed(1)}c`);
    this.readouts.get("rivalTariff")?.update(`RIVAL ${state.rivalTariffCents.toFixed(1)}c`);
    this.readouts.get("incidents")?.update(formatIncidentReadout(state));
    this.readouts.get("city")?.update(formatCityReadout(state));
    this.readouts.get("load")?.update(formatDemandForecastReadout(state));
    this.readouts.get("generation")?.update(`GEN ${state.generationMW.toFixed(1)} MW`);
    this.readouts.get("reactor")?.update(`REACT ${state.nuclearOutputMW.toFixed(0)}/${state.nuclearTargetMW.toFixed(0)} MW`);
    this.readouts.get("boiler")?.update(`BOILER ${state.thermalOutputMW.toFixed(0)} MW`);
    this.readouts
      .get("wind")
      ?.update(`WIND ${state.currentWindKmh.toFixed(0)}K ${state.windOutputMW.toFixed(0)}/${state.windPotentialMW.toFixed(0)}MW`);
    this.readouts.get("solar")?.update(`SOLAR ${state.solarOutputMW.toFixed(0)}/${state.solarPeakMW.toFixed(0)} MW`);
    this.readouts.get("dam")?.update(formatDamReadout(state));
  }

  public debugComponentLabels(): string[] {
    return this.children.map((child) => child.label ?? "");
  }

  public debugInstrumentChildLabels(): string[] {
    return this.instrumentOverlayLayer.children.map((child) => child.label ?? "");
  }

  public debugControls(): {
    reactor: RotaryKnob;
    boiler: RotaryKnob;
    wind: ModeRotarySwitch<WindSwitchMode>;
    dam: ModeRotarySwitch<WaterDamMode>;
  } {
    return {
      reactor: this.reactorKnob,
      boiler: this.boilerKnob,
      wind: this.windSwitch,
      dam: this.damRotary,
    };
  }

  public animate(dt: number): void {
    this.cityScene?.tick(dt * 1000);
  }

  public debugForecastTapeState(): ForecastTapeDebugState | undefined {
    return this.forecastTape?.debugState();
  }

  public debugDemandForecastMonitorState(): DemandForecastMonitorDebugState | undefined {
    return this.demandMonitor.debugState();
  }

  public debugSafetyNetCooldownState(): { visible: boolean; text: string; barRatio: number } {
    return {
      visible: this.safetyNetCooldown.visible,
      text: this.safetyNetCooldownLabel.text,
      barRatio: this.safetyNetCooldownRatio,
    };
  }

  public debugWindLedCount(): number {
    return this.windStrip.debugActiveCount();
  }

  public debugReactorLedCount(): number {
    return this.reactorStrip.debugActiveCount();
  }

  public debugReadoutText(key: ReadoutKey): string | undefined {
    return this.readouts.get(key)?.debugText();
  }

  public debugReadoutPosition(key: ReadoutKey): Point | undefined {
    const readout = this.readouts.get(key);
    return readout ? { x: readout.x, y: readout.y } : undefined;
  }

  public debugReadoutFill(key: ReadoutKey): unknown {
    return this.readouts.get(key)?.debugFill();
  }

  public debugCitySlotLevel(slotId: CitySlotId): number | undefined {
    return this.cityScene?.debugSlotLevel(slotId);
  }

  public debugDamWaterState(): DamWaterVisualState | undefined {
    return this.cityScene?.debugDamWaterState();
  }

  public debugActiveTurbineCount(): number | undefined {
    return this.cityScene?.debugActiveTurbineCount();
  }

  public debugWindFramePosition(): number | undefined {
    return this.cityScene?.debugWindFramePosition();
  }

  public debugCitySectorOverlayState(slotId: CitySectorSlotId): CitySectorOverlayState | undefined {
    return this.cityScene?.debugSectorOverlayState(slotId);
  }

  public cityEditorScene(): CityScene | undefined {
    return this.cityScene;
  }

  public createLayoutEditorTargets(): ControlDeskLayoutEditorTarget[] {
    const targets: ControlDeskLayoutEditorTarget[] = [];
    for (const [key, readout] of this.readouts.entries()) {
      targets.push(this.createLayoutEditorTarget(`text.${key}`, `Text ${key}`, readout));
    }
    targets.push(
      this.createLayoutEditorTarget("led.reactor", "LED reactor", this.reactorStrip),
      this.createLayoutEditorTarget("led.boiler", "LED boiler", this.boilerStrip),
      this.createLayoutEditorTarget("led.wind", "LED wind", this.windStrip),
      this.createLayoutEditorTarget("led.solar", "LED solar", this.solarStrip),
      this.createLayoutEditorTarget("led.dam", "LED dam", this.damStrip),
      this.createLayoutEditorTarget("knob.reactor", "Knob reactor", this.reactorKnob),
      this.createLayoutEditorTarget("knob.boiler", "Knob boiler", this.boilerKnob),
      this.createLayoutEditorTarget("switch.wind", "Switch wind", this.windSwitch),
      this.createLayoutEditorTarget("switch.dam", "Switch dam", this.damRotary),
    );
    if (this.forecastTape) {
      targets.push(this.createLayoutEditorTarget("forecast.weatherTape", "Weather tape", this.forecastTape));
    }
    targets.push(this.createLayoutEditorTarget("forecast.demandMonitor", "Demand monitor", this.demandMonitor));
    this.upgradeRows.forEach((row, index) => {
      targets.push(this.createLayoutEditorTarget(`upgrade.${row.plantKey}`, `Upgrade ${row.plantKey}`, row, index + 1));
    });
    targets.push(
      this.createLayoutEditorTarget("desk.content", "Desk content", this.deskContentLayer),
      this.createLayoutEditorTarget("top.status", "Top status", this.topStatusLayer),
    );
    return targets;
  }

  private createLedStrip(key: keyof ControlDeskLayout["ledStrips"], cells: 3 | 10): SpriteLedStrip {
    return new SpriteLedStrip(this.layout.ledStrips[key], {
      base: this.assets.texture(cells === 10 ? "led_empty_10" : "led_empty_3"),
      green: this.assets.texture("led_green"),
      orange: this.assets.texture("led_orange"),
      red: this.assets.texture("led_red"),
      blue: this.assets.texture("led_blue"),
    });
  }

  private addHitZones(showDebug: boolean): void {
    this.hitZoneLayer.addChild(
      new HitZone(
        this.layout.hitZones.reactor,
        {
          down: (event) => this.reactorKnob.beginAdjustment(this.toDeskLocalPoint(event.global)),
          move: (event) => this.reactorKnob.adjustToGlobalPoint(this.toDeskLocalPoint(event.global)),
          up: () => this.reactorKnob.endAdjustment(),
        },
        showDebug,
      ),
      new HitZone(
        this.layout.hitZones.boiler,
        {
          down: (event) => this.boilerKnob.beginAdjustment(this.toDeskLocalPoint(event.global)),
          move: (event) => this.boilerKnob.adjustToGlobalPoint(this.toDeskLocalPoint(event.global)),
          up: () => this.boilerKnob.endAdjustment(),
        },
        showDebug,
      ),
      new HitZone(
        this.layout.hitZones.wind,
        {
          tap: () => this.windSwitch.cycleFromCenter(),
          down: (event) => this.windSwitch.beginDrag(this.toDeskLocalPoint(event.global)),
          move: (event) => this.windSwitch.dragTo(this.toDeskLocalPoint(event.global)),
          up: () => this.windSwitch.endDrag(),
        },
        showDebug,
      ),
      new HitZone(
        this.layout.hitZones.damFill,
        {
          tap: () => this.damRotary.cycleFromCenter(),
          down: (event) => this.damRotary.beginDrag(this.toDeskLocalPoint(event.global)),
          move: (event) => this.damRotary.dragTo(this.toDeskLocalPoint(event.global)),
          up: () => this.damRotary.endDrag(),
        },
        showDebug,
      ),
      new HitZone(
        this.layout.hitZones.damHold,
        {
          tap: () => this.damRotary.cycleFromCenter(),
          down: (event) => this.damRotary.beginDrag(this.toDeskLocalPoint(event.global)),
          move: (event) => this.damRotary.dragTo(this.toDeskLocalPoint(event.global)),
          up: () => this.damRotary.endDrag(),
        },
        showDebug,
      ),
      new HitZone(
        this.layout.hitZones.damDrain,
        {
          tap: () => this.damRotary.cycleFromCenter(),
          down: (event) => this.damRotary.beginDrag(this.toDeskLocalPoint(event.global)),
          move: (event) => this.damRotary.dragTo(this.toDeskLocalPoint(event.global)),
          up: () => this.damRotary.endDrag(),
        },
        showDebug,
      ),
    );
  }

  private updateSafetyNetCooldown(secondsRemaining: number): void {
    const remaining = Math.max(0, secondsRemaining);
    this.safetyNetCooldown.visible = remaining > 0;
    if (remaining <= 0) {
      this.safetyNetCooldownRatio = 0;
      this.safetyNetCooldownBar.clear();
      this.safetyNetCooldownLabel.text = "";
      return;
    }

    const ratio = Math.min(1, remaining / GAME_CONFIG.breaker.gridShutdownReliefSeconds);
    this.safetyNetCooldownRatio = ratio;
    this.safetyNetCooldownBar
      .clear()
      .roundRect(846, 728, 342, 54, 7)
      .fill({ color: 0x6fcad1, alpha: 0.92 })
      .stroke({ color: 0x101711, alpha: 0.78, width: 3 })
      .roundRect(862, 764, 310, 8, 3)
      .fill({ color: 0x101711, alpha: 0.28 })
      .roundRect(862, 764, 310 * ratio, 8, 3)
      .fill({ color: 0x101711, alpha: 0.95 });
    this.safetyNetCooldownLabel.text = `SAFETY NET ${Math.ceil(remaining)}s`;
  }

  private addReferenceOverlay(): void {
    const texture = this.assets.texture("desk_reference_full_clean");
    if (!texture) {
      return;
    }
    const sprite = new Sprite({ texture, label: "desk-full-clean-reference-only" });
    sprite.alpha = 0.38;
    sprite.eventMode = "none";
    sprite.width = this.layout.canvas.width;
    sprite.height = this.layout.canvas.height;
    this.referenceOverlayLayer.addChild(sprite);
  }

  private addLayoutDebug(): void {
    const outlineRect = (rect: Rect, color: number): void => {
      this.alignmentDebugLayer.addChild(
        new Graphics().rect(rect.x, rect.y, rect.w, rect.h).stroke({ color, alpha: 0.7, width: 2 }),
      );
    };
    const outlineCircle = (circle: CircleLayout, color: number): void => {
      this.alignmentDebugLayer.addChild(
        new Graphics().circle(circle.x, circle.y, circle.r).stroke({ color, alpha: 0.7, width: 2 }),
      );
    };
    const markPoint = (point: Point, color: number): void => {
      this.alignmentDebugLayer.addChild(
        new Graphics()
          .moveTo(point.x - 10, point.y)
          .lineTo(point.x + 10, point.y)
          .moveTo(point.x, point.y - 10)
          .lineTo(point.x, point.y + 10)
          .stroke({ color, alpha: 0.8, width: 2 }),
      );
    };

    outlineRect(this.layout.forecast.plot, 0x44d7ff);
    outlineRect(this.layout.demandMonitor, 0x44d7ff);
    markPoint(this.layout.gauges.capacity.center, 0xff7044);
    markPoint(this.layout.gauges.supplyDelta.center, 0xff7044);
    markPoint(this.layout.knobs.reactor.center, 0xffd447);
    markPoint(this.layout.knobs.boiler.center, 0xffd447);
    markPoint(this.layout.knobs.windSwitch.center, 0xffd447);
    markPoint(this.layout.knobs.dam.center, 0xffd447);
    for (const row of this.layout.upgradeRows) {
      outlineRect(row.hitZone, 0xffd447);
      outlineRect(row.ledStrip, 0x7aff8a);
    }
    for (const strip of Object.values(this.layout.ledStrips)) {
      outlineRect(strip, 0x7aff8a);
    }
    for (const hitZone of Object.values(this.layout.hitZones)) {
      if ("r" in hitZone) {
        outlineCircle(hitZone, 0x44d7ff);
      } else {
        outlineRect(hitZone, 0x44d7ff);
      }
    }
  }

  private toDeskLocalPoint(point: Point): Point {
    return this.coordinateMapper.toLayoutPoint(point);
  }

  private createLayoutEditorTarget(
    id: string,
    label: string,
    displayObject: Container,
    order = 0,
  ): ControlDeskLayoutEditorTarget {
    const applyDelta = (delta: { x?: number; y?: number; scale?: number }): void => {
      displayObject.position.set(displayObject.x + (delta.x ?? 0), displayObject.y + (delta.y ?? 0));
      if (delta.scale !== undefined && delta.scale !== 0) {
        const nextX = clamp(displayObject.scale.x + delta.scale, 0.25, 3);
        const nextY = clamp(displayObject.scale.y + delta.scale, 0.25, 3);
        displayObject.scale.set(nextX, nextY);
      }
      if (this.selectedLayoutTarget === displayObject) {
        this.drawLayoutSelection(displayObject);
      }
    };
    return {
      id,
      label: `${order > 0 ? `${order}. ` : ""}${label}`,
      getValue: () => ({
        x: round(displayObject.x),
        y: round(displayObject.y),
        scaleX: round(displayObject.scale.x),
        scaleY: round(displayObject.scale.y),
      }),
      applyDelta,
      setSelected: (selected) => {
        if (selected) {
          this.selectedLayoutTarget = displayObject;
          this.drawLayoutSelection(displayObject);
        } else if (this.selectedLayoutTarget === displayObject) {
          this.selectedLayoutTarget = undefined;
          this.layoutSelectionLayer.clear();
        }
      },
    };
  }

  private drawLayoutSelection(displayObject: Container): void {
    const bounds = safeGlobalBounds(displayObject);
    this.layoutSelectionLayer
      .clear()
      .rect(bounds.x, bounds.y, bounds.width, bounds.height)
      .stroke({ color: 0xffd447, alpha: 0.92, width: 3 });
  }
}

const TOP_STATUS_READOUT_KEYS = new Set<ReadoutKey>(["cash", "score", "tariff", "rivalTariff", "incidents", "city"]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function safeGlobalBounds(displayObject: Container): { x: number; y: number; width: number; height: number } {
  try {
    const bounds = displayObject.getBounds();
    if (Number.isFinite(bounds.x) && Number.isFinite(bounds.y) && bounds.width > 0 && bounds.height > 0) {
      return bounds;
    }
  } catch {
    // Some Pixi graphics-backed containers can throw while computing global bounds during live editing.
  }
  const position = displayObject.getGlobalPosition();
  return { x: position.x - 36, y: position.y - 36, width: 72, height: 72 };
}

class DeskCoordinateMapper {
  public constructor(private readonly layoutLayer: Container) {}

  public toLayoutPoint(point: Point): Point {
    const local = this.layoutLayer.toLocal(point);
    return { x: local.x, y: local.y };
  }
}

function createTopStatusBand(bounds: Rect): Graphics {
  return new Graphics({ label: "TopStatusBand" })
    .rect(bounds.x, bounds.y, bounds.w, bounds.h)
    .fill({ color: 0xe7d0a8, alpha: 0.58 })
    .stroke({ color: 0x1a130d, alpha: 0.52, width: 4 });
}

function formatDamReadout(state: ProductionConsoleState): string {
  if (state.damOutputMW > 0) {
    return `DAM OUT ${state.damOutputMW.toFixed(0)} MW`;
  }
  if (state.damAbsorbMW > 0) {
    return `DAM FILL ${state.damAbsorbMW.toFixed(0)} MW`;
  }
  return `DAM ${state.waterDamMode.toUpperCase()} 0 MW`;
}

function formatDemandForecastReadout(state: ProductionConsoleState): string {
  const deltaMW = state.generationMW - state.currentDemandMW;
  const deltaPrefix = deltaMW >= 0 ? "+" : "";
  return `GEN ${state.generationMW.toFixed(0)} / LOAD ${state.currentDemandMW.toFixed(0)} / DELTA ${deltaPrefix}${deltaMW.toFixed(0)} MW`;
}

function formatIncidentReadout(state: ProductionConsoleState): string {
  const incident = state.incidents[0];
  if (!incident) {
    return "INCIDENT CLEAR";
  }
  return `INCIDENT ${incident.label} ${incident.remainingSeconds.toFixed(0)}s`;
}

function formatCityReadout(state: ProductionConsoleState): string {
  return `House LVL${state.sectors.homes.demandLevel} Business LVL${state.sectors.services.demandLevel} Data Center LVL${state.sectors.dataCenters.demandLevel}`;
}
