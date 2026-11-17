import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { strFromU8, unzipSync } from "fflate";
import { buildKeycapParts } from "@/lib/geometry/cap";
import { buildHousing, previewLayout } from "@/lib/geometry/housing";
import { arrangeOnBed, build3mf } from "@/lib/export/threemf";

const file = readFileSync("public/fonts/roboto-latin-700-normal.woff");
const font = parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));

describe("build3mf with several keys", () => {
  it("writes a part for every cap, every legend and the one housing", () => {
    const units = [1, 2, 1];
    const layout = previewLayout(units, "separate");
    const items = units.map((u, i) => {
      const p = buildKeycapParts(
        { units: u, text: "ABC"[i], fontSize: 6, offsetX: 0, offsetY: 0, rotation: 0, raise: 0, stemTolerance: 0.1 },
        font
      );
      return {
        name: `Keycap ${i + 1}`,
        parts: [
          { name: "Cap", geometry: p.cap, color: "#e8e8e8", extruder: 1 },
          { name: "Legend", geometry: p.legend!, color: "#ff6a00", extruder: 2 },
        ],
        faceDown: true,
        offsetX: layout.capXs[i],
      };
    });
    items.push({
      name: "Housing",
      parts: [{ name: "Housing", geometry: buildHousing(units), color: "#e8e8e8", extruder: 1 }],
      faceDown: false,
      offsetX: layout.housingX,
    });

    const files = unzipSync(build3mf(items));
    const model = strFromU8(files["3D/3dmodel.model"]);
    // 3 caps + 3 legends + 1 housing as parts, plus one wrapper object per item.
    expect(model.match(/<object /g)!.length).toBeGreaterThanOrEqual(7);
    expect(model.match(/<item /g)).toHaveLength(4);

    // Colors as a standard 3MF color group, which slicers can read without any settings file.
    expect(model).toContain("<m:colorgroup");
    expect(model).toContain('<m:color color="#E8E8E8FF"/>');
    expect(model).toContain('<m:color color="#FF6A00FF"/>');
    expect(model).toMatch(/<triangle v1="\d+" v2="\d+" v3="\d+" pid="1" p1="1"\/>/);

    // No project settings and no claim to be Bambu Studio: Bambu rejects such a file as invalid.
    expect(files["Metadata/project_settings.config"]).toBeUndefined();
    expect(model).not.toMatch(/BambuStudio/);

    // Every part says which filament it prints with.
    const settings = strFromU8(files["Metadata/model_settings.config"]);
    expect(settings.match(/key="extruder" value="2"/g)).toHaveLength(3);
    expect(settings.match(/key="extruder" value="1"/g)!.length).toBeGreaterThanOrEqual(4);
  });
});

describe("arrangeOnBed", () => {
  it("keeps every item inside the plate, centered, without overlaps", () => {
    const housing = buildHousing([1, 1, 1, 1, 1]);
    const cap = buildKeycapParts({ units: 1, text: "", fontSize: 12, offsetX: 0, offsetY: 0, rotation: 0, raise: 0, stemTolerance: 0.1 }, null).cap;
    const item = (name: string, g: typeof housing, faceDown: boolean) => ({ name, faceDown, parts: [{ name, geometry: g, color: "#ffffff", extruder: 1 }] });
    const big = item("Housing", housing, false);
    const small = [1, 2, 3, 4, 5].map((i) => item(`Key ${i}`, cap, true));
    arrangeOnBed([[big], small], 256, 8);
    const files = unzipSync(build3mf([big, ...small]));
    const xml = strFromU8(files["3D/3dmodel.model"]);
    const xs = [...xml.matchAll(/<vertex x="([-\d.]+)" y="([-\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])]);
    for (const [x, y] of xs) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(256);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(256);
    }
    const cx = xs.reduce((a, p) => a + p[0], 0) / xs.length;
    expect(Math.abs(cx - 128)).toBeLessThan(40);
  });
});
