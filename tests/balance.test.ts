import { describe, expect, it } from "vitest";

import { computeContractEfficiency } from "../src/gameplay/efficiency";
import { computeDemand } from "../src/gameplay/demand";
import { getPublicEventState } from "../src/gameplay/events";
import { deterministicMaxCapacityMW } from "../src/gameplay/efficiency";
import { createInitialPlayerState } from "../src/gameplay/playerState";

describe("demand and capacity balance", () => {
  it("starts in the efficient 70 MW over 80 MW utilization zone", () => {
    const player = createInitialPlayerState("player");
    const demand = computeDemand(getPublicEventState(0), { households: 1, business: 1, dataCenters: 1 });
    const contractLoadMW = demand.totalMW * player.subscribedLoadShare;
    const deterministicMaxMW = deterministicMaxCapacityMW(player.capacities);

    expect(contractLoadMW).toBe(70);
    expect(deterministicMaxMW).toBe(80);
    expect(computeContractEfficiency({ currentContractLoadMW: contractLoadMW, contractCapacityBasisMW: deterministicMaxMW })).toBe(1);
  });

  it("makes all-level-2 demand fit one deterministic upgrade at 50 percent share", () => {
    const demand = computeDemand(getPublicEventState(0), { households: 2, business: 2, dataCenters: 2 });
    const loadAtHalfShare = demand.totalMW * 0.5;
    const thermalLevelTwoCapacityMW = 35 + 70;

    expect(demand.totalMW).toBe(200);
    expect(loadAtHalfShare).toBe(100);
    expect(thermalLevelTwoCapacityMW).toBeGreaterThanOrEqual(loadAtHalfShare);
  });

  it("makes final all-level-3 demand fit level-2 deterministic capacity at 50 percent share", () => {
    const demand = computeDemand(getPublicEventState(0), { households: 3, business: 3, dataCenters: 3 });
    const loadAtHalfShare = demand.totalMW * 0.5;
    const levelTwoDeterministicCapacityMW = 70 + 70;

    expect(demand.totalMW).toBe(260);
    expect(loadAtHalfShare).toBe(130);
    expect(levelTwoDeterministicCapacityMW).toBeGreaterThanOrEqual(loadAtHalfShare);
  });

  it("lets full deterministic level 3 support high share while preserving overbuild penalties", () => {
    const finalDemand = computeDemand(getPublicEventState(0), { households: 3, business: 3, dataCenters: 3 });
    const fullLevelThreeDeterministicCapacityMW = 105 + 95;
    const aggressiveLoadMW = finalDemand.totalMW * 0.75;
    const efficientLoadMW = finalDemand.totalMW * 0.5;

    expect(aggressiveLoadMW).toBeLessThanOrEqual(fullLevelThreeDeterministicCapacityMW);
    expect(
      computeContractEfficiency({
        currentContractLoadMW: efficientLoadMW,
        contractCapacityBasisMW: fullLevelThreeDeterministicCapacityMW,
      }),
    ).toBeLessThan(1);
  });
});
