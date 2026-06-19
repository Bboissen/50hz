import { GAME_CONFIG } from "./config";
import type { DemandBreakdown, DemandLevel, DemandScheduleStep, DemandSectorKey, MatchSeed, PublicEventState } from "./types";

const DEMAND_SECTORS: DemandSectorKey[] = ["households", "business", "dataCenters"];

const BASE_DEMAND_LEVELS: Record<DemandSectorKey, DemandLevel> = {
  households: 1,
  business: 1,
  dataCenters: 1,
};

function seedHash(seed: MatchSeed): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: MatchSeed): () => number {
  let state = seedHash(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledSectors(random: () => number): DemandSectorKey[] {
  const sectors = [...DEMAND_SECTORS];
  for (let index = sectors.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [sectors[index], sectors[swapIndex]] = [sectors[swapIndex], sectors[index]];
  }
  return sectors;
}

export function generateDemandSchedule(seed: MatchSeed = GAME_CONFIG.match.defaultSeed): DemandScheduleStep[] {
  const random = createSeededRandom(seed);
  const config = GAME_CONFIG.demand;
  const stepCount = config.progressionSteps;
  const slotSpacing = (config.progressionEndSeconds - config.progressionStartSeconds) / Math.max(stepCount - 1, 1);
  const levelTwoOrder = shuffledSectors(random);
  const levelThreeOrder = shuffledSectors(random);

  return [...levelTwoOrder, ...levelThreeOrder].map((sector, index) => {
    const jitter = (random() * 2 - 1) * config.progressionJitterSeconds;
    const baseTime = config.progressionStartSeconds + slotSpacing * index;
    return {
      id: `${sector}-level-${index < DEMAND_SECTORS.length ? 2 : 3}`,
      sector,
      level: (index < DEMAND_SECTORS.length ? 2 : 3) as Exclude<DemandLevel, 1>,
      timeSeconds: Math.max(0, baseTime + jitter),
    };
  });
}

export function demandLevelsAtTime(schedule: DemandScheduleStep[], timeSeconds: number): Record<DemandSectorKey, DemandLevel> {
  return schedule.reduce(
    (levels, step) => {
      if (timeSeconds >= step.timeSeconds) {
        return {
          ...levels,
          [step.sector]: Math.max(levels[step.sector], step.level) as DemandLevel,
        };
      }
      return levels;
    },
    { ...BASE_DEMAND_LEVELS },
  );
}

function sectorDemandMW(sector: DemandSectorKey, level: DemandLevel): number {
  const sectorConfig = GAME_CONFIG.demand.sectors;
  const levelsMW =
    sector === "households"
      ? sectorConfig.householdsMW
      : sector === "business"
        ? sectorConfig.businessMW
        : sectorConfig.dataCentersMW;
  return levelsMW[level - 1];
}

function scheduledSectorDemandMW(sector: DemandSectorKey, schedule: DemandScheduleStep[], timeSeconds: number): number {
  let currentMW = sectorDemandMW(sector, 1);
  const sectorSteps = schedule
    .filter((step) => step.sector === sector)
    .sort((a, b) => a.timeSeconds - b.timeSeconds);

  for (const step of sectorSteps) {
    const targetMW = sectorDemandMW(sector, step.level);
    const rampSeconds = GAME_CONFIG.demand.progressionRampSeconds;
    const progress = rampSeconds <= 0 ? (timeSeconds >= step.timeSeconds ? 1 : 0) : (timeSeconds - step.timeSeconds) / rampSeconds;
    if (progress <= 0) {
      break;
    }
    if (progress < 1) {
      return currentMW + (targetMW - currentMW) * progress;
    }
    currentMW = targetMW;
  }

  return currentMW;
}

export function computeDemand(
  eventState: PublicEventState,
  levels: Record<DemandSectorKey, DemandLevel> = BASE_DEMAND_LEVELS,
): DemandBreakdown {
  const householdsMW = sectorDemandMW("households", levels.households) * eventState.householdMultiplier;
  const businessMW = sectorDemandMW("business", levels.business) * eventState.businessMultiplier;
  const dataCentersMW = sectorDemandMW("dataCenters", levels.dataCenters) * eventState.dataCenterMultiplier;

  return {
    householdsMW,
    businessMW,
    dataCentersMW,
    totalMW: householdsMW + businessMW + dataCentersMW,
    levels,
  };
}

export function computeScheduledDemand(
  eventState: PublicEventState,
  schedule: DemandScheduleStep[],
  timeSeconds: number,
): DemandBreakdown {
  const levels = demandLevelsAtTime(schedule, timeSeconds);
  const householdsMW = scheduledSectorDemandMW("households", schedule, timeSeconds) * eventState.householdMultiplier;
  const businessMW = scheduledSectorDemandMW("business", schedule, timeSeconds) * eventState.businessMultiplier;
  const dataCentersMW = scheduledSectorDemandMW("dataCenters", schedule, timeSeconds) * eventState.dataCenterMultiplier;

  return {
    householdsMW,
    businessMW,
    dataCentersMW,
    totalMW: householdsMW + businessMW + dataCentersMW,
    levels,
  };
}
