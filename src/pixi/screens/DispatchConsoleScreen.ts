import { Container, Graphics, Sprite, Text } from "pixi.js";

import type { DispatchCardState, DispatchConsoleState, PlantKey, PlayerCommand, SectorKey, SectorVisualState } from "../../gameplay/types";
import type { AssetResolver, VisualAssetKey } from "../assets";
import { DESIGN_TOKENS, type DesignTokens } from "../tokens";

type Rect = { x: number; y: number; w: number; h: number };
type CommandSink = (command: PlayerCommand) => void;

const BOUNDS = {
  topStrip: { x: 36, y: 26, w: 1848, h: 98 },
  diorama: { x: 68, y: 148, w: 1784, h: 542 },
  upgrades: { x: 54, y: 730, w: 500, h: 310 },
  meter: { x: 590, y: 718, w: 650, h: 326 },
  cards: { x: 1276, y: 730, w: 592, h: 310 },
} satisfies Record<string, Rect>;

function makeLabel(text: string, size = 22, color: number = DESIGN_TOKENS.colors.inkBlack): Text {
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

function fitSprite(texture: ReturnType<AssetResolver["texture"]>, bounds: Rect, alpha = 1): Sprite | undefined {
  if (!texture) {
    return undefined;
  }

  const sprite = new Sprite(texture);
  const scale = Math.min(bounds.w / texture.width, bounds.h / texture.height);
  sprite.scale.set(scale);
  sprite.position.set(bounds.x + (bounds.w - texture.width * scale) / 2, bounds.y + (bounds.h - texture.height * scale) / 2);
  sprite.alpha = alpha;
  sprite.roundPixels = true;
  return sprite;
}

function hardwarePanel(bounds: Rect, label: string, tokens: DesignTokens): Container {
  const root = new Container();
  const g = new Graphics();
  g.roundRect(bounds.x, bounds.y, bounds.w, bounds.h, 16)
    .fill({ color: 0xd0c6a0 })
    .stroke({ color: tokens.colors.inkBlack, width: 8 })
    .roundRect(bounds.x + 12, bounds.y + 12, bounds.w - 24, bounds.h - 24, 10)
    .stroke({ color: tokens.colors.fadedOlive, width: 4, alpha: 0.9 });

  for (const [sx, sy] of [
    [bounds.x + 20, bounds.y + 20],
    [bounds.x + bounds.w - 20, bounds.y + 20],
    [bounds.x + 20, bounds.y + bounds.h - 20],
    [bounds.x + bounds.w - 20, bounds.y + bounds.h - 20],
  ]) {
    g.circle(sx, sy, 6).fill({ color: tokens.colors.inkBlack }).circle(sx - 1, sy - 1, 2).fill({ color: tokens.colors.smokeGrey });
  }

  const plaque = new Graphics().roundRect(bounds.x + 22, bounds.y + 18, Math.min(260, bounds.w - 44), 34, 4).fill({
    color: tokens.colors.paperTan,
  });
  const text = makeLabel(label, 17, tokens.colors.inkBlack);
  text.position.set(bounds.x + 34, bounds.y + 26);
  root.addChild(g, plaque, text);
  return root;
}

class TopStatusStrip extends Container {
  private readonly cash: Text;
  private readonly forecast: Text;
  private readonly incidents: Text;
  private readonly tariff: Text;

  public constructor(private readonly tokens: DesignTokens) {
    super();
    this.cash = makeLabel("", 22, tokens.colors.inkBlack);
    this.forecast = makeLabel("", 18, tokens.colors.inkBlack);
    this.incidents = makeLabel("", 18, tokens.colors.inkBlack);
    this.tariff = makeLabel("", 20, tokens.colors.inkBlack);
    const g = new Graphics()
      .roundRect(BOUNDS.topStrip.x, BOUNDS.topStrip.y, BOUNDS.topStrip.w, BOUNDS.topStrip.h, 14)
      .fill({ color: 0xd0c6a0 })
      .stroke({ color: tokens.colors.inkBlack, width: 8 })
      .rect(BOUNDS.topStrip.x + 18, BOUNDS.topStrip.y + 54, BOUNDS.topStrip.w - 36, 2)
      .fill({ color: tokens.colors.fadedOlive, alpha: 0.75 });
    this.cash.position.set(64, 52);
    this.tariff.position.set(300, 52);
    this.forecast.position.set(710, 52);
    this.incidents.position.set(1230, 52);
    this.addChild(g, this.cash, this.tariff, this.forecast, this.incidents);
  }

  public update(state: DispatchConsoleState): void {
    this.cash.text = `CASH €${state.cash.toFixed(0)}  SCORE ${state.score.toFixed(0)}`;
    this.tariff.text = `YOUR TARIFF ${(state.playerTariffCents / 10).toFixed(1)}¢/kWh  |  RIVAL ${(state.rivalTariffCents / 10).toFixed(1)}¢/kWh`;
    this.forecast.text = `FORECAST ${state.forecast.map((token) => token.label).join("  >  ")}`;
    this.incidents.text = `INCIDENTS ${
      state.incidents.length > 0 ? state.incidents.map((token) => token.label).join("  |  ") : "CLEAR  |  FOOTBALL  |  CLOUD  |  DATA"
    }`;
    this.incidents.style.fill = state.incidents.length > 0 ? this.tokens.colors.overloadRed : this.tokens.colors.inkBlack;
  }
}

class ContractSplitInstrument extends Container {
  private readonly g = new Graphics();
  private readonly labelText = makeLabel("", 18, DESIGN_TOKENS.colors.inkBlack);

  public constructor(private readonly bounds: Rect, private readonly tokens: DesignTokens) {
    super();
    this.labelText.position.set(bounds.x + 36, bounds.y + bounds.h - 58);
    this.addChild(this.g, this.labelText);
  }

  public update(state: DispatchConsoleState): void {
    const barX = this.bounds.x + 320;
    const barY = this.bounds.y + this.bounds.h - 60;
    const barW = this.bounds.w - 650;
    const currentW = barW * state.playerSubscribedLoadShare;
    const targetX = barX + barW * state.playerTargetMarketShare;
    this.labelText.text = `CONTRACT SPLIT   YOU ${(state.playerSubscribedLoadShare * 100).toFixed(0)}%   TARGET ${(state.playerTargetMarketShare * 100).toFixed(0)}%`;
    this.g
      .clear()
      .roundRect(barX - 10, barY - 12, barW + 20, 48, 8)
      .fill({ color: 0xc9bb93 })
      .stroke({ color: this.tokens.colors.inkBlack, width: 3 })
      .rect(barX, barY, barW, 24)
      .fill({ color: this.tokens.colors.inkBlack })
      .rect(barX, barY, currentW, 24)
      .fill({ color: this.tokens.colors.dataCyan })
      .rect(barX + currentW, barY, barW - currentW, 24)
      .fill({ color: this.tokens.colors.overloadRed, alpha: 0.65 })
      .rect(targetX - 4, barY - 13, 8, 50)
      .fill({ color: this.tokens.colors.paperTan })
      .stroke({ color: this.tokens.colors.inkBlack, width: 1 });
  }
}

class DioramaViewport extends Container {
  private readonly terrain = new Graphics();
  private readonly overlay = new Graphics();
  private readonly spriteLayer = new Container();
  private readonly labels: Record<SectorKey, Text>;
  private readonly plantLabels: Text[];
  private readonly split: ContractSplitInstrument;

  public constructor(private readonly bounds: Rect, private readonly tokens: DesignTokens, private readonly assets: AssetResolver) {
    super();

    this.addSceneAsset("plant_reactor", { x: bounds.x + 92, y: bounds.y + 62, w: 310, h: 174 });
    this.addSceneAsset("plant_boiler", { x: bounds.x + 200, y: bounds.y + 254, w: 320, h: 180 });
    this.addSceneAsset("city_homes_slab", { x: bounds.x + 560, y: bounds.y + 228, w: 335, h: 188 });
    this.addSceneAsset("city_homes_slab", { x: bounds.x + 662, y: bounds.y + 122, w: 300, h: 169 }, 0.96);
    this.addSceneAsset("city_services_tower", { x: bounds.x + 788, y: bounds.y + 74, w: 405, h: 228 });
    this.addSceneAsset("city_data_bunker", { x: bounds.x + 904, y: bounds.y + 248, w: 360, h: 202 });
    this.addSceneAsset("plant_water_dam", { x: bounds.x + 1320, y: bounds.y + 54, w: 384, h: 216 });
    this.addSceneAsset("plant_solar", { x: bounds.x + 1242, y: bounds.y + 292, w: 300, h: 169 });
    this.addSceneAsset("plant_wind_turbine", { x: bounds.x + 1476, y: bounds.y + 226, w: 280, h: 153 });

    this.labels = {
      homes: makeLabel("HOMES", 20, tokens.colors.inkBlack),
      services: makeLabel("SERVICES", 20, tokens.colors.inkBlack),
      dataCenters: makeLabel("DATA CENTERS", 20, tokens.colors.inkBlack),
    };
    this.labels.homes.position.set(bounds.x + 612, bounds.y + 430);
    this.labels.services.position.set(bounds.x + 900, bounds.y + 308);
    this.labels.dataCenters.position.set(bounds.x + 964, bounds.y + 462);
    this.plantLabels = [
      this.makePlaque("NUCLEAR", bounds.x + 138, bounds.y + 236),
      this.makePlaque("THERMAL", bounds.x + 258, bounds.y + 444),
      this.makePlaque("HYDRO", bounds.x + 1430, bounds.y + 278),
      this.makePlaque("SOLAR", bounds.x + 1322, bounds.y + 466),
      this.makePlaque("WIND", bounds.x + 1578, bounds.y + 388),
    ];
    this.split = new ContractSplitInstrument(bounds, tokens);
    this.addChild(this.terrain, this.spriteLayer, this.overlay, this.labels.homes, this.labels.services, this.labels.dataCenters, ...this.plantLabels, this.split);
  }

  public update(state: DispatchConsoleState): void {
    this.drawTerrain(state.timeSeconds);
    this.drawOverlays(state);
    this.split.update(state);
  }

  private addSceneAsset(key: VisualAssetKey, bounds: Rect, alpha = 1): void {
    const sprite = fitSprite(this.assets.texture(key), bounds, alpha);
    if (sprite) {
      this.spriteLayer.addChild(sprite);
    }
  }

  private makePlaque(text: string, x: number, y: number): Text {
    const label = makeLabel(text, 15, this.tokens.colors.inkBlack);
    label.position.set(x, y);
    return label;
  }

  private drawTerrain(timeSeconds: number): void {
    const pulse = 0.55 + Math.sin(timeSeconds * 3) * 0.08;
    const tileW = 136;
    const tileH = 64;
    const originX = this.bounds.x + this.bounds.w / 2 - 34;
    const originY = this.bounds.y + 88;

    this.terrain
      .clear()
      .roundRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h, 22)
      .fill({ color: 0x151911 })
      .stroke({ color: this.tokens.colors.inkBlack, width: 12 })
      .roundRect(this.bounds.x + 24, this.bounds.y + 24, this.bounds.w - 48, this.bounds.h - 88, 16)
      .fill({ color: 0x1e5bb7 })
      .stroke({ color: 0x0b0f0c, width: 8, alpha: 0.75 });

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 13; col += 1) {
        const cx = originX + (col - row) * (tileW / 2);
        const cy = originY + (col + row) * (tileH / 2);
        if (cx < this.bounds.x + 46 || cx > this.bounds.x + this.bounds.w - 46 || cy < this.bounds.y + 42 || cy > this.bounds.y + this.bounds.h - 112) {
          continue;
        }

        const water = (row <= 1 && col >= 9) || (row >= 6 && col <= 2) || (row === 0 && col <= 1);
        const road = row === 3 || col === 6 || col === 2 || col === 10;
        const plantPad = (col <= 3 && row >= 2 && row <= 6) || (col >= 9 && row >= 1 && row <= 6);
        const cityPad = col >= 4 && col <= 8 && row >= 2 && row <= 6;

        if (water) {
          this.drawIsoTile(cx, cy, tileW, tileH, 0x1b61c5, 0x123a77);
          this.drawIsoTile(cx + 4, cy + 2, tileW - 22, tileH - 12, 0x2878e6, 0x123a77, 0.42 + pulse * 0.2);
        } else if (road) {
          this.drawIsoTile(cx, cy, tileW, tileH, 0x6d7273, 0x22282a);
          this.drawRoadStripe(cx, cy, tileW, tileH, row === 3);
        } else if (plantPad) {
          this.drawIsoTile(cx, cy, tileW, tileH, 0x9b956d, 0x41412d);
          this.drawIsoTile(cx, cy + 2, tileW - 22, tileH - 10, 0xb5aa7a, 0x41412d, 0.7);
        } else if (cityPad) {
          this.drawIsoTile(cx, cy, tileW, tileH, (row + col) % 2 === 0 ? 0x43aa42 : 0x2d8e38, 0x1b5f28);
          this.drawIsoTile(cx, cy + 1, tileW - 28, tileH - 14, 0x74bd5a, 0x1b5f28, 0.36);
        } else {
          this.drawIsoTile(cx, cy, tileW, tileH, (row + col) % 2 === 0 ? 0x32a43e : 0x248235, 0x195c27);
        }
      }
    }

    this.terrain
      .rect(this.bounds.x + 82, this.bounds.y + 64, 446, 12)
      .fill({ color: 0xd4d0c2, alpha: 0.88 })
      .stroke({ color: 0x14140e, width: 2 })
      .rect(this.bounds.x + 1214, this.bounds.y + 86, 434, 12)
      .fill({ color: 0xd4d0c2, alpha: 0.88 })
      .stroke({ color: 0x14140e, width: 2 })
      .rect(this.bounds.x + 496, this.bounds.y + 242, 836, 14)
      .fill({ color: 0x35383a })
      .stroke({ color: 0x111315, width: 2 });
  }

  private drawIsoTile(cx: number, cy: number, w: number, h: number, color: number, stroke: number, alpha = 1): void {
    this.terrain
      .moveTo(cx, cy - h / 2)
      .lineTo(cx + w / 2, cy)
      .lineTo(cx, cy + h / 2)
      .lineTo(cx - w / 2, cy)
      .closePath()
      .fill({ color, alpha })
      .stroke({ color: stroke, width: 2, alpha: 0.55 });
  }

  private drawRoadStripe(cx: number, cy: number, w: number, h: number, horizontal: boolean): void {
    if (horizontal) {
      this.terrain.moveTo(cx - w / 2 + 18, cy).lineTo(cx + w / 2 - 18, cy).stroke({ color: 0xe8e0bf, width: 3, alpha: 0.82 });
      return;
    }
    this.terrain.moveTo(cx, cy - h / 2 + 10).lineTo(cx, cy + h / 2 - 10).stroke({ color: 0xe8e0bf, width: 3, alpha: 0.82 });
  }

  private drawOverlays(state: DispatchConsoleState): void {
    const pulse = 0.55 + Math.sin(state.timeSeconds * 8) * 0.22;
    this.overlay.clear();

    const overlays: Record<SectorKey, { x: number; y: number; state: SectorVisualState }> = {
      homes: { x: this.bounds.x + 640, y: this.bounds.y + 410, state: state.sectors.homes },
      services: { x: this.bounds.x + 916, y: this.bounds.y + 292, state: state.sectors.services },
      dataCenters: { x: this.bounds.x + 1000, y: this.bounds.y + 444, state: state.sectors.dataCenters },
    };

    for (const { x, y, state: sectorState } of Object.values(overlays)) {
      const lampColor = sectorState.isDemandCritical
          ? this.tokens.colors.overloadRed
          : sectorState.isSpiking
            ? this.tokens.colors.amberWarn
            : this.tokens.colors.phosphorGreen;
      this.overlay.roundRect(x - 24, y - 24, 128, 54, 8).fill({ color: 0xd0c6a0 }).stroke({ color: this.tokens.colors.inkBlack, width: 3 });
      for (let lamp = 0; lamp < 3; lamp += 1) {
        this.overlay.circle(x + lamp * 34, y, 11).fill({
          color: lamp < sectorState.demandLevel ? lampColor : this.tokens.colors.smokeGrey,
          alpha: lamp < sectorState.demandLevel ? (sectorState.isSpiking ? pulse + 0.35 : 1) : 0.45,
        });
      }
      if (sectorState.isDemandCritical) {
        this.overlay.roundRect(x - 34, y - 102, 154, 42, 6).fill({ color: this.tokens.colors.overloadRed }).stroke({
          color: this.tokens.colors.inkBlack,
          width: 3,
        });
      }
    }
  }
}

class PlantRack extends Container {
  private readonly rows = new Map<PlantKey, Text>();

  public constructor(bounds: Rect, private readonly sink: CommandSink, private readonly tokens: DesignTokens, assets: AssetResolver) {
    super();
    const entries: Array<[PlantKey, string, VisualAssetKey]> = [
      ["reactor", "REACTOR", "plant_reactor"],
      ["boiler", "BOILER", "plant_boiler"],
      ["renewables", "SOLAR/WIND", "plant_solar"],
      ["waterDam", "WATER DAM", "plant_water_dam"],
    ];

    entries.forEach(([key, label, assetKey], index) => {
      const row = new Container();
      const y = bounds.y + 62 + index * 58;
      row.eventMode = "static";
      row.cursor = "pointer";
      row.on("pointertap", () => {
        const kind = key === "reactor" ? "nuclear" : key === "boiler" ? "thermal" : key === "renewables" ? "renewable" : "waterDam";
        this.sink({ type: "buyUpgrade", playerId: "player", kind });
      });
      const hit = new Graphics().roundRect(bounds.x + 22, y, bounds.w - 44, 48, 8).fill({ color: 0xb9ad8a }).stroke({
        color: tokens.colors.inkBlack,
        width: 3,
      });
      const sprite = fitSprite(assets.texture(assetKey), { x: bounds.x + 30, y: y + 4, w: 72, h: 40 }, 1);
      const text = makeLabel(label, 17, tokens.colors.inkBlack);
      text.position.set(bounds.x + 116, y + 13);
      this.rows.set(key, text);
      row.addChild(hit);
      if (sprite) {
        row.addChild(sprite);
      }
      row.addChild(text);
      this.addChild(row);
    });
  }

  public update(state: DispatchConsoleState): void {
    for (const [key, text] of this.rows) {
      const plant = state.plants[key];
      const lamps = "●".repeat(plant.level).padEnd(3, "○");
      text.text = `${key.toUpperCase().padEnd(10)} ${lamps}  €${plant.upgradeCost.toFixed(0)}`;
      text.style.fill = plant.canAfford ? this.tokens.colors.inkBlack : this.tokens.colors.smokeGrey;
    }
  }
}

class VuGridPressureMeter extends Container {
  private readonly g = new Graphics();
  private readonly capacityFaceLabel = makeLabel("CAPACITY", 14, 0x1f1a12);
  private readonly balanceFaceLabel = makeLabel("BALANCE", 14, 0x1f1a12);
  private readonly readout: Text;
  private readonly trip: Text;

  public constructor(private readonly bounds: Rect, private readonly tokens: DesignTokens) {
    super();
    this.readout = makeLabel("", 18, tokens.colors.inkBlack);
    this.trip = makeLabel("TRIP", 34, tokens.colors.overloadRed);
    this.capacityFaceLabel.position.set(bounds.x + 130, bounds.y + 80);
    this.balanceFaceLabel.position.set(bounds.x + bounds.w - 226, bounds.y + 80);
    this.readout.position.set(bounds.x + 44, bounds.y + 262);
    this.trip.position.set(bounds.x + bounds.w - 128, bounds.y + 262);
    this.addChild(this.g, this.capacityFaceLabel, this.balanceFaceLabel, this.readout, this.trip);
  }

  public update(state: DispatchConsoleState): void {
    const danger = state.capacityZone === "tripRisk" || state.capacityZone === "trip" || state.balanceZone.includes("severe");
    const blink = danger && Math.floor(state.timeSeconds * 4) % 2 === 0;
    this.trip.visible = blink || state.capacityZone === "trip";
    this.readout.text = `CAP ${(state.capacityUtilization * 100).toFixed(0)}%  ${state.capacityZone.toUpperCase()}    BAL ${(state.supplyDemandMismatch * 100).toFixed(1)}%  ${state.balanceZone.toUpperCase()}`;
    this.g
      .clear()
      .roundRect(this.bounds.x + 18, this.bounds.y + 18, this.bounds.w - 36, this.bounds.h - 36, 14)
      .fill({ color: 0x111417 })
      .stroke({ color: 0x050607, width: 7 })
      .rect(this.bounds.x + this.bounds.w / 2 - 6, this.bounds.y + 32, 12, 224)
      .fill({ color: 0x070809 })
      .roundRect(this.bounds.x + 34, this.bounds.y + 34, this.bounds.w / 2 - 50, 206, 4)
      .fill({ color: 0xead9a8 })
      .stroke({ color: 0x463e2d, width: 5 })
      .roundRect(this.bounds.x + this.bounds.w / 2 + 18, this.bounds.y + 34, this.bounds.w / 2 - 52, 206, 4)
      .fill({ color: 0xead9a8 })
      .stroke({ color: 0x463e2d, width: 5 })
      .rect(this.bounds.x + 44, this.bounds.y + 44, this.bounds.w / 2 - 70, 26)
      .fill({ color: 0xffffff, alpha: 0.12 })
      .rect(this.bounds.x + this.bounds.w / 2 + 28, this.bounds.y + 44, this.bounds.w / 2 - 72, 26)
      .fill({ color: 0xffffff, alpha: 0.12 });

    this.drawMeterFace(this.bounds.x + 178, this.bounds.y + 202, 126, Math.min(1.25, state.capacityUtilization) / 1.25, 0.72, danger ? Math.sin(state.timeSeconds * 18) * 0.015 : 0);
    this.drawMeterFace(
      this.bounds.x + this.bounds.w - 178,
      this.bounds.y + 202,
      126,
      Math.max(0, Math.min(1, 0.5 + state.supplyDemandMismatch / 0.32)),
      0.82,
      danger ? Math.sin(state.timeSeconds * 20) * 0.018 : 0,
    );

    this.g
      .circle(this.bounds.x + this.bounds.w - 72, this.bounds.y + 70, 20)
      .fill({ color: blink ? this.tokens.colors.overloadRed : 0x3b1610 })
      .stroke({ color: 0x1b1710, width: 3 })
      .circle(this.bounds.x + 72, this.bounds.y + 70, 20)
      .fill({ color: state.balanceZone === "lock" ? this.tokens.colors.phosphorGreen : 0x3b1610 })
      .stroke({ color: 0x1b1710, width: 3 });
  }

  private drawMeterFace(cx: number, cy: number, radius: number, ratio: number, redStart: number, jitter: number): void {
    const start = Math.PI * 1.08;
    const sweep = Math.PI * 0.84;
    this.g.arc(cx, cy, radius, start, start + sweep).stroke({ color: 0x201b13, width: 4 });
    this.g.arc(cx, cy, radius, start + sweep * redStart, start + sweep).stroke({ color: this.tokens.colors.overloadRed, width: 12, alpha: 0.9 });
    for (let tick = 0; tick <= 12; tick += 1) {
      const angle = start + (tick / 12) * sweep;
      const inner = radius - (tick % 3 === 0 ? 34 : 24);
      const outer = radius + 4;
      this.g.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner).lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer).stroke({
        color: 0x201b13,
        width: tick % 3 === 0 ? 3 : 2,
      });
    }

    const needle = start + Math.max(0, Math.min(1, ratio)) * sweep + jitter;
    this.g
      .moveTo(cx - 5, cy)
      .lineTo(cx + Math.cos(needle) * (radius - 18), cy + Math.sin(needle) * (radius - 18))
      .lineTo(cx + 5, cy)
      .closePath()
      .fill({ color: 0x14100b })
      .circle(cx, cy, 13)
      .fill({ color: 0x14100b })
      .circle(cx, cy, 5)
      .fill({ color: 0xd8c792 })
      .rect(cx - 38, cy - 116, 76, 22)
      .fill({ color: 0xead9a8, alpha: 0.88 });
  }
}

class DispatchCardsPanel extends Container {
  public constructor(private readonly bounds: Rect, private readonly sink: CommandSink, private readonly tokens: DesignTokens) {
    super();
  }

  public update(state: DispatchConsoleState): void {
    this.removeChildren();
    state.cards.slice(0, 4).forEach((card, index) => this.addCard(card, index, state.timeSeconds));
  }

  private addCard(card: DispatchCardState, index: number, timeSeconds: number): void {
    const cardW = 128;
    const cardH = 222;
    const x = this.bounds.x + 26 + index * 136;
    const y = this.bounds.y + 70 + (card.state === "available" ? Math.sin(timeSeconds * 5 + index) * 3 : 8);
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
      .roundRect(x, y, cardW, cardH, 8)
      .fill({ color: card.state === "disabled" ? 0x9d957b : 0xe4d4a6 })
      .stroke({ color: card.type === "offense" ? this.tokens.colors.overloadRed : this.tokens.colors.inkBlack, width: 4 })
      .roundRect(x + 16, y + 48, cardW - 32, 64, 6)
      .fill({ color: card.type === "offense" ? 0x391412 : 0x354029 })
      .rect(x + 18, y + 178, cardW - 36, 12)
      .fill({ color: this.tokens.colors.inkBlack })
      .rect(x + 18, y + 178, (cardW - 36) * (1 - card.cooldownRatio), 12)
      .fill({ color: this.tokens.colors.phosphorGreen });
    const text = makeLabel(`${card.title}\n\n\n${card.effectText}\n${card.state.toUpperCase()}`, 13, this.tokens.colors.inkBlack);
    text.position.set(x + 12, y + 14);
    root.addChild(shell, text);
    this.addChild(root);
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
    const danger = state.capacityZone === "tripRisk" || state.capacityZone === "trip" || state.balanceZone.includes("severe");
    const alpha = danger ? 0.07 + (Math.sin(state.timeSeconds * 11) + 1) * 0.05 : 0;
    this.flash.clear().rect(0, 0, 1920, 1080).fill({ color: DESIGN_TOKENS.colors.overloadRed, alpha });
    this.stamp.visible = state.capacityZone === "trip";
  }
}

export class DispatchConsoleScreen extends Container {
  private readonly tokens = DESIGN_TOKENS;
  private readonly backgroundLayer = new Container();
  private readonly hardwareLayer = new Container();
  private readonly diorama: DioramaViewport;
  private readonly topStrip = new TopStatusStrip(this.tokens);
  private readonly upgrades: PlantRack;
  private readonly meter = new VuGridPressureMeter(BOUNDS.meter, this.tokens);
  private readonly cards: DispatchCardsPanel;
  private readonly alarmOverlayLayer = new AlarmOverlay();

  public constructor(assets: AssetResolver, sink: CommandSink) {
    super();
    this.diorama = new DioramaViewport(BOUNDS.diorama, this.tokens, assets);
    this.upgrades = new PlantRack(BOUNDS.upgrades, sink, this.tokens, assets);
    this.cards = new DispatchCardsPanel(BOUNDS.cards, sink, this.tokens);
    this.addChild(this.backgroundLayer, this.hardwareLayer, this.diorama, this.topStrip, this.upgrades, this.meter, this.cards, this.alarmOverlayLayer);
    this.drawBackground();
    this.drawHardware();
  }

  public update(state: DispatchConsoleState): void {
    this.topStrip.update(state);
    this.diorama.update(state);
    this.upgrades.update(state);
    this.meter.update(state);
    this.cards.update(state);
    this.alarmOverlayLayer.update(state);
  }

  private drawBackground(): void {
    const g = new Graphics();
    g.rect(0, 0, 1920, 1080)
      .fill({ color: 0x171a14 })
      .rect(18, 18, 1884, 1044)
      .fill({ color: 0x4b513d })
      .stroke({ color: this.tokens.colors.inkBlack, width: 18 })
      .rect(42, 700, 1836, 360)
      .fill({ color: 0x25291f, alpha: 0.9 });
    this.backgroundLayer.addChild(g);
  }

  private drawHardware(): void {
    this.hardwareLayer.addChild(
      hardwarePanel(BOUNDS.upgrades, "PLANT / UPGRADE RACK", this.tokens),
      hardwarePanel(BOUNDS.meter, "GRID PRESSURE VU", this.tokens),
      hardwarePanel(BOUNDS.cards, "DISPATCH CARDS", this.tokens),
    );
  }
}
