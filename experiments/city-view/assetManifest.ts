import terrainUrl from "../../assets/city/background.png?url";
import householdLevel1Url from "../../assets/city/buildings/household/house_level_1.png?url";
import householdLevel2Url from "../../assets/city/buildings/household/house_level_2.png?url";
import householdLevel3Url from "../../assets/city/buildings/household/house_level_3.png?url";
import businessLevel1Url from "../../assets/city/buildings/business/business_level_1.png?url";
import businessLevel2Url from "../../assets/city/buildings/business/business_level_2.png?url";
import businessLevel3Url from "../../assets/city/buildings/business/business_level_3.png?url";
import datacenterLevel1Url from "../../assets/city/buildings/datacenter/datacenter_level_1.png?url";
import datacenterLevel2Url from "../../assets/city/buildings/datacenter/datacenter_level_2.png?url";
import datacenterLevel3Url from "../../assets/city/buildings/datacenter/datacenter_level_3.png?url";
import damLevel1Url from "../../assets/city/power/dam/dam_level_1.png?url";
import damLevel2Url from "../../assets/city/power/dam/dam_level_2.png?url";
import damLevel3Url from "../../assets/city/power/dam/dam_level_3.png?url";
import nuclearLevel1Url from "../../assets/city/power/nuclear/nuclear_level_1.png?url";
import nuclearLevel2Url from "../../assets/city/power/nuclear/nuclear_level_2.png?url";
import nuclearLevel3Url from "../../assets/city/power/nuclear/nuclear_level_3.png?url";
import solarLevel1Url from "../../assets/city/power/solar/solar_level_1.png?url";
import solarLevel2Url from "../../assets/city/power/solar/solar_level_2.png?url";
import solarLevel3Url from "../../assets/city/power/solar/solar_level_3.png?url";
import thermalLevel1Url from "../../assets/city/power/thermal/thermal_level_1.png?url";
import thermalLevel2Url from "../../assets/city/power/thermal/thermal_level_2.png?url";
import thermalLevel3Url from "../../assets/city/power/thermal/thermal_level_3.png?url";
import windLevel1Url from "../../assets/city/power/wind/wind_level_1.png?url";
import windLevel2Url from "../../assets/city/power/wind/wind_level_2.png?url";
import windLevel3Url from "../../assets/city/power/wind/wind_level_3.png?url";
import deskFrameUrl from "../../assets/ui/background/empty_background_1920.runtime.png?url";
import openAiSignUrl from "../../assets/city/openAI.png?url";

import type { CityLevel, CitySlotId, UpgradeableCitySlotId } from "./cityTypes";

export const CITY_LEVELS = [1, 2, 3] as const satisfies readonly CityLevel[];

export const UPGRADEABLE_CITY_SLOT_IDS = [
  "household",
  "business",
  "datacenter",
  "nuclear",
  "thermal",
  "solar",
  "wind",
  "dam",
] as const satisfies readonly UpgradeableCitySlotId[];

export const CITY_SLOT_IDS = UPGRADEABLE_CITY_SLOT_IDS satisfies readonly CitySlotId[];

export const CITY_STATIC_ASSET_URLS = {
  terrain: terrainUrl,
  deskFrame: deskFrameUrl,
  openAiSign: openAiSignUrl,
} as const;

export const CITY_SLOT_ASSET_URLS: Record<CitySlotId, Record<CityLevel, string>> = {
  household: {
    1: householdLevel1Url,
    2: householdLevel2Url,
    3: householdLevel3Url,
  },
  business: {
    1: businessLevel1Url,
    2: businessLevel2Url,
    3: businessLevel3Url,
  },
  datacenter: {
    1: datacenterLevel1Url,
    2: datacenterLevel2Url,
    3: datacenterLevel3Url,
  },
  nuclear: {
    1: nuclearLevel1Url,
    2: nuclearLevel2Url,
    3: nuclearLevel3Url,
  },
  thermal: {
    1: thermalLevel1Url,
    2: thermalLevel2Url,
    3: thermalLevel3Url,
  },
  solar: {
    1: solarLevel1Url,
    2: solarLevel2Url,
    3: solarLevel3Url,
  },
  wind: {
    1: windLevel1Url,
    2: windLevel2Url,
    3: windLevel3Url,
  },
  dam: {
    1: damLevel1Url,
    2: damLevel2Url,
    3: damLevel3Url,
  },
};
