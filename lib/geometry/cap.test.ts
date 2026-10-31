import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { buildKeycapParts } from "@/lib/geometry/cap";
import { validateMesh } from "@/lib/geometry/validate";

const file = readFileSync("public/fonts/roboto-latin-700-normal.woff");
const font = parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));

const base = { units: 1, text: "A", fontSize: 8, offsetX: 0, offsetY: 0, rotation: 0, raise: 0, stemTolerance: 0.1 };

describe("buildKeycapParts", () => {
  for (const text of ["A", "S", "B", "FN", "ESC"]) {
    it(`gives a watertight cap and legend for "${text}"`, () => {
      const parts = buildKeycapParts({ ...base, text, fontSize: text.length > 2 ? 4.5 : 8 }, font);
      expect(parts.fits).toBe(true);
      expect(validateMesh(parts.cap).watertight).toBe(true);
      expect(parts.legend).not.toBeNull();
      expect(validateMesh(parts.legend!).watertight).toBe(true);
    });
  }

  it("stays watertight with a raised, rotated legend on a wide key", () => {
    const parts = buildKeycapParts({ ...base, units: 2, text: "SHIFT", fontSize: 6, rotation: 20, raise: 0.4 }, font);
    expect(validateMesh(parts.cap).watertight).toBe(true);
    expect(validateMesh(parts.legend!).watertight).toBe(true);
  });
});
