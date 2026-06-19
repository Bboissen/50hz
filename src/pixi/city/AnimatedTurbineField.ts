import { Container, type Texture } from "pixi.js";

import { AnimatedTurbine, type TurbineMount } from "./AnimatedTurbine";
import type { CityLevel } from "./cityTypes";

export type WindFarmVisualState = {
  renewableLevel: CityLevel;
  windOutputMW: number;
  windPotentialMW: number;
  windPeakMW: number;
  windEnabled: boolean;
  windPlantOnline: boolean;
  currentWindKmh: number;
};

const BASE_FPS = 10;
const DESIGN_WIDTH = 1430;
const DESIGN_HEIGHT = 826;

const TURBINE_MOUNTS: TurbineMount[] = [
  { x: 421, y: 178, scale: 0.72, phase: 0 },
  { x: 693, y: 43, scale: 0.7, phase: 2 },
  { x: 984, y: 179, scale: 0.72, phase: 4 },
  { x: 718, y: 339, scale: 0.86, phase: 6 },
];

export class AnimatedTurbineField extends Container {
  private readonly turbines: AnimatedTurbine[];
  private framePosition = 0;
  private visualState: WindFarmVisualState = {
    renewableLevel: 1,
    windOutputMW: 0,
    windPotentialMW: 0,
    windPeakMW: 0,
    windEnabled: false,
    windPlantOnline: true,
    currentWindKmh: 0,
  };

  public constructor(frames: Texture[]) {
    super({ label: "AnimatedTurbineField" });
    this.eventMode = "none";
    this.interactiveChildren = false;
    this.pivot.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
    this.turbines = frames.length > 0 ? TURBINE_MOUNTS.map((mountPoint) => new AnimatedTurbine(frames, mountPoint)) : [];
    if (this.turbines.length > 0) {
      this.addChild(...this.turbines);
    }
    this.syncActiveTurbines();
  }

  public setVisualState(state: WindFarmVisualState): void {
    this.visualState = {
      renewableLevel: state.renewableLevel,
      windOutputMW: Math.max(0, state.windOutputMW),
      windPotentialMW: Math.max(0, state.windPotentialMW),
      windPeakMW: Math.max(0, state.windPeakMW),
      windEnabled: state.windEnabled,
      windPlantOnline: state.windPlantOnline,
      currentWindKmh: state.currentWindKmh,
    };
    this.syncActiveTurbines();
  }

  public tick(deltaMS: number): void {
    if (this.canAnimate()) {
      const ratio = this.visualState.windOutputMW / Math.max(this.visualState.windPeakMW, 1);
      const speed = lerp(0.35, 1.85, clamp01(ratio));
      this.framePosition += Math.max(0, Math.min(deltaMS, 100)) / 1000 * BASE_FPS * speed;
    }
    for (const [index, turbine] of this.turbines.entries()) {
      turbine.update(this.framePosition + TURBINE_MOUNTS[index].phase);
    }
  }

  public debugActiveTurbineCount(): number {
    return this.turbines.filter((turbine) => turbine.visible).length;
  }

  public debugFirstFrameIndex(): number {
    return this.turbines[0]?.debugFrameIndex() ?? 0;
  }

  public debugFramePosition(): number {
    return this.framePosition;
  }

  private canAnimate(): boolean {
    return (
      this.visualState.windPlantOnline &&
      this.visualState.windEnabled &&
      this.visualState.windOutputMW > 0 &&
      this.visualState.windPeakMW > 0
    );
  }

  private syncActiveTurbines(): void {
    const activeCount = this.visualState.renewableLevel === 1 ? 1 : this.visualState.renewableLevel === 2 ? 2 : 4;
    this.turbines.forEach((turbine, index) => {
      turbine.visible = index < activeCount;
    });
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
