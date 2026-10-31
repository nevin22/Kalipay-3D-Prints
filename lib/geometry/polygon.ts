import * as THREE from "three";

/**
 * 2D helpers for outline "rings": closed polygons stored as Vector2[]
 * without a repeated closing point. All values are in mm.
 */
export type Ring = THREE.Vector2[];

/** Points closer than this (5 microns) are merged. */
export const CLEAN_TOLERANCE = 0.005;
/** Maximum nudge per axis applied by jitterRing (0.2 microns). */
export const JITTER_AMOUNT = 0.0002;

/**
 * Drop points that sit within `tolerance` of the previous kept point,
 * including the closing point. Returns [] if fewer than 3 points remain.
 */
export function cleanRing(ring: Ring, tolerance = CLEAN_TOLERANCE): Ring {
  const out: Ring = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || last.distanceTo(p) > tolerance) out.push(p.clone());
  }
  while (out.length > 1 && out[out.length - 1].distanceTo(out[0]) <= tolerance) {
    out.pop();
  }
  return out.length >= 3 ? out : [];
}

/** Small deterministic PRNG so the same text always gives the same mesh. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Nudge every point by up to `amount` on each axis. The triangulator drops
 * exactly-collinear points and draws edges through collinear points from
 * different outlines (all capitals share a top line), which leaves open
 * edges in the mesh. A sub-micron jitter breaks those ties.
 */
export function jitterRing(ring: Ring, seed = 1, amount = JITTER_AMOUNT): Ring {
  const rand = mulberry32(seed);
  return ring.map(
    (p) =>
      new THREE.Vector2(
        p.x + (rand() * 2 - 1) * amount,
        p.y + (rand() * 2 - 1) * amount
      )
  );
}

/** Signed area: positive when the ring runs counter-clockwise (Y up). */
export function signedArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j].x * ring[i].y - ring[i].x * ring[j].y;
  }
  return a / 2;
}

/** Return the ring running counter-clockwise (`ccw`) or clockwise. */
export function orient(ring: Ring, ccw: boolean): Ring {
  return signedArea(ring) > 0 === ccw ? ring : [...ring].reverse();
}

/**
 * Triangulate an outer ring with holes. Returns index triples into
 * [...outer, ...holes.flat()], all wound the same way as `outer`.
 */
export function triangulate(outer: Ring, holes: Ring[] = []): [number, number, number][] {
  // triangulateShape mutates its inputs, so pass copies.
  const faces = THREE.ShapeUtils.triangulateShape(
    [...outer],
    holes.map((h) => [...h])
  );

  const pts = [outer, ...holes].flat();
  const ccw = signedArea(outer) > 0;
  return faces.map(([a, b, c]) => {
    const area = signedArea([pts[a], pts[b], pts[c]]);
    return area > 0 === ccw ? [a, b, c] : [a, c, b];
  });
}
