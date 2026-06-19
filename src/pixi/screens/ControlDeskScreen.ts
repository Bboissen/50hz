import { Container, Graphics, Sprite } from "pixi.js";

import type { PlayerCommand, ProductionConsoleState, WaterDamMode } from "../../gameplay/types";
import type { AssetResolver } from "../assets";
import { CONTROL_DESK_LAYOUT, type CircleLayout, type ControlDeskLayout, type Point, type Rect } from "../controlDesk/controlDeskLayout";
import { Backplate } from "../controlDesk/components/Backplate";
import { ForecastOscilloscope } from "../controlDesk/components/ForecastOscilloscope";
import { GaugeNeedle } from "../controlDesk/components/GaugeNeedle";
import { HitZone } from "../controlDesk/components/HitZone";
import { ModeRotarySwitch } from "../controlDesk/components/ModeRotarySwitch";
import { RotaryKnob } from "../controlDesk/components/RotaryKnob";
import { SpriteLedStrip } from "../controlDesk/components/SpriteLedStrip";
import { TextReadout } from "../controlDesk/components/TextReadout";
import { UpgradeRow } from "../controlDesk/components/UpgradeRow";

export type ControlDeskScreenOptions = {
  layout?: ControlDeskLayout;
  showReferenceOverlay?: boolean;
  showLayoutDebug?: boolean;
};

type ReadoutKey = keyof ControlDeskLayout["text"];
type WindSwitchMode = "off" | "on";

export class ControlDeskScreen extends Container {
  public readonly deskBackplateLayer = new Container({ label: "DeskBackplateLayer" });
  public readonly staticTextLayer = new Container({ label: "StaticTextLayer" });
  public readonly instrumentOverlayLayer = new Container({ label: "InstrumentOverlayLayer" });
  public readonly hitZoneLayer = new Container({ label: "HitZoneLayer" });
  public readonly alignmentDebugLayer = new Container({ label: "AlignmentDebugLayer" });
  public readonly referenceOverlayLayer = new Container({ label: "ReferenceOverlayLayer" });

  private readonly layout: ControlDeskLayout;
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
  private readonly forecast: ForecastOscilloscope;
  private readonly upgradeRows: UpgradeRow[];
  private readonly readouts = new Map<ReadoutKey, TextReadout>();
  private latestState?: ProductionConsoleState;
  private windResourceRatio = 0.72;
  private windAvailableMW = 0;

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

    this.deskBackplateLayer.addChild(new Backplate(assets.texture("desk_background"), this.layout.backplate));
    this.addChild(
      this.deskBackplateLayer,
      this.staticTextLayer,
      this.instrumentOverlayLayer,
      this.hitZoneLayer,
      this.alignmentDebugLayer,
      this.referenceOverlayLayer,
    );

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
    this.forecast = new ForecastOscilloscope(this.layout.forecast.plot);
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
      this.forecast,
      ...this.upgradeRows,
    );

    for (const key of Object.keys(this.layout.text) as ReadoutKey[]) {
      const readout = new TextReadout(this.layout.text[key], assets.fontFamily);
      this.readouts.set(key, readout);
      this.staticTextLayer.addChild(readout);
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
    this.capacityNeedle.update(state.capacityUtilization);
    this.supplyDeltaNeedle.update(state.supplyDemandMismatch);
    this.reactorStrip.update(state.nuclearCapacityMW === 0 ? 0 : state.nuclearTargetMW / state.nuclearCapacityMW);
    this.boilerStrip.update(state.thermalThrottle);
    if (state.windEnabled || this.windAvailableMW === 0) {
      this.windAvailableMW = state.windEnabled ? state.windOutputMW : state.windPeakMW * this.windResourceRatio;
      this.windResourceRatio = state.windPeakMW === 0 ? 0 : clamp(this.windAvailableMW / state.windPeakMW, 0, 1);
    }
    this.windStrip.update(this.windResourceRatio, "green");
    this.solarStrip.update(state.solarPeakMW === 0 ? 0 : state.solarOutputMW / state.solarPeakMW, "green");
    this.damStrip.update(state.storedWaterMWh / Math.max(1, state.waterDamCapacityMWh), "blue");
    this.reactorKnob.update(state.nuclearCapacityMW === 0 ? 0 : state.nuclearTargetMW / state.nuclearCapacityMW);
    this.boilerKnob.update(state.thermalThrottle);
    this.windSwitch.update(state.windEnabled ? "on" : "off");
    this.damRotary.update(state.waterDamMode);
    this.forecast.update(state);
    for (const row of this.upgradeRows) {
      row.update(state.plants[row.plantKey]);
    }

    this.readouts.get("cash")?.update(`CASH ${Math.floor(state.cash)}`);
    this.readouts.get("score")?.update(`SCORE ${Math.floor(state.score)}`);
    this.readouts.get("tariff")?.update(`TARIFF ${state.playerTariffCents.toFixed(1)}c`);
    this.readouts.get("rivalTariff")?.update(`RIVAL ${state.rivalTariffCents.toFixed(1)}c`);
    this.readouts.get("weather")?.update(`WEATHER ${state.forecast.map((token) => token.label).join(" / ")}`);
    this.readouts.get("load")?.update(`LOAD ${state.currentDemandMW.toFixed(1)} MW`);
    this.readouts.get("generation")?.update(`GEN ${state.generationMW.toFixed(1)} MW`);
    this.readouts.get("breaker")?.update(state.breakerStatusText);
    this.readouts
      .get("share")
      ?.update(`SHARE YOU ${(state.playerSubscribedLoadShare * 100).toFixed(0)}% RIVAL ${((1 - state.playerSubscribedLoadShare) * 100).toFixed(0)}%`);
    this.readouts.get("reactor")?.update(`REACT ${state.nuclearTargetMW.toFixed(0)} MW`);
    this.readouts.get("boiler")?.update(`BOILER ${(state.thermalCapacityMW * state.thermalThrottle).toFixed(0)} MW`);
    this.readouts.get("wind")?.update(`WIND ${state.windEnabled ? "GRID" : "OFF"} ${this.windAvailableMW.toFixed(0)} MW`);
    this.readouts.get("solar")?.update(`SOLAR ${state.solarOutputMW.toFixed(0)} MW`);
    this.readouts.get("dam")?.update(`DAM ${state.waterDamMode.toUpperCase()} ${Math.max(state.damOutputMW, state.damAbsorbMW).toFixed(0)} MW`);
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
    this.forecast.animate(dt);
  }

  public debugForecastFeatures(): { hasCurrentMarker: boolean; hasRangeBand: boolean; hasForecastCurve: boolean; hasScanAnimation: boolean } {
    return this.forecast.debugFeatures();
  }

  public debugForecastAnimationPhase(): number {
    return this.forecast.debugAnimationPhase();
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
          down: (event) => this.reactorKnob.beginAdjustment(event.global),
          move: (event) => this.reactorKnob.adjustToGlobalPoint(event.global),
          up: () => this.reactorKnob.endAdjustment(),
        },
        showDebug,
      ),
      new HitZone(
        this.layout.hitZones.boiler,
        {
          down: (event) => this.boilerKnob.beginAdjustment(event.global),
          move: (event) => this.boilerKnob.adjustToGlobalPoint(event.global),
          up: () => this.boilerKnob.endAdjustment(),
        },
        showDebug,
      ),
      new HitZone(
        this.layout.hitZones.wind,
        {
          tap: () => this.windSwitch.cycleFromCenter(),
          down: (event) => this.windSwitch.beginDrag(event.global),
          move: (event) => this.windSwitch.dragTo(event.global),
          up: () => this.windSwitch.endDrag(),
        },
        showDebug,
      ),
      new HitZone(
        this.layout.hitZones.damFill,
        {
          tap: () => this.damRotary.cycleFromCenter(),
          down: (event) => this.damRotary.beginDrag(event.global),
          move: (event) => this.damRotary.dragTo(event.global),
          up: () => this.damRotary.endDrag(),
        },
        showDebug,
      ),
      new HitZone(
        this.layout.hitZones.damHold,
        {
          tap: () => this.damRotary.cycleFromCenter(),
          down: (event) => this.damRotary.beginDrag(event.global),
          move: (event) => this.damRotary.dragTo(event.global),
          up: () => this.damRotary.endDrag(),
        },
        showDebug,
      ),
      new HitZone(
        this.layout.hitZones.damDrain,
        {
          tap: () => this.damRotary.cycleFromCenter(),
          down: (event) => this.damRotary.beginDrag(event.global),
          move: (event) => this.damRotary.dragTo(event.global),
          up: () => this.damRotary.endDrag(),
        },
        showDebug,
      ),
    );
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
    const drawRect = (rect: Rect, color: number): void => {
      this.alignmentDebugLayer.addChild(
        new Graphics().rect(rect.x, rect.y, rect.w, rect.h).stroke({ color, alpha: 0.7, width: 2 }),
      );
    };
    const drawCircle = (circle: CircleLayout, color: number): void => {
      this.alignmentDebugLayer.addChild(
        new Graphics().circle(circle.x, circle.y, circle.r).stroke({ color, alpha: 0.7, width: 2 }),
      );
    };
    const drawCrosshair = (point: Point, color: number): void => {
      this.alignmentDebugLayer.addChild(
        new Graphics()
          .moveTo(point.x - 10, point.y)
          .lineTo(point.x + 10, point.y)
          .moveTo(point.x, point.y - 10)
          .lineTo(point.x, point.y + 10)
          .stroke({ color, alpha: 0.8, width: 2 }),
      );
    };

    drawRect(this.layout.forecast.plot, 0x44d7ff);
    drawCrosshair(this.layout.gauges.capacity.center, 0xff7044);
    drawCrosshair(this.layout.gauges.supplyDelta.center, 0xff7044);
    drawCrosshair(this.layout.knobs.reactor.center, 0xffd447);
    drawCrosshair(this.layout.knobs.boiler.center, 0xffd447);
    drawCrosshair(this.layout.knobs.windSwitch.center, 0xffd447);
    drawCrosshair(this.layout.knobs.dam.center, 0xffd447);
    for (const row of this.layout.upgradeRows) {
      drawRect(row.hitZone, 0xffd447);
      drawRect(row.ledStrip, 0x7aff8a);
    }
    for (const strip of Object.values(this.layout.ledStrips)) {
      drawRect(strip, 0x7aff8a);
    }
    for (const hitZone of Object.values(this.layout.hitZones)) {
      if ("r" in hitZone) {
        drawCircle(hitZone, 0x44d7ff);
      } else {
        drawRect(hitZone, 0x44d7ff);
      }
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
