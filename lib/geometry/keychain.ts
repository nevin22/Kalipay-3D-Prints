import * as THREE from "three";
import type { Font } from "opentype.js";
import { addFace, addWall } from "@/lib/geometry/cap";
import { LEGEND_FONT_UNITS, textToShapes } from "@/lib/geometry/legend";
import { MeshBuilder } from "@/lib/geometry/mesh";
import { offsetRings, unionRings } from "@/lib/geometry/outline";
import { type Ring, cleanRing, jitterRing, orient, signedArea } from "@/lib/geometry/polygon";

/** "follow" is an outline that hugs the letters; "rounded" is a rounded rectangle stretched to the text. */
export type KeychainBase = "follow" | "rounded";
export const KEYCHAIN_BASES: { id: KeychainBase; label: string }[] = [
  { id: "follow", label: "Follow the text" },
  { id: "rounded", label: "Rounded rectangle" },
];
/** Each base starts at its own padding (mm) when it is chosen. */
export const DEFAULT_PADDING: Record<KeychainBase, number> = { follow: 2.3, rounded: 4 };

/** Which end of the base has the hole for a split ring. */
export type KeychainHole = "off" | "left" | "right";

export type KeychainSettings = {
  text: string;
  fontSize: number; // mm, the text's em size (capital letters are about 0.7 of it)
  bold: number; // mm every letter is grown by on all sides: chunkier letters, tiny gaps inside them closed
  base: KeychainBase;
  padding: number; // mm of base around the text
  puff: number; // mm, only for "follow": 0 hugs every letter, higher fills the gaps and rounds the outline into a cloud
  thickness: number; // mm, the base
  raise: number; // mm the text stands above the base
  hole: KeychainHole;
};

export const MAX_TEXT = 12;
export const MIN_PADDING = 1.5;
/** A base or text solid with no height is no part at all: one 0.4 mm layer is the least that prints. */
export const MIN_HEIGHT = 0.4;

const CURVE_SEGMENTS = 8;
/** 4 mm hole: room for a 1.2 mm split ring wire. The lug around it is 2 mm wider on every side. */
const HOLE_RADIUS = 2;
const LUG_RADIUS = HOLE_RADIUS + 2;
/** Gap (mm) kept between the hole and any letter. */
const HOLE_CLEARANCE = 0.4;
/** The hole starts this far outside the base's edge: it ends HOLE_CLEARANCE short of it. */
const HOLE_OUTSET = HOLE_RADIUS + HOLE_CLEARANCE;
/** Step (mm) and most steps when moving the hole outward to clear a letter. */
const PUSH_STEP = 0.25;
const MAX_PUSH_STEPS = 200;
const CORNER_RADIUS = 3;
/** Smallest base height (mm), so the lug is never taller than the base. */
const MIN_BASE_HEIGHT = 8;
/** "Follow the text" always fills gaps up to twice this (mm) between letters; `puff` adds to it. */
const MIN_CLOSING = 0.5;
/** Below this `puff` (mm) the outline is not rounded at all. */
const MIN_PUFF = 0.1;
/** Box (mm) shown while there is no text yet. */
const EMPTY_BOX = { w: 16, h: 6 };
const ARC_POINTS = 48;

export type Outline = { outer: Ring; holes: Ring[] };

const v = (x: number, y: number) => new THREE.Vector2(x, y);

/** Legend 2D (x, y) sits on the XZ plane as (x, -y), like the keycap legend. */
const ellipse = (cx: number, cy: number, rx: number, ry: number, n = ARC_POINTS): Ring =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return v(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
  });

/** Counter-clockwise rectangle with rounded corners, centered on the origin. */
function roundedRect(w: number, h: number, radius: number): Ring {
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, hw, hh);
  const ring: Ring = [];
  // Corner centers, counter-clockwise from the lower right.
  const corners: [number, number, number][] = [
    [hw - r, -(hh - r), -90],
    [hw - r, hh - r, 0],
    [-(hw - r), hh - r, 90],
    [-(hw - r), -(hh - r), 180],
  ];
  const steps = 10;
  for (const [cx, cy, start] of corners) {
    for (let k = 0; k <= steps; k++) {
      const a = THREE.MathUtils.degToRad(start + (90 * k) / steps);
      ring.push(v(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
  }
  return ring;
}

/** The text's outlines in mm, centered on the origin. Empty when there is no text or font yet. */
export function textOutlines(font: Font | null, text: string, size: number, bold = 0): Outline[] {
  if (!font || !text.trim()) return [];
  const raw = textToShapes(font, text).map((sh) => sh.extractPoints(CURVE_SEGMENTS));
  if (raw.length === 0) return [];

  const box = new THREE.Box2();
  for (const r of raw) for (const p of r.shape) box.expandByPoint(p);
  const center = box.getCenter(new THREE.Vector2());
  const k = size / LEGEND_FONT_UNITS;

  const place = (ring: Ring, ccw: boolean) =>
    orient(cleanRing(ring.map((p) => v((p.x - center.x) * k, (p.y - center.y) * k))), ccw);

  // Script fonts draw letters that overlap each other and themselves. Merge every outline into one
  // set first, so the text is one clean solid (and the top face has no overlapping triangles).
  const union = unionRings(raw.flatMap((r) => [place(r.shape, true), ...r.holes.map((h) => place(h, false))]).filter((r) => r.length >= 3));
  // Growing shrinks the holes (the inside of an "o") by the same amount, and closes the small ones.
  const merged = bold > 0 ? offsetRings(union, bold) : union;
  const outers = merged.filter((r) => signedArea(r) > 0);
  const holes = merged.filter((r) => signedArea(r) < 0);

  // A hole belongs to the smallest outline that contains it.
  const outlines: Outline[] = outers.map((outer) => ({ outer, holes: [] }));
  for (const hole of holes) {
    const owner = outlines
      .filter((o) => inside(hole[0], o.outer))
      .sort((a, b) => signedArea(a.outer) - signedArea(b.outer))[0];
    owner?.holes.push(hole);
  }

  let seed = 1;
  const tidy = (ring: Ring, ccw: boolean) => {
    const clean = cleanRing(ring);
    return clean.length ? jitterRing(orient(clean, ccw), seed++) : clean;
  };
  return outlines
    .map((o) => ({ outer: tidy(o.outer, true), holes: o.holes.map((h) => tidy(h, false)).filter((h) => h.length) }))
    .filter((o) => o.outer.length);
}

/** True when the point lies inside the ring (ray casting). */
export function inside(p: THREE.Vector2, ring: Ring): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

const bounds = (rings: Ring[]) => {
  const box = new THREE.Box2();
  for (const r of rings) for (const p of r) box.expandByPoint(p);
  return box;
};

/** The ring with the most area: the one outline that matters when a merge leaves stray bits. */
const largest = (rings: Ring[]) =>
  rings.reduce<Ring | null>((a, b) => (a && Math.abs(signedArea(a)) >= Math.abs(signedArea(b)) ? a : b), null);

/**
 * Outer outline of the base for a text that is `w` x `h` mm, centered on the origin.
 * Falls back to the rounded rectangle if the text outline cannot be built.
 */
function baseOutline(s: KeychainSettings, w: number, h: number, textOuters: Ring[]): Ring {
  const pw = w + 2 * s.padding;
  const ph = Math.max(h + 2 * s.padding, MIN_BASE_HEIGHT);


  if (s.base === "follow" && textOuters.length) {
    // Grow past the padding, then shrink back: fills the nooks between letters. Then shrink and
    // grow by `puff`: rounds off every outer corner.
    const closing = MIN_CLOSING + s.puff;
    const grow = (extra: Ring[]) =>
      offsetRings([...textOuters, ...extra], s.padding + closing).filter((r) => signedArea(r) > 0);
    let pieces = grow([]);
    if (pieces.length > 1) {
      // Separate words: a thin bar through the middle joins them into one piece.
      pieces = grow([[v(-w / 2, -0.5), v(w / 2, -0.5), v(w / 2, 0.5), v(-w / 2, 0.5)]]);
    }
    const grown = largest(pieces);
    const closed = grown && largest(offsetRings([grown], -closing));
    const shrunk = closed && s.puff >= MIN_PUFF ? largest(offsetRings([closed], -s.puff)) : null;
    const puffy = shrunk ? largest(offsetRings([shrunk], s.puff)) : closed;
    // Rounding can shave a sharp letter tip when the padding is tiny: the base must still hold every letter.
    const holding = puffy && largest(unionRings([puffy, ...textOuters]).filter((r) => signedArea(r) > 0));
    if (holding && holding.length >= 3) return holding;
  }

  return roundedRect(pw, ph, CORNER_RADIUS);
}

/** Where the ring crosses y = 0 on the given side (smallest x on the left, largest on the right). */
function edgeAtMiddle(ring: Ring, side: "left" | "right"): number {
  let x = side === "left" ? Infinity : -Infinity;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    if (p.y <= 0 !== q.y <= 0) {
      const cross = p.x + ((0 - p.y) / (q.y - p.y)) * (q.x - p.x);
      x = side === "left" ? Math.min(x, cross) : Math.max(x, cross);
    }
  }
  return x;
}

/** Distance from point `p` to the segment a-b. */
function distanceToSegment(p: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? THREE.MathUtils.clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** True when a circle of radius `r` centered at (cx, 0) touches no letter. */
function clearOfText(cx: number, r: number, text: Outline[]): boolean {
  const c = v(cx, 0);
  return text.every(
    ({ outer }) => !inside(c, outer) && outer.every((a, i) => distanceToSegment(c, a, outer[(i + 1) % outer.length]) > r)
  );
}

/** The base's outline joined with the ring lug, and the hole in it. */
export function keychainBase(s: KeychainSettings, text: Outline[]): { outer: Ring; hole: Ring | null } {
  const box = bounds(text.map((o) => o.outer));
  const w = text.length ? box.max.x - box.min.x : EMPTY_BOX.w;
  const h = text.length ? box.max.y - box.min.y : EMPTY_BOX.h;
  let outer = baseOutline(s, w, h, text.map((o) => o.outer));

  let hole: Ring | null = null;
  if (s.hole !== "off") {
    // Centered on the middle line. It moves outward only as far as it takes to clear the letters
    // (script letters can reach past the base's edge at other heights), and then gets a short neck
    // back to the base.
    const dir = s.hole === "left" ? -1 : 1;
    const edge = edgeAtMiddle(outer, s.hole);
    const start = edge + dir * HOLE_OUTSET;
    let cx = start;
    for (let i = 0; i < MAX_PUSH_STEPS && !clearOfText(cx, HOLE_RADIUS + HOLE_CLEARANCE, text); i++) cx += dir * PUSH_STEP;

    const parts = [outer, ellipse(cx, 0, LUG_RADIUS, LUG_RADIUS)];
    if (cx !== start) {
      const inner = edge - dir; // 1 mm into the base
      parts.push(orient([v(cx, -LUG_RADIUS), v(inner, -LUG_RADIUS), v(inner, LUG_RADIUS), v(cx, LUG_RADIUS)], true));
    }
    const joined = largest(unionRings(parts).filter((r) => signedArea(r) > 0));
    if (joined) outer = joined;
    hole = orient(ellipse(cx, 0, HOLE_RADIUS, HOLE_RADIUS, 32), false);
  }
  return { outer, hole };
}

/** Bambu X1, P1 and A1 beds are 256 mm square: a keychain wider or longer than this does not fit. */
export const BED_MM = 256;

/** Limits (mm) of the settings that scale with the width; the sliders use the same numbers. */
export const LIMITS = {
  fontSize: { min: 6, max: 48 },
  padding: { min: MIN_PADDING, max: 16 },
  bold: { min: 0, max: 3 },
  puff: { min: 0, max: 6 },
} as const;

/** Width (mm) of the finished base along x, the ring lug included. Built from the same outline as the mesh. */
export function keychainWidth(s: KeychainSettings, font: Font | null): number {
  const { outer } = keychainBase(s, textOutlines(font, s.text, s.fontSize, s.bold));
  const box = bounds([outer]);
  return box.max.x - box.min.x;
}

type Scaled = Pick<KeychainSettings, "fontSize" | "padding" | "bold" | "puff">;

/** The text size, padding, bold and smooth multiplied by `k`, kept inside their limits, to 0.1 mm. */
function scaled(s: KeychainSettings, k: number): Scaled {
  const snap = (v: number, { min, max }: { min: number; max: number }) =>
    THREE.MathUtils.clamp(Math.round(v * 10) / 10, min, max);
  return {
    fontSize: snap(s.fontSize * k, LIMITS.fontSize),
    padding: snap(s.padding * k, LIMITS.padding),
    bold: snap(s.bold * k, LIMITS.bold),
    puff: snap(s.puff * k, LIMITS.puff),
  };
}

/**
 * The settings that make the keychain `target` mm wide: text size, padding, bold and smooth all
 * scale by one factor, so it keeps its look. The ring lug does not scale, so the width is not
 * exactly proportional and the factor is found with a few secant steps. A target beyond the
 * limits gets as close as the limits allow.
 */
export function scaleToWidth(s: KeychainSettings, font: Font | null, target: number): Scaled {
  const widthAt = (k: number) => keychainWidth({ ...s, ...scaled(s, k) }, font);
  const w1 = widthAt(1);
  if (!font || !s.text.trim() || !(target > 0) || w1 <= 0) return scaled(s, 1);

  let kPrev = 1;
  let wPrev = w1;
  let k = target / w1;
  for (let i = 0; i < 8; i++) {
    const w = widthAt(k);
    if (Math.abs(w - target) < 0.2) break;
    const slope = (w - wPrev) / (k - kPrev);
    if (!Number.isFinite(slope) || slope <= 0) break;
    kPrev = k;
    wPrev = w;
    k = Math.max(0.05, k + (target - w) / slope);
  }
  return scaled(s, k);
}

/**
 * The keychain as two closed solids that are printed flat: the base from y = 0 up to `thickness`,
 * and the text standing on its top face. The text is its own solid (same as the keycap legend),
 * so the two can print in two colors.
 */
export function buildKeychainParts(
  s: KeychainSettings,
  font: Font | null
): { base: THREE.BufferGeometry; text: THREE.BufferGeometry | null } {
  const outlines = textOutlines(font, s.text, s.fontSize, s.bold);
  const { outer, hole } = keychainBase(s, outlines);
  const rim = jitterRing(orient(cleanRing(outer), true), 9001);
  const holes = hole ? [jitterRing(orient(cleanRing(hole), false), 9002)] : [];

  const base = new MeshBuilder();
  addFace(base, rim, holes, s.thickness, true);
  addFace(base, rim, holes, 0, false);
  for (const ring of [rim, ...holes]) addWall(base, ring, 0, s.thickness, false);

  if (outlines.length === 0) return { base: base.toGeometry(), text: null };

  const text = new MeshBuilder();
  const top = s.thickness + s.raise;
  for (const o of outlines) {
    addFace(text, o.outer, o.holes, top, true);
    addFace(text, o.outer, o.holes, s.thickness, false);
    for (const ring of [o.outer, ...o.holes]) addWall(text, ring, s.thickness, top, false);
  }
  return { base: base.toGeometry(), text: text.toGeometry() };
}
