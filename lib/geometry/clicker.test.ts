import { readFileSync } from "node:fs";
import { parse } from "opentype.js";
import { describe, expect, it } from "vitest";
import { buildKeycapParts } from "@/lib/geometry/cap";
import {
  CAP_BOTTOM_Y,
  CAP_PROTRUDE,
  CLICKER_CAP_HEIGHT,
  CLICKER_CAP_TAPER,
  CLICKER_EDGE_RADIUS,
  CLICKER_HOUSING_TOP,
  CLICKER_LEGEND_ROTATION,
  CLICKER_LEGEND_SIZE,
  CUSTOM_HEADS,
  HEAD_BOTTOM_Y,
  HEAD_SIZE,
  clickerLayout,
  headHousing,
  headShapes,
  MAX_CLICKER_KEYS,
  clickerCapSettings,
  clickerChars,
  DEFAULT_BODY_COLOR,
  effectiveBodyColor,
  THICK_BORDER,
  buildClickerHead,
  buildClickerHeadParts,
  buildClickerHousing,
  buildClickerRing,
} from "@/lib/geometry/clicker";
import { WELL_CLEARANCE } from "@/lib/geometry/housing";
import { offsetRings } from "@/lib/geometry/outline";
import { signedArea } from "@/lib/geometry/polygon";
import { SHAPES } from "@/lib/geometry/shapes";
import { validateMesh } from "@/lib/geometry/validate";

const closed = (g: Parameters<typeof validateMesh>[0]) => {
  const r = validateMesh(g);
  expect(r.openEdges).toBe(0);
  expect(r.nonManifoldEdges).toBe(0);
  expect(r.degenerate).toBe(0);
  expect(r.volume).toBeGreaterThan(0);
  return r;
};

describe("buildClickerHousing", () => {
  for (const grill of ["none", "teeth", "round", "wavy"] as const) {
    it(`is watertight for 1 to 5 keys, with and without a head (grill: ${grill})`, () => {
      for (let n = 1; n <= MAX_CLICKER_KEYS; n++) {
        for (const head of [undefined, { id: "pikachu", size: 28 }, { id: "bear", size: 24 }]) closed(buildClickerHousing(n, grill, head));
      }
    });
  }

  it("leaves the released cap top just above the rim", () => {
    expect(CAP_BOTTOM_Y + CLICKER_CAP_HEIGHT - CLICKER_HOUSING_TOP).toBeCloseTo(CAP_PROTRUDE, 3);
    expect(buildClickerHousing(1).boundingBox!.max.y).toBeCloseTo(CLICKER_HOUSING_TOP, 3);
  });

  it("the grill adds width on the long sides", () => {
    const plain = buildClickerHousing(4, "none").boundingBox!;
    const teeth = buildClickerHousing(4, "teeth").boundingBox!;
    expect(teeth.max.z - teeth.min.z).toBeGreaterThan(plain.max.z - plain.min.z + 2);
  });

  it("a thick border widens the housing around the keys but not the head", () => {
    const plain = buildClickerHousing(4, "teeth").boundingBox!;
    const thick = buildClickerHousing(4, "teeth", undefined, true).boundingBox!;
    expect(thick.max.x - thick.min.x).toBeCloseTo(plain.max.x - plain.min.x + 2 * THICK_BORDER, 1);
    for (const head of [undefined, { id: "pikachu", size: 28 }]) closed(buildClickerHousing(4, "teeth", head, true));
    closed(buildClickerRing(4, undefined, true));
    closed(buildClickerRing(4, { id: "pikachu", size: 28 }, true));
  });

  it("round and wavy grills also widen the long sides, with a head and a thick border too", () => {
    const plain = buildClickerHousing(4, "none").boundingBox!;
    for (const grill of ["round", "wavy"] as const) {
      const g = buildClickerHousing(4, grill).boundingBox!;
      expect(g.max.z - g.min.z, grill).toBeGreaterThan(plain.max.z - plain.min.z + 1);
      closed(buildClickerHousing(3, grill, { id: "pikachu", size: 36 }, true));
    }
  });

  it("every grill is watertight at the smallest and largest size and spacing", () => {
    for (const grill of ["teeth", "round", "wavy"] as const)
      for (const size of [0.6, 3]) for (const spacing of [4, 8])
        for (const head of [undefined, { id: "pikachu", size: 36 }]) closed(buildClickerHousing(3, grill, head, true, { size, spacing }));
  });

  it("the ring tab sits flat on the floor", () => {
    for (const head of [undefined, { id: "pikachu", size: 36 }]) {
      const g = buildClickerRing(4, head);
      g.computeBoundingBox();
      expect(g.boundingBox!.min.y).toBeCloseTo(0, 3);
    }
  });

  it("typed letters make one key each, at least one, at most five", () => {
    expect(clickerChars("JED")).toEqual(["J", "E", "D"]);
    expect(clickerChars("")).toEqual([""]);
    expect(clickerChars("ABCDEFG")).toHaveLength(5);
  });

  it("the ring tab is watertight", () => {
    closed(buildClickerRing(4));
    closed(buildClickerRing(4, { id: "pikachu", size: 28 }));
  });
});

describe("clicker caps", () => {
  const base = {
    units: 1, fontSize: 12, offsetX: 0, offsetY: 0, rotation: 0, raise: 0, stemTolerance: 0.1,
    capHeight: CLICKER_CAP_HEIGHT, taper: CLICKER_CAP_TAPER, edgeRadius: CLICKER_EDGE_RADIUS,
  };

  it("have straight walls: the cap is as wide at the top as at the bottom", () => {
    const box = buildKeycapParts({ ...base, text: "" }, null).cap.boundingBox ?? undefined;
    const g = buildKeycapParts({ ...base, text: "" }, null).cap;
    g.computeBoundingBox();
    expect(box ?? g.boundingBox).toBeTruthy();
    // Width at 1 mm below the top is within the rim rounding of the bottom width.
    const pos = g.getAttribute("position");
    let wTop = 0;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > CLICKER_CAP_HEIGHT - 0.01) wTop = Math.max(wTop, Math.abs(pos.getX(i)));
    expect(wTop).toBeGreaterThan(18.2 / 2 - CLICKER_EDGE_RADIUS - 0.01);
  });

  it("with a border: cap and border are watertight, without text and with a shape legend", () => {
    for (const legend of [{ text: "" }, { text: "", legendKind: "shape" as const, shape: "heart" }]) {
      const p = buildKeycapParts({ ...base, ...legend, border: true }, null);
      closed(p.cap);
      closed(p.border!);
      expect(p.fits).toBe(true);
    }
  });

  it("the letters Z, Y, A, N, X, W, M fit the plain cap top (real font)", () => {
    const file = readFileSync("public/fonts/roboto-latin-700-normal.woff");
    const font = parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    for (const text of ["Z", "Y", "A", "N", "X", "W", "M"]) {
      const p = buildKeycapParts(
        { ...base, text, fontSize: CLICKER_LEGEND_SIZE, rotation: CLICKER_LEGEND_ROTATION },
        font
      );
      expect(p.fits, text).toBe(true);
      closed(p.cap);
      closed(p.legend!);
    }
  });

  it("with the clicker's settings, the letters fit inside the key border (real font)", () => {
    const file = readFileSync("public/fonts/roboto-latin-700-normal.woff");
    const font = parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    for (const text of ["Z", "Y", "A", "N", "X", "W", "M"]) {
      const p = buildKeycapParts(clickerCapSettings(text, true), font);
      expect(p.fits, text).toBe(true);
      closed(p.cap);
      closed(p.legend!);
      closed(p.border!);
    }
  });

  it("without a border there is no border part", () => {
    expect(buildKeycapParts({ ...base, text: "" }, null).border).toBeNull();
  });
});

describe("head", () => {
  it("is level with the caps: its top is at the caps' top", () => {
    const head = buildClickerHead("pikachu", 28);
    head.computeBoundingBox();
    expect(HEAD_BOTTOM_Y + head.boundingBox!.max.y).toBeCloseTo(CAP_BOTTOM_Y + CLICKER_CAP_HEIGHT, 3);
  });

  it("sits left of the keys in a housing of its own shape, with no teeth on it", () => {
    const { headX, minX, maxX } = clickerLayout(4, { id: "pikachu", size: 28 });
    expect(headX!).toBeLessThan(minX + 20);
    const plain = buildClickerHousing(4, "teeth");
    const withHead = buildClickerHousing(4, "teeth", { id: "pikachu", size: 28 });
    withHead.computeBoundingBox();
    // Teeth stay on the key section: the head part adds length but the housing is no wider than the teeth make it.
    expect(withHead.boundingBox!.min.x).toBeCloseTo(minX, 1);
    expect(withHead.boundingBox!.max.x).toBeCloseTo(plain.boundingBox!.max.x, 1);
    expect(maxX).toBeGreaterThan(minX);
  });
});

describe("Pikachu's face colors", () => {
  it("every colored part and the plate with its pockets are watertight", () => {
    const { plate, features } = buildClickerHeadParts("pikachu", 28);
    closed(plate);
    expect(features.length).toBeGreaterThanOrEqual(6);
    expect(new Set(features.map((f) => f.color)).size).toBeGreaterThanOrEqual(3);
    for (const f of features) closed(f.geometry);
  });
});

describe("head housing shape", () => {
  it("follows the head: the pocket is the head grown by the clearance, with no bulge from the switch square", () => {
    const area = (r: { x: number; y: number }[]) => Math.abs(signedArea(r as never));
    for (const size of [32, 36, 45]) {
      const { extra } = headHousing({ id: "pikachu", size }, 4, 0);
      const grown = offsetRings(headShapes("pikachu", size).outers, WELL_CLEARANCE, "miter");
      const want = grown.reduce((a, r) => a + area(r), 0);
      expect(Math.abs(area(extra.well) - want)).toBeLessThan(1);
    }
  });
});

describe("body color", () => {
  it("follows the head's color unless one was picked", () => {
    expect(effectiveBodyColor(null, true, "pikachu")).toBe(CUSTOM_HEADS.pikachu.color);
    expect(effectiveBodyColor(null, true, "snorlax")).toBe("#0D646E"); // the dark teal of its head, not the cream face
    expect(effectiveBodyColor(null, false, "pikachu")).toBe(DEFAULT_BODY_COLOR);
    expect(effectiveBodyColor(null, true, "bear")).toBe(DEFAULT_BODY_COLOR);
    expect(effectiveBodyColor("#123456", true, "pikachu")).toBe("#123456");
  });
});

describe("every character head", () => {
  for (const id of Object.keys(CUSTOM_HEADS)) {
    it(`${id}: plate, every colored part and the housing at sizes 32 to 45 are watertight`, () => {
      const { plate, features } = buildClickerHeadParts(id, 36);
      closed(plate);
      for (const f of features) closed(f.geometry);
      for (const size of [32, 45]) {
        for (const thick of [false, true]) closed(buildClickerHousing(3, "wavy", { id, size }, thick));
        closed(buildClickerRing(3, { id, size }));
      }
    });
  }
});

describe("buildClickerHead", () => {
  it("is watertight for every icon", () => {
    for (const s of SHAPES) closed(buildClickerHead(s.id, 28));
    for (const id of Object.keys(CUSTOM_HEADS)) closed(buildClickerHead(id, HEAD_SIZE)); // characters only go down to 32 mm
  });
});
