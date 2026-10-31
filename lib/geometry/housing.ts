import * as THREE from "three";
import type { HousingLayout } from "@/store/useGenerator";
import { CAP_CORNER_RADIUS, CAP_HEIGHT, capDimensions } from "@/lib/geometry/keycap";
import { addFace, addWall, roundedRectangle } from "@/lib/geometry/cap";
import { MeshBuilder } from "@/lib/geometry/mesh";
import { type Ring, jitterRing } from "@/lib/geometry/polygon";
import { RING_REACH, type RingSide, buildRingTab } from "@/lib/geometry/ring";

/**
 * Fixed housing for MX-style switches (plate mount, 3-pin/5-pin), mm.
 * One strip with a square well per key. Each well has the switch plate at its
 * bottom and the cap's skirt drops into it when pressed; neighbouring wells
 * share one wall. The numbers are the usual MX plate cutout, not tuned to a
 * particular brand.
 */
const FLOOR = 1.2;
/** Room under the plate: switch body (about 5 mm) plus its pins (about 3.3 mm). */
const CAVITY_HEIGHT = 8.6;
/** Plate thickness the switch's side clips are made for. */
const PLATE = 1.5;
/**
 * Rim standing above the plate. The released cap's skirt sits 4 mm above the
 * plate (the switch travel), so this keeps it inside the well.
 */
const RIM = 6;
const WALL = 1.5;
/** Gap between the cap's skirt and the well wall, per side. */
const WELL_CLEARANCE = 0.6;
/** How far the box sticks out past the cap's footprint on every side. */
const MARGIN = WALL + WELL_CLEARANCE;

const HOLE = 14.1;
const NOTCH_LENGTH = 5;
const NOTCH_DEPTH = 0.8;

/** Height of the top of the plate above the floor's underside. */
const PLATE_TOP = FLOOR + CAVITY_HEIGHT + PLATE;
export const HOUSING_HEIGHT = PLATE_TOP + RIM;

/** Gap (mm) between the caps and the housing when they sit side by side. */
const SIDE_GAP = 8;
/** Height of the released cap's skirt above the plate (= switch travel). */
const SKIRT_ABOVE_PLATE = 4;

/**
 * Size of the housing strip for a row of keys, and where each key's well is
 * (x of its center, with the strip centered on 0). A single key gives the
 * same box as a lone housing: the walls on both sides plus the well.
 */
export function housingLayout(units: number[]) {
  const wellWidths = units.map((u) => capDimensions(u).bottomW + 2 * WELL_CLEARANCE);
  const width = wellWidths.reduce((sum, w) => sum + w, 0) + (units.length + 1) * WALL;
  const depth = capDimensions(1).bottomD + 2 * MARGIN;

  const centers: number[] = [];
  let x = -width / 2 + WALL;
  for (const w of wellWidths) {
    centers.push(x + w / 2);
    x += w + WALL;
  }
  return { width, depth, wellWidths, centers };
}

/**
 * Total width (mm) of everything shown in a layout: the camera needs it to fit the scene.
 * A split ring tab on the left or right end adds its reach, either to the gap between the
 * caps and the housing or to the outside.
 */
export function layoutExtent(units: number[], layout: HousingLayout, ring: RingSide | "off" = "off"): number {
  const { width } = housingLayout(units);
  const tab = ring === "left" || ring === "right" ? RING_REACH : 0;
  return (layout === "separate" ? width - 2 * MARGIN + SIDE_GAP + width : width) + tab;
}

/** The split ring tab for the housing: a flat plate on the floor, fused to the outer wall. */
export function buildHousingTab(units: number[], side: RingSide): THREE.BufferGeometry {
  const { width, depth } = housingLayout(units);
  return buildRingTab(width / 2, depth / 2, side, 0);
}

/**
 * Where the caps and the housing go in the preview scene, whose y = 0 is the
 * middle of the caps. `separate` puts the row of caps and the housing side by
 * side on the same floor and centers the pair, `below` stacks the caps over
 * the housing as they would sit on the switches, `hidden` leaves the caps
 * alone. In every layout each cap sits over its own well. `floorY` is the
 * lowest point and `targetY` is the height the camera looks at. `gapExtra` widens
 * the space between the caps and the housing (for a split ring tab pointing at them).
 */
export function previewLayout(units: number[], layout: HousingLayout, gapExtra = 0) {
  const capFloorY = -CAP_HEIGHT / 2;
  const { width: housingW, centers } = housingLayout(units);
  // The caps' own extent: the housing minus the walls and clearance around them.
  const rowW = housingW - 2 * MARGIN;

  if (layout === "separate") {
    const total = rowW + SIDE_GAP + gapExtra + housingW;
    const rowCenter = -total / 2 + rowW / 2;
    return {
      capXs: centers.map((c) => rowCenter + c),
      housingX: total / 2 - housingW / 2,
      housingY: capFloorY,
      floorY: capFloorY,
      targetY: 0,
    };
  }
  if (layout === "below") {
    const housingY = capFloorY - SKIRT_ABOVE_PLATE - PLATE_TOP;
    return { capXs: centers, housingX: 0, housingY, floorY: housingY, targetY: housingY / 2 };
  }
  return { capXs: centers, housingX: 0, housingY: capFloorY, floorY: capFloorY, targetY: 0 };
}

/** Square switch hole with a latch notch on the left and right, counter-clockwise. */
function holeRing(): Ring {
  const h = HOLE / 2;
  const n = NOTCH_LENGTH / 2;
  const o = h + NOTCH_DEPTH;
  const pts = [
    [h, -h], [h, -n], [o, -n], [o, n], [h, n], [h, h],
    [-h, h], [-h, n], [-o, n], [-o, -n], [-h, -n], [-h, -h],
  ];
  return jitterRing(pts.map(([x, y]) => new THREE.Vector2(x, y)), 2001);
}

const shifted = (ring: Ring, dx: number): Ring => ring.map((p) => new THREE.Vector2(p.x + dx, p.y));
const at = (p: THREE.Vector2, y: number) => new THREE.Vector3(p.x, y, -p.y);

/**
 * Housing for a row of keys (`units` lists their widths, left to right).
 * Origin: middle of the floor's underside, strip centered on x = 0.
 */
export function buildHousing(units: number[]): THREE.BufferGeometry {
  const { width, depth, wellWidths, centers } = housingLayout(units);
  const innerD = depth - 2 * WALL;
  const plateBottomY = FLOOR + CAVITY_HEIGHT;

  // The well's corners follow the cap's, a clearance further out.
  const wellRadius = CAP_CORNER_RADIUS + WELL_CLEARANCE;
  const outerRadius = wellRadius + WALL;

  // Outlines in the legend's 2D plane. Every height reuses these exact points
  // (jittered once, so the triangulator never sees collinear points from
  // different outlines), which keeps the walls and faces welded together.
  const flat = (r: THREE.Vector3[]) => r.map((v) => new THREE.Vector2(v.x, -v.z));
  const outer = jitterRing(flat(roundedRectangle(width, depth, 0, outerRadius)), 3001);
  const wells = units.map((_, i) =>
    jitterRing(shifted(flat(roundedRectangle(wellWidths[i], innerD, 0, wellRadius)), centers[i]), 3100 + i)
  );
  const holes = units.map((_, i) => shifted(holeRing(), centers[i]));

  const mesh = new MeshBuilder();

  // Underside and outside walls.
  addFace(mesh, outer, [], 0, false);
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    mesh.addQuad(at(outer[i], 0), at(outer[j], 0), at(outer[j], HOUSING_HEIGHT), at(outer[i], HOUSING_HEIGHT));
  }

  // Top rim: the outline with a hole for every well.
  addFace(mesh, outer, wells.map((w) => [...w].reverse()), HOUSING_HEIGHT, true);

  wells.forEach((well, k) => {
    const holeHole = [...holes[k]].reverse();

    // Hollow below the plate, floor of the hollow, and the well above the plate.
    addFace(mesh, well, [], FLOOR, true);
    for (let i = 0; i < well.length; i++) {
      const j = (i + 1) % well.length;
      mesh.addQuad(at(well[j], FLOOR), at(well[i], FLOOR), at(well[i], plateBottomY), at(well[j], plateBottomY));
      mesh.addQuad(at(well[j], PLATE_TOP), at(well[i], PLATE_TOP), at(well[i], HOUSING_HEIGHT), at(well[j], HOUSING_HEIGHT));
    }

    // Plate: its upper face (the well's floor), the underside, and the switch hole walls.
    addFace(mesh, well, [holeHole], PLATE_TOP, true);
    addFace(mesh, well, [holeHole], plateBottomY, false);
    addWall(mesh, holes[k], plateBottomY, PLATE_TOP, true);
  });

  return mesh.toGeometry();
}
