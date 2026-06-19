---
title: "Generation Assets and Dispatch"
type: "system"
status: "draft"
updated: "2026-06-18"
tags: ["50hz", "generation", "dispatch", "nuclear", "thermal", "renewable", "water-dam"]
summary: "Starter generation asset rules, deterministic capacity, renewable output, water dam behavior, control response, and controllable generation."
related: []
---

# Generation Assets and Dispatch

Players start with a small complete grid. Upgrades create specialization.

## Starter asset rules

Do not start the player with only one energy type. Manual gameplay requires multiple levers from the beginning.

Starting grid:

```txt
nuclear = slow deterministic baseload
thermal = fast deterministic emergency power
renewable = cheap non-deterministic solar + wind
water dam = limited buffer that can produce power if filled
grid = delivery cap for all supply
```

## Asset list

| Asset | Capacity type | Strength | Weakness |
|---|---|---|---|
| Nuclear | Deterministic | Cheap, stable | Slow to change |
| Thermal | Deterministic | Fast response | Cost/heat penalty |
| Renewable solar | Non-deterministic | Low cost | Clouds/night, surplus risk |
| Renewable wind | Non-deterministic | Low cost | Produces only in wind-speed range |
| Water dam | Conditional buffer | Instant response if filled | Needs rain or manual fill |
| Grid/network | Delivery capacity | Enables contracts/customers | Capacity overload risk |

## Recommended starting values

| System | Starting value |
|---|---:|
| Grid delivery capacity | 210 MW |
| Nuclear capacity | 35 MW |
| Thermal capacity | 45 MW |
| Renewable peak | 25 MW |
| Solar peak | 10 MW |
| Wind peak | 15 MW |
| Water dam capacity | 20 MWh |
| Water dam max power | 15 MW |
| Starting boiler throttle | 38% |
| Starting cash | 80 |

Initial demand:

```txt
total demand = 140 MW
player share = 50%
player customer load = 70 MW
deterministic max capacity = min(210, 35 + 45) = 80 MW
starting contract utilization = 70 / 80 = 87.5%
```

This means the player starts in the efficient contract-utilization zone but still must manually match real-time supply to demand.

## Physical level tables

Plant upgrades set the next explicit physical level. Do not derive new levels by adding capacity deltas.

| Track | Level 1 | Level 2 | Level 3 | Meaning |
|---|---:|---:|---:|---|
| Reactor | 35 MW | 70 MW | 105 MW | Slow deterministic baseload |
| Boiler | 45 MW | 70 MW | 95 MW | Fast deterministic peaker |
| Renewable peak | 25 MW | 40 MW | 55 MW | Non-deterministic renewable peak |
| Water dam storage | 20 MWh | 35 MWh | 50 MWh | Compressed arcade storage |
| Water dam power | 15 MW | 25 MW | 35 MW | Short-ramp buffer power |

Renewable peak is split as:

```txt
wind = 60%
solar = 40%
```

Examples:

| Renewable level | Solar peak | Wind peak | Total peak |
|---:|---:|---:|---:|
| 1 | 10 MW | 15 MW | 25 MW |
| 2 | 16 MW | 24 MW | 40 MW |
| 3 | 22 MW | 33 MW | 55 MW |

## Deterministic max capacity

Normal customers can subscribe only against deterministic max capacity.

```ts
const deterministicGenerationMW = nuclearCapacityMW + thermalCapacityMW;
const deterministicMaxCapacityMW = Math.min(gridCapacityMW, deterministicGenerationMW);
```

Renewable and dam output can help serve real-time demand, but they do not raise normal customer subscription capacity.

## Total max capacity

Fixed contracts can push the player toward total max capacity.

```ts
const totalAvailableCapacityMW =
  Math.min(
    gridCapacityMW,
    nuclearCapacityMW +
      thermalCapacityMW +
      currentRenewableOutputMW +
      waterDamMaxPowerMW
  );
```

This is high risk because renewable and dam output can disappear during the contract.

## Nuclear

Role:

```txt
cheap, slow, predictable baseload
```

Manual control:

```txt
set target output
```

Dynamics:

```ts
nuclearOutputMW = moveTowards(
  nuclearOutputMW,
  nuclearTargetMW,
  NUCLEAR_RAMP_MW_PER_SECOND * dt
);
```

Recommended:

```ts
const NUCLEAR_RAMP_MW_PER_SECOND = 15;
```

Implication:

- good for cold waves and long ramps,
- bad for sudden spikes,
- punishes late reaction.

## Thermal backup

Role:

```txt
fast emergency power
```

Manual control:

```txt
set throttle from 0% to 100%
```

Output:

```ts
thermalOutputMW = thermalCapacityMW * thermalThrottle;
```

When a boiler upgrade completes, the new maximum capacity must not increase live output instantly. Preserve the current MW output and lower `thermalThrottle` to the equivalent fraction of the new capacity. The player can then raise throttle manually.

Heat:

```ts
thermalHeat += thermalOutputMW / thermalCapacityMW * THERMAL_HEAT_GAIN_PER_SECOND * dt;
thermalHeat -= THERMAL_COOLING_PER_SECOND * dt;
thermalHeat = clamp01(thermalHeat);
```

Recommended:

```ts
const THERMAL_HEAT_GAIN_PER_SECOND = 0.07;
const THERMAL_COOLING_PER_SECOND = 0.04;
const THERMAL_OVERHEAT_THRESHOLD = 0.85;
```

Penalty:

```ts
if (thermalHeat > THERMAL_OVERHEAT_THRESHOLD) {
  thermalOutputMW *= 0.85;
}
```

## Renewable solar

Role:

```txt
cheap non-deterministic supply
```

Output:

```ts
solarPotentialMW = solarPeakMW * weatherSolarFactor;
solarOutputMW =
  solarPotentialMW < solarOutputMW
    ? solarPotentialMW
    : moveTowards(
        solarOutputMW,
        solarPotentialMW,
        (solarPeakMW / RENEWABLE_RAMP_SECONDS) * dt
      );
```

Recommended weather factors:

| Weather | Factor |
|---|---:|
| Sun | 1.00 |
| Cloud | 0.55 |
| Rain | 0.35 |
| Snow | 0.25 |
| Windy | 0.85 |
| Night | 0.00 |

Solar surplus can be used to manually fill the water dam if the dam is not full. Otherwise it can create overload risk unless curtailed.

Prototype weather should make time of day visible within the short match. The time-of-day clock advances linearly and repeats every 36 simulation seconds. With the current `0.6x` simulation speed, that is one complete day/night cycle per real-world minute.

```txt
0% cycle = dawn
25% cycle = noon
50% cycle = dusk
75% cycle = night
100% cycle = next dawn
```

Solar output is exactly `0 MW` during night. Weather conditions then multiply only the daylight solar factor, so cloud/rain/snow cannot create nighttime trickle output.

Weather front labels are not the same system as time of day. The prototype uses separate 12-second weather condition segments so sunny weather can include noon while cloud, rain, and snow still cap the panels during daylight. Bad-weather reductions cap actual solar output immediately; sunny recovery ramps upward for readability.

Recommended:

```ts
const RENEWABLE_RAMP_SECONDS = 1.5;
```

## Renewable wind

Role:

```txt
cheap supply that only works inside a wind-speed band
```

Output:

```ts
function windFactor(speedKmh: number): number {
  if (speedKmh < WIND_CUT_IN_KMH) return 0;
  if (speedKmh > WIND_CUT_OUT_KMH) return 0;
  if (speedKmh <= WIND_FULL_POWER_KMH) {
    return (speedKmh - WIND_CUT_IN_KMH) / (WIND_FULL_POWER_KMH - WIND_CUT_IN_KMH);
  }
  return 1;
}

const windPotentialMW = windPeakMW * windFactor(currentWindKmh);
const windOutputMW = moveTowards(
  windOutputMW,
  windPotentialMW,
  (windPeakMW / RENEWABLE_RAMP_SECONDS) * dt
);
```

Recommended:

```ts
const WIND_CUT_IN_KMH = 12;
const WIND_FULL_POWER_KMH = 45;
const WIND_CUT_OUT_KMH = 90;
const RENEWABLE_RAMP_SECONDS = 2.5;
```

Manual control:

```txt
wind turbine ON / OFF
```

If wind is outside the valid range, ON still produces `0 MW`. If wind is strong enough to create surplus, switching OFF can prevent overload.

Wind output should ramp down when switched off rather than disappearing instantly, so the operator sees the supply change and can react.

Wind should fluctuate every match from a seeded deterministic weather sampler. It should not stay at a flat default speed except in tests that explicitly pass a constant wind value.

Design target:

```txt
base wind speed + smooth seeded variation + short gust interpolation
```

The fluctuation should be strong enough to move turbine output during normal play, but not so chaotic that the player cannot read and react to the renewable panel.

## Water dam

Role:

```txt
limited buffer that stores water and can generate power when drained
```

State:

| State | Meaning | Available action |
|---|---|---|
| Empty | `storedWaterMWh <= 0` | cannot generate |
| Neutral | between empty and full | can fill or drain |
| Full | `storedWaterMWh >= capacityMWh` | cannot fill more |

Recommended:

```ts
const WATER_DAM_CAPACITY_MWH = 20;
const WATER_DAM_MAX_POWER_MW = 15;
const WATER_DAM_INITIAL_RATIO = 0.50;
const WATER_DAM_FILL_RAMP_MW_PER_SECOND = 30;
const WATER_DAM_DRAIN_RAMP_MW_PER_SECOND = 8;
const WATER_DAM_FILL_EFFICIENCY = 0.75;
const WATER_DAM_DRAIN_EFFICIENCY = 0.90;
const WATER_DAM_STORAGE_SECONDS_PER_MWH = 20;
const RAIN_FILL_MWH_PER_SECOND = 0.50;
const RAIN_AUTODRAIN_THRESHOLD = 0.95;
const RAIN_AUTODRAIN_POWER_RATIO = 0.25;
```

Manual fill as pump load:

```ts
const fillTargetMW = WATER_DAM_MAX_POWER_MW;
const fillMW = moveTowards(previousFillMW, fillTargetMW, WATER_DAM_FILL_RAMP_MW_PER_SECOND * dtSeconds);
storedWaterMWh +=
  fillMW *
  WATER_DAM_FILL_EFFICIENCY *
  (dtSeconds / WATER_DAM_STORAGE_SECONDS_PER_MWH);
```

Manual drain during underload:

```ts
const drainMW = Math.min(
  WATER_DAM_MAX_POWER_MW,
  storedWaterMWh / (dtSeconds / WATER_DAM_STORAGE_SECONDS_PER_MWH)
);
damOutputMW = moveTowards(
  previousDamOutputMW,
  drainMW * WATER_DAM_DRAIN_EFFICIENCY,
  WATER_DAM_DRAIN_RAMP_MW_PER_SECOND * dtSeconds
);
storedWaterMWh -=
  (damOutputMW / WATER_DAM_DRAIN_EFFICIENCY) *
  (dtSeconds / WATER_DAM_STORAGE_SECONDS_PER_MWH);
```

For the prototype, dam storage uses a deliberately compressed arcade timebase instead of real-world MWh hours. This keeps the reservoir gauge readable during a short match while preserving the tactical rule: filling actively consumes generation as pump load and draining adds power after a short readable ramp.

Rain fill:

```ts
if (rainActive) {
  storedWaterMWh += RAIN_FILL_MWH_PER_SECOND * dt;
}
```

If rain would overfill the dam, the dam auto-drains into energy production:

```ts
if (rainActive && storedWaterMWh >= WATER_DAM_CAPACITY_MWH * RAIN_AUTODRAIN_THRESHOLD) {
  damOutputMW = WATER_DAM_MAX_POWER_MW * RAIN_AUTODRAIN_POWER_RATIO;
}
```

This auto-drain is intentionally small. Full-rain overflow should be visible as a pressure relief effect without replacing the player's manual drain control.

Interpretation:

- full dam: cannot absorb overload/surplus, but can ramp into generation,
- empty dam: cannot generate, but can fill as pump load or from rain,
- neutral dam: both fill and drain are actionable.

## Controllable generation output

Simplified MVP calculation:

```ts
const generationMW =
  nuclearOutputMW +
  thermalOutputMW +
  solarOutputMW +
  windOutputMW +
  damOutputMW;
```

The production console compares `generationMW` to current demand. This is the value the player adjusts in real time.

Grid-limited delivered power can still be computed separately for delivery/cap diagnostics:

```ts
const deliveredSupplyMW = Math.min(generationMW, gridCapacityMW);
```

Do not silently correct mismatch. If controllable generation is more than 5% away from current demand, breaker risk should rise in [`08-grid-overload-and-reliability.md`](./08-grid-overload-and-reliability.md).

## Dispatch rules

The system can calculate outputs, but the player should decide targets and modes.

Allowed automation:

- smoothing ramp rates,
- clamping impossible values,
- rain filling the dam,
- rain auto-draining a full dam.

Forbidden for MVP unless explicitly chosen:

- automatic optimal dispatch that removes manual control,
- hidden emergency thermal activation,
- hidden production corrections.
