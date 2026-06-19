export type ControlDeskAssetKey =
  | "desk_background"
  | "desk_reference_full_clean"
  | "led_empty_10"
  | "led_empty_3"
  | "led_green"
  | "led_orange"
  | "led_red"
  | "led_blue"
  | "knob"
  | "rotary_left"
  | "rotary_center"
  | "rotary_right"
  | "gauge_needle"
  | "upgrade_arrow";

export const CONTROL_DESK_ASSET_SOURCES: Record<ControlDeskAssetKey, string> = {
  desk_background: "/assets/ui/background/empty_background_1920.runtime.png",
  desk_reference_full_clean: "/assets/ui/full_clean.png",
  led_empty_10: "/assets/ui/components/Led/empty_10-level.png",
  led_empty_3: "/assets/ui/components/Led/empty_3-level.png",
  led_green: "/assets/ui/components/Led/green_led.png",
  led_orange: "/assets/ui/components/Led/orange_led.png",
  led_red: "/assets/ui/components/Led/red_led.png",
  led_blue: "/assets/ui/components/Led/blue_led.png",
  knob: "/assets/ui/components/Knob/knob.png",
  rotary_left: "/assets/ui/components/Knob/rotary_knob_left.png",
  rotary_center: "/assets/ui/components/Knob/rotary_knob_center.png",
  rotary_right: "/assets/ui/components/Knob/rotary_knob_right.png",
  gauge_needle: "/assets/ui/components/gauge/needle.png",
  upgrade_arrow: "/assets/ui/components/upgrade.png",
};

export function isControlDeskAssetKey(key: string): key is ControlDeskAssetKey {
  return Object.hasOwn(CONTROL_DESK_ASSET_SOURCES, key);
}
