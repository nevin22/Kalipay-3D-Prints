import { describe, expect, it } from "vitest";
import { buildHousing, buildHousingTab, housingLayout, layoutExtent, previewLayout } from "@/lib/geometry/housing";
import { RING_REACH, RING_SIDES, buildRingTab } from "@/lib/geometry/ring";
import { validateMesh } from "@/lib/geometry/validate";

describe("buildRingTab", () => {
  for (const side of RING_SIDES) {
    it(`is watertight on the ${side} side`, () => {
      const report = validateMesh(buildRingTab(30, 11, side));
      expect(report.watertight).toBe(true);
      expect(report.volume).toBeGreaterThan(60);
    });
  }

  it("sticks out by RING_REACH on the chosen side, flat on the floor", () => {
    const box = (side: Parameters<typeof buildRingTab>[2]) => buildRingTab(30, 11, side).boundingBox!;
    expect(box("right").max.x).toBeCloseTo(30 + RING_REACH, 1);
    expect(box("left").min.x).toBeCloseTo(-30 - RING_REACH, 1);
    // The legend's "up" is the back, which is -z.
    expect(box("top").min.z).toBeCloseTo(-11 - RING_REACH, 1);
    expect(box("bottom").max.z).toBeCloseTo(11 + RING_REACH, 1);
    expect(box("right").min.y).toBeCloseTo(0, 3);
    expect(box("right").max.y).toBeCloseTo(2, 3);
  });
});

describe("housing split ring tab", () => {
  for (const units of [[1], [1, 1, 1], [1, 2, 1.5, 1, 1, 1]]) {
    it(`fits the housing for keys ${units.join(", ")} on every side`, () => {
      const { width, depth } = housingLayout(units);
      for (const side of RING_SIDES) {
        const tab = buildHousingTab(units, side);
        expect(validateMesh(tab).watertight).toBe(true);
        const b = tab.boundingBox!;
        // Reaches RING_REACH past the wall and starts inside it, so the two overlap.
        if (side === "right") expect(b.max.x).toBeCloseTo(width / 2 + RING_REACH, 1);
        if (side === "left") expect(b.min.x).toBeCloseTo(-width / 2 - RING_REACH, 1);
        if (side === "top") expect(b.min.z).toBeCloseTo(-depth / 2 - RING_REACH, 1);
        if (side === "bottom") expect(b.max.z).toBeCloseTo(depth / 2 + RING_REACH, 1);
      }
    });
  }

  it("is wide enough to stay on the straight part of the wall", () => {
    // 8 mm wide against the shortest wall of a 1u housing, minus its rounded corners.
    const { depth } = housingLayout([1]);
    expect(depth - 2 * 3.6).toBeGreaterThan(8);
  });

  it("does not change the housing itself", () => {
    const before = validateMesh(buildHousing([1, 1])).volume;
    buildHousingTab([1, 1], "left");
    expect(validateMesh(buildHousing([1, 1])).volume).toBeCloseTo(before, 6);
  });
});

describe("room for the ring in the layout", () => {
  it("pushes the housing away from the caps by the extra gap", () => {
    const plain = previewLayout([1, 1], "separate");
    const roomy = previewLayout([1, 1], "separate", RING_REACH);
    expect(roomy.housingX - roomy.capXs[1]).toBeCloseTo(plain.housingX - plain.capXs[1] + RING_REACH, 6);
  });

  it("counts a tab on the left or right end in the width, but not one on the front or back", () => {
    const base = layoutExtent([1, 1], "separate");
    expect(layoutExtent([1, 1], "separate", "left")).toBeCloseTo(base + RING_REACH, 6);
    expect(layoutExtent([1, 1], "below", "right")).toBeCloseTo(layoutExtent([1, 1], "below") + RING_REACH, 6);
    expect(layoutExtent([1, 1], "separate", "top")).toBeCloseTo(base, 6);
    expect(layoutExtent([1, 1], "separate", "off")).toBeCloseTo(base, 6);
  });
});
