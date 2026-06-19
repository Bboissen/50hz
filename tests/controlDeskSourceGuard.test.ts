import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const controlDeskRoot = join(repoRoot, "src/pixi/controlDesk");
const controlDeskScreen = join(repoRoot, "src/pixi/screens/ControlDeskScreen.ts");
const approvedGraphicsFiles = [
  "src/pixi/controlDesk/components/DemandForecastMonitor.ts",
  "src/pixi/controlDesk/components/ForecastTape.ts",
  "src/pixi/controlDesk/components/HitZone.ts",
  "src/pixi/controlDesk/components/SpriteLedStrip.ts",
  "src/pixi/screens/ControlDeskScreen.ts",
];

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (path.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

function deskSourceFiles(): string[] {
  return [...sourceFiles(controlDeskRoot), controlDeskScreen].map((path) => relative(repoRoot, path)).sort();
}

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("control desk migration source guardrails", () => {
  it("does not reference quarantined UI reset sources", () => {
    for (const file of deskSourceFiles()) {
      const source = readSource(file);
      expect(source, file).not.toContain(".worktree-quarantine");
      expect(source, file).not.toContain("ui-reset-2026-06-18");
    }
  });

  it("keeps Graphics use limited to approved live overlays and debug layers", () => {
    expect(approvedGraphicsFiles.every((file) => existsSync(join(repoRoot, file)))).toBe(true);

    const filesUsingGraphics = deskSourceFiles()
      .filter((file) => /\bGraphics\b/.test(readSource(file)))
      .sort();

    expect(filesUsingGraphics).toEqual(approvedGraphicsFiles.sort());
  });
});
