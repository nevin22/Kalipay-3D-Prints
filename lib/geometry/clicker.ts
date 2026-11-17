import * as THREE from "three";
import { STEM_TIP_Y, addFace, addWall } from "@/lib/geometry/cap";
import { HOLE, PLATE_TOP, SKIRT_ABOVE_PLATE, WALL, WELL_CLEARANCE, buildHousing, housingLayout } from "@/lib/geometry/housing";
import { MeshBuilder } from "@/lib/geometry/mesh";
import { inside } from "@/lib/geometry/keychain";
import { offsetRings, unionRings } from "@/lib/geometry/outline";
import { type Ring, cleanRing, jitterRing, orient, signedArea } from "@/lib/geometry/polygon";
import headOutlines from "@/lib/geometry/headOutlines.json";
import { buildRingTab } from "@/lib/geometry/ring";
import { shapeOutlines } from "@/lib/geometry/shapes";
import { STEM_SOCKET_DEPTH, stemRings } from "@/lib/geometry/stem";

export const MAX_CLICKER_KEYS = 5;
/** Half the width of the split ring tab (its outer radius in ring.ts). */
const TAB_HALF = 4;
/** Neck joining the tab to the housing: half its width, and how far (mm) it reaches into the wall. */
const NECK_HALF = 3;
const NECK_INTO = 1.2;
/** Cap height used on the clicker (mm): the default one, so letters fit. */
export const CLICKER_CAP_HEIGHT = 9;
/** Caps have straight walls here, so the top face fills the whole key. */
export const CLICKER_CAP_TAPER = 0;
/** Smaller rim rounding than a normal keycap, again so the top face is as big as possible. */
export const CLICKER_EDGE_RADIUS = 0.6;
/**
 * The letters read down the bar, head at the top: the legend is turned 90 degrees so its "up"
 * points along the row toward the head (the left end). The preview then turns the whole bar
 * to run front to back.
 */
export const CLICKER_LEGEND_ROTATION = 90;
/** Letter size on the clicker's caps (mm). */
export const CLICKER_LEGEND_SIZE = 12;
/** Smaller letters when the key has a border, which takes room from the top face. */
export const CLICKER_LEGEND_SIZE_BORDER = 10;

/** Settings for one clicker cap. `border` puts a band round the letter, in the letter color. */
export const clickerCapSettings = (text: string, border: boolean) => ({
  units: 1,
  text,
  fontSize: border ? CLICKER_LEGEND_SIZE_BORDER : CLICKER_LEGEND_SIZE,
  offsetX: 0,
  offsetY: 0,
  rotation: CLICKER_LEGEND_ROTATION,
  raise: 0,
  stemTolerance: 0.1,
  capHeight: CLICKER_CAP_HEIGHT,
  taper: CLICKER_CAP_TAPER,
  edgeRadius: CLICKER_EDGE_RADIUS,
  border,
});
/** How far the released cap's top stands above the housing rim (mm): "barely outside". */
export const CAP_PROTRUDE = 1.5;

/** Extra wall (mm) all round the keys with the thick border on. The head's housing is not made thicker. */
export const THICK_BORDER = 3;

export type ClickerGrill = "none" | "teeth" | "round" | "wavy";

/** The letters typed in one box: one key each (at least one key, blank when nothing is typed). */
export function clickerChars(text: string): string[] {
  const chars = Array.from(text).slice(0, MAX_CLICKER_KEYS);
  return chars.length ? chars : [""];
}

/** Rim height that leaves the released cap's top `CAP_PROTRUDE` above the rim. */
const CLICKER_RIM = SKIRT_ABOVE_PLATE + CLICKER_CAP_HEIGHT - CAP_PROTRUDE;
/** Top of the housing's walls (y), floor at 0. */
export const CLICKER_HOUSING_TOP = PLATE_TOP + CLICKER_RIM;

/** Height (y) of the cap's bottom face when the housing floor is at y = 0. */
export const CAP_BOTTOM_Y = PLATE_TOP + SKIRT_ABOVE_PLATE;

/** Head plate: thickness, default width and the disc that always holds the stem (mm). */
const HEAD_THICKNESS = 3;
export const HEAD_SIZE = 36;
/** Head outlines traced from the owner's own images (private use): same format as the icon outlines. */
/**
 * Character heads. `scale` evens out their sizes: a head's size is its widest point, which for Pikachu
 * includes the ears, so the others are scaled down until their faces are as wide as Pikachu's at the eyes.
 */
export const CUSTOM_HEADS: Record<string, { label: string; color: string; body?: string; scale?: number; hidden?: boolean }> = {
  pikachu: { label: "Pikachu", color: "#F5D63D" },
  squirtle: { label: "Squirtle", color: "#6EBBD2", scale: 0.61 },
  charmander: { label: "Charmander", color: "#EB8004", scale: 0.745 },
  bulbasaur: { label: "Bulbasaur", color: "#89C9C0", scale: 0.586 },
  darkrai: { label: "Darkrai", color: "#D8323A", body: "#1C1C22", scale: 1.45, hidden: true }, // hidden from the list for now; the red collar is the base, the plume sticks out
  snorlax: { label: "Snorlax", color: "#F2D4A7", body: "#0D646E", scale: 0.61 }, // plate cream, body the dark teal of its head
};
/** The head plate's color: the character's own, or the body color for a library icon. */
export const headColor = (id: string, bodyColor: string) => CUSTOM_HEADS[id]?.color ?? bodyColor;

/** Body color when none was picked. */
export const DEFAULT_BODY_COLOR = "#F5D63D";
/**
 * The color of the housing, keys and ring: the one the user picked, else the character's body color (the
 * dark teal of Snorlax's head, the yellow of Pikachu) so the body matches the head by default (the default yellow with no head or a library icon).
 */
export const effectiveBodyColor = (picked: string | null, head: boolean, headId: string) =>
  picked ?? (head ? CUSTOM_HEADS[headId]?.body ?? headColor(headId, DEFAULT_BODY_COLOR) : DEFAULT_BODY_COLOR);
/** Millimeters per outline unit for a head of `size` mm (see `scale` in CUSTOM_HEADS). */
const headK = (id: string, size: number) => (size / 100) * (CUSTOM_HEADS[id]?.scale ?? 1);
const CUSTOM_OUTLINES = headOutlines as unknown as Record<string, { outer: [number, number][]; holes: [number, number][][] }[]>;
const HEAD_STEM_PAD = 4.5;
/** The head's top is level with the caps' tops, so its underside is `HEAD_THICKNESS` below them. */
export const HEAD_BOTTOM_Y = CAP_BOTTOM_Y + CLICKER_CAP_HEIGHT - HEAD_THICKNESS;

export type ClickerHead = { id: string; size: number };

type TracedFeature = { color: string; outer: [number, number][]; holes: [number, number][][]; through?: boolean };
const TRACED_HEADS = headOutlines as unknown as {
  features: Record<string, TracedFeature[]>;
  /** The plate's outline where it differs from the head's silhouette (the full-thickness colored tips are cut out of it). */
  plates: Record<string, { outer: [number, number][] }[]>;
};
const CUSTOM_FEATURES = TRACED_HEADS.features;
const CUSTOM_PLATES = TRACED_HEADS.plates;
/** Depth (mm) of the pockets the colored face parts sit in: flush with the plate's top, like the keycap legend. */
const FEATURE_DEPTH = 0.4;

const V = (x: number, y: number) => new THREE.Vector2(x, y);

/**
 * The head's outlines in mm, stem at (0, 0): outer rings (counter-clockwise) and holes (clockwise).
 * A disc around the stem is merged in so the stem always has material to grow from. Holes (eyes)
 * are kept when clear of that disc. Turned a quarter turn so the head's "up" points away from the
 * keys (to -x), like the letters' "up".
 */
export function headShapes(id: string, size: number) {
  const k = headK(id, size);
  const shift = headShift(id, size);
  const scale = (r: [number, number][]) => r.map(([x, y]) => V(-y * k - shift, x * k));
  const traced = CUSTOM_OUTLINES[id] ?? shapeOutlines(id);
  const disc: Ring = Array.from({ length: 32 }, (_, i) => {
    const a = (2 * Math.PI * i) / 32;
    return V(HEAD_STEM_PAD * Math.cos(a), HEAD_STEM_PAD * Math.sin(a));
  });
  const merged = unionRings([...traced.map((t) => orient(scale(t.outer), true)), disc]);
  const outers = merged.filter((r) => signedArea(r) > 0).map((r) => cleanRing(r));
  const holes = [...merged.filter((r) => signedArea(r) < 0), ...traced.flatMap((t) => t.holes.map((h) => scale(h)))]
    .map((h) => orient(h, false))
    .filter((h) => h.every((p) => Math.hypot(p.x, p.y) > HEAD_STEM_PAD + 0.5));
  return { outers, holes };
}

/** Half the side (mm) of the square the switch needs inside the head: the hole plus a margin. */
const SWITCH_HALF = HOLE / 2 + 1;

/**
 * Where the stem goes along the head's axis (mm, toward the chin): the smallest move from the head's
 * middle that puts the switch square's ears-side half inside the outline, so the housing around the head can follow
 * the head's shape instead of bulging out (into the gap between the ears, say). 0 when none works.
 */
export function headShift(id: string, size: number) {
  const k = headK(id, size);
  const traced = CUSTOM_OUTLINES[id] ?? shapeOutlines(id);
  const rings = traced.map((t) => t.outer.map(([x, y]) => V(-y * k, x * k)));
  for (let step = 0; step <= 60; step++) {
    for (const s of step === 0 ? [0] : [step * 0.5, -step * 0.5]) {
      // The square's ears-side edge and the upper half of its two side edges must be inside the outline
      // (testing only the corners misses the notch between the ears, which cuts into the middle of the edge).
      const corners: THREE.Vector2[] = [];
      for (let t = -SWITCH_HALF; t <= SWITCH_HALF + 1e-9; t += 1) corners.push(V(s - SWITCH_HALF, t));
      for (let u = 0; u <= SWITCH_HALF; u += 1) corners.push(V(s - SWITCH_HALF + u, SWITCH_HALF), V(s - SWITCH_HALF + u, -SWITCH_HALF));
      if (corners.every((c) => rings.some((r) => inside(c, r)))) return s;
    }
  }
  return 0;
}

/** Width of the housing part that holds the keys. */
const keyHousingWidth = (keys: number) => housingLayout(Array(keys).fill(1)).width;

/**
 * The head's well in the housing: the head's outline grown by the clearance (and joined to a square
 * that holds the switch hole), with a wall around it, placed at the left end so its right-most
 * point touches the key section's end. Rings are in the strip's 2D plane; `centerX` is the stem's x.
 */
export function headHousing(head: ClickerHead, keys: number, margin: number) {
  const { outers } = headShapes(head.id, head.size);
  const h = SWITCH_HALF;
  const square = [V(-h, -h), V(h, -h), V(h, h), V(-h, h)];
  const wells = unionRings([...offsetRings(outers, WELL_CLEARANCE, "miter"), square]).filter((r) => signedArea(r) > 0);
  const well0 = wells.reduce((a, b) => (signedArea(a) >= signedArea(b) ? a : b));
  const centerX = -(keyHousingWidth(keys) / 2 + margin) - Math.max(...well0.map((p) => p.x));
  const move = (r: Ring) => r.map((p) => V(p.x + centerX, p.y));
  const well = move(well0);
  const outer = move(offsetRings([well0], WALL, "miter")[0]);
  return { extra: { outer, well, centerX }, outer, centerX };
}

/** x of each key's center, of the head's stem (null without a head), and the housing's left and right ends. */
export function clickerLayout(keys: number, head?: ClickerHead, thick = false) {
  const margin = thick ? THICK_BORDER : 0;
  const { centers, width } = housingLayout(Array(keys).fill(1));
  if (!head) return { keyXs: centers, headX: null, minX: -width / 2 - margin, maxX: width / 2 + margin };
  const { outer, centerX } = headHousing(head, keys, margin);
  return { keyXs: centers, headX: centerX, minX: Math.min(...outer.map((p) => p.x)), maxX: width / 2 + margin };
}

/**
 * The key clicker's housing: the row-of-wells housing lying on its back (as it prints), with a
 * deeper rim so the caps barely stand out, optional grill teeth on the key section's long sides,
 * and, with a head, one more well in the head's own shape at the left end.
 * Floor at y = 0, the key section centered on x = 0.
 */
export function buildClickerHousing(
  keys: number,
  grill: ClickerGrill = "none",
  head?: ClickerHead,
  /** A thicker wall all round the keys (not round the head). */
  thick = false,
  /** Grill size and spacing, mm (see GRILL_SIZE, GRILL_SPACING in housing.ts). */
  grillShape: { size?: number; spacing?: number } = {}
): THREE.BufferGeometry {
  const margin = thick ? THICK_BORDER : 0;
  return buildHousing(Array(keys).fill(1), {
    rim: CLICKER_RIM,
    grill: grill === "none" ? undefined : grill,
    grillSize: grillShape.size,
    grillSpacing: grillShape.spacing,
    extra: head ? headHousing(head, keys, margin).extra : undefined,
    margin,
  });
}

/**
 * The split ring tab, flat on the floor at the left end: on the key section's end wall, or with a
 * head on the head housing's far edge, in the middle line (so between a head's ears).
 */
export function buildClickerRing(keys: number, head?: ClickerHead, thick = false): THREE.BufferGeometry {
  const y0 = 0; // flat on the floor, flush with the housing's bottom
  const margin = thick ? THICK_BORDER : 0;
  if (!head) return buildRingTab(keyHousingWidth(keys) / 2 + margin, 0, "left", y0);
  const { outer } = headHousing(head, keys, margin);
  // The tab is RING_REACH long and 2 * TAB_HALF wide, on the middle line. Its root goes at the outline's
  // farthest point anywhere across that width, so no part of the housing (a curling plume, say) reaches into it.
  const crossing = (yy: number) => {
    let c = Infinity;
    for (let i = 0; i < outer.length; i++) {
      const a = outer[i];
      const b = outer[(i + 1) % outer.length];
      if (a.y <= yy !== b.y <= yy) c = Math.min(c, a.x + ((yy - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    return c;
  };
  let x = Infinity;
  for (let yy = -TAB_HALF; yy <= TAB_HALF + 1e-9; yy += 0.25) x = Math.min(x, crossing(yy));
  // A neck from the tab back to the housing's edge on the middle line and NECK_INTO the wall, so the tab is
  // properly joined even where the outline curves away from it (it overlaps the housing; the slicer fuses them).
  const back = crossing(0) + NECK_INTO;
  const neck = [V(x - 0.5, -NECK_HALF), V(back, -NECK_HALF), V(back, NECK_HALF), V(x - 0.5, NECK_HALF)];
  return buildRingTab(-x, 0, "left", y0, neck);
}

export type HeadFeature = { color: string; geometry: THREE.BufferGeometry };

/**
 * The head's plate and its colored face parts (eyes, cheeks, mouth, ear tips). Each part is its own
 * closed solid that fills a pocket in the plate, flush with its top, built from the same rings as
 * the pocket so they share exact vertices (no boolean operations). Plate bottom at y = 0 (the
 * origin; place it at `HEAD_BOTTOM_Y`), top at `HEAD_THICKNESS`, stem tip at -`headStemLength()`.
 * A part inside another one's outline (the tongue inside the mouth) fills a hole in it.
 */
export function buildClickerHeadParts(id: string, size: number, stemTolerance = 0.1) {
  const shapes = headShapes(id, size);
  const k = headK(id, size);
  const shift = headShift(id, size);
  const turn = (r: [number, number][]) => r.map(([x, y]) => V(-y * k - shift, x * k));

  // Every distinct source outline is jittered once and reused, so a tongue and the hole it fills match exactly.
  const cache = new Map<string, Ring>();
  const ring = (r: [number, number][], ccw: boolean): Ring => {
    const key = JSON.stringify(r);
    let c = cache.get(key);
    if (!c) {
      c = jitterRing(cleanRing(orient(turn(r), true)), 5200 + cache.size);
      cache.set(key, c);
    }
    return ccw ? c : [...c].reverse();
  };
  // The plate is the silhouette, minus any full-thickness colored pieces (ear tips) that are parts of their own.
  const outers = CUSTOM_PLATES[id]
    ? CUSTOM_PLATES[id].map((p) => ring(p.outer, true))
    : shapes.outers.map((r, i) => jitterRing(r, 5001 + i));
  const features = (CUSTOM_FEATURES[id] ?? []).map((f) => ({
    color: f.color,
    through: !!f.through,
    outer: ring(f.outer, true),
    holes: f.holes.map((h) => ring(h, false)),
  }));
  // Pockets: the outlines that are not inside another part's outline.
  const pockets = features.filter((f) => !f.through && !features.some((o) => o !== f && inside(f.outer[0], o.outer)));
  const floor = HEAD_THICKNESS - FEATURE_DEPTH;

  const stem = stemRings(stemTolerance);
  const length = headStemLength();
  const socketY = -length + STEM_SOCKET_DEPTH;
  const mesh = new MeshBuilder();
  // The stem stands under the outline that contains the origin.
  outers.forEach((outer) => {
    const mine = pockets.filter((p) => inside(p.outer[0], outer));
    addFace(mesh, outer, mine.map((p) => [...p.outer].reverse()), HEAD_THICKNESS, true);
    addFace(mesh, outer, inside(V(0, 0), outer) ? [[...stem.outer].reverse()] : [], 0, false);
    addWall(mesh, outer, 0, HEAD_THICKNESS, false);
    for (const p of mine) {
      addFace(mesh, p.outer, [], floor, true);
      addWall(mesh, p.outer, floor, HEAD_THICKNESS, true);
    }
  });
  addWall(mesh, stem.outer, -length, 0, false);
  addFace(mesh, stem.outer, [[...stem.cross].reverse()], -length, false);
  addWall(mesh, stem.cross, -length, socketY, true);
  addFace(mesh, stem.cross, [], socketY, false);

  const parts: HeadFeature[] = features.map((f) => {
    const m = new MeshBuilder();
    // A full-thickness piece (ear tip) runs from the plate's underside to its top; the others fill a pocket.
    const bottom = f.through ? 0 : floor;
    addFace(m, f.outer, f.holes, bottom, false);
    addFace(m, f.outer, f.holes, HEAD_THICKNESS, true);
    addWall(m, f.outer, bottom, HEAD_THICKNESS, false);
    for (const h of f.holes) addWall(m, h, bottom, HEAD_THICKNESS, false);
    return { color: f.color, geometry: m.toGeometry() };
  });
  return { plate: mesh.toGeometry(), features: parts };
}

/** Just the head's plate (see `buildClickerHeadParts`). */
export const buildClickerHead = (id: string, size: number, stemTolerance = 0.1) =>
  buildClickerHeadParts(id, size, stemTolerance).plate;

/** Stem length of the head: from its underside down to where a cap's own stem ends. */
export function headStemLength() {
  return HEAD_BOTTOM_Y - (CAP_BOTTOM_Y + STEM_TIP_Y);
}
