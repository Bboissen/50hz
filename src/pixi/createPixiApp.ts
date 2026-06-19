import { Application, Ticker } from "pixi.js";

const MAX_RENDER_RESOLUTION = 1;

export async function createPixiApp(root: HTMLElement): Promise<Application> {
  const app = new Application();

  await app.init({
    width: 1920,
    height: 1080,
    background: "#101711",
    antialias: false,
    autoStart: false,
    sharedTicker: false,
    autoDensity: true,
    backgroundAlpha: 1,
    resolution: Math.min(window.devicePixelRatio || 1, MAX_RENDER_RESOLUTION),
    gcActive: true,
    gcMaxUnusedTime: 60_000,
    gcFrequency: 30_000,
  });
  app.ticker.autoStart = false;
  app.stop();
  Ticker.system.autoStart = false;
  Ticker.system.stop();

  app.canvas.setAttribute("aria-label", "50Hz Dispatch Console canvas");
  root.appendChild(app.canvas);

  return app;
}
