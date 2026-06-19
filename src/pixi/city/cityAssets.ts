import type { Texture } from "pixi.js";

import type { AssetResolver } from "../assets";
import type { CityLevel, CitySlotId } from "./cityTypes";
import type { CitySceneTextures } from "./CityScene";
import type { DamWaterTextures } from "./DamWaterObject";

export const CITY_LEVELS = [1, 2, 3] as const satisfies readonly CityLevel[];

export const CITY_SLOT_IDS = [
  "household",
  "business",
  "datacenter",
  "nuclear",
  "thermal",
  "solar",
  "wind",
  "dam",
] as const satisfies readonly CitySlotId[];

export type CityAssetKey =
  | "city_terrain"
  | "city_open_ai_sign"
  | "city_dam_upstream_top_mask"
  | "city_dam_upstream_side_mask"
  | "city_dam_downstream_mask"
  | `city_wind_turbine_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`
  | `city_${CitySlotId}_${CityLevel}`;

export const CITY_ASSET_SOURCES: Record<CityAssetKey, string> = {
  city_terrain: "/assets/city/background.png",
  city_open_ai_sign: "/assets/city/openAI.png",
  city_dam_upstream_top_mask: "/assets/city/power/dam/upstream_top_mask.png",
  city_dam_upstream_side_mask: "/assets/city/power/dam/mask_2.png",
  city_dam_downstream_mask: "/assets/city/power/dam/mask_3.png",
  city_wind_turbine_1: "/assets/city/power/wind/turbine_1.png",
  city_wind_turbine_2: "/assets/city/power/wind/turbine_2.png",
  city_wind_turbine_3: "/assets/city/power/wind/turbine_3.png",
  city_wind_turbine_4: "/assets/city/power/wind/turbine_4.png",
  city_wind_turbine_5: "/assets/city/power/wind/turbine_5.png",
  city_wind_turbine_6: "/assets/city/power/wind/turbine_6.png",
  city_wind_turbine_7: "/assets/city/power/wind/turbine_7.png",
  city_wind_turbine_8: "/assets/city/power/wind/turbine_8.png",
  city_household_1: "/assets/city/buildings/household/house_level_1.png",
  city_household_2: "/assets/city/buildings/household/house_level_2.png",
  city_household_3: "/assets/city/buildings/household/house_level_3.png",
  city_business_1: "/assets/city/buildings/business/business_level_1.png",
  city_business_2: "/assets/city/buildings/business/business_level_2.png",
  city_business_3: "/assets/city/buildings/business/business_level_3.png",
  city_datacenter_1: "/assets/city/buildings/datacenter/datacenter_level_1.png",
  city_datacenter_2: "/assets/city/buildings/datacenter/datacenter_level_2.png",
  city_datacenter_3: "/assets/city/buildings/datacenter/datacenter_level_3.png",
  city_nuclear_1: "/assets/city/power/nuclear/nuclear_level_1.png",
  city_nuclear_2: "/assets/city/power/nuclear/nuclear_level_2.png",
  city_nuclear_3: "/assets/city/power/nuclear/nuclear_level_3.png",
  city_thermal_1: "/assets/city/power/thermal/thermal_level_1.png",
  city_thermal_2: "/assets/city/power/thermal/thermal_level_2.png",
  city_thermal_3: "/assets/city/power/thermal/thermal_level_3.png",
  city_solar_1: "/assets/city/power/solar/solar_level_1.png",
  city_solar_2: "/assets/city/power/solar/solar_level_2.png",
  city_solar_3: "/assets/city/power/solar/solar_level_3.png",
  city_wind_1: "/assets/city/power/wind/wind_level_1.png",
  city_wind_2: "/assets/city/power/wind/wind_level_2.png",
  city_wind_3: "/assets/city/power/wind/wind_level_3.png",
  city_dam_1: "/assets/city/power/dam/dam_level_1.png",
  city_dam_2: "/assets/city/power/dam/dam_level_2.png",
  city_dam_3: "/assets/city/power/dam/dam_level_3.png",
};

export function citySceneTexturesFromResolver(assets: AssetResolver): CitySceneTextures | undefined {
  const terrain = assets.texture("city_terrain");
  const openAiSign = assets.texture("city_open_ai_sign");
  const upstreamTopMask = assets.texture("city_dam_upstream_top_mask");
  const upstreamSideMask = assets.texture("city_dam_upstream_side_mask");
  const downstreamMask = assets.texture("city_dam_downstream_mask");
  const windFrames = [1, 2, 3, 4, 5, 6, 7, 8].map((frame) =>
    assets.texture(`city_wind_turbine_${frame as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`),
  );
  if (!terrain || !openAiSign || !upstreamTopMask || !upstreamSideMask || !downstreamMask) {
    return undefined;
  }
  if (windFrames.some((texture) => texture === undefined)) {
    return undefined;
  }

  const slots = {} as Record<CitySlotId, Record<CityLevel, Texture>>;
  for (const slotId of CITY_SLOT_IDS) {
    const textures = {} as Record<CityLevel, Texture>;
    for (const level of CITY_LEVELS) {
      const texture = assets.texture(`city_${slotId}_${level}`);
      if (!texture) {
        return undefined;
      }
      textures[level] = texture;
    }
    slots[slotId] = textures;
  }

  const damWater: DamWaterTextures = {
    upstreamTopMask,
    upstreamSideMask,
    downstreamMask,
  };

  return {
    terrain,
    openAiSign,
    damWater,
    windFrames: windFrames as Texture[],
    slots,
  };
}
