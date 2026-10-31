import type * as THREE from "three";

export type MeshReport = {
  triangles: number;
  /** Directed edges whose reverse edge is missing: holes in the surface. */
  openEdges: number;
  /** Directed edges used by more than one triangle. */
  nonManifoldEdges: number;
  /** Triangles with repeated vertices or (almost) no area. */
  degenerate: number;
  /** Enclosed volume in mm³; positive when the triangles face outward. */
  volume: number;
  /** Every edge appears once in each direction and nothing is degenerate. */
  watertight: boolean;
};

/** Triangles smaller than this (mm²) count as degenerate. */
const MIN_AREA = 1e-9;

/**
 * Print-ready check for a triangle-soup geometry (the kind MeshBuilder makes).
 * Vertices are welded by exact position, which works because faces that meet
 * are built from the same points.
 */
export function validateMesh(geometry: THREE.BufferGeometry): MeshReport {
  const pos = geometry.getAttribute("position");
  const ids = new Map<string, number>();
  const idOf = (i: number) => {
    const key = `${pos.getX(i)},${pos.getY(i)},${pos.getZ(i)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = ids.size;
      ids.set(key, id);
    }
    return id;
  };

  const edges = new Map<string, number>();
  const addEdge = (a: number, b: number) => {
    const key = `${a}>${b}`;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  };

  let degenerate = 0;
  let volume = 0;
  const triangles = pos.count / 3;
  for (let t = 0; t < triangles; t++) {
    const i = t * 3;
    const a = idOf(i);
    const b = idOf(i + 1);
    const c = idOf(i + 2);

    const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
    const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1);
    const cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2);

    // Cross product of (b - a) and (c - a): its length is twice the area.
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const area = Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;

    if (a === b || b === c || a === c || area < MIN_AREA) {
      degenerate++;
      continue;
    }

    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }

  let openEdges = 0;
  let nonManifoldEdges = 0;
  for (const [key, count] of edges) {
    if (count > 1) nonManifoldEdges++;
    const [a, b] = key.split(">");
    if (!edges.has(`${b}>${a}`)) openEdges++;
  }

  return {
    triangles,
    openEdges,
    nonManifoldEdges,
    degenerate,
    volume,
    watertight: openEdges === 0 && nonManifoldEdges === 0 && degenerate === 0,
  };
}
