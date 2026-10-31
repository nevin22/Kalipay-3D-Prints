import * as THREE from "three";
import type { Font } from "opentype.js";
import type { GeneratorState, KeyConfig } from "@/store/useGenerator";
import {
  CAP_CORNER_RADIUS,
  CAP_EDGE_RADIUS,
  DEFAULT_CAP_HEIGHT,
  capDimensions,
} from "@/lib/geometry/keycap";
import { LEGEND_FONT_UNITS, textToShapes } from "@/lib/geometry/legend";
import { MeshBuilder } from "@/lib/geometry/mesh";
import { STEM_LENGTH, STEM_SOCKET_DEPTH, stemRings } from "@/lib/geometry/stem";
import {
  type Ring,
  cleanRing,
  jitterRing,
  orient,
  triangulate,
} from "@/lib/geometry/polygon";

export type CapSettings = Pick<
  KeyConfig,
  "units" | "text" | "fontSize" | "offsetX" | "offsetY" | "rotation" | "raise"
> &
  Pick<GeneratorState, "stemTolerance"> & { capHeight?: number };

export type KeycapParts = {
  cap: THREE.BufferGeometry;
  /** Solid that fills the legend pocket; null when there is no legend. */
  legend: THREE.BufferGeometry | null;
  /** False when the legend does not fit inside the top face. */
  fits: boolean;
};

/** The legend must stay this far (mm) inside the top face. */
export const EDGE_MARGIN = 0.4;
/** How deep (mm) the legend sits inside the cap. Fixed, not user-adjustable. */
export const LEGEND_DEPTH = 0.4;
/** Thickness (mm) of the side walls, measured horizontally. */
export const WALL = 1.5;
/** Thickness (mm) of the cap between the top face and the hollow inside. */
export const TOP_THICKNESS = 1.5;
/** Smallest corner radius (mm) of any outline, so corners never collapse. */
const MIN_CORNER_RADIUS = 0.4;
/** Segments around the cap's rounded top rim. */
const RIM_SEGMENTS = 6;
/**
 * Height (mm) of the stem's tip above the cap's bottom: 1 mm over the skirt, so the cap keeps its
 * full travel. It stays here whatever the cap's height, so a taller cap just gets a longer stem.
 */
const STEM_TIP_Y = DEFAULT_CAP_HEIGHT - TOP_THICKNESS - STEM_LENGTH;
const CURVE_SEGMENTS = 8;
/** Segments per rounded corner. */
const CORNER_SEGMENTS = 6;

/** One legend outline: outer ring counter-clockwise, holes clockwise. */
type LegendShape = { outer: Ring; holes: Ring[] };

/** Legend 2D (x, y) sits on the cap's XZ plane as (x, -y): "up" is the back. */
const at = (p: THREE.Vector2, y: number) => new THREE.Vector3(p.x, y, -p.y);

/**
 * Rectangle with rounded corners at height y, counter-clockwise seen from
 * above. Every call returns the same number of points, so two outlines of
 * different sizes can be joined point to point.
 */
export function roundedRectangle(w: number, d: number, y: number, radius: number) {
  const hw = w / 2;
  const hd = d / 2;
  const r = Math.min(radius, hw, hd);
  // Corner centers in the legend's 2D plane, counter-clockwise from the front right.
  const corners: [number, number, number][] = [
    [hw - r, -(hd - r), -90],
    [hw - r, hd - r, 0],
    [-(hw - r), hd - r, 90],
    [-(hw - r), -(hd - r), 180],
  ];
  const ring: THREE.Vector3[] = [];
  for (const [cx, cy, start] of corners) {
    for (let k = 0; k <= CORNER_SEGMENTS; k++) {
      const a = THREE.MathUtils.degToRad(start + (90 * k) / CORNER_SEGMENTS);
      ring.push(at(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)), y));
    }
  }
  return ring;
}

/** True when p lies inside a rounded rectangle centered on the origin. */
function insideRounded(p: THREE.Vector2, hw: number, hd: number, r: number) {
  const dx = Math.max(Math.abs(p.x) - (hw - r), 0);
  const dy = Math.max(Math.abs(p.y) - (hd - r), 0);
  return Math.abs(p.x) <= hw && Math.abs(p.y) <= hd && dx * dx + dy * dy <= r * r;
}

/** Text outlines in mm, centered, sized, rotated and offset. */
function legendRings(font: Font | null, s: CapSettings): LegendShape[] {
  if (!font || !s.text.trim()) return [];
  const raw = textToShapes(font, s.text).map((sh) => sh.extractPoints(CURVE_SEGMENTS));
  if (raw.length === 0) return [];

  const box = new THREE.Box2();
  for (const r of raw) for (const p of r.shape) box.expandByPoint(p);
  const center = box.getCenter(new THREE.Vector2());

  // Same order as a three.js transform: scale, rotate, translate.
  const scale = s.fontSize / LEGEND_FONT_UNITS;
  const angle = THREE.MathUtils.degToRad(s.rotation);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const transform = (p: THREE.Vector2) => {
    const x = (p.x - center.x) * scale;
    const y = (p.y - center.y) * scale;
    return new THREE.Vector2(
      x * cos - y * sin + s.offsetX,
      x * sin + y * cos + s.offsetY
    );
  };

  let seed = 1;
  const prepare = (ring: THREE.Vector2[], ccw: boolean) => {
    const clean = cleanRing(ring.map(transform));
    return clean.length ? jitterRing(orient(clean, ccw), seed++) : clean;
  };

  const shapes: LegendShape[] = [];
  for (const r of raw) {
    const outer = prepare(r.shape, true);
    if (!outer.length) continue;
    const holes = r.holes.map((h) => prepare(h, false)).filter((h) => h.length);
    shapes.push({ outer, holes });
  }
  return shapes;
}

/** Triangulate an outline with holes at height y, facing up or down. */
export function addFace(mesh: MeshBuilder, outer: Ring, holes: Ring[], y: number, up: boolean) {
  const pts = [outer, ...holes].flat();
  for (const [a, b, c] of triangulate(outer, holes)) {
    if (up) mesh.addTriangle(at(pts[a], y), at(pts[b], y), at(pts[c], y));
    else mesh.addTriangle(at(pts[a], y), at(pts[c], y), at(pts[b], y));
  }
}

/**
 * Vertical band along a ring between y0 and y1. With outer rings
 * counter-clockwise and holes clockwise, legend material is always on the
 * left of the ring's direction: `inward = false` faces away from it (the
 * legend's own walls), `inward = true` faces toward it (the pocket walls).
 */
export function addWall(mesh: MeshBuilder, ring: Ring, y0: number, y1: number, inward: boolean) {
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    if (inward) mesh.addQuad(at(q, y0), at(p, y0), at(p, y1), at(q, y1));
    else mesh.addQuad(at(p, y0), at(q, y0), at(q, y1), at(p, y1));
  }
}

/**
 * Build the cap and the legend. Origin is the center of the bottom face,
 * Y up. When the legend fits, the cap gets a pocket in its shape and the
 * legend fills it flush with the top face. Both parts are built from the
 * same rings, so they share exact vertices.
 */
export function buildKeycapParts(settings: CapSettings, font: Font | null): KeycapParts {
  const height = settings.capHeight ?? DEFAULT_CAP_HEIGHT;
  const { bottomW, bottomD, topW, topD } = capDimensions(settings.units, height);
  const radius = CAP_CORNER_RADIUS;
  const edge = CAP_EDGE_RADIUS;
  // Outline of the outside at height y, shrunk by `inset` on every side. The
  // walls are straight, so the size at any height is a straight blend.
  const outline = (y: number, inset: number) => {
    const k = y / height;
    return roundedRectangle(
      bottomW + (topW - bottomW) * k - 2 * inset,
      bottomD + (topD - bottomD) * k - 2 * inset,
      y,
      Math.max(radius - inset, MIN_CORNER_RADIUS)
    );
  };
  // Outside, bottom to top: a straight wall, then a rim that curves in along a
  // quarter circle to the flat top face. The inset has no slope at the start,
  // so the rim continues the wall smoothly.
  const outside = [outline(0, 0), outline(height - edge, 0)];
  for (let k = 1; k <= RIM_SEGMENTS; k++) {
    const a = (Math.PI / 2) * (k / RIM_SEGMENTS);
    outside.push(
      k === RIM_SEGMENTS
        ? outline(height, edge)
        : outline(height - edge + edge * Math.sin(a), edge * (1 - Math.cos(a)))
    );
  }
  const bottom = outside[0];
  const top = outside[outside.length - 1]; // the flat top face
  const shapes = legendRings(font, settings);

  // The legend must stay inside the flat part of the top, rounded corners included.
  const flatRadius = Math.max(radius - edge, MIN_CORNER_RADIUS);
  const fits = shapes.every((s) =>
    [s.outer, ...s.holes].every((ring) =>
      ring.every((p) =>
        insideRounded(
          p,
          topW / 2 - edge - EDGE_MARGIN,
          topD / 2 - edge - EDGE_MARGIN,
          Math.max(flatRadius - EDGE_MARGIN, 0)
        )
      )
    )
  );
  const pocket = fits && shapes.length > 0;
  const floor = height - LEGEND_DEPTH;

  // Hollow inside: the outer walls are straight, so the wall thickness stays
  // constant when the outline at any height is shrunk by WALL on each side.
  const ceilY = height - TOP_THICKNESS;
  const t = ceilY / height;
  const innerRadius = Math.max(radius - WALL, MIN_CORNER_RADIUS);
  const innerBottom = roundedRectangle(bottomW - 2 * WALL, bottomD - 2 * WALL, 0, innerRadius);
  const innerTop = roundedRectangle(
    bottomW + (topW - bottomW) * t - 2 * WALL,
    bottomD + (topD - bottomD) * t - 2 * WALL,
    ceilY,
    innerRadius
  );
  const stem = stemRings(settings.stemTolerance);
  const stemY = STEM_TIP_Y;
  const socketY = stemY + STEM_SOCKET_DEPTH;

  const cap = new MeshBuilder();
  for (let i = 0; i < bottom.length; i++) {
    const j = (i + 1) % bottom.length;
    // Outside wall and rim, bottom rim (facing down), inside wall (facing the hollow).
    for (let r = 0; r + 1 < outside.length; r++) {
      cap.addQuad(outside[r][i], outside[r][j], outside[r + 1][j], outside[r + 1][i]);
    }
    cap.addQuad(bottom[j], bottom[i], innerBottom[i], innerBottom[j]);
    cap.addQuad(innerBottom[j], innerBottom[i], innerTop[i], innerTop[j]);
  }

  // Underside of the top, with the stem growing out of it.
  const ceiling = innerTop.map((v) => new THREE.Vector2(v.x, -v.z));
  addFace(cap, ceiling, [[...stem.outer].reverse()], ceilY, false);
  addWall(cap, stem.outer, stemY, ceilY, false);
  // End of the stem with the "+" socket cut into it, closed at its far end.
  addFace(cap, stem.outer, [[...stem.cross].reverse()], stemY, false);
  addWall(cap, stem.cross, stemY, socketY, true);
  addFace(cap, stem.cross, [], socketY, false);

  const rect = top.map((v) => new THREE.Vector2(v.x, -v.z));
  if (pocket) {
    // Top face with a hole for every legend outline.
    const outers = shapes.map((s) => [...s.outer].reverse());
    addFace(cap, rect, outers, height, true);
    for (const s of shapes) {
      // Cap material left standing inside letter counters (e.g. the "A").
      for (const h of s.holes) addFace(cap, [...h].reverse(), [], height, true);
      addFace(cap, s.outer, s.holes, floor, true);
      for (const ring of [s.outer, ...s.holes]) addWall(cap, ring, floor, height, true);
    }
  } else {
    addFace(cap, rect, [], height, true);
  }

  let legend: THREE.BufferGeometry | null = null;
  if (shapes.length > 0) {
    // Flush in the pocket when it fits, otherwise sitting on the plain top.
    const y0 = pocket ? floor : height;
    const y1 = height + settings.raise + (pocket ? 0 : LEGEND_DEPTH);
    const mesh = new MeshBuilder();
    for (const s of shapes) {
      addFace(mesh, s.outer, s.holes, y1, true);
      addFace(mesh, s.outer, s.holes, y0, false);
      for (const ring of [s.outer, ...s.holes]) addWall(mesh, ring, y0, y1, false);
    }
    legend = mesh.toGeometry();
  }

  return { cap: cap.toGeometry(), legend, fits };
}
