import { Container, Graphics, Text } from "pixi.js";

import type {
  DispatchConsoleState,
  EventTracePoint,
  PlantKey,
  PlantUpgradeState,
  PlayerCommand,
  SectorKey,
  SectorVisualState,
} from "../../gameplay/types";
import type { AssetResolver } from "../assets";
import { DESIGN_TOKENS, type DesignTokens } from "../tokens";

type Rect = { x: number; y: number; w: number; h: number };
type CommandSink = (command: PlayerCommand) => void;

const BOUNDS = {
  topStrip: { x: 34, y: 28, w: 1852, h: 146 },
  diorama: { x: 64, y: 196, w: 1792, h: 488 },
  upgrades: { x: 54, y: 726, w: 500, h: 318 },
  meter: { x: 590, y: 710, w: 650, h: 334 },
} satisfies Record<string, Rect>;

const PIXEL = {
  black: 0x0d110e,
  shadow: 0x1a1d18,
  cockpit: 0x252a22,
  cockpitDark: 0x111711,
  road: 0x353a34,
  guard: 0x66705e,
  sky: 0xbddbc0,
  hill: 0x67855f,
  grass: 0x4c7a3e,
  paper: 0xd0c69d,
  paperLight: 0xe0d6ae,
  copper: 0x8f4b24,
  copperLight: 0xd47d34,
  screen: 0x36533d,
  screenDark: 0x15221a,
  cream: 0xf4e8bd,
  blue: 0x76c4d0,
  storm: 0x566375,
};

type TextAlign = "left" | "center" | "right";

function makeLabel(text: string, size = 18, color: number = DESIGN_TOKENS.colors.inkBlack, align: TextAlign = "left"): Text {
  return new Text({
    text,
    style: {
      fontFamily: DESIGN_TOKENS.typography.labelFamily,
      fontSize: size,
      fill: color,
      fontWeight: "700",
      align,
      letterSpacing: 0,
    },
  });
}

function addLabel(parent: Container, text: string, x: number, y: number, size = 18, color: number = DESIGN_TOKENS.colors.inkBlack): Text {
  const label = makeLabel(text, size, color);
  label.position.set(Math.round(x), Math.round(y));
  parent.addChild(label);
  return label;
}

function pixelPanel(g: Graphics, bounds: Rect, fill = PIXEL.paper): Graphics {
  g.rect(bounds.x, bounds.y, bounds.w, bounds.h)
    .fill({ color: PIXEL.black })
    .rect(bounds.x + 8, bounds.y + 8, bounds.w - 16, bounds.h - 16)
    .fill({ color: fill })
    .rect(bounds.x + 16, bounds.y + 16, bounds.w - 32, bounds.h - 32)
    .stroke({ color: 0x7c7557, width: 3 });

  for (const [x, y] of [
    [bounds.x + 18, bounds.y + 18],
    [bounds.x + bounds.w - 18, bounds.y + 18],
    [bounds.x + 18, bounds.y + bounds.h - 18],
    [bounds.x + bounds.w - 18, bounds.y + bounds.h - 18],
  ]) {
    g.rect(x - 5, y - 5, 10, 10).fill({ color: PIXEL.black }).rect(x - 2, y - 2, 4, 4).fill({ color: 0x9e9270 });
  }

  return g;
}

function drawTinyPlant(g: Graphics, key: PlantKey, x: number, y: number, scale = 3): void {
  const px = (dx: number, dy: number, w: number, h: number, color: number): void => {
    g.rect(x + dx * scale, y + dy * scale, w * scale, h * scale).fill({ color });
  };

  px(0, 14, 34, 4, 0x283029);
  if (key === "reactor") {
    px(5, 5, 7, 9, 0xbfc2b2);
    px(21, 4, 8, 10, 0xc8cab9);
    px(7, 2, 3, 2, 0xf1f1d1);
    px(24, 1, 3, 2, 0xf1f1d1);
    px(12, 9, 10, 5, 0x767d70);
  } else if (key === "boiler") {
    px(2, 10, 30, 5, 0x9a9b88);
    px(7, 5, 6, 5, 0xc7c5a7);
    px(15, 3, 4, 7, 0xb95836);
    px(22, 6, 6, 4, 0xdbd4b0);
  } else if (key === "renewables") {
    px(3, 10, 12, 5, 0x244b73);
    px(17, 9, 12, 6, 0x244b73);
    px(28, 1, 2, 13, 0xd6d9bd);
    px(23, 5, 12, 2, 0xd6d9bd);
    px(28, 0, 2, 12, 0xd6d9bd);
  } else {
    px(2, 7, 30, 8, 0x526979);
    px(7, 4, 20, 4, 0xbfc0aa);
    px(11, 9, 5, 5, 0xe5ead1);
    px(19, 9, 5, 5, 0xe5ead1);
  }
}

function drawWeatherIcon(g: Graphics, id: string, x: number, y: number, scale = 4): void {
  const key = id.toLowerCase();
  const px = (dx: number, dy: number, w: number, h: number, color: number, alpha = 1): void => {
    g.rect(x + dx * scale, y + dy * scale, w * scale, h * scale).fill({ color, alpha });
  };

  if (key.includes("cold")) {
    px(6, 0, 2, 14, 0xd9f6ff);
    px(0, 6, 14, 2, 0xd9f6ff);
    px(3, 3, 8, 8, 0x93d9f0, 0.7);
    return;
  }
  if (key.includes("wind")) {
    px(1, 3, 12, 2, 0xe4f2ff);
    px(7, 7, 10, 2, 0xb6d9ec);
    px(3, 11, 12, 2, 0xe4f2ff);
    px(13, 1, 2, 4, 0xe4f2ff);
    return;
  }
  if (key.includes("cloud")) {
    px(2, 7, 15, 5, 0xe8eef0);
    px(5, 4, 6, 4, 0xf8f5dd);
    px(11, 5, 5, 3, 0xcdd8df);
    if (key.includes("storm")) {
      px(8, 12, 2, 5, 0xffd94e);
      px(6, 16, 4, 2, 0xffd94e);
    }
    return;
  }
  if (key.includes("football")) {
    px(4, 4, 9, 9, 0xf3f0d8);
    px(7, 7, 3, 3, 0x22251e);
    return;
  }
  if (key.includes("data")) {
    px(2, 2, 13, 12, 0x28322a);
    px(4, 4, 3, 3, 0x77e7f0);
    px(9, 4, 3, 3, 0x77e7f0);
    px(4, 9, 8, 2, 0x77e7f0);
    return;
  }

  px(5, 5, 8, 8, 0xffd44f);
  px(7, 1, 4, 3, 0xffeb85);
  px(7, 14, 4, 3, 0xeaa53a);
  px(1, 7, 3, 4, 0xffeb85);
  px(14, 7, 3, 4, 0xeaa53a);
}

class ForecastTape extends Container {
  private readonly frame = new Graphics();
  private readonly dynamic = new Container();

  public constructor(private readonly bounds: Rect, private readonly tokens: DesignTokens) {
    super();
    this.addChild(this.frame, this.dynamic);
  }

  public update(state: DispatchConsoleState): void {
    const y = this.bounds.y;
    const tokens = state.forecast.length > 0 ? state.forecast : [{ id: "sun", label: "SUN", phase: "impact" as const, remainingSeconds: 0 }];
    const cellW = (this.bounds.w - 28) / 4;

    this.dynamic.removeChildren();
    this.frame
      .clear()
      .rect(this.bounds.x, y, this.bounds.w, this.bounds.h)
      .fill({ color: PIXEL.black })
      .rect(this.bounds.x + 8, y + 8, this.bounds.w - 16, this.bounds.h - 16)
      .fill({ color: PIXEL.copper })
      .rect(this.bounds.x + 14, y + 16, this.bounds.w - 28, this.bounds.h - 42)
      .fill({ color: PIXEL.screenDark })
      .rect(this.bounds.x + 14, y + this.bounds.h - 30, this.bounds.w - 28, 16)
      .fill({ color: 0x5b2a19 })
      .rect(this.bounds.x + 22, y + this.bounds.h - 26, this.bounds.w - 44, 4)
      .fill({ color: PIXEL.copperLight });

    for (let index = 0; index < 4; index += 1) {
      const x = this.bounds.x + 14 + index * cellW;
      const token = tokens[index] ?? tokens[tokens.length - 1];
      const isNow = index === 0;
      const bg = weatherBackground(token.id);
      this.frame.rect(x, y + 16, cellW, this.bounds.h - 46).fill({ color: bg });
      this.frame.rect(x, y + 16, 2, this.bounds.h - 46).fill({ color: 0xffffff, alpha: 0.18 });
      drawWeatherIcon(this.frame, token.id || token.label, x + cellW * 0.5 - 28, y + 30, 3.7);

      const bucketLabel = makeLabel(isNow ? "NOW" : `+${Math.round(token.remainingSeconds)}s`, 14, PIXEL.cream, "center");
      bucketLabel.position.set(x + 16, y + this.bounds.h - 31);
      bucketLabel.style.wordWrap = true;
      bucketLabel.style.wordWrapWidth = cellW - 32;
      this.dynamic.addChild(bucketLabel);

      const weatherLabel = makeLabel(token.label, 14, PIXEL.cream, "center");
      weatherLabel.position.set(x + 8, y + 88);
      weatherLabel.style.wordWrap = true;
      weatherLabel.style.wordWrapWidth = cellW - 16;
      this.dynamic.addChild(weatherLabel);
    }

    const arrowX = this.bounds.x + 14 + cellW * 0.5;
    this.frame
      .moveTo(arrowX - 24, y - 2)
      .lineTo(arrowX + 24, y - 2)
      .lineTo(arrowX + 24, y + 24)
      .lineTo(arrowX + 10, y + 24)
      .lineTo(arrowX, y + 40)
      .lineTo(arrowX - 10, y + 24)
      .lineTo(arrowX - 24, y + 24)
      .closePath()
      .fill({ color: this.tokens.colors.amberWarn })
      .stroke({ color: PIXEL.black, width: 4 });
  }
}

function weatherBackground(id: string): number {
  const key = id.toLowerCase();
  if (key.includes("rain")) {
    return 0x465d67;
  }
  if (key.includes("snow") || key.includes("cold")) {
    return 0x607a8e;
  }
  if (key.includes("wind")) {
    return 0x657ea1;
  }
  if (key.includes("cloud")) {
    return 0x566375;
  }
  return 0x8dcde3;
}

class TopStatusStrip extends Container {
  private readonly g = new Graphics();
  private readonly cash = makeLabel("", 21, PIXEL.cream);
  private readonly tariff = makeLabel("", 18, PIXEL.cream);
  private readonly incidents = makeLabel("", 18, PIXEL.cream);
  private readonly tape = new ForecastTape({ x: 486, y: 62, w: 760, h: 86 }, DESIGN_TOKENS);

  public constructor(private readonly tokens: DesignTokens) {
    super();
    this.cash.position.set(72, 62);
    this.tariff.position.set(72, 102);
    this.incidents.position.set(1280, 74);
    this.addChild(this.g, this.tape, this.cash, this.tariff, this.incidents);
  }

  public update(state: DispatchConsoleState): void {
    pixelPanel(this.g.clear(), BOUNDS.topStrip, 0x1d241c)
      .rect(60, 54, 380, 92)
      .fill({ color: PIXEL.screenDark })
      .stroke({ color: PIXEL.guard, width: 3 })
      .rect(1268, 54, 586, 92)
      .fill({ color: PIXEL.screenDark })
      .stroke({ color: state.incidents.length > 0 ? this.tokens.colors.overloadRed : PIXEL.guard, width: 3 });
    this.cash.text = `CASH ${state.cash.toFixed(0).padStart(3, "0")}   SCORE ${state.score.toFixed(0).padStart(4, "0")}`;
    this.tariff.text = `YOU ${(state.playerTariffCents / 10).toFixed(1)}c  RIVAL ${(state.rivalTariffCents / 10).toFixed(1)}c`;
    this.incidents.text =
      state.incidents.length > 0
        ? `INCIDENTS\n${state.incidents.map((token) => token.label).join(" / ")}`
        : "INCIDENTS\nCLEAR";
    this.incidents.style.fill = state.incidents.length > 0 ? this.tokens.colors.overloadRed : PIXEL.cream;
    this.tape.update(state);
  }
}

class EventScopePanel extends Container {
  private readonly g = new Graphics();
  private readonly labelLayer = new Container();

  public constructor(private readonly bounds: Rect, private readonly tokens: DesignTokens) {
    super();
    this.addChild(this.g, this.labelLayer);
  }

  public update(state: DispatchConsoleState): void {
    this.labelLayer.removeChildren();
    const trace = state.eventTrace.length > 0 ? state.eventTrace : this.fallbackTrace(state);
    const plot = {
      x: this.bounds.x + 22,
      y: this.bounds.y + 62,
      w: this.bounds.w - 44,
      h: this.bounds.h - 126,
    };
    const maxDemand = Math.max(1, ...trace.map((point) => point.demandMW));
    const maxSupply = Math.max(1, ...trace.map((point) => point.renewableSupplyMW));
    const demandScaleMax = Math.max(260, maxDemand * 1.08);
    const supplyScaleMax = Math.max(35, maxSupply * 1.2);
    const activeIncident = state.incidents[0];

    this.g
      .clear()
      .rect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h)
      .fill({ color: 0x101a13 })
      .stroke({ color: PIXEL.black, width: 5 })
      .rect(plot.x, plot.y, plot.w, plot.h)
      .fill({ color: 0x071108 })
      .stroke({ color: 0x4a694b, width: 2 });

    for (let index = 1; index < 4; index += 1) {
      const x = plot.x + (plot.w / 4) * index;
      this.g.moveTo(x, plot.y).lineTo(x, plot.y + plot.h).stroke({ color: 0x32553a, width: 1, alpha: 0.55 });
    }
    for (let index = 1; index < 3; index += 1) {
      const y = plot.y + (plot.h / 3) * index;
      this.g.moveTo(plot.x, y).lineTo(plot.x + plot.w, y).stroke({ color: 0x32553a, width: 1, alpha: 0.45 });
    }

    this.drawTraceLine(trace, plot, demandScaleMax, (point) => point.demandMW, this.tokens.colors.amberWarn);
    this.drawTraceLine(trace, plot, supplyScaleMax, (point) => point.renewableSupplyMW, this.tokens.colors.dataCyan);
    this.drawIntensity(trace, plot);

    this.g.rect(plot.x - 4, plot.y - 4, 8, plot.h + 8).fill({ color: PIXEL.cream });
    addLabel(this.labelLayer, "FORECAST SCOPE", this.bounds.x + 20, this.bounds.y + 18, 18, PIXEL.cream);
    addLabel(this.labelLayer, "DEMAND", this.bounds.x + 22, this.bounds.y + this.bounds.h - 48, 13, this.tokens.colors.amberWarn);
    addLabel(this.labelLayer, "SUPPLY", this.bounds.x + 114, this.bounds.y + this.bounds.h - 48, 13, this.tokens.colors.dataCyan);
    addLabel(
      this.labelLayer,
      activeIncident ? activeIncident.label : "INCIDENTS CLEAR",
      this.bounds.x + 22,
      this.bounds.y + this.bounds.h - 27,
      12,
      activeIncident ? this.tokens.colors.overloadRed : PIXEL.cream,
    );

    const current = trace[0];
    addLabel(
      this.labelLayer,
      `${current.demandMW.toFixed(0)}MW / ${current.renewableSupplyMW.toFixed(0)}MW`,
      this.bounds.x + this.bounds.w - 142,
      this.bounds.y + 20,
      13,
      PIXEL.cream,
    );
  }

  private fallbackTrace(state: DispatchConsoleState): EventTracePoint[] {
    return [{ timeOffsetSeconds: 0, demandMW: state.cityDemandMW, renewableSupplyMW: state.generationMW, eventIntensity: 0 }];
  }

  private drawTraceLine(
    trace: EventTracePoint[],
    plot: Rect,
    scaleMax: number,
    valueForPoint: (point: EventTracePoint) => number,
    color: number,
  ): void {
    trace.forEach((point, index) => {
      const x = plot.x + (point.timeOffsetSeconds / 30) * plot.w;
      const y = plot.y + plot.h - Math.min(1, valueForPoint(point) / scaleMax) * plot.h;
      if (index === 0) {
        this.g.moveTo(x, y);
      } else {
        this.g.lineTo(x, y);
      }
    });
    this.g.stroke({ color, width: 3 });
  }

  private drawIntensity(trace: EventTracePoint[], plot: Rect): void {
    if (!trace.some((point) => point.eventIntensity > 0)) {
      return;
    }
    trace.forEach((point, index) => {
      const x = plot.x + (point.timeOffsetSeconds / 30) * plot.w;
      const height = point.eventIntensity * plot.h;
      const y = plot.y + plot.h - height;
      this.g.rect(x - 5, y, 10, height).fill({ color: this.tokens.colors.overloadRed, alpha: 0.14 });
      if (index === 0 && point.eventIntensity > 0) {
        this.g.rect(plot.x, plot.y, 8, plot.h).fill({ color: this.tokens.colors.overloadRed, alpha: 0.28 });
      }
    });
  }
}

class ContractSplitInstrument extends Container {
  private readonly g = new Graphics();
  private readonly labelText = makeLabel("", 17, PIXEL.cream);

  public constructor(private readonly bounds: Rect, private readonly tokens: DesignTokens) {
    super();
    this.labelText.position.set(bounds.x + bounds.w / 2 - 242, bounds.y + bounds.h - 58);
    this.addChild(this.g, this.labelText);
  }

  public update(state: DispatchConsoleState): void {
    const barX = this.bounds.x + 430;
    const barY = this.bounds.y + this.bounds.h - 82;
    const barW = this.bounds.w - 860;
    const playerW = Math.round(barW * state.playerSubscribedLoadShare);
    const targetX = Math.round(barX + barW * state.playerTargetMarketShare);
    this.labelText.text = `CONTRACT SPLIT  YOU ${(state.playerSubscribedLoadShare * 100).toFixed(0)}%  TARGET ${(state.playerTargetMarketShare * 100).toFixed(0)}%`;
    this.g
      .clear()
      .rect(barX - 14, barY - 14, barW + 28, 54)
      .fill({ color: PIXEL.black })
      .rect(barX, barY, barW, 26)
      .fill({ color: 0x4a271f })
      .rect(barX, barY, playerW, 26)
      .fill({ color: this.tokens.colors.dataCyan })
      .rect(barX + playerW, barY, barW - playerW, 26)
      .fill({ color: this.tokens.colors.overloadRed, alpha: 0.72 })
      .rect(targetX - 3, barY - 10, 6, 46)
      .fill({ color: PIXEL.cream });
  }
}

class DioramaViewport extends Container {
  private readonly g = new Graphics();
  private readonly labelLayer = new Container();
  private readonly split: ContractSplitInstrument;
  private readonly forecastScope: EventScopePanel;

  public constructor(private readonly bounds: Rect, private readonly tokens: DesignTokens) {
    super();
    this.split = new ContractSplitInstrument(bounds, tokens);
    this.forecastScope = new EventScopePanel(
      { x: this.bounds.x + this.bounds.w - 382, y: this.bounds.y + 48, w: 330, h: 286 },
      tokens,
    );
    this.addChild(this.g, this.labelLayer, this.split, this.forecastScope);
  }

  public update(state: DispatchConsoleState): void {
    const pulse = 0.55 + Math.sin(state.timeSeconds * 7) * 0.2;
    this.labelLayer.removeChildren();
    this.drawBackdrop(state.timeSeconds);
    this.drawCitySectors(state.sectors, pulse);
    this.drawPlayerPlantSide(this.bounds.x + 34, this.bounds.y + 66, state.plants);
    this.forecastScope.update(state);
    this.split.update(state);
  }

  private drawBackdrop(timeSeconds: number): void {
    const g = this.g.clear();
    g.rect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h)
      .fill({ color: PIXEL.black })
      .rect(this.bounds.x + 12, this.bounds.y + 12, this.bounds.w - 24, this.bounds.h - 24)
      .fill({ color: 0x253027 })
      .rect(this.bounds.x + 30, this.bounds.y + 28, this.bounds.w - 60, 300)
      .fill({ color: PIXEL.sky })
      .rect(this.bounds.x + 30, this.bounds.y + 328, this.bounds.w - 60, 82)
      .fill({ color: PIXEL.road })
      .rect(this.bounds.x + 30, this.bounds.y + 410, this.bounds.w - 60, 30)
      .fill({ color: 0x222820 });

    for (let x = this.bounds.x + 30; x < this.bounds.x + this.bounds.w - 80; x += 74) {
      const hillY = this.bounds.y + 238 + Math.sin((x + timeSeconds * 12) * 0.012) * 12;
      g.rect(x, hillY, 96, 90).fill({ color: PIXEL.hill, alpha: 0.72 });
      g.rect(x + 16, hillY + 32, 84, 58).fill({ color: PIXEL.grass, alpha: 0.9 });
    }

    for (let x = this.bounds.x + 62; x < this.bounds.x + this.bounds.w - 120; x += 130) {
      g.rect(x, this.bounds.y + 366, 54, 5).fill({ color: PIXEL.cream, alpha: 0.78 });
    }
  }

  private drawCitySectors(sectors: Record<SectorKey, SectorVisualState>, pulse: number): void {
    const cityBounds: Record<SectorKey, Rect> = {
      homes: { x: this.bounds.x + 506, y: this.bounds.y + 90, w: 220, h: 210 },
      services: { x: this.bounds.x + 770, y: this.bounds.y + 54, w: 260, h: 246 },
      dataCenters: { x: this.bounds.x + 1074, y: this.bounds.y + 110, w: 236, h: 190 },
    };
    this.drawSector(cityBounds.homes, "HOMES", sectors.homes, 0xd9c18a, pulse);
    this.drawSector(cityBounds.services, "SERVICES", sectors.services, 0xc8c0a8, pulse);
    this.drawSector(cityBounds.dataCenters, "DATA", sectors.dataCenters, 0x9ab2ba, pulse);
  }

  private drawSector(bounds: Rect, label: string, state: SectorVisualState, color: number, pulse: number): void {
    const lampColor = state.isDemandCritical ? this.tokens.colors.overloadRed : state.isSpiking ? this.tokens.colors.amberWarn : this.tokens.colors.phosphorGreen;
    this.g
      .rect(bounds.x, bounds.y + bounds.h - 12, bounds.w, 12)
      .fill({ color: 0x253127 })
      .rect(bounds.x + 20, bounds.y + 56, bounds.w - 40, bounds.h - 70)
      .fill({ color })
      .stroke({ color: PIXEL.black, width: 4 });

    for (let floor = 0; floor < 4; floor += 1) {
      for (let col = 0; col < 5; col += 1) {
        const lit = (floor + col + state.demandLevel) % 3 !== 0;
        this.g.rect(bounds.x + 44 + col * 30, bounds.y + 78 + floor * 28, 14, 12).fill({ color: lit ? 0xf4e2a3 : 0x3d4640 });
      }
    }

    this.g.rect(bounds.x + 34, bounds.y + 34, bounds.w - 68, 36).fill({ color: PIXEL.screenDark }).stroke({ color: PIXEL.black, width: 3 });
    for (let i = 0; i < 3; i += 1) {
      this.g.rect(bounds.x + 54 + i * 38, bounds.y + 44, 22, 16).fill({
        color: i < state.demandLevel ? lampColor : 0x596050,
        alpha: i < state.demandLevel ? (state.isSpiking ? pulse + 0.3 : 1) : 0.55,
      });
    }
    if (state.isDemandCritical) {
      this.g.rect(bounds.x + bounds.w - 72, bounds.y + 20, 48, 28).fill({ color: this.tokens.colors.overloadRed }).stroke({ color: PIXEL.black, width: 3 });
    }
    const text = makeLabel(label, 17, PIXEL.cream);
    text.position.set(bounds.x + 42, bounds.y + bounds.h - 34);
    this.labelLayer.addChild(text);
  }

  private drawPlayerPlantSide(x: number, y: number, plants: Record<PlantKey, PlantUpgradeState>): void {
    this.g.rect(x, y, 286, 244).fill({ color: PIXEL.screenDark }).stroke({ color: PIXEL.black, width: 5 });
    const title = makeLabel("YOU", 18, PIXEL.cream);
    title.position.set(x + 18, y + 16);
    this.labelLayer.addChild(title);
    const keys: PlantKey[] = ["reactor", "boiler", "renewables", "waterDam"];
    keys.forEach((key, index) => {
      const plant = plants[key];
      const rowY = y + 48 + index * 46;
      this.g.rect(x + 18, rowY, 250, 34).fill({ color: 0x2f382f }).stroke({ color: PIXEL.black, width: 2 });
      drawTinyPlant(this.g, key, x + 26, rowY - 8, 1.8);
      this.g.rect(x + 94, rowY + 11, 138, 8).fill({ color: 0x1a241d });
      this.g.rect(x + 94, rowY + 11, Math.round(138 * (plant.level / plant.maxLevel)), 8).fill({
        color: DESIGN_TOKENS.colors.phosphorGreen,
        alpha: 0.95,
      });
      if (plant.isBuilding) {
        this.g.rect(x + 94, rowY + 24, Math.round(138 * plant.buildProgressRatio), 4).fill({
          color: DESIGN_TOKENS.colors.amberWarn,
          alpha: 0.95,
        });
      }
      const label = makeLabel(`${plant.shortLabel} ${plant.capacityLabel}`, 10, PIXEL.cream);
      label.position.set(x + 94, rowY - 1);
      this.labelLayer.addChild(label);
    });
  }

}

class PlantRack extends Container {
  private readonly rows = new Map<PlantKey, Text>();
  private readonly g = new Graphics();
  private latestPlants: Record<PlantKey, PlantUpgradeState> | undefined;

  public constructor(private readonly bounds: Rect, private readonly sink: CommandSink, private readonly tokens: DesignTokens) {
    super();
    this.addChild(this.g);
    addLabel(this, "PLANT / UPGRADE", this.bounds.x + 38, this.bounds.y + 28, 18, PIXEL.black);
    this.addRows();
  }

  public update(state: DispatchConsoleState): void {
    this.latestPlants = state.plants;
    this.g.clear();
    pixelPanel(this.g, this.bounds, PIXEL.paper);
    const entries: PlantKey[] = ["reactor", "boiler", "renewables", "waterDam"];
    entries.forEach((key, index) => {
      const y = this.bounds.y + 76 + index * 58;
      this.g
        .rect(this.bounds.x + 24, y, this.bounds.w - 48, 48)
        .fill({ color: 0xbdb28d })
        .stroke({ color: PIXEL.black, width: 3 })
        .rect(this.bounds.x + 34, y + 8, 86, 32)
        .fill({ color: 0x2d3a31 })
        .stroke({ color: 0x151711, width: 2 });
      drawTinyPlant(this.g, key, this.bounds.x + 44, y + 3, 1.8);
    });
    for (const [key, text] of this.rows) {
      const plant = state.plants[key];
      const lamps = "■".repeat(plant.level).padEnd(plant.maxLevel, "□");
      const pending = plant.purchasedLevel > plant.level ? " +" : "  ";
      text.text = `${plant.shortLabel} ${lamps}${pending} ${plant.statusText}  ${plant.capacityLabel}`;
      text.style.fill = plant.canAfford || plant.isMaxed || plant.isBuilding ? PIXEL.black : this.tokens.colors.smokeGrey;
    }
  }

  private addRows(): void {
    const entries: Array<[PlantKey, string]> = [
      ["reactor", "REACTOR"],
      ["boiler", "BOILER"],
      ["renewables", "RENEW"],
      ["waterDam", "DAM"],
    ];
    entries.forEach(([key], index) => {
      const row = new Container();
      const y = this.bounds.y + 76 + index * 58;
      row.eventMode = "static";
      row.cursor = "pointer";
      row.on("pointertap", () => {
        const plant = this.latestPlants?.[key];
        if (plant?.canAfford) {
          this.sink({ type: "buyUpgrade", playerId: "player", kind: plant.kind });
        }
      });
      row.addChild(new Graphics().rect(this.bounds.x + 24, y, this.bounds.w - 48, 48).fill({ color: 0xffffff, alpha: 0.001 }));
      const text = makeLabel("", 17, PIXEL.black);
      text.position.set(this.bounds.x + 146, y + 15);
      this.rows.set(key, text);
      this.addChild(row, text);
    });
  }
}

class VuGridPressureMeter extends Container {
  private readonly g = new Graphics();
  private readonly labelLayer = new Container();
  private readonly readout = makeLabel("", 18, PIXEL.cream);

  public constructor(private readonly bounds: Rect, private readonly tokens: DesignTokens) {
    super();
    this.readout.position.set(bounds.x + 42, bounds.y + 286);
    this.addChild(this.g, this.labelLayer, this.readout);
  }

  public update(state: DispatchConsoleState): void {
    const danger = state.capacityZone === "tripRisk" || state.capacityZone === "trip" || state.balanceZone.includes("severe");
    const blink = danger && Math.floor(state.timeSeconds * 5) % 2 === 0;
    this.labelLayer.removeChildren();
    pixelPanel(this.g.clear(), this.bounds, 0x111611);
    this.g.rect(this.bounds.x + 42, this.bounds.y + 54, 260, 196).fill({ color: PIXEL.paperLight }).stroke({ color: PIXEL.black, width: 5 });
    this.g.rect(this.bounds.x + 348, this.bounds.y + 54, 260, 196).fill({ color: PIXEL.paperLight }).stroke({ color: PIXEL.black, width: 5 });
    this.drawMeterFace(this.bounds.x + 172, this.bounds.y + 214, 112, Math.min(1.25, state.capacityUtilization) / 1.25, 0.72, danger ? Math.sin(state.timeSeconds * 18) * 0.015 : 0);
    this.drawSupplyDeltaGauge(state);
    addLabel(this.labelLayer, "CAPACITY", this.bounds.x + 108, this.bounds.y + 76, 15, PIXEL.black);
    addLabel(this.labelLayer, "SUPPLY DELTA", this.bounds.x + 388, this.bounds.y + 76, 15, PIXEL.black);
    this.g.rect(this.bounds.x + 38, this.bounds.y + 28, 36, 22).fill({ color: state.balanceZone === "lock" ? this.tokens.colors.phosphorGreen : 0x3b1610 });
    this.g.rect(this.bounds.x + this.bounds.w - 74, this.bounds.y + 28, 36, 22).fill({ color: blink ? this.tokens.colors.overloadRed : 0x3b1610 });
    this.readout.text = `CAP ${(state.capacityUtilization * 100).toFixed(0)}% ${state.capacityZone.toUpperCase()}   SUPPLY-LOAD ${this.formatSignedMw(state.generationMW - state.currentDemandMW)} (${this.formatSignedPercent(state.supplyDemandMismatch)}) ${state.balanceZone.toUpperCase()}`;
    addLabel(
      this.labelLayer,
      `${state.currentContractLoadMW.toFixed(0)}/${state.contractCapacityBasisMW.toFixed(0)}MW CONTRACT   ${state.generationMW.toFixed(0)}MW SUPPLY / ${state.currentDemandMW.toFixed(0)}MW DEMAND`,
      this.bounds.x + 54,
      this.bounds.y + 258,
      13,
      PIXEL.cream,
    );
    addLabel(
      this.labelLayer,
      `${state.breakerStatusText}   SOURCE ${state.breakerRiskSource.toUpperCase()}`,
      this.bounds.x + 54,
      this.bounds.y + 24,
      14,
      state.breakerResetRequired ? this.tokens.colors.overloadRed : PIXEL.cream,
    );
    this.drawActiveContractTickets(state);
  }

  private drawActiveContractTickets(state: DispatchConsoleState): void {
    const x = this.bounds.x + 366;
    const y = this.bounds.y + 190;
    const w = 226;
    const h = 48;
    const contracts = state.activeContracts.slice(0, 2);

    if (contracts.length === 0) {
      this.g.rect(x, y, w, h).fill({ color: 0x263026 }).stroke({ color: PIXEL.black, width: 3 });
      addLabel(this.labelLayer, "NO FIXED CONTRACT", x + 18, y + 16, 13, PIXEL.cream);
      return;
    }

    contracts.forEach((contract, index) => {
      const rowY = y + index * (h + 6);
      this.g
        .rect(x, rowY, w, h)
        .fill({ color: 0x17231c })
        .stroke({ color: this.tokens.colors.amberWarn, width: 3 })
        .rect(x + 8, rowY + 8, 42, h - 16)
        .fill({ color: this.tokens.colors.dataCyan });
      addLabel(this.labelLayer, `${contract.loadMW.toFixed(0)}MW`, x + 12, rowY + 18, 12, PIXEL.black);
      addLabel(this.labelLayer, contract.title.replace(" CONTRACT", ""), x + 62, rowY + 8, 12, PIXEL.cream);
      addLabel(this.labelLayer, `${Math.ceil(contract.remainingSeconds)}s REMAIN`, x + 62, rowY + 26, 12, this.tokens.colors.amberWarn);
    });
  }

  private drawMeterFace(cx: number, cy: number, radius: number, ratio: number, redStart: number, jitter: number): void {
    const start = Math.PI * 1.08;
    const sweep = Math.PI * 0.84;
    this.g.moveTo(cx + Math.cos(start) * radius, cy + Math.sin(start) * radius).arc(cx, cy, radius, start, start + sweep).stroke({ color: 0x201b13, width: 4 });
    const dangerStart = start + sweep * redStart;
    this.g
      .moveTo(cx + Math.cos(dangerStart) * radius, cy + Math.sin(dangerStart) * radius)
      .arc(cx, cy, radius, dangerStart, start + sweep)
      .stroke({ color: this.tokens.colors.overloadRed, width: 12, alpha: 0.9 });
    for (let tick = 0; tick <= 10; tick += 1) {
      const angle = start + (tick / 10) * sweep;
      const inner = radius - (tick % 5 === 0 ? 32 : 22);
      this.g.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner).lineTo(cx + Math.cos(angle) * (radius + 2), cy + Math.sin(angle) * (radius + 2)).stroke({
        color: 0x201b13,
        width: tick % 5 === 0 ? 3 : 2,
      });
    }
    const needle = start + Math.max(0, Math.min(1, ratio)) * sweep + jitter;
    this.g.moveTo(cx, cy).lineTo(cx + Math.cos(needle) * (radius - 16), cy + Math.sin(needle) * (radius - 16)).stroke({ color: PIXEL.black, width: 7 });
    this.g.rect(cx - 12, cy - 12, 24, 24).fill({ color: PIXEL.black }).rect(cx - 5, cy - 5, 10, 10).fill({ color: PIXEL.cream });
  }

  private drawSupplyDeltaGauge(state: DispatchConsoleState): void {
    const x = this.bounds.x + 374;
    const y = this.bounds.y + 132;
    const w = 208;
    const h = 34;
    const center = x + w / 2;
    const severe = 0.15;
    const safe = 0.05;
    const displayMax = 0.3;
    const markerX = center + Math.max(-1, Math.min(1, state.supplyDemandMismatch / displayMax)) * (w / 2);
    const jitter = state.balanceZone.includes("severe") ? Math.sin(state.timeSeconds * 22) * 4 : 0;
    const leftSafe = center - (safe / displayMax) * (w / 2);
    const rightSafe = center + (safe / displayMax) * (w / 2);
    const leftSevere = center - (severe / displayMax) * (w / 2);
    const rightSevere = center + (severe / displayMax) * (w / 2);
    const deltaMW = state.generationMW - state.currentDemandMW;

    this.g
      .rect(x, y, w, h)
      .fill({ color: 0x261510 })
      .stroke({ color: PIXEL.black, width: 4 })
      .rect(x + 4, y + 4, leftSevere - x - 4, h - 8)
      .fill({ color: this.tokens.colors.overloadRed })
      .rect(leftSevere, y + 4, leftSafe - leftSevere, h - 8)
      .fill({ color: this.tokens.colors.amberWarn })
      .rect(leftSafe, y + 4, rightSafe - leftSafe, h - 8)
      .fill({ color: this.tokens.colors.phosphorGreen })
      .rect(rightSafe, y + 4, rightSevere - rightSafe, h - 8)
      .fill({ color: this.tokens.colors.amberWarn })
      .rect(rightSevere, y + 4, x + w - 4 - rightSevere, h - 8)
      .fill({ color: this.tokens.colors.overloadRed })
      .rect(center - 2, y - 8, 4, h + 16)
      .fill({ color: PIXEL.black })
      .rect(markerX - 6 + jitter, y - 10, 12, h + 20)
      .fill({ color: PIXEL.black })
      .rect(markerX - 3 + jitter, y - 4, 6, h + 8)
      .fill({ color: PIXEL.cream });

    addLabel(this.labelLayer, "UNDER", x + 2, y + h + 10, 11, PIXEL.black);
    addLabel(this.labelLayer, "0%", center - 12, y + h + 10, 11, PIXEL.black);
    addLabel(this.labelLayer, "OVER", x + w - 42, y + h + 10, 11, PIXEL.black);
    addLabel(this.labelLayer, `SUPPLY - DEMAND ${this.formatSignedMw(deltaMW)}`, x + 4, y - 38, 13, PIXEL.black);
    addLabel(this.labelLayer, this.formatSignedPercent(state.supplyDemandMismatch), center - 24, y - 18, 12, PIXEL.black);
  }

  private formatSignedMw(value: number): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(0)}MW`;
  }

  private formatSignedPercent(value: number): string {
    const percent = value * 100;
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
  }
}

class AlarmOverlay extends Container {
  private readonly flash = new Graphics();
  private readonly stamp = makeLabel("TRIP", 116, DESIGN_TOKENS.colors.overloadRed);

  public constructor() {
    super();
    this.stamp.position.set(760, 338);
    this.stamp.rotation = -0.1;
    this.addChild(this.flash, this.stamp);
  }

  public update(state: DispatchConsoleState): void {
    const danger = state.breakerResetRequired || state.capacityZone === "tripRisk" || state.capacityZone === "trip" || state.balanceZone.includes("severe");
    const alpha = danger ? 0.07 + (Math.sin(state.timeSeconds * 11) + 1) * 0.05 : 0;
    this.flash.clear().rect(0, 0, 1920, 1080).fill({ color: DESIGN_TOKENS.colors.overloadRed, alpha });
    this.stamp.text = state.breakerResetRequired ? "RESET" : "TRIP";
    this.stamp.visible = state.breakerResetRequired || state.capacityZone === "trip";
  }
}

export class DispatchConsoleScreen extends Container {
  private readonly tokens = DESIGN_TOKENS;
  private readonly backgroundLayer = new Container();
  private readonly diorama = new DioramaViewport(BOUNDS.diorama, this.tokens);
  private readonly topStrip = new TopStatusStrip(this.tokens);
  private readonly upgrades: PlantRack;
  private readonly meter = new VuGridPressureMeter(BOUNDS.meter, this.tokens);
  private readonly alarmOverlayLayer = new AlarmOverlay();

  public constructor(_assets: AssetResolver, sink: CommandSink) {
    super();
    this.upgrades = new PlantRack(BOUNDS.upgrades, sink, this.tokens);
    this.addChild(this.backgroundLayer, this.diorama, this.topStrip, this.upgrades, this.meter, this.alarmOverlayLayer);
    this.drawBackground();
  }

  public update(state: DispatchConsoleState): void {
    this.topStrip.update(state);
    this.diorama.update(state);
    this.upgrades.update(state);
    this.meter.update(state);
    this.alarmOverlayLayer.update(state);
  }

  private drawBackground(): void {
    const g = new Graphics();
    g.rect(0, 0, 1920, 1080)
      .fill({ color: 0x11150f })
      .rect(18, 18, 1884, 1044)
      .fill({ color: 0x30382d })
      .stroke({ color: PIXEL.black, width: 16 })
      .rect(42, 702, 1836, 358)
      .fill({ color: 0x1e241d });
    for (let x = 40; x < 1880; x += 32) {
      g.rect(x, 188, 12, 6).fill({ color: 0x617059, alpha: 0.25 });
      g.rect(x, 1052, 12, 4).fill({ color: 0x617059, alpha: 0.2 });
    }
    this.backgroundLayer.addChild(g);
  }
}
