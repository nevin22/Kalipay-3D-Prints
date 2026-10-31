import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { buildKeycapParts } from "@/lib/geometry/cap";
import { DEFAULT_CAP_HEIGHT, MAX_CAP_HEIGHT, MIN_CAP_HEIGHT, capDimensions, capTaper } from "@/lib/geometry/keycap";
import { validateMesh } from "@/lib/geometry/validate";

const file = readFileSync("public/fonts/roboto-latin-700-normal.woff");
const font = parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));

const base = { units: 1, text: "A", fontSize: 8, offsetX: 0, offsetY: 0, rotation: 0, raise: 0, stemTolerance: 0.1 };
const HEIGHTS = [MIN_CAP_HEIGHT, DEFAULT_CAP_HEIGHT, MAX_CAP_HEIGHT];

describe("cap height", () => {
  it("keeps the base and gives a taller cap a bigger top face", () => {
    const low = capDimensions(1, MIN_CAP_HEIGHT);
    const high = capDimensions(1, MAX_CAP_HEIGHT);
    expect(high.bottomW).toBe(low.bottomW);
    expect(high.bottomD).toBe(low.bottomD);
    expect(high.topW).toBeGreaterThan(low.topW);
    expect(high.topD).toBeGreaterThan(low.topD);
    // 3 mm per side at the lowest cap, 1.5 mm at the highest, in a straight line between.
    expect(capTaper(MIN_CAP_HEIGHT)).toBeCloseTo(3, 6);
    expect(capTaper(MAX_CAP_HEIGHT)).toBeCloseTo(1.5, 6);
    expect(capTaper(DEFAULT_CAP_HEIGHT)).toBeCloseTo(2.5, 6);
    // Even the tallest cap's top face stays narrower than its base.
    expect(high.topW).toBeLessThan(high.bottomW - 2);
  });

  for (const capHeight of HEIGHTS) {
    it(`gives a watertight cap and legend at ${capHeight} mm`, () => {
      for (const units of [1, 2]) {
        for (const raise of [0, 0.4]) {
          const parts = buildKeycapParts({ ...base, units, raise, capHeight }, font);
          expect(parts.fits).toBe(true);
          expect(validateMesh(parts.cap).watertight).toBe(true);
          expect(validateMesh(parts.legend!).watertight).toBe(true);
        }
      }
    });
  }

  it("keeps the stem tip at the same height whatever the cap height", () => {
    const tip = (capHeight: number) => {
      const { cap } = buildKeycapParts({ ...base, capHeight }, font);
      const pos = cap.getAttribute("position");
      const ys = Array.from({ length: pos.count }, (_, i) => pos.getY(i)).filter((y) => y > 0.01);
      return Math.min(...ys);
    };
    expect(tip(MIN_CAP_HEIGHT)).toBeCloseTo(tip(MAX_CAP_HEIGHT), 6);
  });
});
