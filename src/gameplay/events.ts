import { windFactor } from "./assets";
import { computeDemand, demandLevelsAtTime } from "./demand";
import { sampleWeather, type WeatherSample } from "./weather";
import type { AssetCapacities, DemandBreakdown, DemandScheduleStep, EventTracePoint, GenerationControls, PublicEventState, TimelineToken } from "./types";

type ScriptedEvent = {
  id: string;
  label: string;
  warningAt: number;
  impactAt: number;
  rampUpSeconds: number;
  durationSeconds: number;
  recoverySeconds: number;
};

export const DEMO_EVENTS: ScriptedEvent[] = [
  {
    id: "footballFinal",
    label: "FOOTBALL FINAL",
    warningAt: 35,
    impactAt: 42,
    rampUpSeconds: 4,
    durationSeconds: 8,
    recoverySeconds: 4,
  },
  {
    id: "cloudFront",
    label: "CLOUD FRONT",
    warningAt: 65,
    impactAt: 70,
    rampUpSeconds: 4,
    durationSeconds: 10,
    recoverySeconds: 4,
  },
  {
    id: "dataCenterBurst",
    label: "DATA CENTER BURST",
    warningAt: 90,
    impactAt: 96,
    rampUpSeconds: 4,
    durationSeconds: 7,
    recoverySeconds: 4,
  },
];

function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function eventIntensityAt(event: ScriptedEvent, timeSeconds: number): number {
  const fullImpactAt = event.impactAt + event.rampUpSeconds;
  const recoveryAt = fullImpactAt + event.durationSeconds;
  const endsAt = recoveryAt + event.recoverySeconds;

  if (timeSeconds < event.impactAt || timeSeconds >= endsAt) {
    return 0;
  }
  if (timeSeconds < fullImpactAt) {
    return smoothstep((timeSeconds - event.impactAt) / event.rampUpSeconds);
  }
  if (timeSeconds < recoveryAt) {
    return 1;
  }
  return 1 - smoothstep((timeSeconds - recoveryAt) / event.recoverySeconds);
}

function tokenForEvent(event: ScriptedEvent, timeSeconds: number): TimelineToken | undefined {
  if (timeSeconds >= event.warningAt && timeSeconds < event.impactAt) {
    return {
      id: event.id,
      label: `${event.label} WARNING`,
      phase: "warning",
      remainingSeconds: event.impactAt - timeSeconds,
      intensity: 0,
    };
  }

  const fullImpactAt = event.impactAt + event.rampUpSeconds;
  const recoveryAt = fullImpactAt + event.durationSeconds;
  if (timeSeconds >= event.impactAt && timeSeconds < recoveryAt) {
    return {
      id: event.id,
      label: event.label,
      phase: "impact",
      remainingSeconds: recoveryAt - timeSeconds,
      intensity: eventIntensityAt(event, timeSeconds),
    };
  }

  const endsAt = recoveryAt + event.recoverySeconds;
  if (timeSeconds >= recoveryAt && timeSeconds < endsAt) {
    return {
      id: event.id,
      label: `${event.label} RECOVERY`,
      phase: "recovery",
      remainingSeconds: endsAt - timeSeconds,
      intensity: eventIntensityAt(event, timeSeconds),
    };
  }

  return undefined;
}

function easedMultiplier(base: number, target: number, intensity: number): number {
  return base + (target - base) * intensity;
}

export function getPublicEventState(timeSeconds: number): PublicEventState {
  const tokens = DEMO_EVENTS.map((event) => tokenForEvent(event, timeSeconds)).filter((token): token is TimelineToken => token !== undefined);
  let householdMultiplier = 1;
  let businessMultiplier = 1;
  let dataCenterMultiplier = 1;
  let solarFactorMultiplier = 1;
  let windKmhOverride: number | undefined;

  for (const token of tokens) {
    const intensity = token.intensity ?? 0;
    if (token.id === "footballFinal" && intensity > 0) {
      householdMultiplier *= easedMultiplier(1, 1.25, intensity);
    }
    if (token.id === "cloudFront" && intensity > 0) {
      solarFactorMultiplier *= easedMultiplier(1, 0.4, intensity);
    }
    if (token.id === "dataCenterBurst" && intensity > 0) {
      dataCenterMultiplier *= easedMultiplier(1, 1.45, intensity);
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

export function forecastEventQueue(timeSeconds: number, horizonSeconds = 45): TimelineToken[] {
  return DEMO_EVENTS.flatMap((event) => {
    const activeToken = tokenForEvent(event, timeSeconds);
    if (activeToken) {
      return [activeToken];
    }

    const secondsUntilWarning = event.warningAt - timeSeconds;
    if (secondsUntilWarning >= 0 && secondsUntilWarning <= horizonSeconds) {
      return [
        {
          id: event.id,
          label: `${event.label} SOON`,
          phase: "warning" as const,
          remainingSeconds: secondsUntilWarning,
          intensity: 0,
        },
      ];
    }

    const secondsUntilImpact = event.impactAt - timeSeconds;
    if (secondsUntilImpact >= 0 && secondsUntilImpact <= horizonSeconds) {
      return [
        {
          id: event.id,
          label: `${event.label} WARNING`,
          phase: "warning" as const,
          remainingSeconds: secondsUntilImpact,
          intensity: 0,
        },
      ];
    }

    return [];
  }).sort((a, b) => a.remainingSeconds - b.remainingSeconds);
}

export function sampleEventEnvironment(args: {
  seed: string;
  demandSchedule: DemandScheduleStep[];
  timeSeconds: number;
}): {
  publicEvents: PublicEventState;
  weather: WeatherSample;
  demand: DemandBreakdown;
  solarFactor: number;
  windKmh: number;
} {
  const publicEvents = getPublicEventState(args.timeSeconds);
  const weather = sampleWeather(args.seed, args.timeSeconds);
  const eventState = {
    ...publicEvents,
    householdMultiplier: publicEvents.householdMultiplier * weather.householdDemandMultiplier,
  };
  const demand = computeDemand(eventState, demandLevelsAtTime(args.demandSchedule, args.timeSeconds));

  return {
    publicEvents,
    weather,
    demand,
    solarFactor: weather.solarFactor * publicEvents.solarFactorMultiplier,
    windKmh: publicEvents.windKmhOverride ?? weather.windKmh,
  };
}

export function buildEventTrace(args: {
  seed: string;
  demandSchedule: DemandScheduleStep[];
  timeSeconds: number;
  capacities: AssetCapacities;
  controls: GenerationControls;
}): EventTracePoint[] {
  return [0, 5, 10, 15, 20, 25, 30].map((timeOffsetSeconds) => {
    const environment = sampleEventEnvironment({
      seed: args.seed,
      demandSchedule: args.demandSchedule,
      timeSeconds: args.timeSeconds + timeOffsetSeconds,
    });
    const renewableSupplyMW =
      args.capacities.solarPeakMW * environment.solarFactor +
      (args.controls.windEnabled ? args.capacities.windPeakMW * windFactor(environment.windKmh) : 0);

    return {
      timeOffsetSeconds,
      demandMW: environment.demand.totalMW,
      renewableSupplyMW,
      eventIntensity: Math.max(0, ...environment.publicEvents.tokens.map((token) => token.intensity ?? 0)),
    };
  });
}
