import { describe, expect, it } from "vitest";
import { DEFAULT_VASE, LIMITS, PLAIN_STYLE, VASE_PRESETS, buildVase, maxOverhang, vaseMaxRadius, vaseRadius, type VaseSettings } from "@/lib/geometry/vase";
import { validateMesh } from "@/lib/geometry/validate";

const make = (patch: Partial<VaseSettings>): VaseSettings => ({ ...DEFAULT_VASE, ...patch });

const cases: [string, Partial<VaseSettings>][] = [
  ["default", {}],
  ["solid (spiral vase mode)", { mode: "vase" }],
  ["straight cylinder", { belly: 0, topDiameter: 80 }],
  ["waist", { belly: LIMITS.belly.min }],
  ["big belly and lip", { belly: LIMITS.belly.max, lip: LIMITS.lip.max }],
  ["thick wall, narrow top", { wall: LIMITS.wall.max, topDiameter: LIMITS.topDiameter.min }],
  ["thin wall, thick floor", { wall: LIMITS.wall.min, floor: LIMITS.floor.max }],
  ["shortest and tallest", { height: LIMITS.height.min }],
  ["tallest", { height: LIMITS.height.max }],
  ["triangle, sharp", { section: "polygon", sides: 3 }],
  ["twelve sides, twisted", { section: "polygon", sides: 12, twist: LIMITS.twist.max }],
  ["twisted the other way", { section: "polygon", sides: 5, twist: LIMITS.twist.min, corner: 0.5 }],
  ["deep ribs", { ribs: LIMITS.ribs.max, ribDepth: LIMITS.ribDepth.max }],
  ["few ribs and twist", { ribs: LIMITS.ribs.min, ribDepth: LIMITS.ribDepth.max, twist: 180 }],
  ["wave", { wave: LIMITS.wave.max, waveCount: LIMITS.waveCount.max }],
  ["bands", { bands: LIMITS.bands.max, bandCount: LIMITS.bandCount.max }],
  ["deep scallops", { scallop: LIMITS.scallop.max, scallopCount: LIMITS.scallopCount.max }],
  ["scallops on the shortest vase", { scallop: LIMITS.scallop.max, height: LIMITS.height.min }],
  ["everything at once", { section: "polygon", sides: 7, twist: 90, ribDepth: 0.2, wave: 4, bands: 2, scallop: 10, lip: 15 }],
];

describe("buildVase", () => {
  for (const [name, patch] of cases) {
    for (const mode of ["walls", "vase"] as const) {
      it(`is watertight: ${name}, ${mode}`, () => {
        const report = validateMesh(buildVase(make({ mode, ...patch })));
        expect(report.openEdges).toBe(0);
        expect(report.nonManifoldEdges).toBe(0);
        expect(report.degenerate).toBe(0);
        expect(report.volume).toBeGreaterThan(0);
      });
    }
  }

  for (const p of VASE_PRESETS) {
    for (const mode of ["walls", "vase"] as const) {
      it(`preset ${p.label} is watertight, ${mode}`, () => {
        const report = validateMesh(buildVase(make({ ...p.patch, mode })));
        expect(report.openEdges).toBe(0);
        expect(report.nonManifoldEdges).toBe(0);
        expect(report.degenerate).toBe(0);
        expect(report.volume).toBeGreaterThan(0);
      });
    }
  }

  it("a twisted square keeps its corners sharp on every ring", () => {
    const s = make({ mode: "vase", section: "polygon", sides: 4, corner: 0, twist: 120, belly: 0, topDiameter: 80, ribDepth: 0 });
    const pos = buildVase(s).getAttribute("position");
    // Fixed angles sample a moving corner at a different offset per ring (chipped edges); turning the samples with the twist does not.
    for (const i of [10, 37, 60, 91, 119]) {
      const t = i / 120;
      let max = 0;
      for (let k = 0; k < pos.count; k++) {
        if (Math.abs(pos.getY(k) - s.height * t) < 1e-4) max = Math.max(max, Math.hypot(pos.getX(k), pos.getZ(k)));
      }
      expect(max).toBeGreaterThan(vaseRadius(s, t) - 1e-3);
    }
  });

  it("the page default is the Classic preset, so Classic shows as selected on load", () => {
    const classic = VASE_PRESETS.find((p) => p.id === "classic")!.patch;
    for (const [k, v] of Object.entries(classic)) expect(DEFAULT_VASE[k as keyof VaseSettings]).toBe(v);
  });

  it("a straight cylinder does not lean", () => {
    expect(maxOverhang(make({ belly: 0, topDiameter: 80 }))).toBeLessThan(1);
  });

  it("a strong lip leans past the printable limit", () => {
    expect(maxOverhang(make({ lip: LIMITS.lip.max, topDiameter: 60 }))).toBeGreaterThan(45);
  });

  it("vaseMaxRadius covers the belly", () => {
    expect(vaseMaxRadius(make({ belly: 30 }))).toBeGreaterThan(40);
  });

  it("plain style settings leave the section round", () => {
    expect(PLAIN_STYLE.section).toBe("round");
  });

  it("a hollow cup holds less material than the solid body", () => {
    const solid = validateMesh(buildVase(make({ mode: "vase" }))).volume;
    const cup = validateMesh(buildVase(make({ mode: "walls" }))).volume;
    expect(cup).toBeLessThan(solid);
    expect(cup).toBeGreaterThan(0);
  });

  it("a straight cylinder has the volume of a cylinder", () => {
    const g = make({ mode: "vase", belly: 0, topDiameter: 80, baseDiameter: 80, height: 100, ribDepth: 0 });
    const v = validateMesh(buildVase(g)).volume;
    // 240-sided prism is a hair smaller than the true circle.
    expect(v).toBeGreaterThan(Math.PI * 40 * 40 * 100 * 0.999);
    expect(v).toBeLessThan(Math.PI * 40 * 40 * 100);
  });
});
