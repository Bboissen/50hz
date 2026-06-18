import type { GAME_CONFIG, PLAYER_IDS } from "./config";

export type PlayerId = (typeof PLAYER_IDS)[number];
export type WaterDamMode = "fill" | "hold" | "drain";
export type UpgradeKind = keyof typeof GAME_CONFIG.upgrades extends infer Key
  ? Exclude<Key, "repeatCostMultiplier">
  : never;
export type ContractKind = keyof typeof GAME_CONFIG.contracts;
export type CardKind = keyof typeof GAME_CONFIG.cards;
export type BreakerReason = "capacity-overload" | "underload" | "overload";

export type GenerationControls = {
  nuclearTargetMW: number;
  thermalThrottle: number;
  waterDamMode: WaterDamMode;
  windEnabled: boolean;
};

export type AssetCapacities = {
  gridCapacityMW: number;
  nuclearCapacityMW: number;
  thermalCapacityMW: number;
  solarPeakMW: number;
  windPeakMW: number;
  waterDamCapacityMWh: number;
  waterDamMaxPowerMW: number;
};

export type AssetRuntime = {
  nuclearOutputMW: number;
  thermalHeat: number;
  storedWaterMWh: number;
  capacityOverloadTimer: number;
  balanceBreakerTimer: number;
  breakerTrippedSeconds: number;
  breakerResetHoldSeconds: number;
  lastBreakerReason?: BreakerReason;
};

export type AssetOutputs = {
  nuclearOutputMW: number;
  thermalOutputMW: number;
  solarOutputMW: number;
  windOutputMW: number;
  damOutputMW: number;
  damAbsorbMW: number;
  rawProductionMW: number;
  deliveredSupplyMW: number;
  thermalHeat: number;
  storedWaterMWh: number;
};

export type ActiveContract = {
  id: string;
  kind: ContractKind;
  loadMW: number;
  remainingSeconds: number;
  completionCashReward: number;
  strikeScorePenalty: number;
};

export type UpgradeInProgress = {
  kind: UpgradeKind;
  remainingSeconds: number;
};

export type IncomingAttack = {
  kind: Extract<CardKind, "cloudFront" | "windStorm">;
  warningRemainingSeconds: number;
  activeRemainingSeconds: number;
};

export type PlayerState = {
  id: PlayerId;
  cash: number;
  score: number;
  strikes: number;
  subscribedLoadShare: number;
  targetMarketShare: number;
  controls: GenerationControls;
  capacities: AssetCapacities;
  runtime: AssetRuntime;
  activeContracts: ActiveContract[];
  upgradesInProgress: UpgradeInProgress[];
  upgradePurchases: Record<UpgradeKind, number>;
  cardCooldowns: Record<CardKind, number>;
  incomingAttacks: IncomingAttack[];
  demandResponseSeconds: number;
  lastCashGain: number;
  lastEfficiency: number;
  lastPrice: number;
  lastMargin: number;
  lastContractLoadMW: number;
  lastContractCapacityBasisMW: number;
  lastCurrentDemandMW: number;
  lastSupplyDemandMismatch: number;
  lastCapacityUtilization: number;
  lastOutputs: AssetOutputs;
};

export type DemandBreakdown = {
  householdsMW: number;
  businessMW: number;
  dataCentersMW: number;
  totalMW: number;
};

export type TimelineToken = {
  id: string;
  label: string;
  phase: "warning" | "impact" | "recovery";
  remainingSeconds: number;
};

export type PlantKey = "reactor" | "boiler" | "renewables" | "waterDam";
export type SectorKey = "homes" | "services" | "dataCenters";

export type PlantUpgradeState = {
  key: PlantKey;
  kind: UpgradeKind;
  label: string;
  shortLabel: string;
  level: 0 | 1 | 2 | 3;
  purchasedLevel: 0 | 1 | 2 | 3;
  maxLevel: 3;
  upgradeCost: number;
  canAfford: boolean;
  isMaxed: boolean;
  isBuilding: boolean;
  buildProgressRatio: number;
  remainingBuildSeconds: number;
  statusText: string;
  capacityLabel: string;
};

export type SectorVisualState = {
  demandLevel: 0 | 1 | 2 | 3;
  isSpiking: boolean;
  isDemandCritical: boolean;
  isBrownedOut?: boolean;
  activeEventId?: string;
};

export type DispatchCardState = {
  id: string;
  title: string;
  type: "defense" | "offense" | "fixedContract";
  effectText: string;
  state: "available" | "active" | "cooldown" | "disabled";
  cooldownRatio: number;
};

export type PublicEventState = {
  tokens: TimelineToken[];
  householdMultiplier: number;
  businessMultiplier: number;
  dataCenterMultiplier: number;
  solarFactorMultiplier: number;
  windKmhOverride?: number;
  finalDemandBonusMW: number;
};

export type MatchState = {
  timeSeconds: number;
  isPaused: boolean;
  players: Record<PlayerId, PlayerState>;
  activeEvents: TimelineToken[];
};

export type PlayerCommand =
  | { type: "setNuclearTarget"; playerId: PlayerId; targetMW: number }
  | { type: "setThermalThrottle"; playerId: PlayerId; throttle: number }
  | { type: "setWaterDamMode"; playerId: PlayerId; mode: WaterDamMode }
  | { type: "setWindEnabled"; playerId: PlayerId; enabled: boolean }
  | { type: "shedLoad"; playerId: PlayerId }
  | { type: "holdBreakerReset"; playerId: PlayerId; seconds: number }
  | { type: "buyUpgrade"; playerId: PlayerId; kind: UpgradeKind }
  | { type: "playCard"; playerId: PlayerId; kind: CardKind }
  | { type: "acceptContract"; playerId: PlayerId; kind: ContractKind }
  | { type: "pause" }
  | { type: "resume" };

export type DerivedPlayerStats = {
  efficiency: number;
  price: number;
  margin: number;
  targetMarketShare: number;
  subscribedLoadShare: number;
  currentContractLoadMW: number;
  contractCapacityBasisMW: number;
  currentDemandMW: number;
  capacityUtilization: number;
  supplyDemandMismatch: number;
  outputs: AssetOutputs;
};

export type DispatchConsoleState = {
  cash: number;
  score: number;
  strikes: number;
  timeSeconds: number;
  playerEfficiency: number;
  rivalEfficiency: number;
  playerTariffCents: number;
  rivalTariffCents: number;
  playerSubscribedLoadShare: number;
  playerTargetMarketShare: number;
  cityDemandMW: number;
  currentContractLoadMW: number;
  contractCapacityBasisMW: number;
  deterministicMaxCapacityMW: number;
  totalMaxCapacityMW: number;
  gridCapacityMW: number;
  generationMW: number;
  deliveredSupplyMW: number;
  currentDemandMW: number;
  capacityUtilization: number;
  supplyDemandMismatch: number;
  capacityZone: "idle" | "safe" | "efficient" | "strain" | "tripRisk" | "trip";
  balanceZone: "severeUnderload" | "underload" | "lock" | "overload" | "severeOverload";
  breakerTimer: number;
  activeEventLabel: string;
  plants: Record<PlantKey, PlantUpgradeState>;
  sectors: Record<SectorKey, SectorVisualState>;
  forecast: TimelineToken[];
  incidents: TimelineToken[];
  cards: DispatchCardState[];
};

export type ProductionConsoleState = DispatchConsoleState & {
  nuclearTargetMW: number;
  nuclearOutputMW: number;
  thermalThrottle: number;
  thermalHeat: number;
  thermalOutputMW: number;
  solarOutputMW: number;
  windOutputMW: number;
  damOutputMW: number;
  damAbsorbMW: number;
  storedWaterMWh: number;
  waterDamCapacityMWh: number;
  waterDamMaxPowerMW: number;
  nuclearCapacityMW: number;
  thermalCapacityMW: number;
  solarPeakMW: number;
  windPeakMW: number;
  waterDamMode: WaterDamMode;
  windEnabled: boolean;
  breakerTrippedSeconds: number;
  breakerResetProgress: number;
};

export type FinalResult = {
  winner: PlayerId | "tie";
  playerFinalScore: number;
  rivalFinalScore: number;
  playerScore: number;
  rivalScore: number;
  playerStrikes: number;
  rivalStrikes: number;
};
