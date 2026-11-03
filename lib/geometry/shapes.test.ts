import { describe, expect, it } from "vitest";
import { buildKeycapParts } from "@/lib/geometry/cap";
import { SHAPE_GROUPS, SHAPES, shapeToShapes } from "@/lib/geometry/shapes";
import { validateMesh } from "@/lib/geometry/validate";

const base = {
  units: 1, text: "", fontSize: 12, offsetX: 0, offsetY: 0, rotation: 0, raise: 0, stemTolerance: 0.1,
  legendKind: "shape" as const,
};

describe("icon list", () => {
  it("has unique ids, known groups and 36 icons", () => {
    expect(new Set(SHAPES.map((s) => s.id)).size).toBe(SHAPES.length);
    expect(SHAPES.every((s) => SHAPE_GROUPS.includes(s.group))).toBe(true);
    expect(SHAPES).toHaveLength(36);
  });

  it("draws an unknown id as the star", () => {
    expect(shapeToShapes("nope")[0].extractPoints(8).shape).toHaveLength(10);
  });
});

describe("every icon", () => {
  for (const { id } of SHAPES) {
    it(`${id} is 85 to 100 units across`, () => {
      const pts = shapeToShapes(id).flatMap((s) => s.extractPoints(8).shape);
      const w = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
      const h = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
      expect(Math.max(w, h)).toBeGreaterThan(85);
      expect(Math.max(w, h)).toBeLessThanOrEqual(100.5);
    });

    it(`${id} fits and is watertight, flush and raised with rounded edges`, () => {
      for (const extra of [{ raise: 0 }, { raise: 1, smooth: 100 }]) {
        const parts = buildKeycapParts({ ...base, shape: id, ...extra }, null);
        expect(parts.fits).toBe(true);
        expect(validateMesh(parts.cap).watertight).toBe(true);
        expect(parts.legend).not.toBeNull();
        expect(validateMesh(parts.legend!).watertight).toBe(true);
      }
    });
  }

  it("gets a rounded top edge when raised, whatever its shape", () => {
    const volume = (shape: string, smooth: number) =>
      validateMesh(buildKeycapParts({ ...base, shape, raise: 1, smooth }, null).legend!).volume;
    for (const { id } of SHAPES) {
      expect(volume(id, 100), id).toBeLessThan(volume(id, 0) * 0.99);
    }
  });

  it("stays watertight when rotated and moved", () => {
    const parts = buildKeycapParts({ ...base, shape: "octopus", rotation: 17, offsetX: 1, offsetY: -1 }, null);
    expect(validateMesh(parts.cap).watertight).toBe(true);
    expect(validateMesh(parts.legend!).watertight).toBe(true);
  });
});
