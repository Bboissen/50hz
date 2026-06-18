import { Application, Container, Graphics, Text } from "pixi.js";

import "./styles.css";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Missing #app root element");
}

const root = appRoot;

async function bootstrap(): Promise<void> {
  const app = new Application();

  await app.init({
    width: 960,
    height: 540,
    background: "#101711",
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });

  app.canvas.setAttribute("aria-label", "50Hz PixiJS canvas");
  root.appendChild(app.canvas);

  const scene = new Container();
  app.stage.addChild(scene);

  const panel = new Graphics()
    .roundRect(96, 96, 768, 348, 18)
    .fill({ color: 0x1f2b22 })
    .stroke({ color: 0x8dfc7a, width: 3, alpha: 0.85 });
  scene.addChild(panel);

  const title = new Text({
    text: "50Hz",
    style: {
      fontFamily: "Georgia, serif",
      fontSize: 84,
      fontWeight: "700",
      fill: 0x8dfc7a,
      letterSpacing: 2,
    },
  });
  title.anchor.set(0.5);
  title.position.set(480, 230);
  scene.addChild(title);

  const subtitle = new Text({
    text: "Tooling ready",
    style: {
      fontFamily: "Courier New, monospace",
      fontSize: 32,
      fill: 0xc8b982,
      letterSpacing: 1,
    },
  });
  subtitle.anchor.set(0.5);
  subtitle.position.set(480, 320);
  scene.addChild(subtitle);
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start 50Hz", error);
  root.textContent = "50Hz failed to start. Check the console for details.";
});
