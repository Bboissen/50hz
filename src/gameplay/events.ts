import type { PublicEventState, TimelineToken } from "./types";

type ScriptedEvent = {
  id: string;
  label: string;
  warningAt: number;
  impactAt: number;
  durationSeconds: number;
  recoverySeconds: number;
};

export const DEMO_EVENTS: ScriptedEvent[] = [
  { id: "footballFinal", label: "FOOTBALL FINAL", warningAt: 35, impactAt: 42, durationSeconds: 8, recoverySeconds: 4 },
  { id: "cloudFront", label: "CLOUD FRONT", warningAt: 65, impactAt: 70, durationSeconds: 10, recoverySeconds: 4 },
  { id: "dataCenterBurst", label: "DATA CENTER BURST", warningAt: 90, impactAt: 96, durationSeconds: 7, recoverySeconds: 4 },
];

function tokenForEvent(event: ScriptedEvent, timeSeconds: number): TimelineToken | undefined {
  if (timeSeconds >= event.warningAt && timeSeconds < event.impactAt) {
    return {
      id: event.id,
      label: `${event.label} WARNING`,
      phase: "warning",
      remainingSeconds: event.impactAt - timeSeconds,
    };
  }

  const recoveryAt = event.impactAt + event.durationSeconds;
  if (timeSeconds >= event.impactAt && timeSeconds < recoveryAt) {
    return {
      id: event.id,
      label: event.label,
      phase: "impact",
      remainingSeconds: recoveryAt - timeSeconds,
    };
  }

  const endsAt = recoveryAt + event.recoverySeconds;
  if (timeSeconds >= recoveryAt && timeSeconds < endsAt) {
    return {
      id: event.id,
      label: `${event.label} RECOVERY`,
      phase: "recovery",
      remainingSeconds: endsAt - timeSeconds,
    };
  }

  return undefined;
}

export function getPublicEventState(timeSeconds: number): PublicEventState {
  const tokens = DEMO_EVENTS.map((event) => tokenForEvent(event, timeSeconds)).filter((token): token is TimelineToken => token !== undefined);
  let householdMultiplier = 1;
  let businessMultiplier = 1;
  let dataCenterMultiplier = 1;
  let solarFactorMultiplier = 1;
  let windKmhOverride: number | undefined;

  for (const token of tokens) {
    if (token.id === "footballFinal" && token.phase === "impact") {
      householdMultiplier *= 1.25;
    }
    if (token.id === "cloudFront" && token.phase === "impact") {
      solarFactorMultiplier *= 0.4;
    }
    if (token.id === "dataCenterBurst" && token.phase === "impact") {
      dataCenterMultiplier *= 1.45;
    }
  }

  return {
    tokens,
    householdMultiplier,
    businessMultiplier,
    dataCenterMultiplier,
    solarFactorMultiplier,
    windKmhOverride,
  };
}
