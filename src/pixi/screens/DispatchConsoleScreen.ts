import { Container, Graphics, Sprite, Text } from "pixi.js";

import type { PlayerCommand } from "../../gameplay/types";
import type {
  AssetResolver,
  VisualAssetKey,
} from "../assets";
import { DESIGN_TOKENS, type DesignTokens } from "../tokens";
import type { DispatchCardState, DispatchConsoleState, PlantKey, SectorKey, SectorVisualState } from "../../gameplay/types";

type Rect = { x: number; y: number; w: number; h: number };
type CommandSink = (command: PlayerCommand) => void;

const BOUNDS = {
  cash: { x: 36, y: 36, w: 225, h: 138 },
  forecast: { x: 276, y: 36, w: 750, h: 138 },
  incidents: { x: 1044, y: 36, w: 840, h: 138 },
  generation: { x: 36, y: 186, w: 285, h: 468 },
  yourTariff: { x: 336, y: 186, w: 225, h: 468 },
  city: { x: 576, y: 186, w: 750, h: 468 },
  rivalTariff: { x: 1341, y: 186, w: 225, h: 468 },
  rivalGrid: { x: 1581, y: 186, w: 303, h: 468 },
  upgrades: { x: 36, y: 672, w: 495, h: 372 },
  meter: { x: 549, y: 672, w: 672, h: 372 },
  cards: { x: 1239, y: 672, w: 645, h: 372 },
} satisfies Record<string, Rect>;

function makeLabel(text: string, size = 22, color: number = DESIGN_TOKENS.colors.paperTan): Text {
  return new Text({
    text,
    style: {
      fontFamily: DESIGN_TOKENS.typography.labelFamily,
      fontSize: size,
      fill: color,
      fontWeight: "700",
      letterSpacing: 1,
    },
  });
}

function panelFrame(bounds: Rect, label: string, tokens: DesignTokens): Container {
  const root = new Container();
  const g = new Graphics();
  g.roundRect(bounds.x, bounds.y, bounds.w, bounds.h, 8)
    .fill({ color: tokens.colors.panelGreen })
    .stroke({ color: tokens.colors.fadedOlive, width: 5 })
    .roundRect(bounds.x + 8, bounds.y + 8, bounds.w - 16, bounds.h - 16, 4)
    .stroke({ color: tokens.colors.inkBlack, width: 4, alpha: 0.8 });

  for (const [sx, sy] of [
    [bounds.x + 14, bounds.y + 14],
    [bounds.x + bounds.w - 14, bounds.y + 14],
    [bounds.x + 14, bounds.y + bounds.h - 14],
    [bounds.x + bounds.w - 14, bounds.y + bounds.h - 14],
  ]) {
    g.circle(sx, sy, 5).fill({ color: tokens.colors.inkBlack }).circle(sx - 1, sy - 1, 2).fill({ color: tokens.colors.smokeGrey });
  }

  const text = makeLabel(label, 18, tokens.colors.paperTan);
  text.position.set(bounds.x + 18, bounds.y + 12);
  root.addChild(g, text);
  return root;
}

class CashReservePanel extends Container {
  private readonly value: Text;

  public constructor(tokens: DesignTokens) {
    super();
    this.value = makeLabel("", 36, tokens.colors.phosphorGreen);
    this.value.position.set(BOUNDS.cash.x + 28, BOUNDS.cash.y + 62);
    this.addChild(this.value);
  }

  public update(state: DispatchConsoleState): void {
    this.value.text = `CASH\n€${state.cash.toFixed(0)}`;
  }
}

class TariffBoard extends Container {
  private readonly title: Text;
  private readonly price: Text;
  private readonly lamp = new Graphics();

  public constructor(label: string, private readonly bounds: Rect, private readonly tokens: DesignTokens) {
    super();
    this.title = makeLabel(label, 22, tokens.colors.paperTan);
    this.price = new Text({
      text: "",
      style: {
        fontFamily: tokens.typography.numberFamily,
        fontSize: 44,
        fill: tokens.colors.phosphorGreen,
        fontWeight: "700",
      },
    });
    this.title.position.set(bounds.x + 24, bounds.y + 52);
    this.price.position.set(bounds.x + 24, bounds.y + 150);
    this.addChild(this.title, this.price, this.lamp);
  }

  public update(tariff: number, isCheaper: boolean): void {
    this.price.text = `${(tariff / 10).toFixed(1)}¢\n/kWh`;
    this.lamp
      .clear()
      .circle(this.bounds.x + this.bounds.w - 42, this.bounds.y + 70, 14)
      .fill({ color: isCheaper ? this.tokens.colors.phosphorGreen : this.tokens.colors.smokeGrey, alpha: isCheaper ? 1 : 0.4 });
  }
}

class TimelinePanel extends Container {
  private readonly lines: Text[] = [];

  public constructor(bounds: Rect, labels: string[], private readonly tokens: DesignTokens) {
    super();
    labels.forEach((label, index) => {
      const text = makeLabel(label, index === 0 ? 20 : 18, index === 0 ? tokens.colors.paperTan : tokens.colors.phosphorGreen);
      text.position.set(bounds.x + 26 + index * (bounds.w - 52) / 4, bounds.y + (index === 0 ? 36 : 76));
      this.lines.push(text);
      this.addChild(text);
    });
  }

  public update(labels: string[], alert = false): void {
    for (let i = 1; i < this.lines.length; i += 1) {
      this.lines[i].text = labels[i - 1] ?? "-";
      this.lines[i].style.fill = alert ? this.tokens.colors.amberWarn : this.tokens.colors.phosphorGreen;
    }
  }
}

class ContractSplitBar extends Container {
  private readonly g = new Graphics();

  public constructor(private readonly bounds: Rect, private readonly tokens: DesignTokens) {
    super();
    this.addChild(this.g);
  }

  public update(currentShare: number, targetShare: number): void {
    const barX = this.bounds.x + 36;
    const barY = this.bounds.y + this.bounds.h - 78;
    const barW = this.bounds.w - 72;
    const currentW = barW * currentShare;
    const targetX = barX + barW * targetShare;
    this.g
      .clear()
      .rect(barX, barY, barW, 28)
      .fill({ color: this.tokens.colors.inkBlack })
      .rect(barX, barY, currentW, 28)
      .fill({ color: this.tokens.colors.dataCyan })
      .rect(barX + currentW, barY, barW - currentW, 28)
      .fill({ color: this.tokens.colors.overloadRed, alpha: 0.55 })
      .rect(targetX - 3, barY - 12, 6, 52)
      .fill({ color: this.tokens.colors.paperTan })
      .rect(barX, barY, barW, 28)
      .stroke({ color: this.tokens.colors.paperTan, width: 2 });
  }
}

class SectorView extends Container {
  private readonly g = new Graphics();
  private readonly labelText: Text;
  private readonly sprite?: Sprite;

  public constructor(
    label: string,
    private readonly sector: SectorKey,
    private readonly bounds: Rect,
    private readonly tokens: DesignTokens,
    private readonly assets: AssetResolver,
  ) {
    super();
    this.labelText = makeLabel(label, 18, tokens.colors.paperTan);
    this.labelText.position.set(bounds.x, bounds.y - 28);
    const assetKey: Record<SectorKey, VisualAssetKey> = {
      homes: "city_homes_slab",
      services: "city_services_tower",
      dataCenters: "city_data_bunker",
    };
    const texture = this.assets.texture(assetKey[this.sector]);
    if (texture) {
      this.sprite = new Sprite(texture);
      this.sprite.position.set(this.bounds.x, this.bounds.y);
      this.sprite.width = this.bounds.w;
      this.sprite.height = this.bounds.h * 0.62;
      this.addChild(this.sprite);
    }
    this.addChild(this.g, this.labelText);
  }

  public update(state: SectorVisualState, timeSeconds: number): void {
    const pulse = state.isSpiking ? 0.55 + Math.sin(timeSeconds * 8) * 0.25 : 0.45;
    const baseColor = this.sector === "dataCenters" ? this.tokens.colors.dataCyan : this.sector === "homes" ? this.tokens.colors.windowWarm : this.tokens.colors.phosphorGreen;
    const dangerColor = state.isDemandCritical ? this.tokens.colors.overloadRed : state.isSpiking ? this.tokens.colors.amberWarn : baseColor;
    this.g.clear();

    if (!this.sprite) {
      this.g.roundRect(this.bounds.x, this.bounds.y + 38, this.bounds.w, this.bounds.h * 0.58, 4).fill({
        color: this.tokens.colors.oxideGreen,
      });
    }

    const lightRows = this.sector === "dataCenters" ? 2 : 4;
    for (let row = 0; row < lightRows; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const active = (row + col + Math.floor(timeSeconds * (state.isSpiking ? 5 : 1))) % 3 < state.demandLevel;
        this.g.rect(this.bounds.x + 16 + col * 22, this.bounds.y + 54 + row * 22, 11, 8).fill({
          color: active ? dangerColor : this.tokens.colors.inkBlack,
          alpha: active ? pulse + 0.35 : 0.55,
        });
      }
    }

    for (let index = 0; index < 3; index += 1) {
      const active = index < state.demandLevel;
      this.g.circle(this.bounds.x + 18 + index * 24, this.bounds.y + this.bounds.h - 18, 8).fill({
        color: active ? dangerColor : this.tokens.colors.smokeGrey,
        alpha: active ? 1 : 0.35,
      });
    }

    if (state.isBrownedOut || state.isDemandCritical) {
      this.g.rect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h).fill({
        color: this.tokens.colors.overloadRed,
        alpha: state.isBrownedOut ? 0.28 : 0.14,
      });
    }
  }
}

class CityLoadWindow extends Container {
  private readonly sectors: Record<SectorKey, SectorView>;
  private readonly split: ContractSplitBar;
  private readonly title: Text;

  public constructor(bounds: Rect, tokens: DesignTokens, assets: AssetResolver) {
    super();
    this.title = makeLabel("CITY LOAD WINDOW", 22, tokens.colors.paperTan);
    this.title.position.set(bounds.x + 24, bounds.y + 28);
    this.sectors = {
      homes: new SectorView("HOMES", "homes", { x: bounds.x + 36, y: bounds.y + 106, w: 190, h: 210 }, tokens, assets),
      services: new SectorView("SERVICES", "services", { x: bounds.x + 280, y: bounds.y + 106, w: 190, h: 210 }, tokens, assets),
      dataCenters: new SectorView("DATA CENTERS", "dataCenters", { x: bounds.x + 524, y: bounds.y + 106, w: 190, h: 210 }, tokens, assets),
    };
    this.split = new ContractSplitBar(bounds, tokens);
    this.addChild(this.title, this.sectors.homes, this.sectors.services, this.sectors.dataCenters, this.split);
  }

  public update(state: DispatchConsoleState): void {
    this.sectors.homes.update(state.sectors.homes, state.timeSeconds);
    this.sectors.services.update(state.sectors.services, state.timeSeconds);
    this.sectors.dataCenters.update(state.sectors.dataCenters, state.timeSeconds);
    this.split.update(state.playerSubscribedLoadShare, state.playerTargetMarketShare);
  }
}

class GridPressureMeter extends Container {
  private readonly g = new Graphics();
  private readonly needle = new Graphics();
  private readonly readout: Text;
  private readonly trip: Text;

  public constructor(private readonly bounds: Rect, private readonly tokens: DesignTokens) {
    super();
    this.readout = makeLabel("", 20, tokens.colors.paperTan);
    this.trip = makeLabel("TRIP", 42, tokens.colors.overloadRed);
    this.readout.position.set(bounds.x + 44, bounds.y + 256);
    this.trip.position.set(bounds.x + bounds.w - 144, bounds.y + 248);
    this.needle.position.set(bounds.x + bounds.w / 2, bounds.y + 214);
    this.needle.rect(-5, -145, 10, 150).fill({ color: tokens.colors.paperTan });
    this.addChild(this.g, this.needle, this.readout, this.trip);
  }

  public update(state: DispatchConsoleState): void {
    const centerX = this.bounds.x + this.bounds.w / 2;
    const centerY = this.bounds.y + 214;
    const danger = state.capacityZone === "tripRisk" || state.capacityZone === "trip" || state.balanceZone.includes("severe");
    const blink = danger && Math.floor(state.timeSeconds * 3) % 2 === 0;
    const rotation = -1.95 + Math.min(1.2, state.capacityUtilization) * 3.25;
    this.needle.rotation = rotation + (danger ? Math.sin(state.timeSeconds * 18) * 0.025 : Math.sin(state.timeSeconds * 5) * 0.006);
    this.trip.visible = state.capacityZone === "trip" || blink;
    this.readout.text = [
      `CAPACITY ${(state.capacityUtilization * 100).toFixed(1)}% ${state.capacityZone.toUpperCase()}`,
      `BALANCE ${(state.supplyDemandMismatch * 100).toFixed(1)}% ${state.balanceZone.toUpperCase()}`,
      `SUPPLY ${state.deliveredSupplyMW.toFixed(1)}MW / LOAD ${state.currentDemandMW.toFixed(1)}MW`,
    ].join("\n");

    const balanceX = centerX + Math.max(-1, Math.min(1, state.supplyDemandMismatch / 0.2)) * 230;
    this.g
      .clear()
      .arc(centerX, centerY, 142, Math.PI * 1.05, Math.PI * 1.95)
      .stroke({ color: this.tokens.colors.fadedOlive, width: 18 })
      .arc(centerX, centerY, 142, Math.PI * 1.33, Math.PI * 1.66)
      .stroke({ color: this.tokens.colors.phosphorGreen, width: 18 })
      .arc(centerX, centerY, 142, Math.PI * 1.66, Math.PI * 1.79)
      .stroke({ color: this.tokens.colors.amberWarn, width: 18 })
      .arc(centerX, centerY, 142, Math.PI * 1.79, Math.PI * 1.95)
      .stroke({ color: this.tokens.colors.overloadRed, width: 18 })
      .circle(centerX, centerY, 18)
      .fill({ color: this.tokens.colors.paperTan })
      .rect(this.bounds.x + 64, this.bounds.y + 300, this.bounds.w - 128, 26)
      .fill({ color: this.tokens.colors.inkBlack })
      .rect(centerX - 38, this.bounds.y + 300, 76, 26)
      .fill({ color: this.tokens.colors.phosphorGreen, alpha: 0.55 })
      .circle(balanceX, this.bounds.y + 313, 16)
      .fill({ color: state.balanceZone === "lock" ? this.tokens.colors.phosphorGreen : blink ? this.tokens.colors.overloadRed : this.tokens.colors.amberWarn })
      .circle(this.bounds.x + this.bounds.w - 66, this.bounds.y + 72, 22)
      .fill({ color: blink ? this.tokens.colors.overloadRed : this.tokens.colors.inkBlack })
      .stroke({ color: this.tokens.colors.paperTan, width: 2 });
  }
}

class UpgradeRack extends Container {
  private readonly rows: Record<PlantKey, Text> = {
    reactor: makeLabel("", 19),
    boiler: makeLabel("", 19),
    renewables: makeLabel("", 19),
    waterDam: makeLabel("", 19),
  };

  public constructor(bounds: Rect, private readonly sink: CommandSink, private readonly tokens: DesignTokens) {
    super();
    const entries: Array<[PlantKey, string]> = [
      ["reactor", "REACTOR"],
      ["boiler", "BOILER"],
      ["renewables", "RENEWABLES"],
      ["waterDam", "WATER DAM"],
    ];
    entries.forEach(([key, label], index) => {
      const row = new Container();
      row.position.set(bounds.x + 24, bounds.y + 64 + index * 68);
      row.eventMode = "static";
      row.cursor = "pointer";
      row.on("pointertap", () => {
        const commandKind = key === "reactor" ? "nuclear" : key === "boiler" ? "thermal" : key === "renewables" ? "renewable" : "waterDam";
        this.sink({ type: "buyUpgrade", playerId: "player", kind: commandKind });
      });
      const hit = new Graphics().roundRect(0, 0, bounds.w - 48, 54, 6).fill({ color: tokens.colors.oxideGreen });
      const text = this.rows[key];
      text.text = label;
      text.position.set(16, 14);
      row.addChild(hit, text);
      this.addChild(row);
    });
  }

  public update(state: DispatchConsoleState): void {
    for (const key of Object.keys(this.rows) as PlantKey[]) {
      const plant = state.plants[key];
      const lamps = "■".repeat(plant.level).padEnd(3, "□");
      this.rows[key].style.fill = plant.canAfford ? this.tokens.colors.phosphorGreen : this.tokens.colors.smokeGrey;
      this.rows[key].text = `${key.toUpperCase().padEnd(10)} ${lamps} €${plant.upgradeCost.toFixed(0)}`;
    }
  }
}

class DispatchCardsPanel extends Container {
  private readonly cards = new Map<string, Text>();

  public constructor(private readonly bounds: Rect, private readonly sink: CommandSink, private readonly tokens: DesignTokens) {
    super();
  }

  public update(state: DispatchConsoleState): void {
    this.removeChildren();
    state.cards.slice(0, 5).forEach((card, index) => this.addCard(card, index, state.timeSeconds));
  }

  private addCard(card: DispatchCardState, index: number, timeSeconds: number): void {
    const cardW = 112;
    const x = this.bounds.x + 24 + index * 120;
    const y = this.bounds.y + 74 + (card.state === "cooldown" ? 10 : Math.sin(timeSeconds * 5 + index) * 2);
    const root = new Container();
    root.eventMode = card.state === "available" ? "static" : "passive";
    root.cursor = card.state === "available" ? "pointer" : "default";
    root.on("pointertap", () => {
      if (card.id === "business" || card.id === "dataCenter") {
        this.sink({ type: "acceptContract", playerId: "player", kind: card.id });
      } else {
        this.sink({ type: "playCard", playerId: "player", kind: card.id as "demandResponse" | "cloudFront" | "windStorm" });
      }
    });
    const shell = new Graphics()
      .roundRect(x, y, cardW, 212, 6)
      .fill({ color: card.state === "disabled" ? this.tokens.colors.smokeGrey : this.tokens.colors.paperTan, alpha: card.state === "cooldown" ? 0.55 : 1 })
      .stroke({ color: card.type === "offense" ? this.tokens.colors.overloadRed : this.tokens.colors.oxideGreen, width: 3 })
      .rect(x + 12, y + 132, cardW - 24, 12)
      .fill({ color: this.tokens.colors.inkBlack })
      .rect(x + 12, y + 132, (cardW - 24) * (1 - card.cooldownRatio), 12)
      .fill({ color: this.tokens.colors.phosphorGreen });
    const text = makeLabel(`${card.title}\n\n${card.effectText}\n${card.state.toUpperCase()}`, 13, this.tokens.colors.inkBlack);
    text.position.set(x + 10, y + 14);
    root.addChild(shell, text);
    this.cards.set(card.id, text);
    this.addChild(root);
  }
}

class GenerationStack extends Container {
  private readonly labelText = makeLabel("", 18);

  public constructor(bounds: Rect, private readonly title: string, private readonly dim: boolean, private readonly tokens: DesignTokens) {
    super();
    this.labelText.position.set(bounds.x + 24, bounds.y + 58);
    this.addChild(this.labelText);
  }

  public update(state: DispatchConsoleState): void {
    const color = this.dim ? this.tokens.colors.smokeGrey : this.tokens.colors.phosphorGreen;
    this.labelText.style.fill = color;
    this.labelText.text = [
      this.title,
      `REACTOR    ${"■".repeat(state.plants.reactor.level)}`,
      `BOILER     ${"■".repeat(state.plants.boiler.level)}`,
      `RENEWABLES ${"■".repeat(state.plants.renewables.level)}`,
      `WATER DAM  ${"■".repeat(state.plants.waterDam.level)}`,
    ].join("\n");
  }
}

class AlarmOverlay extends Container {
  private readonly flash = new Graphics();
  private readonly stamp = makeLabel("TRIP", 96, DESIGN_TOKENS.colors.overloadRed);

  public constructor() {
    super();
    this.stamp.position.set(780, 438);
    this.stamp.rotation = -0.12;
    this.addChild(this.flash, this.stamp);
  }

  public update(state: DispatchConsoleState): void {
    const danger = state.capacityZone === "tripRisk" || state.capacityZone === "trip" || state.balanceZone.includes("severe");
    const alpha = danger ? 0.08 + (Math.sin(state.timeSeconds * 12) + 1) * 0.06 : 0;
    this.flash.clear().rect(0, 0, 1920, 1080).fill({ color: DESIGN_TOKENS.colors.overloadRed, alpha });
    this.stamp.visible = state.capacityZone === "trip";
  }
}

export class DispatchConsoleScreen extends Container {
  private readonly tokens = DESIGN_TOKENS;
  private readonly backgroundLayer = new Container();
  private readonly panelFrameLayer = new Container();
  private readonly topAnticipationLayer = new Container();
  private readonly marketConfrontationLayer = new Container();
  private readonly operatorConsoleLayer = new Container();
  private readonly alarmOverlayLayer = new AlarmOverlay();
  private readonly cashPanel = new CashReservePanel(this.tokens);
  private readonly forecastTape = new TimelinePanel(BOUNDS.forecast, ["FORECAST TAPE", "NOW", "+15s", "+30s", "+45s"], this.tokens);
  private readonly incidentQueue = new TimelinePanel(BOUNDS.incidents, ["INCIDENT QUEUE", "NOW", "+15s", "+30s", "+45s"], this.tokens);
  private readonly yourTariff = new TariffBoard("YOUR TARIFF", BOUNDS.yourTariff, this.tokens);
  private readonly rivalTariff = new TariffBoard("RIVAL TARIFF", BOUNDS.rivalTariff, this.tokens);
  private readonly city: CityLoadWindow;
  private readonly meter = new GridPressureMeter(BOUNDS.meter, this.tokens);
  private readonly upgrades: UpgradeRack;
  private readonly cards: DispatchCardsPanel;
  private readonly yourGeneration = new GenerationStack(BOUNDS.generation, "YOUR GENERATION", false, this.tokens);
  private readonly rivalGrid = new GenerationStack(BOUNDS.rivalGrid, "RIVAL GRID", true, this.tokens);

  public constructor(assets: AssetResolver, sink: CommandSink) {
    super();
    this.city = new CityLoadWindow(BOUNDS.city, this.tokens, assets);
    this.upgrades = new UpgradeRack(BOUNDS.upgrades, sink, this.tokens);
    this.cards = new DispatchCardsPanel(BOUNDS.cards, sink, this.tokens);
    this.addChild(
      this.backgroundLayer,
      this.panelFrameLayer,
      this.topAnticipationLayer,
      this.marketConfrontationLayer,
      this.operatorConsoleLayer,
      this.alarmOverlayLayer,
    );
    this.drawBackground();
    this.drawFrames();
    this.topAnticipationLayer.addChild(this.cashPanel, this.forecastTape, this.incidentQueue);
    this.marketConfrontationLayer.addChild(this.yourGeneration, this.yourTariff, this.city, this.rivalTariff, this.rivalGrid);
    this.operatorConsoleLayer.addChild(this.upgrades, this.meter, this.cards);
  }

  public update(state: DispatchConsoleState): void {
    this.cashPanel.update(state);
    this.forecastTape.update(state.forecast.map((token) => token.label));
    this.incidentQueue.update(state.incidents.length > 0 ? state.incidents.map((token) => token.label) : ["CLEAR", "FOOTBALL", "CLOUD", "DATA"], state.incidents.length > 0);
    this.yourTariff.update(state.playerTariffCents, state.playerTariffCents < state.rivalTariffCents);
    this.rivalTariff.update(state.rivalTariffCents, state.rivalTariffCents < state.playerTariffCents);
    this.yourGeneration.update(state);
    this.rivalGrid.update(state);
    this.city.update(state);
    this.meter.update(state);
    this.upgrades.update(state);
    this.cards.update(state);
    this.alarmOverlayLayer.update(state);
  }

  private drawBackground(): void {
    const g = new Graphics();
    g.rect(0, 0, 1920, 1080)
      .fill({ color: this.tokens.colors.inkBlack })
      .rect(18, 18, 1884, 1044)
      .fill({ color: this.tokens.colors.panelGreen })
      .stroke({ color: this.tokens.colors.oxideGreen, width: 12 })
      .rect(0, 0, 1920, 1080)
      .stroke({ color: this.tokens.colors.inkBlack, width: 28 });
    this.backgroundLayer.addChild(g);
  }

  private drawFrames(): void {
    this.panelFrameLayer.addChild(
      panelFrame(BOUNDS.cash, "CASH RESERVE", this.tokens),
      panelFrame(BOUNDS.forecast, "FORECAST", this.tokens),
      panelFrame(BOUNDS.incidents, "INCIDENTS", this.tokens),
      panelFrame(BOUNDS.generation, "GENERATION", this.tokens),
      panelFrame(BOUNDS.yourTariff, "YOUR PRICE", this.tokens),
      panelFrame(BOUNDS.city, "CITY", this.tokens),
      panelFrame(BOUNDS.rivalTariff, "RIVAL PRICE", this.tokens),
      panelFrame(BOUNDS.rivalGrid, "RIVAL MONITOR", this.tokens),
      panelFrame(BOUNDS.upgrades, "UPGRADES", this.tokens),
      panelFrame(BOUNDS.meter, "GRID PRESSURE", this.tokens),
      panelFrame(BOUNDS.cards, "DISPATCH CARDS", this.tokens),
    );
  }
}
