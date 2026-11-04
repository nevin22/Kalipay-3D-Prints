import { readFileSync } from "node:fs";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { strFromU8, unzipSync } from "fflate";
import { build3mf } from "@/lib/export/threemf";
import { type KeychainSettings, KEYCHAIN_BASES, LIMITS, buildKeychainParts, inside, keychainBase, keychainWidth, scaleToWidth, textOutlines } from "@/lib/geometry/keychain";
import { signedArea } from "@/lib/geometry/polygon";
import { useKeychain } from "@/store/useKeychain";
import { validateMesh } from "@/lib/geometry/validate";

const load = (path: string) => {
  const file = readFileSync(path);
  return parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
};
const roboto = load("public/fonts/roboto-latin-700-normal.woff");
const mouldy = load("public/fonts/mouldy-cheese.ttf");
const pacifico = load("public/fonts/pacifico-latin-400-normal.woff");

const base: KeychainSettings = { text: "Mia", fontSize: 14, bold: 0, base: "rounded", padding: 3.5, puff: 1, thickness: 2.4, raise: 1, hole: "left" };

describe("buildKeychainParts", () => {
  for (const { id } of KEYCHAIN_BASES) {
    for (const hole of ["left", "right", "off"] as const) {
      for (const text of ["Mia", "Hello World", "Wg.", "i"]) {
        it(`is watertight: ${id} base, hole ${hole}, "${text}"`, () => {
          const parts = buildKeychainParts({ ...base, base: id, hole, text }, roboto);
          const b = validateMesh(parts.base);
          expect(b.watertight).toBe(true);
          expect(b.volume).toBeGreaterThan(0);
          const t = validateMesh(parts.text!);
          expect(t.watertight).toBe(true);
          expect(t.volume).toBeGreaterThan(0);
        });
      }
    }
  }

  const extremes: [string, Partial<KeychainSettings>][] = [
    ["smallest settings", { fontSize: 6, padding: 1.5, puff: 0, thickness: 0.4, raise: 0.2 }],
    ["largest settings", { fontSize: 24, padding: 8, thickness: 5, raise: 2 }],
  ];
  for (const [name, patch] of extremes) {
    for (const { id } of KEYCHAIN_BASES) {
      it(`is watertight at the ${name}: ${id} base, 12 wide letters`, () => {
        const parts = buildKeychainParts({ ...base, ...patch, base: id, text: "WWWWWWWWWWWW" }, roboto);
        expect(validateMesh(parts.base).watertight).toBe(true);
        expect(validateMesh(parts.text!).watertight).toBe(true);
      });
    }
  }

  // Script letters overlap each other, so they have to be merged into one clean outline first.
  for (const { id } of KEYCHAIN_BASES) {
    for (const text of ["Nicole", "Mia Rose", "Fly"]) {
      it(`is watertight with the script font: ${id} base, "${text}"`, () => {
        const parts = buildKeychainParts({ ...base, base: id, text, fontSize: 16 }, pacifico);
        expect(validateMesh(parts.base).watertight).toBe(true);
        expect(validateMesh(parts.text!).watertight).toBe(true);
      });
    }
  }

  it("merges overlapping script letters into fewer outlines than letters", () => {
    expect(textOutlines(pacifico, "Nicole", 16).length).toBeLessThan(6);
  });

  it("is watertight with bold letters, and bold makes them bigger", () => {
    for (const bold of [0.5, 1.5]) {
      const parts = buildKeychainParts({ ...base, text: "Nicole", fontSize: 16, bold }, pacifico);
      expect(validateMesh(parts.base).watertight).toBe(true);
      expect(validateMesh(parts.text!).watertight).toBe(true);
    }
    const volume = (bold: number) => validateMesh(buildKeychainParts({ ...base, text: "Nicole", fontSize: 16, bold }, pacifico).text!).volume;
    expect(volume(1)).toBeGreaterThan(volume(0));
  });

  it("follow-the-text hugs the letters tighter at low smoothness, and is watertight at every setting", () => {
    const area = (puff: number) => {
      const parts = buildKeychainParts({ ...base, base: "follow", text: "Nicole", fontSize: 18, puff, hole: "off" }, pacifico);
      expect(validateMesh(parts.base).watertight).toBe(true);
      return validateMesh(parts.base).volume;
    };
    expect(area(0)).toBeLessThan(area(3));
    [0.5, 1, 2, 3].forEach(area);
  });

  it("works with a rounded display font too", () => {
    const parts = buildKeychainParts({ ...base, base: "follow", text: "Kalipay" }, mouldy);
    expect(validateMesh(parts.base).watertight).toBe(true);
    expect(validateMesh(parts.text!).watertight).toBe(true);
  });

  it("gives a plain base and no text when the text is empty", () => {
    const parts = buildKeychainParts({ ...base, text: "  " }, roboto);
    expect(parts.text).toBeNull();
    expect(validateMesh(parts.base).watertight).toBe(true);
  });

  it("gets longer as the text gets longer", () => {
    const width = (text: string) => {
      const geo = buildKeychainParts({ ...base, text, hole: "off" }, roboto).base;
      geo.computeBoundingBox();
      return geo.boundingBox!.max.x - geo.boundingBox!.min.x;
    };
    expect(width("Mia Rose")).toBeGreaterThan(width("Mia"));
  });
});

describe("3MF export", () => {
  it("writes the base on filament 1 and the text on filament 2, resting on the bed", () => {
    const parts = buildKeychainParts(base, roboto);
    const zip = unzipSync(
      build3mf([
        {
          name: "Keychain",
          parts: [
            { name: "Base", geometry: parts.base, color: "#ff6a00", extruder: 1 },
            { name: "Text", geometry: parts.text!, color: "#ffffff", extruder: 2 },
          ],
          faceDown: false,
        },
      ])
    );
    const model = strFromU8(zip["3D/3dmodel.model"]);
    const settings = strFromU8(zip["Metadata/model_settings.config"]);
    expect(model).toContain('name="Base"');
    expect(model).toContain('name="Text"');
    expect(settings).toContain('<metadata key="extruder" value="2"/>');

    // Z is up in the file: the lowest point is the bed, the highest is the top of the text.
    const zs = [...model.matchAll(/ z="([-\d.]+)"/g)].map((m) => Number(m[1]));
    expect(Math.min(...zs)).toBeCloseTo(0, 5);
    expect(Math.max(...zs)).toBeCloseTo(base.thickness + base.raise, 3);
  });
});

describe("ring hole", () => {
  for (const { id } of KEYCHAIN_BASES) {
    for (const hole of ["left", "right"] as const) {
      for (const padding of [1.5, 2]) {
        it(`never cuts into a letter: ${id} base, hole ${hole}, padding ${padding}`, () => {
          for (const [font, text, size] of [[pacifico, "Nicole", 18], [roboto, "Mia", 14]] as const) {
            const letters = textOutlines(font, text, size);
            const ring = keychainBase({ ...base, base: id, hole, padding, fontSize: size, text }, letters).hole!;
            expect(ring.some((p) => letters.some((o) => inside(p, o.outer)))).toBe(false);
          }
        });
      }
    }
  }
});

describe("keychainBase", () => {
  const outer = (s: Partial<KeychainSettings>) => {
    const settings = { ...base, hole: "off" as const, ...s };
    return keychainBase(settings, textOutlines(roboto, settings.text, settings.fontSize)).outer;
  };

  it("follow-the-text is one outline that covers the words and the space between them", () => {
    const ring = outer({ base: "follow", text: "A B" });
    const box = new THREE.Box2();
    ring.forEach((p) => box.expandByPoint(p));
    const text = new THREE.Box2();
    textOutlines(roboto, "A B", base.fontSize).forEach((o) => o.outer.forEach((p) => text.expandByPoint(p)));
    expect(signedArea(ring)).toBeGreaterThan(0);
    expect(box.containsBox(text)).toBe(true);
    // The base is at least `padding` bigger than the text on every side.
    expect(box.min.x).toBeLessThanOrEqual(text.min.x - base.padding + 0.1);
    expect(box.max.x).toBeGreaterThanOrEqual(text.max.x + base.padding - 0.1);
  });

  it("centers the hole on the side you pick, for every base and font", () => {
    for (const { id } of KEYCHAIN_BASES) {
      for (const side of ["left", "right"] as const) {
        for (const [font, text, size] of [[pacifico, "Nicole", 18], [roboto, "Mia", 14]] as const) {
          const { hole } = keychainBase({ ...base, base: id, hole: side, text, fontSize: size, padding: 1.5 }, textOutlines(font, text, size));
          const ys = hole!.map((p) => p.y);
          expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(0, 2);
        }
      }
    }
  });

  it("puts the hole outside the text, on the chosen side", () => {
    const left = keychainBase({ ...base, hole: "left" }, textOutlines(roboto, "Mia", 14));
    const right = keychainBase({ ...base, hole: "right" }, textOutlines(roboto, "Mia", 14));
    const text = new THREE.Box2();
    textOutlines(roboto, "Mia", 14).forEach((o) => o.outer.forEach((p) => text.expandByPoint(p)));
    const midX = (r: NonNullable<typeof left.hole>) => r.reduce((a, p) => a + p.x, 0) / r.length;
    expect(midX(left.hole!)).toBeLessThan(text.min.x - 1);
    expect(midX(right.hole!)).toBeGreaterThan(text.max.x + 1);
  });
});

describe("size", () => {
  const sizes: [string, typeof pacifico, KeychainSettings][] = [
    ["Pacifico", pacifico, { text: "Minthara", fontSize: 36, bold: 1, base: "follow", padding: 4, puff: 0, thickness: 1.5, raise: 1, hole: "left" }],
    ["Roboto", roboto, { text: "Minthara", fontSize: 20, bold: 0.5, base: "rounded", padding: 7, puff: 0, thickness: 1.5, raise: 1, hole: "right" }],
  ];

  it("keychainWidth matches the width of the mesh", () => {
    for (const [, font, s] of sizes) {
      const geo = buildKeychainParts(s, font).base;
      geo.computeBoundingBox();
      expect(keychainWidth(s, font)).toBeCloseTo(geo.boundingBox!.max.x - geo.boundingBox!.min.x, 1);
    }
  });

  for (const [name, font, s] of sizes) {
    for (const target of [60, 120, 200]) {
      it(`scaleToWidth reaches ${target} mm within 1%: ${name}`, () => {
        const next = scaleToWidth(s, font, target);
        expect(Math.abs(keychainWidth({ ...s, ...next }, font) - target) / target).toBeLessThan(0.01);
      });
    }

    it(`scaleToWidth keeps the look (everything scales together): ${name}`, () => {
      const next = scaleToWidth(s, font, 120);
      const k = next.fontSize / s.fontSize;
      expect(next.padding / s.padding).toBeCloseTo(k, 1);
      expect(next.bold / s.bold).toBeCloseTo(k, 1);
    });

    it(`scaleToWidth stops at the limits and does not crash: ${name}`, () => {
      const huge = scaleToWidth(s, font, 5000);
      expect(huge.fontSize).toBe(LIMITS.fontSize.max);
      expect(huge.padding).toBeLessThanOrEqual(LIMITS.padding.max);
      const tiny = scaleToWidth(s, font, 1);
      expect(tiny.fontSize).toBe(LIMITS.fontSize.min);
      expect(tiny.padding).toBe(LIMITS.padding.min);
    });
  }

  it("leaves the settings alone when there is no text or the target is not a number", () => {
    const s = sizes[0][2];
    expect(scaleToWidth({ ...s, text: " " }, pacifico, 100)).toEqual({ fontSize: 36, padding: 4, bold: 1, puff: 0 });
    expect(scaleToWidth(s, pacifico, NaN)).toEqual({ fontSize: 36, padding: 4, bold: 1, puff: 0 });
  });
});

describe("default keychain", () => {
  it("opens about 100 mm wide, and about 25 mm long, for the default name", () => {
    const { text, font, fontSize, bold, base, padding, puff, thickness, raise, hole } = useKeychain.getState();
    expect(font).toBe("pacifico");
    const settings: KeychainSettings = { text, fontSize, bold, base, padding, puff, thickness, raise, hole };
    expect(Math.abs(keychainWidth(settings, pacifico) - 100)).toBeLessThan(0.5);
    const geo = buildKeychainParts(settings, pacifico).base;
    geo.computeBoundingBox();
    expect(Math.abs(geo.boundingBox!.max.z - geo.boundingBox!.min.z - 25)).toBeLessThan(1);
  });
});
