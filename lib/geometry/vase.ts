import * as THREE from "three";
import { MeshBuilder } from "@/lib/geometry/mesh";

/** "walls" = a real hollow cup (wall + floor). "vase" = a solid body for the slicer's spiral vase mode. */
export type VaseMode = "walls" | "vase";
export type VaseSection = "round" | "polygon";

export type VaseSettings = {
  // Size and silhouette
  height: number;
  baseDiameter: number;
  topDiameter: number;
  /** Extra radius at the widest point (negative = a waist). */
  belly: number;
  /** Where the belly sits, 0 (bottom) to 1 (top). */
  bellyPos: number;
  /** Extra radius flared out over the top 15 %. */
  lip: number;
  // Style
  section: VaseSection;
  sides: number;
  /** 0 = sharp polygon corners, 1 = fully round. */
  corner: number;
  /** Number of vertical ribs (used when ribDepth > 0). */
  ribs: number;
  /** How deep the ribs cut, as a share of the radius. 0 = no ribs. */
  ribDepth: number;
  /** Degrees the pattern turns from bottom to top. */
  twist: number;
  /** Silhouette ripple (mm) and how many ripples fit the height. 0 = off. */
  wave: number;
  waveCount: number;
  /** Sharp horizontal ridges (mm) and how many. 0 = off. */
  bands: number;
  bandCount: number;
  /** How far the rim dips between scallops (mm). 0 = flat rim. */
  scallop: number;
  scallopCount: number;
  // Printing
  mode: VaseMode;
  wall: number;
  floor: number;
};

export const LIMITS = {
  height: { min: 60, max: 250 },
  baseDiameter: { min: 30, max: 200 },
  topDiameter: { min: 20, max: 200 },
  belly: { min: -30, max: 60 },
  bellyPos: { min: 0.2, max: 0.8 },
  lip: { min: 0, max: 30 },
  sides: { min: 3, max: 12 },
  ribs: { min: 3, max: 24 },
  ribDepth: { min: 0, max: 0.3 },
  twist: { min: -360, max: 360 },
  wave: { min: 0, max: 8 },
  waveCount: { min: 1, max: 8 },
  bands: { min: 0, max: 4 },
  bandCount: { min: 2, max: 20 },
  scallop: { min: 0, max: 25 },
  scallopCount: { min: 3, max: 12 },
  wall: { min: 0.8, max: 4 },
  floor: { min: 0.8, max: 5 },
} as const;

/** All the style settings switched off. */
export const PLAIN_STYLE = {
  section: "round",
  sides: 6,
  corner: 0,
  ribs: 12,
  ribDepth: 0,
  twist: 0,
  wave: 0,
  waveCount: 3,
  bands: 0,
  bandCount: 8,
  scallop: 0,
  scallopCount: 6,
} as const satisfies Partial<VaseSettings>;

export const DEFAULT_VASE: VaseSettings = {
  height: 150,
  baseDiameter: 80,
  topDiameter: 60,
  belly: 20,
  bellyPos: 0.45,
  lip: 0,
  ...PLAIN_STYLE,
  ribDepth: 0.1, // same as the Classic preset, so Classic shows as selected on load
  mode: "walls",
  wall: 2, // no sidebar controls for wall and floor: always 2 mm
  floor: 2,
};

/** One click sets the size, silhouette and style (not the print settings). */
export const VASE_PRESETS: { id: string; label: string; patch: Partial<VaseSettings> }[] = [
  { id: "classic", label: "Classic", patch: { ...PLAIN_STYLE, height: 150, baseDiameter: 80, topDiameter: 60, belly: 20, bellyPos: 0.45, lip: 0, ribDepth: 0.1 } },
  { id: "bottle", label: "Bottle", patch: { ...PLAIN_STYLE, height: 180, baseDiameter: 80, topDiameter: 26, belly: 12, bellyPos: 0.3, lip: 4 } },
  { id: "bowl", label: "Bowl", patch: { ...PLAIN_STYLE, height: 80, baseDiameter: 60, topDiameter: 130, belly: 0, bellyPos: 0.5, lip: 8 } },
  { id: "pot", label: "Pot", patch: { ...PLAIN_STYLE, height: 100, baseDiameter: 70, topDiameter: 95, belly: 0, bellyPos: 0.5, lip: 0 } },
  { id: "twisted", label: "Twisted", patch: { ...PLAIN_STYLE, height: 160, baseDiameter: 80, topDiameter: 80, belly: 0, lip: 0, section: "polygon", sides: 4, twist: 120 } },
  { id: "ribbed", label: "Ribbed", patch: { ...PLAIN_STYLE, height: 150, baseDiameter: 80, topDiameter: 70, belly: 12, lip: 0, ribs: 16, ribDepth: 0.08 } },
  { id: "faceted", label: "Faceted", patch: { ...PLAIN_STYLE, height: 150, baseDiameter: 80, topDiameter: 70, belly: 14, lip: 0, section: "polygon", sides: 8 } },
  { id: "wavy", label: "Wavy", patch: { ...PLAIN_STYLE, height: 150, baseDiameter: 80, topDiameter: 70, belly: 0, lip: 0, wave: 5, waveCount: 4 } },
  { id: "flower", label: "Flower", patch: { ...PLAIN_STYLE, height: 140, baseDiameter: 80, topDiameter: 90, belly: 0, lip: 0, ribs: 6, ribDepth: 0.22, twist: 60 } },
  { id: "scalloped", label: "Scalloped", patch: { ...PLAIN_STYLE, height: 150, baseDiameter: 80, topDiameter: 80, belly: 10, lip: 0, scallop: 20, scallopCount: 8 } },
];

/** Points per ring. Divisible by 3, 4, 5, 6, 8, 10 and 12 so polygon corners land exactly on a point. */
export const SEGMENTS = 240;
const RINGS = 120;
const MIN_RADIUS = 1;
const MIN_INNER = 0.5;
/** The rim dips over the top part of the wall, and by at most this share of the height. */
const SCALLOP_ZONE = 0.25;
const MAX_SCALLOP_SHARE = 0.15;
/** Lean (degrees from vertical) above which FDM printing needs supports or gets droopy. */
export const OVERHANG_LIMIT = 45;

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Radius of the smooth silhouette at height fraction t (0 to 1), before polygon and ribs. */
export function vaseRadius(s: VaseSettings, t: number) {
  const r0 = s.baseDiameter / 2;
  const r1 = s.topDiameter / 2;
  const base = r0 + (r1 - r0) * smooth(t);
  const belly = s.belly * Math.exp(-((t - s.bellyPos) ** 2) / (2 * 0.2 ** 2));
  const lip = s.lip * smooth((t - 0.85) / 0.15);
  const wave = s.wave * Math.sin(2 * Math.PI * s.waveCount * t);
  const bands = (s.bands * (Math.abs(Math.sin(Math.PI * s.bandCount * t)) * 2 - 1)) / 2;
  return Math.max(base + belly + lip + wave + bands, MIN_RADIUS);
}

/** Share of the radius kept at angle a (0 to 1): the polygon corners and the ribs, turned by the twist. */
function shape(s: VaseSettings, a: number, t: number) {
  const turned = a + (s.twist * Math.PI * t) / 180;
  let m = 1;
  if (s.section === "polygon") {
    const seg = (2 * Math.PI) / s.sides;
    const phi = ((((turned % seg) + seg) % seg) - seg / 2);
    const poly = Math.cos(Math.PI / s.sides) / Math.cos(phi);
    m *= poly + (1 - poly) * s.corner;
  }
  if (s.ribDepth > 0) m *= 1 - s.ribDepth * (0.5 + 0.5 * Math.cos(s.ribs * turned));
  return m;
}

/** Largest radius of the vase, for fitting the camera and the bed check. */
export function vaseMaxRadius(s: VaseSettings) {
  let max = 0;
  for (let i = 0; i <= RINGS; i++) max = Math.max(max, vaseRadius(s, i / RINGS));
  return max;
}

/** Steepest outward lean of the silhouette, in degrees from vertical (0 = straight up). */
export function maxOverhang(s: VaseSettings) {
  let steepest = 0;
  for (let i = 0; i < RINGS; i++) {
    const dr = vaseRadius(s, (i + 1) / RINGS) - vaseRadius(s, i / RINGS);
    steepest = Math.max(steepest, dr / (s.height / RINGS));
  }
  return (Math.atan(steepest) * 180) / Math.PI;
}

/** A closed vase, bottom on y = 0, axis along y. */
export function buildVase(s: VaseSettings) {
  const H = s.height;
  const scallop = Math.min(s.scallop, H * MAX_SCALLOP_SHARE);
  // Each ring is turned back by the twist, so a polygon corner or rib always lands exactly on the same
  // point column. Without this a sharp twisted edge is sampled at a different offset on every ring and looks chipped.
  const angle = (j: number, t: number) => (j / SEGMENTS) * Math.PI * 2 - (s.twist * Math.PI * t) / 180;
  const next = (j: number) => (j + 1) % SEGMENTS;

  const outerRadii = (t: number) =>
    Array.from({ length: SEGMENTS }, (_, j) => Math.max(vaseRadius(s, t) * shape(s, angle(j, t), t), MIN_RADIUS));
  /** How far the rim dips at this point; zero outside the top part of the wall. */
  const drop = (t: number, j: number) =>
    scallop * (0.5 - 0.5 * Math.cos(s.scallopCount * angle(j, t))) * smooth((t - (1 - SCALLOP_ZONE)) / SCALLOP_ZONE);
  const ringAt = (t: number, radii: number[]) =>
    radii.map((r, j) => new THREE.Vector3(r * Math.cos(angle(j, t)), H * t - drop(t, j), r * Math.sin(angle(j, t))));

  const ts = Array.from({ length: RINGS + 1 }, (_, i) => i / RINGS);
  const radii = ts.map(outerRadii);
  const outer = ts.map((t, i) => ringAt(t, radii[i]));
  const mb = new MeshBuilder();
  const bottom = new THREE.Vector3(0, 0, 0);

  // Outer wall (faces point away from the axis) and bottom.
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SEGMENTS; j++) {
      mb.addQuad(outer[i][j], outer[i + 1][j], outer[i + 1][next(j)], outer[i][next(j)]);
    }
  }
  for (let j = 0; j < SEGMENTS; j++) mb.addTriangle(bottom, outer[0][j], outer[0][next(j)]);

  const topRing = outer[RINGS];
  if (s.mode === "vase") {
    const top = new THREE.Vector3(0, H - scallop / 2, 0);
    for (let j = 0; j < SEGMENTS; j++) mb.addTriangle(top, topRing[next(j)], topRing[j]);
    return mb.toGeometry();
  }

  // Hollow cup. The wall is measured square to the surface, so it is pushed in further where the
  // surface leans (a flared lip) or slopes around the ring (polygon sides, ribs).
  const floor = Math.min(Math.max(s.floor, LIMITS.floor.min), H - 2);
  const dt = 1 / RINGS;
  const innerRadii = (t: number) => {
    const r = outerRadii(t);
    const up = outerRadii(Math.min(t + dt, 1));
    const down = outerRadii(Math.max(t - dt, 0));
    const dy = H * (Math.min(t + dt, 1) - Math.max(t - dt, 0));
    return r.map((rj, j) => {
      const sv = (up[j] - down[j]) / dy;
      const sa = (r[next(j)] - r[(j + SEGMENTS - 1) % SEGMENTS]) / (2 * ((2 * Math.PI) / SEGMENTS)) / rj;
      const w = s.wall * Math.min(Math.sqrt(1 + sv * sv + sa * sa), 3);
      return Math.min(Math.max(rj - w, MIN_INNER), rj - 0.2);
    });
  };
  // The inner wall starts exactly at the floor height; rings closer than 0.3 mm above it are skipped.
  const innerTs = [floor / H, ...ts.filter((t) => H * t > floor + 0.3)];
  const inner = innerTs.map((t) => ringAt(t, innerRadii(t)));

  for (let i = 0; i < inner.length - 1; i++) {
    for (let j = 0; j < SEGMENTS; j++) {
      mb.addQuad(inner[i][j], inner[i][next(j)], inner[i + 1][next(j)], inner[i + 1][j]);
    }
  }
  const floorCenter = new THREE.Vector3(0, floor, 0);
  for (let j = 0; j < SEGMENTS; j++) mb.addTriangle(floorCenter, inner[0][next(j)], inner[0][j]);

  const rim = inner[inner.length - 1];
  for (let j = 0; j < SEGMENTS; j++) {
    mb.addQuad(topRing[j], rim[j], rim[next(j)], topRing[next(j)]);
  }
  return mb.toGeometry();
}
