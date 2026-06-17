import { GAME_CONFIG } from "./config";
import type { DemandBreakdown, PublicEventState } from "./types";

export function computeDemand(eventState: PublicEventState): DemandBreakdown {
  const householdsMW = GAME_CONFIG.demand.sectors.householdsMW * eventState.householdMultiplier;
  const businessMW = GAME_CONFIG.demand.sectors.businessMW * eventState.businessMultiplier;
  const dataCentersMW = GAME_CONFIG.demand.sectors.dataCentersMW * eventState.dataCenterMultiplier;

  return {
    householdsMW,
    businessMW,
    dataCentersMW,
    totalMW: householdsMW + businessMW + dataCentersMW + eventState.finalDemandBonusMW,
  };
}
