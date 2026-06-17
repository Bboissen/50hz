import type { PlayerCommand, PlayerState } from "./types";

export function chooseBotCommands(rival: PlayerState): PlayerCommand[] {
  const commands: PlayerCommand[] = [];

  if (rival.lastCapacityUtilization > 0.98 || Math.abs(rival.lastSupplyDemandMismatch) > 0.12) {
    commands.push({ type: "setThermalThrottle", playerId: "rival", throttle: Math.max(0.2, rival.controls.thermalThrottle - 0.05) });
    commands.push({ type: "setWaterDamMode", playerId: "rival", mode: rival.lastSupplyDemandMismatch < 0 ? "drain" : "fill" });
    return commands;
  }

  if (rival.lastSupplyDemandMismatch < -0.04) {
    commands.push({ type: "setThermalThrottle", playerId: "rival", throttle: Math.min(1, rival.controls.thermalThrottle + 0.06) });
    commands.push({ type: "setWaterDamMode", playerId: "rival", mode: "drain" });
  } else if (rival.lastSupplyDemandMismatch > 0.04) {
    commands.push({ type: "setThermalThrottle", playerId: "rival", throttle: Math.max(0, rival.controls.thermalThrottle - 0.06) });
    commands.push({ type: "setWaterDamMode", playerId: "rival", mode: "fill" });
    commands.push({ type: "setWindEnabled", playerId: "rival", enabled: false });
  } else {
    commands.push({ type: "setWaterDamMode", playerId: "rival", mode: "hold" });
    commands.push({ type: "setWindEnabled", playerId: "rival", enabled: true });
  }

  if (rival.cash >= 60 && rival.lastCapacityUtilization > 0.92 && rival.upgradesInProgress.length === 0) {
    commands.push({ type: "buyUpgrade", playerId: "rival", kind: "thermal" });
  }

  return commands;
}
