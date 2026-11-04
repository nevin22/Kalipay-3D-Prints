import * as THREE from "three";
import ClipperLib from "clipper-lib";
import type { Ring } from "@/lib/geometry/polygon";

/** Clipper works on whole numbers, so millimeters become microns on the way in and out. */
const SCALE = 1000;
/** How far (microns) a rounded corner may stray from a true circle: 0.01 mm. */
const ARC_TOLERANCE = 10;

const toPath = (ring: Ring) =>
  ring.map((p) => ({ X: Math.round(p.x * SCALE), Y: Math.round(p.y * SCALE) }));
const toRing = (path: { X: number; Y: number }[]): Ring =>
  path.map((p) => new THREE.Vector2(p.X / SCALE, p.Y / SCALE));

/**
 * Merge overlapping outlines into one set of outlines. Outer rings come back counter-clockwise,
 * holes clockwise. This is the 2D join that stands in for boolean operations on meshes.
 */
export function unionRings(rings: Ring[]): Ring[] {
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(rings.map(toPath), ClipperLib.PolyType.ptSubject, true);
  const out: { X: number; Y: number }[][] = [];
  const { ctUnion } = ClipperLib.ClipType;
  const { pftNonZero } = ClipperLib.PolyFillType;
  clipper.Execute(ctUnion, out, pftNonZero, pftNonZero);
  return out.map(toRing);
}

/**
 * Grow (`delta` > 0) or shrink (`delta` < 0) outlines by `delta` mm, with rounded corners.
 * Give it outer rings only, counter-clockwise. Outlines that touch after growing are merged.
 */
export function offsetRings(rings: Ring[], delta: number): Ring[] {
  const offset = new ClipperLib.ClipperOffset(2, ARC_TOLERANCE);
  offset.AddPaths(rings.map(toPath), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const out: { X: number; Y: number }[][] = [];
  offset.Execute(out, delta * SCALE);
  return out.map(toRing);
}
