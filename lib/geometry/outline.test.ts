import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { offsetRings, unionRings } from "@/lib/geometry/outline";
import { type Ring, signedArea } from "@/lib/geometry/polygon";

/** Counter-clockwise square with its lower left corner at (x, y). */
const square = (x: number, y: number, size: number): Ring =>
  [[0, 0], [size, 0], [size, size], [0, size]].map(([dx, dy]) => new THREE.Vector2(x + dx, y + dy));

describe("unionRings", () => {
  it("merges two overlapping squares into one counter-clockwise outline", () => {
    const out = unionRings([square(0, 0, 4), square(2, 0, 4)]);
    expect(out).toHaveLength(1);
    expect(signedArea(out[0])).toBeCloseTo(24, 3);
  });

  it("keeps two separate squares separate", () => {
    expect(unionRings([square(0, 0, 4), square(10, 0, 4)])).toHaveLength(2);
  });
});

describe("offsetRings with a hole", () => {
  it("grows the outline and shrinks the hole", () => {
    const hole = square(3, 3, 4).reverse();
    const out = offsetRings([square(0, 0, 10), hole], 1);
    const areas = out.map(signedArea).sort((a, b) => a - b);
    // A 12 x 12 outer (rounded corners) with a 2 x 2 hole.
    expect(areas[0]).toBeCloseTo(-4, 1);
    expect(areas[1]).toBeGreaterThan(136);
    expect(areas[1]).toBeLessThan(144);
  });
});

describe("offsetRings", () => {
  it("grows and shrinks a square", () => {
    const [grown] = offsetRings([square(0, 0, 4)], 1);
    const [shrunk] = offsetRings([square(0, 0, 4)], -1);
    // Rounded corners: a bit under the 6 x 6 square.
    expect(signedArea(grown)).toBeGreaterThan(32);
    expect(signedArea(grown)).toBeLessThan(36);
    expect(signedArea(shrunk)).toBeCloseTo(4, 2);
  });

  it("joins squares that are 1 mm apart when grown by 1 mm", () => {
    expect(offsetRings([square(0, 0, 4), square(5, 0, 4)], 1)).toHaveLength(1);
  });
});
