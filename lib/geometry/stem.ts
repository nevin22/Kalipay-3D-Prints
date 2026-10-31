import * as THREE from "three";
import { type Ring, jitterRing } from "@/lib/geometry/polygon";

/** Cherry MX stem, rough numbers in mm. */
export const STEM_RADIUS = 2.75;
/**
 * How far the stem hangs below the underside of the cap's top. It ends about
 * 1 mm above the skirt's bottom edge, so the skirt keeps clear of the plate
 * for the switch's full 4 mm of travel.
 */
export const STEM_LENGTH = 6.5;
/** Depth of the "+" socket, measured up from the end of the stem. */
export const STEM_SOCKET_DEPTH = 4;

/** Nominal "+" socket: arm length and the thickness of each arm. */
const CROSS_LENGTH = 4.1;
const CROSS_THICKNESS_X = 1.35; // the arm running left-right
const CROSS_THICKNESS_Y = 1.17; // the arm running front-back

const CIRCLE_SEGMENTS = 32;

export type StemRings = {
  /** Round outside of the stem, counter-clockwise. */
  outer: Ring;
  /** "+" socket, counter-clockwise. */
  cross: Ring;
};

/**
 * Outlines for the stem. `tolerance` (mm) widens every part of the "+"
 * socket (negative tightens it): printed holes usually come out small.
 * Both rings are jittered like the legend rings, for the same reason.
 */
export function stemRings(tolerance: number): StemRings {
  const outer: Ring = [];
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    outer.push(new THREE.Vector2(Math.cos(a) * STEM_RADIUS, Math.sin(a) * STEM_RADIUS));
  }

  const a = (CROSS_LENGTH + tolerance) / 2; // half arm length
  const h = (CROSS_THICKNESS_X + tolerance) / 2; // half thickness, left-right arm
  const v = (CROSS_THICKNESS_Y + tolerance) / 2; // half thickness, front-back arm
  const cross: Ring = [
    [a, -h], [a, h], [v, h], [v, a], [-v, a], [-v, h],
    [-a, h], [-a, -h], [-v, -h], [-v, -a], [v, -a], [v, -h],
  ].map(([x, y]) => new THREE.Vector2(x, y));

  return { outer: jitterRing(outer, 1001), cross: jitterRing(cross, 1002) };
}
