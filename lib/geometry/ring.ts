import * as THREE from "three";
import { addFace, addWall } from "@/lib/geometry/cap";
import { MeshBuilder } from "@/lib/geometry/mesh";
import { type Ring, jitterRing } from "@/lib/geometry/polygon";

/**
 * Which side of the housing the split ring tab sticks out from. Left and right are the
 * ends of the strip; "top" is the back, where legend "up" points.
 */
export type RingSide = "top" | "left" | "right" | "bottom";
export const RING_SIDES: RingSide[] = ["top", "left", "right", "bottom"];

/** 4 mm hole: room for a 1.2 mm split ring wire to be threaded through. */
const HOLE_RADIUS = 2;
/** Material around the hole, so the tab is 8 mm wide. */
const OUTER_RADIUS = HOLE_RADIUS + 2;
/** Flat plate on the bed: prints without supports when the housing prints floor down. */
const THICKNESS = 2;
/**
 * How far the tab reaches in past the housing's outer wall. That is inside the 1.5 mm
 * wall, so the two overlap and fuse when sliced.
 */
const ROOT = 1;

/** How far (mm) the tab sticks out past the housing's wall. */
export const RING_REACH = 2 * OUTER_RADIUS;

const ARC_SEGMENTS = 24;
const HOLE_SEGMENTS = 32;

const ANGLE: Record<RingSide, number> = { right: 0, top: 90, left: 180, bottom: 270 };

const at = (p: THREE.Vector2, y: number) => new THREE.Vector3(p.x, y, -p.y);

/**
 * Outline of the tab and of its hole in the legend's 2D plane (x right, y toward the back),
 * for a box whose outer wall is `halfW` / `halfD` from the middle.
 */
export function ringOutline(halfW: number, halfD: number, side: RingSide): { outer: Ring; hole: Ring } {
  const R = OUTER_RADIUS;
  // Along the tab: u = 0 at the box's wall, growing outward. Across: v.
  const centerU = R;

  const local: [number, number][] = [[-ROOT, -R], [centerU, -R]];
  for (let k = 1; k < ARC_SEGMENTS; k++) {
    const a = THREE.MathUtils.degToRad(-90 + (180 * k) / ARC_SEGMENTS);
    local.push([centerU + R * Math.cos(a), R * Math.sin(a)]);
  }
  local.push([centerU, R], [-ROOT, R]);

  const holeLocal: [number, number][] = [];
  for (let k = 0; k < HOLE_SEGMENTS; k++) {
    const a = (2 * Math.PI * k) / HOLE_SEGMENTS;
    holeLocal.push([centerU + HOLE_RADIUS * Math.cos(a), HOLE_RADIUS * Math.sin(a)]);
  }

  const angle = THREE.MathUtils.degToRad(ANGLE[side]);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const edge: Record<RingSide, [number, number]> = {
    right: [halfW, 0],
    left: [-halfW, 0],
    top: [0, halfD],
    bottom: [0, -halfD],
  };
  const [ex, ey] = edge[side];
  const place = ([u, v]: [number, number]) =>
    new THREE.Vector2(ex + u * cos - v * sin, ey + u * sin + v * cos);

  // Jittered once, like every other outline, so the triangulator never meets collinear points.
  return {
    outer: jitterRing(local.map(place), 4001),
    hole: jitterRing(holeLocal.map(place), 4002),
  };
}

/**
 * A flat plate with a hole, standing on `y0`, for a box whose outer wall is `halfW` /
 * `halfD` from the middle. It is its own closed solid; it overlaps the wall a little
 * instead of being cut into it, since there are no boolean operations.
 */
export function buildRingTab(halfW: number, halfD: number, side: RingSide, y0 = 0): THREE.BufferGeometry {
  const { outer, hole } = ringOutline(halfW, halfD, side);
  const y1 = y0 + THICKNESS;
  const holeHole = [...hole].reverse();

  const mesh = new MeshBuilder();
  addFace(mesh, outer, [holeHole], y1, true);
  addFace(mesh, outer, [holeHole], y0, false);
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    mesh.addQuad(at(outer[i], y0), at(outer[j], y0), at(outer[j], y1), at(outer[i], y1));
  }
  addWall(mesh, hole, y0, y1, true);
  return mesh.toGeometry();
}
