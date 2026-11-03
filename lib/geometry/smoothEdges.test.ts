import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type * as THREE from "three";
import { parse } from "opentype.js";
import { buildKeycapParts } from "@/lib/geometry/cap";
import { validateMesh } from "@/lib/geometry/validate";

const file = readFileSync("public/fonts/roboto-latin-700-normal.woff");
const font = parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));

const base = { units: 1, text: "A", fontSize: 8, offsetX: 0, offsetY: 0, rotation: 0, raise: 0.6, stemTolerance: 0.1 };

/** Highest point of the legend, in mm. */
const topY = (g: THREE.BufferGeometry) => {
  g.computeBoundingBox();
  return g.boundingBox!.max.y;
};

describe("smooth edges on a raised legend", () => {
  const cases: [string, Partial<typeof base> & { text?: string; legendKind?: "shape"; shape?: "star" | "square" | "circle" | "triangle" }][] = [
    ["a letter with a hole", { text: "A" }],
    ["several letters", { text: "SHIFT", fontSize: 6 }],
    ["small thin text", { text: "ESC", fontSize: 3.5 }],
    ["a star", { legendKind: "shape", shape: "star" }],
    ["a circle", { legendKind: "shape", shape: "circle" }],
    ["a rotated triangle", { legendKind: "shape", shape: "triangle", rotation: 25 }],
  ];

  for (const [name, extra] of cases) {
    for (const smooth of [50, 100]) {
      it(`${name} stays watertight at ${smooth}%`, () => {
        const parts = buildKeycapParts({ ...base, ...extra, smooth }, font);
        expect(validateMesh(parts.cap).watertight).toBe(true);
        expect(validateMesh(parts.legend!).watertight).toBe(true);
      });
    }
  }

  it("has the same height as the square-edged legend, with less volume at the top", () => {
    const square = buildKeycapParts({ ...base, smooth: 0 }, font).legend!;
    const round = buildKeycapParts({ ...base, smooth: 100 }, font).legend!;
    expect(topY(round)).toBeCloseTo(topY(square), 3);
    expect(validateMesh(round).volume).toBeLessThan(validateMesh(square).volume);
  });

  it("changes nothing when the legend is flush", () => {
    const flush = buildKeycapParts({ ...base, raise: 0, smooth: 100 }, font).legend!;
    const plain = buildKeycapParts({ ...base, raise: 0, smooth: 0 }, font).legend!;
    expect(validateMesh(flush).volume).toBeCloseTo(validateMesh(plain).volume, 6);
  });
});
