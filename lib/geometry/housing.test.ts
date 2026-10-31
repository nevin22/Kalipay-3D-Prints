import { describe, expect, it } from "vitest";
import { HOUSING_HEIGHT, buildHousing, housingLayout, previewLayout } from "@/lib/geometry/housing";
import { validateMesh } from "@/lib/geometry/validate";

describe("buildHousing", () => {
  for (const units of [[1], [1, 1], [1, 2, 1.5], [1, 1, 1, 1, 1, 1], [2.25, 1.25]]) {
    it(`is watertight for keys ${units.join(", ")}`, () => {
      const report = validateMesh(buildHousing(units));
      expect(report.openEdges).toBe(0);
      expect(report.nonManifoldEdges).toBe(0);
      expect(report.degenerate).toBe(0);
      expect(report.volume).toBeGreaterThan(0);
    });
  }

  it("fills the size housingLayout promises", () => {
    const units = [1, 2, 1];
    const { width, depth } = housingLayout(units);
    const geo = buildHousing(units);
    const box = geo.boundingBox!;
    expect(box.max.x - box.min.x).toBeCloseTo(width, 3);
    expect(box.max.z - box.min.z).toBeCloseTo(depth, 3);
    expect(box.max.y).toBeCloseTo(HOUSING_HEIGHT, 3);
    expect(box.max.x + box.min.x).toBeCloseTo(0, 3);
  });

  it("gains the same volume for every extra identical key", () => {
    const v = (n: number) => validateMesh(buildHousing(Array(n).fill(1))).volume;
    // The outlines are jittered by 0.2 micron on purpose, which moves volume by a few hundredths of a mm³.
    const step = v(2) - v(1);
    expect(Math.abs(v(3) - v(2) - step)).toBeLessThan(0.5);
    expect(Math.abs(v(4) - v(3) - step)).toBeLessThan(0.5);
  });
});

describe("housingLayout", () => {
  it("puts wells in order, centered, one shared wall apart", () => {
    const { centers, wellWidths, width } = housingLayout([1, 1, 1]);
    expect(centers).toHaveLength(3);
    expect(centers[0] + centers[2]).toBeCloseTo(0, 6);
    expect(centers[1]).toBeCloseTo(0, 6);
    const wall = centers[1] - centers[0] - wellWidths[0];
    expect(wall).toBeGreaterThan(1);
    expect(width).toBeCloseTo(3 * wellWidths[0] + 4 * wall, 6);
  });
});

describe("previewLayout", () => {
  it("keeps a lone key where it always was", () => {
    const sep = previewLayout([1], "separate");
    expect(sep.capXs).toHaveLength(1);
    expect(sep.capXs[0]).toBeLessThan(0);
    expect(sep.housingX).toBeGreaterThan(0);
  });

  it("puts every cap over its own well when stacked", () => {
    const { centers } = housingLayout([1, 2]);
    expect(previewLayout([1, 2], "below").capXs).toEqual(centers);
  });

  it("does not let the row of caps run into the housing when side by side", () => {
    const units = [1, 1, 1];
    const { capXs, housingX } = previewLayout(units, "separate");
    const { width } = housingLayout(units);
    const lastCapEdge = capXs[capXs.length - 1] + (width - 2 * 2.1) / 2 / units.length;
    expect(housingX - width / 2).toBeGreaterThan(lastCapEdge);
  });
});
