import type { DispatchConsoleState, PlayerCommand, ProductionConsoleState, UpgradeKind, WaterDamMode } from "../gameplay/types";

type DebugPanelOptions = {
  onCommand: (command: PlayerCommand) => void;
  onReset: () => void;
};

export type DebugPanel = {
  element: HTMLElement;
  update: (dispatch: DispatchConsoleState, production: ProductionConsoleState, paused: boolean) => void;
};

const upgrades: UpgradeKind[] = ["renewable", "thermal", "nuclear", "waterDam"];
const damModes: WaterDamMode[] = ["fill", "hold", "drain"];

function button(label: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
}

function labeledRange(
  label: string,
  min: number,
  max: number,
  step: number,
  onInput: (value: number) => void,
): { wrapper: HTMLLabelElement; input: HTMLInputElement } {
  const wrapper = document.createElement("label");
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.addEventListener("input", () => onInput(Number(input.value)));
  wrapper.append(label, input);
  return { wrapper, input };
}

export function createDebugPanel(options: DebugPanelOptions): DebugPanel {
  const element = document.createElement("aside");
  element.className = "debug-panel is-collapsed";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "debug-toggle";
  toggle.textContent = "DEV";
  toggle.addEventListener("click", () => {
    element.classList.toggle("is-collapsed");
  });

  const readout = document.createElement("pre");
  readout.className = "debug-readout";

  const controls = document.createElement("div");
  controls.className = "debug-controls";

  const nuclearTarget = labeledRange("Nuclear target", 0, 100, 1, (targetMW) =>
    options.onCommand({ type: "setNuclearTarget", playerId: "player", targetMW }),
  );
  const thermalThrottle = labeledRange("Thermal throttle", 0, 1, 0.01, (throttle) =>
    options.onCommand({ type: "setThermalThrottle", playerId: "player", throttle }),
  );
  controls.append(nuclearTarget.wrapper, thermalThrottle.wrapper);

  const damSelect = document.createElement("select");
  for (const mode of damModes) {
    const option = document.createElement("option");
    option.value = mode;
    option.textContent = mode.toUpperCase();
    damSelect.appendChild(option);
  }
  damSelect.addEventListener("change", () =>
    options.onCommand({ type: "setWaterDamMode", playerId: "player", mode: damSelect.value as WaterDamMode }),
  );
  const damLabel = document.createElement("label");
  damLabel.append("Dam mode", damSelect);
  controls.appendChild(damLabel);

  controls.append(
    button("Wind ON", () => options.onCommand({ type: "setWindEnabled", playerId: "player", enabled: true })),
    button("Wind OFF", () => options.onCommand({ type: "setWindEnabled", playerId: "player", enabled: false })),
    button("Underload scenario", () => {
      options.onCommand({ type: "setNuclearTarget", playerId: "player", targetMW: 0 });
      options.onCommand({ type: "setThermalThrottle", playerId: "player", throttle: 0 });
      options.onCommand({ type: "setWindEnabled", playerId: "player", enabled: false });
      options.onCommand({ type: "setWaterDamMode", playerId: "player", mode: "hold" });
    }),
    button("Overload scenario", () => {
      options.onCommand({ type: "setNuclearTarget", playerId: "player", targetMW: 100 });
      options.onCommand({ type: "setThermalThrottle", playerId: "player", throttle: 1 });
      options.onCommand({ type: "setWindEnabled", playerId: "player", enabled: true });
      options.onCommand({ type: "setWaterDamMode", playerId: "player", mode: "hold" });
    }),
    button("Capacity trip scenario", () => {
      options.onCommand({ type: "acceptContract", playerId: "player", kind: "business" });
      options.onCommand({ type: "acceptContract", playerId: "player", kind: "dataCenter" });
    }),
    button("Hold reset 2.1s", () => options.onCommand({ type: "holdBreakerReset", playerId: "player", seconds: 2.1 })),
    button("Cloud front", () => options.onCommand({ type: "playCard", playerId: "player", kind: "cloudFront" })),
    button("Wind storm", () => options.onCommand({ type: "playCard", playerId: "player", kind: "windStorm" })),
    button("Business contract", () => options.onCommand({ type: "acceptContract", playerId: "player", kind: "business" })),
    button("Data contract", () => options.onCommand({ type: "acceptContract", playerId: "player", kind: "dataCenter" })),
    button("Pause", () => options.onCommand({ type: "pause" })),
    button("Resume", () => options.onCommand({ type: "resume" })),
    button("Reset demo", options.onReset),
  );

  for (const kind of upgrades) {
    controls.appendChild(button(`Buy ${kind}`, () => options.onCommand({ type: "buyUpgrade", playerId: "player", kind })));
  }

  element.append(toggle, readout, controls);

  return {
    element,
    update: (dispatch, production, paused) => {
      nuclearTarget.input.max = String(Math.ceil(production.nuclearCapacityMW));
      damSelect.value = production.waterDamMode;
      readout.textContent = [
        `${paused ? "PAUSED" : "RUNNING"}  t=${dispatch.timeSeconds.toFixed(1)}s`,
        `cash=${dispatch.cash.toFixed(1)} score=${dispatch.score.toFixed(1)} strikes=${dispatch.strikes}`,
        `eff=${(dispatch.playerEfficiency * 100).toFixed(0)}% rival=${(dispatch.rivalEfficiency * 100).toFixed(0)}%`,
        `price=${dispatch.playerTariffCents.toFixed(1)} rival=${dispatch.rivalTariffCents.toFixed(1)}`,
        `targetShare=${(dispatch.playerTargetMarketShare * 100).toFixed(1)}% subscribed=${(dispatch.playerSubscribedLoadShare * 100).toFixed(1)}%`,
        `demand=${dispatch.currentDemandMW.toFixed(1)} supply=${dispatch.generationMW.toFixed(1)} deltaMW=${(dispatch.generationMW - dispatch.currentDemandMW).toFixed(1)} deltaPercent=${(dispatch.supplyDemandMismatch * 100).toFixed(1)}%`,
        `capacity=${(dispatch.capacityUtilization * 100).toFixed(1)}% basis=${dispatch.contractCapacityBasisMW.toFixed(1)} detMax=${dispatch.deterministicMaxCapacityMW.toFixed(1)} totalMax=${dispatch.totalMaxCapacityMW.toFixed(1)}`,
        `breaker=${dispatch.breakerTimer.toFixed(1)}s balanceTimer=${dispatch.balanceBreakerTimer.toFixed(1)}s capacityTimer=${dispatch.capacityOverloadTimer.toFixed(1)}s source=${dispatch.breakerRiskSource}`,
        `breakerState=${dispatch.breakerLifecycle} gridDown=${dispatch.isGridDown} resetRequired=${dispatch.breakerResetRequired} resetProgress=${(dispatch.breakerResetProgress * 100).toFixed(0)}% reason=${dispatch.breakerTripReason ?? "none"}`,
        `resetCost=${dispatch.breakerResetCost} canReset=${dispatch.canAffordBreakerReset} relief=${dispatch.gridShutdownReliefSeconds.toFixed(1)}s gameOver=${production.gameOverReason ?? "none"}`,
        `breakerStatus=${dispatch.breakerStatusText}`,
        `lastPenalty=cash-${dispatch.lastBreakerTripSummary?.cashPenalty ?? 0} score-${dispatch.lastBreakerTripSummary?.totalScorePenalty ?? 0} subscriberLoss=${((dispatch.lastBreakerTripSummary?.subscriberLossRatio ?? 0) * 100).toFixed(0)}%`,
        `event=${dispatch.activeEventLabel}`,
        `nuclear=${production.nuclearOutputMW.toFixed(1)}/${production.nuclearTargetMW.toFixed(1)} state=${production.plantStates.nuclear} cap=${production.nuclearCapacityMW.toFixed(1)} thermal=${(production.thermalThrottle * 100).toFixed(0)}% thermalState=${production.plantStates.thermal} cap=${production.thermalCapacityMW.toFixed(1)} heat=${(production.thermalHeat * 100).toFixed(0)}%`,
        `dam=${production.waterDamMode} state=${production.plantStates.waterDam} stored=${production.storedWaterMWh.toFixed(1)} out=${production.damOutputMW.toFixed(1)} fill=${production.damAbsorbMW.toFixed(1)} max=${production.waterDamMaxPowerMW.toFixed(1)} wind=${production.windEnabled ? "ON" : "OFF"} windState=${production.plantStates.wind} solarState=${production.plantStates.solar}`,
      ].join("\n");
    },
  };
}
