import { Application } from "pixi.js";

export async function createPixiApp(root: HTMLElement): Promise<Application> {
  const app = new Application();

  await app.init({
    width: 1920,
    height: 1080,
    background: "#101711",
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });

  app.canvas.setAttribute("aria-label", "50Hz Dispatch Console canvas");
  root.appendChild(app.canvas);

  return app;
}
