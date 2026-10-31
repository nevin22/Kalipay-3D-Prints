import type * as THREE from "three";
import { strToU8, zipSync } from "fflate";

export type ThreeMFPart = {
  name: string;
  geometry: THREE.BufferGeometry;
  /** CSS hex color such as "#ff6a00". */
  color: string;
  /** Filament slot (1, 2, ...) the slicer should print this part with. */
  extruder: number;
};

const MODEL_NS = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";
const MATERIAL_NS = "http://schemas.microsoft.com/3dmanufacturing/material/2015/02";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
<Default Extension="config" ContentType="text/xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

/**
 * Cap space (Y up, origin at the middle of the bottom face) to print space
 * (Z up). Both are proper rotations about X, so triangle winding is kept.
 * Face down: the top face ends up on the bed. Otherwise the bottom does.
 */
const place = (faceDown: boolean) => (x: number, y: number, z: number) =>
  faceDown ? [x, z, -y] : [x, -z, y];

const num = (n: number) => n.toFixed(6);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** "#ff6a00" -> "#FF6A00FF" (3MF wants an alpha byte). */
const displayColor = (css: string) => `${css.toUpperCase()}FF`;

/**
 * One <mesh> element. The geometry stores every triangle on its own; slicers
 * want shared vertices, so identical positions are welded into one vertex.
 * The cap and legend were built from the same rings, so this is exact.
 */
function meshXml(
  geo: THREE.BufferGeometry,
  move: (x: number, y: number, z: number) => number[],
  /** Which entry of the color group every triangle uses, so slicers that read triangle colors see it. */
  colorRef: { pid: number; index: number }
) {
  const pos = geo.getAttribute("position").array;
  const ids = new Map<string, number>();
  const vertices: string[] = [];
  const triangles: string[] = [];

  const vertexId = (i: number) => {
    const x = pos[i * 3];
    const y = pos[i * 3 + 1];
    const z = pos[i * 3 + 2];
    const key = `${x},${y},${z}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = vertices.length;
      ids.set(key, id);
      const [px, py, pz] = move(x, y, z);
      vertices.push(`<vertex x="${num(px)}" y="${num(py)}" z="${num(pz)}"/>`);
    }
    return id;
  };

  for (let t = 0; t < pos.length / 9; t++) {
    const a = vertexId(t * 3);
    const b = vertexId(t * 3 + 1);
    const c = vertexId(t * 3 + 2);
    if (a !== b && b !== c && a !== c) {
      triangles.push(`<triangle v1="${a}" v2="${b}" v3="${c}" pid="${colorRef.pid}" p1="${colorRef.index}"/>`);
    }
  }

  return `<mesh><vertices>${vertices.join("")}</vertices><triangles>${triangles.join("")}</triangles></mesh>`;
}

/** Parts that are printed together in one orientation, as one model. */
export type ThreeMFItem = {
  /** Name of the model in the slicer's object list. */
  name: string;
  parts: ThreeMFPart[];
  /** Top face on the bed (otherwise the bottom face is). */
  faceDown: boolean;
  /** Where the item sits along the bed's X axis, in mm. */
  offsetX?: number;
};

/**
 * Build a .3mf file. Every part becomes one object that points at its color in
 * a standard 3MF color group, and every item one group object plus one build
 * item, so the slicer sees separate models, each resting exactly on the bed.
 *
 * Bambu Studio may still ignore those colors, so it also gets its own
 * settings file saying which filament slot each part prints with. It does not
 * set the slot colors: Bambu Studio refuses a settings file from a program that
 * is not Bambu Studio itself ("invalid config, load geometry data only"), so the
 * user sets filament 2's color in the slicer. Other slicers skip the file.
 */
export function build3mf(items: ThreeMFItem[]): Uint8Array {
  const MATERIALS_ID = 1;
  let nextId = 2;
  // One entry per distinct color, in the standard 3MF color group.
  const colors: string[] = [];
  const objects: string[] = [];
  const buildItems: string[] = [];
  const settings: string[] = [];

  for (const item of items) {
    const rotate = place(item.faceDown);

    // Lowest point over the item's parts, so the model sits exactly on the bed.
    let zMin = Infinity;
    for (const p of item.parts) {
      const pos = p.geometry.getAttribute("position").array;
      for (let i = 0; i < pos.length; i += 3) {
        zMin = Math.min(zMin, rotate(pos[i], pos[i + 1], pos[i + 2])[2]);
      }
    }
    const move = (x: number, y: number, z: number) => {
      const [px, py, pz] = rotate(x, y, z);
      return [px + (item.offsetX ?? 0), py, pz - zMin];
    };

    const partSettings: string[] = [];
    const ids: number[] = [];
    for (const p of item.parts) {
      const id = nextId++;
      const css = displayColor(p.color);
      let colorIndex = colors.indexOf(css);
      if (colorIndex < 0) colorIndex = colors.push(css) - 1;
      objects.push(
        `<object id="${id}" type="model" name="${esc(p.name)}" pid="${MATERIALS_ID}" pindex="${colorIndex}">` +
          `${meshXml(p.geometry, move, { pid: MATERIALS_ID, index: colorIndex })}</object>`
      );
      partSettings.push(
        `<part id="${id}" subtype="normal_part">` +
          `<metadata key="name" value="${esc(p.name)}"/>` +
          `<metadata key="extruder" value="${p.extruder}"/></part>`
      );
      ids.push(id);
    }

    const groupId = nextId++;
    const components = ids.map((id) => `<component objectid="${id}"/>`).join("");
    objects.push(
      `<object id="${groupId}" type="model" name="${esc(item.name)}"><components>${components}</components></object>`
    );
    buildItems.push(`<item objectid="${groupId}"/>`);
    settings.push(
      `<object id="${groupId}"><metadata key="name" value="${esc(item.name)}"/>` +
        `<metadata key="extruder" value="${item.parts[0].extruder}"/>${partSettings.join("")}</object>`
    );
  }

  const model =
    `<?xml version="1.0" encoding="UTF-8"?>
` +
    `<model unit="millimeter" xml:lang="en-US" xmlns="${MODEL_NS}" xmlns:m="${MATERIAL_NS}">` +
    `<resources><m:colorgroup id="${MATERIALS_ID}">${colors.map((c) => `<m:color color="${c}"/>`).join("")}</m:colorgroup>${objects.join("")}</resources>` +
    `<build>${buildItems.join("")}</build></model>`;
  const modelSettings = `<?xml version="1.0" encoding="UTF-8"?>
<config>${settings.join("")}</config>`;

  return zipSync({
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(RELS),
    "3D/3dmodel.model": strToU8(model),
    "Metadata/model_settings.config": strToU8(modelSettings),
  });
}
