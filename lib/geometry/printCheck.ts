import { CHECK_SIZE, ICON_SIZE_RATIO, MIN_GAP, MIN_HOLE, MIN_STROKE } from "@/lib/geometry/printLimits";
import { shapeToShapes } from "@/lib/geometry/shapes";

export type PrintIssue = {
  kind: "stroke" | "gap" | "hole";
  /** Width found (mm). */
  width: number;
  /** Width needed (mm). */
  limit: number;
  /** Where, in icon units (about 100 across, y up). */
  x: number;
  y: number;
};

const RES = 4; // pixels per icon unit

/** Distance (in pixels) from every cell to the nearest cell where `seed` is true (Felzenszwalb). */
function edt(seed: Uint8Array, w: number, h: number) {
  const INF = 1e12;
  const f = new Float64Array(Math.max(w, h));
  const d = new Float64Array(Math.max(w, h));
  const v = new Int32Array(Math.max(w, h));
  const z = new Float64Array(Math.max(w, h) + 1);
  const out = new Float64Array(w * h);
  const pass = (n: number, get: (i: number) => number, put: (i: number, val: number) => void) => {
    for (let i = 0; i < n; i++) f[i] = get(i);
    let k = 0;
    v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s: number;
      while ((s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])) <= z[k]) k--;
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) ** 2 + f[v[k]];
    }
    for (let i = 0; i < n; i++) put(i, d[i]);
  };
  for (let i = 0; i < w * h; i++) out[i] = seed[i] ? 0 : INF;
  for (let x = 0; x < w; x++) pass(h, (y) => out[y * w + x], (y, val) => (out[y * w + x] = val));
  for (let y = 0; y < h; y++) pass(w, (x) => out[y * w + x], (x, val) => (out[y * w + x] = val));
  return out.map(Math.sqrt);
}

/** Cells of the icon (union of its outlines, minus holes) on a grid with a 2 unit margin. */
function rasterize(id: string) {
  const shapes = shapeToShapes(id).map((s) => ({
    outer: s.extractPoints(8).shape,
    holes: s.extractPoints(8).holes,
  }));
  const w = 130 * RES; // icons are about 100 across; room for the traced ones that grew a little
  const h = w;
  const off = w / 2;
  const grid = new Uint8Array(w * h);
  const fill = (rings: { x: number; y: number }[][], value: number) => {
    for (let row = 0; row < h; row++) {
      const y = (row + 0.5 - off) / RES;
      const xs: number[] = [];
      for (const ring of rings) {
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i], b = ring[(i + 1) % ring.length];
          if ((a.y > y) !== (b.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const c0 = Math.ceil(xs[i] * RES + off - 0.5);
        const c1 = Math.floor(xs[i + 1] * RES + off - 0.5);
        for (let c = Math.max(c0, 0); c <= Math.min(c1, w - 1); c++) grid[row * w + c] = value;
      }
    }
  };
  for (const s of shapes) fill([s.outer], 1);
  for (const s of shapes) fill(s.holes, 0);
  return { grid, w, h, off };
}

/** Connected groups of true cells, as lists of cell indexes. */
function components(mask: Uint8Array, w: number, h: number) {
  const seen = new Uint8Array(mask.length);
  const groups: number[][] = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || seen[s]) continue;
    const stack = [s], group: number[] = [];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      group.push(i);
      const x = i % w, y = (i / w) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (mask[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    groups.push(group);
  }
  return groups;
}

/** Cells that survive a morphological opening (erode then dilate) of `mask` by radius r pixels. */
function opened(mask: Uint8Array, w: number, h: number, r: number) {
  const dist = edt(mask.map((m) => (m ? 0 : 1)), w, h);
  const core = new Uint8Array(mask.length).map((_, i) => (dist[i] >= r ? 1 : 0));
  const reach = edt(core, w, h);
  return mask.map((m, i) => (m && reach[i] <= r ? 1 : 0));
}

/**
 * Looks for parts of an icon that are too thin to print at `mmPerUnit`: strokes thinner than
 * MIN_STROKE, gaps narrower than MIN_GAP and holes smaller than MIN_HOLE. A part is what an
 * opening by half the limit removes; its width is the widest circle that fits in the removed
 * bit, so a tapering tip or a V-shaped notch (widest at the mouth, about the limit) is not
 * reported, only strokes and slots that stay thin. Accurate to about 0.05 mm.
 */
export function checkIcon(id: string, mmPerUnit: number): PrintIssue[] {
  const { grid, w, h, off } = rasterize(id);
  const px = mmPerUnit / RES; // mm per pixel
  const issues: PrintIssue[] = [];
  const at = (cell: number) => ({ x: ((cell % w) - off) / RES, y: (((cell / w) | 0) - off) / RES });

  const report = (kind: PrintIssue["kind"], mask: Uint8Array, limit: number) => {
    const keep = opened(mask, w, h, limit / 2 / px);
    const lost = mask.map((m, i) => (m && !keep[i] ? 1 : 0));
    const dist = edt(mask.map((m) => (m ? 0 : 1)), w, h);
    // Medial axis: cells no neighbor is farther from the edge than. A corner or a tapering tip has
    // none inside the lost bit; a stroke or slot that stays thin has a long one.
    const ridge = (i: number) => {
      const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if ((dx || dy) && nx >= 0 && ny >= 0 && nx < w && ny < h && dist[ny * w + nx] > dist[i] + 1e-9) return false;
        }
      return true;
    };
    for (const group of components(lost, w, h)) {
      const axis = group.filter(ridge).sort((a, b) => dist[a] - dist[b]);
      if (axis.length < limit / px / 2) continue;
      const mid = axis[axis.length >> 1];
      // A taper (widest at one end) is a tip, not a thin stroke: its axis runs from 0 to the limit.
      if (dist[axis[(axis.length * 3) >> 2]] - dist[axis[axis.length >> 2]] > 0.4 * dist[axis[(axis.length * 3) >> 2]]) continue;
      const width = Math.max(2 * dist[mid] - 1, 0) * px;
      if (width < limit - 0.05) issues.push({ kind, width, limit, ...at(mid) });
    }
  };

  report("stroke", grid, MIN_STROKE);

  const empty = grid.map((m) => (m ? 0 : 1));
  const exterior = new Uint8Array(empty.length);
  for (const i of components(empty, w, h).find((g) => g.includes(0))!) exterior[i] = 1;
  report("gap", exterior, MIN_GAP);
  report("hole", empty.map((e, i) => (e && !exterior[i] ? 1 : 0)), MIN_HOLE);
  return issues;
}

/** Issues of every icon at the given Size (mm), keyed by icon id; icons without issues are left out. */
export function checkAllIcons(ids: string[], size = CHECK_SIZE) {
  const out: Record<string, PrintIssue[]> = {};
  for (const id of ids) {
    const found = checkIcon(id, (size / 100) * ICON_SIZE_RATIO);
    if (found.length) out[id] = found;
  }
  return out;
}
