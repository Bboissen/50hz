import { Container, Sprite, Texture } from "pixi.js";

export type TurbineMount = {
  x: number;
  y: number;
  scale: number;
  phase: number;
};

const TURBINE_ROTOR_ANCHOR = {
  x: 126 / 250,
  y: 132 / 250,
};

export class AnimatedTurbine extends Container {
  private readonly current: Sprite;
  private readonly next: Sprite;
  private readonly frames: Texture[];
  private frameIndex = 0;

  public constructor(frames: Texture[], mountPoint: TurbineMount) {
    super({ label: "animated-turbine" });
    this.frames = frames.length > 0 ? frames : [Texture.EMPTY];
    this.position.set(mountPoint.x, mountPoint.y);
    this.scale.set(mountPoint.scale);
    this.frameIndex = mountPoint.phase % this.frames.length;

    this.current = new Sprite({ texture: this.frames[this.frameIndex], label: "turbine-current-frame" });
    this.next = new Sprite({ texture: this.frames[(this.frameIndex + 1) % this.frames.length], label: "turbine-next-frame" });
    for (const sprite of [this.current, this.next]) {
      sprite.anchor.set(TURBINE_ROTOR_ANCHOR.x, TURBINE_ROTOR_ANCHOR.y);
      sprite.eventMode = "none";
    }
    this.addChild(this.current, this.next);
  }

  public update(framePosition: number): void {
    const wrapped = positiveModulo(framePosition, this.frames.length);
    const nextFrameIndex = Math.floor(wrapped);
    const blend = wrapped - nextFrameIndex;

    if (nextFrameIndex !== this.frameIndex) {
      this.frameIndex = nextFrameIndex;
      this.current.texture = this.frames[this.frameIndex];
      this.next.texture = this.frames[(this.frameIndex + 1) % this.frames.length];
    }

    this.current.alpha = 1 - blend;
    this.next.alpha = blend;
  }

  public debugFrameIndex(): number {
    return this.frameIndex;
  }
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
