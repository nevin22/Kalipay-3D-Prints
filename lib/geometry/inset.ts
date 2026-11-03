import * as THREE from "three";
import { type Ring, signedArea } from "@/lib/geometry/polygon";

/** Corner spikes are capped: a miter longer than 1 / MITER_MIN times the offset is clipped. */
const MITER_MIN = 0.15;

/** Left-pointing unit normal of every edge (edge i runs from point i to point i + 1). */
function edgeNormals(ring: Ring) {
  const n = ring.length;
  return ring.map((p, i) => {
    const q = ring[(i + 1) % n];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    return new THREE.Vector2(-dy / len, dx / len);
  });
}

/** For each point, the sideways move for an offset of 1: the miter of its two edge normals. */
function miters(ring: Ring) {
  const normals = edgeNormals(ring);
  const n = ring.length;
  return ring.map((_, i) => {
    const a = normals[(i - 1 + n) % n];
    const b = normals[i];
    const k = Math.max(1 + a.dot(b), MITER_MIN);
    return new THREE.Vector2((a.x + b.x) / k, (a.y + b.y) / k);
  });
}

/**
 * Move every point of a ring sideways by `d`, to the left of its direction. Legend outer rings run
 * counter-clockwise and holes clockwise, so left is always into the material: outer rings shrink
 * and holes grow. The point count stays the same, so the result joins the original point to point.
 * `scales` (0 to 1, one per point) lets some points move less than the rest.
 */
export function insetRing(ring: Ring, d: number, scales?: number[]): Ring {
  const m = miters(ring);
  return ring.map((p, i) => new THREE.Vector2(p.x + d * (scales?.[i] ?? 1) * m[i].x, p.y + d * (scales?.[i] ?? 1) * m[i].y));
}

const cross = (o: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2) =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** True when segment ab properly crosses segment cd. */
function crosses(a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2, d: THREE.Vector2) {
  return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
}

/** True when any edge of the rings crosses another edge, of the same ring or a different one. */
export function ringsCross(rings: Ring[]): boolean {
  for (let i = 0; i < rings.length; i++) {
    for (let j = i; j < rings.length; j++) {
      const A = rings[i];
      const B = rings[j];
      for (let a = 0; a < A.length; a++) {
        const a2 = A[(a + 1) % A.length];
        for (let b = i === j ? a + 2 : 0; b < B.length; b++) {
          // The first and last edge of one ring touch each other.
          if (i === j && a === 0 && b === B.length - 1) continue;
          if (crosses(A[a], a2, B[b], B[(b + 1) % B.length])) return true;
        }
      }
    }
  }
  return false;
}

/** Shortest distance from point p to segment ab. */
function distanceToSegment(p: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

/** A point may move at most this fraction of its distance to the nearest other edge. */
const CLEARANCE_SHARE = 0.4;
/** On the same outline, an edge only counts as across a thin part if it is this many times farther along the outline than across. */
const ARC_RATIO = 2.5;
/** An edge may shrink to no less than this fraction of its length. */
const MIN_EDGE_KEEP = 0.1;

/**
 * How far each point of the rings can safely move for an inset of `d`, as a scale from 0 to 1 per
 * point (one array per ring). Traced pictures have short edges, sharp corners and thin parts, and
 * moving every point by the full `d` would make the outline cross itself. So points near those
 * move less (down to not at all), and the rest move the full distance. The result is checked, and
 * all scales are halved until the moved outlines are valid. Returns null if that never works.
 */
export function insetScales(rings: Ring[], d: number): number[][] | null {
  const mit = rings.map(miters);
  const scales = rings.map((r) => r.map(() => 1));

  // Distance along each ring from its first point, to tell edges nearby along the outline from
  // edges on the far side of a thin stroke.
  const along = rings.map((ring) => {
    const cum = [0];
    ring.forEach((p, i) => cum.push(cum[i] + p.distanceTo(ring[(i + 1) % ring.length])));
    return cum;
  });

  // Near another edge: move at most a share of the distance to it, so two walls never meet.
  rings.forEach((ring, ri) => {
    ring.forEach((p, i) => {
      let clear = Infinity;
      rings.forEach((other, oi) => {
        for (let e = 0; e < other.length; e++) {
          const dist = distanceToSegment(p, other[e], other[(e + 1) % other.length]);
          if (oi === ri) {
            // An edge a short way along the same outline (the next bit of a curve, the other side
            // of a corner) is not an obstacle; the edge-length check below covers it. An edge
            // that is close across but far along the outline is the other side of a thin part.
            const total = along[ri][ring.length];
            const gap = Math.min(
              ...[e, e + 1].map((end) => {
                const g = Math.abs(along[ri][end] - along[ri][i]);
                return Math.min(g, total - g);
              })
            );
            if (gap <= ARC_RATIO * dist) continue;
          }
          clear = Math.min(clear, dist);
        }
      });
      const move = d * mit[ri][i].length();
      if (move > 0) scales[ri][i] = Math.min(1, (CLEARANCE_SHARE * clear) / move);
    });
  });

  // Short edges between sharp corners would flip: halve both ends until each edge keeps its direction.
  rings.forEach((ring, ri) => {
    const n = ring.length;
    for (let pass = 0; pass < 12; pass++) {
      let ok = true;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ux = ring[j].x - ring[i].x;
        const uy = ring[j].y - ring[i].y;
        const len = Math.hypot(ux, uy) || 1;
        // How far each end moves along the edge: positive moves it forward.
        const along = (k: number) => (d * scales[ri][k] * (mit[ri][k].x * ux + mit[ri][k].y * uy)) / len;
        if (len + along(j) - along(i) < MIN_EDGE_KEEP * len) {
          scales[ri][i] *= 0.5;
          scales[ri][j] *= 0.5;
          ok = false;
        }
      }
      if (ok) break;
    }
  });

  // Last check on the real result; if anything still crosses, move everything less and try again.
  for (let tries = 0; tries < 8; tries++) {
    const moved = rings.map((r, ri) => insetRing(r, d, scales[ri]));
    const flipped = moved.some((m, i) => signedArea(m) > 0 !== signedArea(rings[i]) > 0);
    if (!flipped && !ringsCross(moved)) return scales;
    scales.forEach((s) => s.forEach((_, k) => (s[k] *= 0.5)));
  }
  return null;
}
