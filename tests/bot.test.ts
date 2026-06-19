import { describe, expect, it } from "vitest";

import { chooseBotCommands } from "../src/gameplay/bot";
import { createInitialPlayerState } from "../src/gameplay/playerState";

describe("bot", () => {
  it("raises thermal output and drains dam during severe under-supply", () => {
    const rival = {
      ...createInitialPlayerState("rival"),
      controls: {
        ...createInitialPlayerState("rival").controls,
        thermalThrottle: 0.4,
      },
      lastSupplyDemandMismatch: -0.2,
    };

    const commands = chooseBotCommands(rival);

    expect(commands[0]).toMatchObject({ type: "setThermalThrottle", playerId: "rival" });
    expect(commands[0]?.type === "setThermalThrottle" ? commands[0].throttle : 0).toBeCloseTo(0.48);
    expect(commands[1]).toEqual({ type: "setWaterDamMode", playerId: "rival", mode: "drain" });
  });

  it("lowers thermal output and fills dam during severe over-supply", () => {
    const rival = {
      ...createInitialPlayerState("rival"),
      controls: {
        ...createInitialPlayerState("rival").controls,
        thermalThrottle: 0.4,
      },
      lastSupplyDemandMismatch: 0.2,
    };

    const commands = chooseBotCommands(rival);

    expect(commands[0]).toMatchObject({ type: "setThermalThrottle", playerId: "rival" });
    expect(commands[0]?.type === "setThermalThrottle" ? commands[0].throttle : 0).toBeCloseTo(0.35);
    expect(commands[1]).toEqual({ type: "setWaterDamMode", playerId: "rival", mode: "fill" });
  });
});
