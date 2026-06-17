import { Assets, Texture } from "pixi.js";

export type VisualAssetKey =
  | "city_homes_slab"
  | "city_services_tower"
  | "city_data_bunker"
  | "plant_reactor"
  | "plant_boiler"
  | "plant_solar"
  | "plant_wind_turbine"
  | "plant_renewables"
  | "plant_water_dam"
  | "event_football"
  | "event_cold_wave"
  | "event_data_burst"
  | "action_demand_response"
  | "contract_business"
  | "contract_data_center";

export type AssetResolver = {
  texture: (key: VisualAssetKey) => Texture | undefined;
};

const assetSources: Partial<Record<VisualAssetKey, string>> = {
  city_homes_slab: "/assets/city/buildings/house.png",
  city_services_tower: "/assets/city/buildings/business.png",
  city_data_bunker: "/assets/city/buildings/data_center.png",
  plant_reactor: "/assets/city/buildings/nuclear.png",
  plant_boiler: "/assets/city/buildings/thermal.png",
  plant_solar: "/assets/city/buildings/solar.png",
  plant_wind_turbine: "/assets/city/buildings/wind_turbine.png",
  plant_renewables: "/assets/city/buildings/solar.png",
  plant_water_dam: "/assets/city/buildings/dam.png",
};

export async function createAssetResolver(): Promise<AssetResolver> {
  const textures = new Map<VisualAssetKey, Texture>();

  await Promise.all(
    Object.entries(assetSources).map(async ([key, src]) => {
      try {
        const texture = await Assets.load<Texture>({ src, data: { scaleMode: "nearest" } });
        texture.source.scaleMode = "nearest";
        textures.set(key as VisualAssetKey, texture);
      } catch {
        // Missing authored assets are expected during prototype work.
      }
    }),
  );

  return {
    texture: (key) => textures.get(key),
  };
}
