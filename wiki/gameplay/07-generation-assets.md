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
| Grid delivery capacity | 90 MW |
| Nuclear capacity | 35 MW |
| Thermal capacity | 45 MW |
| Solar peak | 25 MW |
| Wind peak | 25 MW |
| Water dam capacity | 20 MWh |
| Water dam max power | 15 MW |
| Starting cash | 80 |

Initial demand:

```txt
total demand = 140 MW
player share = 50%
player customer load = 70 MW
deterministic max capacity = min(90, 35 + 45) = 80 MW
starting contract utilization = 70 / 80 = 87.5%
```

This means the player starts in the efficient contract-utilization zone but still must manually match real-time supply to demand.

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
solarOutputMW = solarPeakMW * weatherSolarFactor;
```

Recommended weather factors:

| Weather | Factor |
|---|---:|
| Clear | 1.00 |
| Normal | 0.75 |
| Cloud front | 0.30 |
| Night/dim period, if used | 0.10 |

Solar surplus can be used to manually fill the water dam if the dam is not full. Otherwise it can create overload risk unless curtailed.

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

const windOutputMW = windPeakMW * windFactor(currentWindKmh);
```

Recommended:

```ts
const WIND_CUT_IN_KMH = 12;
const WIND_FULL_POWER_KMH = 45;
const WIND_CUT_OUT_KMH = 90;
```

Manual control:

```txt
wind turbine ON / OFF
```

If wind is outside the valid range, ON still produces `0 MW`. If wind is strong enough to create surplus, switching OFF can prevent overload.

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
const WATER_DAM_FILL_EFFICIENCY = 0.75;
const WATER_DAM_DRAIN_EFFICIENCY = 0.90;
const WATER_DAM_STORAGE_SECONDS_PER_MWH = 20;
const RAIN_FILL_MWH_PER_SECOND = 0.50;
const RAIN_AUTODRAIN_THRESHOLD = 0.95;
```

Manual fill during overload / surplus:

```ts
const fillMW = Math.min(surplusMW, WATER_DAM_MAX_POWER_MW);
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
damOutputMW = drainMW * WATER_DAM_DRAIN_EFFICIENCY;
storedWaterMWh -= drainMW * (dtSeconds / WATER_DAM_STORAGE_SECONDS_PER_MWH);
```

For the prototype, dam storage uses a deliberately compressed arcade timebase instead of real-world MWh hours. This keeps the reservoir gauge readable during a short match while preserving the tactical rule: filling absorbs surplus and draining adds immediate power.

Rain fill:

```ts
if (rainActive) {
  storedWaterMWh += RAIN_FILL_MWH_PER_SECOND * dt;
}
```

If rain would overfill the dam, the dam auto-drains into energy production:

```ts
if (rainActive && storedWaterMWh >= WATER_DAM_CAPACITY_MWH * RAIN_AUTODRAIN_THRESHOLD) {
  damOutputMW = WATER_DAM_MAX_POWER_MW;
}
```

Interpretation:

- full dam: cannot absorb overload/surplus, but can generate immediately,
- empty dam: cannot generate, but can absorb overload/surplus or rain,
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
