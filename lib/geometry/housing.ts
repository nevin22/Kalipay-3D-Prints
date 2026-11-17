import * as THREE from "three";
import type { HousingLayout } from "@/store/useGenerator";
import { CAP_CORNER_RADIUS, DEFAULT_CAP_HEIGHT, capDimensions } from "@/lib/geometry/keycap";
import { addFace, addWall, roundedRectangle } from "@/lib/geometry/cap";
import { MeshBuilder } from "@/lib/geometry/mesh";
import { unionRings } from "@/lib/geometry/outline";
import { type Ring, jitterRing, orient } from "@/lib/geometry/polygon";
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
export const WALL = 1.5;
/** Gap between the cap's skirt and the well wall, per side. */
export const WELL_CLEARANCE = 0.6;
/** How far the box sticks out past the cap's footprint on every side. */
const MARGIN = WALL + WELL_CLEARANCE;

export const HOLE = 14.1;

/** Height of the top of the plate above the floor's underside. */
export const PLATE_TOP = FLOOR + CAVITY_HEIGHT + PLATE;
export const HOUSING_HEIGHT = PLATE_TOP + RIM;

/** Gap (mm) between the caps and the housing when they sit side by side. */
const SIDE_GAP = 8;
/** Height of the released cap's skirt above the plate (= switch travel). */
export const SKIRT_ABOVE_PLATE = 4;

/** Grill teeth on the long sides (key clicker): size, spacing and the unteethed end margin, mm. */
const TOOTH = { endMargin: 6 };
/** Default grill size (how far the bumps stand out, mm) and spacing (from one bump to the next, mm). */
export const GRILL_SIZE = 1.4;
export const GRILL_SPACING = 4;

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
 * The row of caps on its own, in the housing strip's coordinates (centered on 0): the left and right
 * edges of the first and last cap, the width between them, and the depth. The size lines use it.
 */
export function capRow(units: number[]) {
  const { centers } = housingLayout(units);
  const first = capDimensions(units[0]);
  const last = capDimensions(units[units.length - 1]);
  const minX = centers[0] - first.bottomW / 2;
  const maxX = centers[centers.length - 1] + last.bottomW / 2;
  return { minX, maxX, width: maxX - minX, depth: first.bottomD, firstCenter: centers[0] };
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
 * `capHeight` is the caps' height: it decides how low their bottom is.
 */
export function previewLayout(
  units: number[],
  layout: HousingLayout,
  gapExtra = 0,
  capHeight = DEFAULT_CAP_HEIGHT
) {
  const capFloorY = -capHeight / 2;
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

/** Plain square switch hole, counter-clockwise (no latch notches: they made the print stringy). */
function holeRing(): Ring {
  const h = HOLE / 2;
  const pts = [[h, -h], [h, h], [-h, h], [-h, -h]];
  return jitterRing(pts.map(([x, y]) => new THREE.Vector2(x, y)), 2001);
}

const shifted = (ring: Ring, dx: number): Ring => ring.map((p) => new THREE.Vector2(p.x + dx, p.y));
const at = (p: THREE.Vector2, y: number) => new THREE.Vector3(p.x, y, -p.y);

/**
 * Housing for a row of keys (`units` lists their widths, left to right).
 * Origin: middle of the floor's underside, strip centered on x = 0.
 */
export function buildHousing(
  units: number[],
  {
    rim = RIM,
    grill,
    grillSize = GRILL_SIZE,
    grillSpacing = GRILL_SPACING,
    extra,
    margin = 0,
  }: {
    rim?: number;
    /** Bumps along both long sides of the key section: square teeth, round bumps or a wave. */
    grill?: "teeth" | "round" | "wavy";
    /** How far the grill stands out (mm) and the distance from one bump to the next (mm). */
    grillSize?: number;
    grillSpacing?: number;
    /** One more well of any shape (the clicker's head): its outer outline, well outline (both in the strip's 2D plane) and the switch hole's x. */
    extra?: { outer: Ring; well: Ring; centerX: number };
    /** Extra wall (mm) all round the key section's outline: a thicker border. The wells stay the same. */
    margin?: number;
  } = {}
): THREE.BufferGeometry {
  const HEIGHT = PLATE_TOP + rim;
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
  let outerBase = flat(roundedRectangle(width + 2 * margin, depth + 2 * margin, 0, outerRadius + margin));
  if (grill) {
    // Grill: bumps along both long sides, joined to the outline in 2D (no booleans on meshes).
    const blocks: Ring[] = [];
    const halfW = width / 2 + margin;
    const halfD = depth / 2 + margin;
    const x0 = -halfW + TOOTH.endMargin;
    const x1 = halfW - TOOTH.endMargin;
    const v2 = (pts: number[][]) => orient(pts.map(([a, b]) => new THREE.Vector2(a, b)), true);
    for (const s of [1, -1]) {
      if (grill === "teeth") {
        const w = grillSpacing / 2;   // teeth as wide as the gaps between them
        for (let x = x0; x + w <= x1; x += grillSpacing) {
          blocks.push(v2([[x, s * (halfD - 0.5)], [x + w, s * (halfD - 0.5)], [x + w, s * (halfD + grillSize)], [x, s * (halfD + grillSize)]]));
        }
      } else if (grill === "round") {
        const R = grillSize;          // a half-circle bump standing out by its radius
        for (let x = x0 + R; x + R <= x1; x += grillSpacing) {
          blocks.push(v2(Array.from({ length: 24 }, (_, i) => [x + R * Math.cos((2 * Math.PI * i) / 24), s * halfD + R * Math.sin((2 * Math.PI * i) / 24)])));
        }
      } else {
        // One smooth wave: the outline rides a sine from the wall (0) out to the grill size, one wave per spacing.
        const amp = grillSize / 2;
        const top: number[][] = [];
        for (let x = x0; x <= x1; x += 0.4) top.push([x, s * (halfD + amp + amp * Math.sin((2 * Math.PI * (x - x0)) / grillSpacing - Math.PI / 2))]);
        blocks.push(v2([[x0, s * (halfD - 0.5)], ...top, [x1, s * (halfD - 0.5)]]));
      }
    }
    outerBase = unionRings([orient(outerBase, true), ...blocks])[0];
  }
  // Teeth put many collinear points on each side, so they need a bigger nudge (3 microns) than the plain ring.
  if (extra) outerBase = unionRings([orient(outerBase, true), orient(extra.outer, true)])[0];
  const outer = jitterRing(outerBase, 3001, grill || extra ? 0.003 : undefined);
  const wells = units.map((_, i) =>
    jitterRing(shifted(flat(roundedRectangle(wellWidths[i], innerD, 0, wellRadius)), centers[i]), 3100 + i)
  );
  const holes = units.map((_, i) => shifted(holeRing(), centers[i]));
  if (extra) {
    wells.push(jitterRing(orient(extra.well, true), 3200, 0.003));
    holes.push(shifted(holeRing(), extra.centerX));
  }

  const mesh = new MeshBuilder();
  const wellHoles = wells.map((w) => [...w].reverse());
  const topY = HEIGHT;

  // Underside and outside walls.
  addFace(mesh, outer, [], 0, false);
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    mesh.addQuad(at(outer[i], 0), at(outer[j], 0), at(outer[j], topY), at(outer[i], topY));
  }

  // Top rim: the outline with a hole for every well.
  addFace(mesh, outer, wellHoles, topY, true);

  wells.forEach((well, k) => {
    const holeHole = [...holes[k]].reverse();

    // Hollow below the plate, floor of the hollow, and the well above the plate.
    addFace(mesh, well, [], FLOOR, true);
    for (let i = 0; i < well.length; i++) {
      const j = (i + 1) % well.length;
      mesh.addQuad(at(well[j], FLOOR), at(well[i], FLOOR), at(well[i], plateBottomY), at(well[j], plateBottomY));
      mesh.addQuad(at(well[j], PLATE_TOP), at(well[i], PLATE_TOP), at(well[i], topY), at(well[j], topY));
    }

    // Plate: its upper face (the well's floor), the underside, and the switch hole walls.
    addFace(mesh, well, [holeHole], PLATE_TOP, true);
    addFace(mesh, well, [holeHole], plateBottomY, false);
    addWall(mesh, holes[k], plateBottomY, PLATE_TOP, true);
  });

  return mesh.toGeometry();
}
