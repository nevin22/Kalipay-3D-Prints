import * as THREE from "three";
import traced from "@/lib/geometry/iconOutlines.json";

/** Order of the groups in the icon picker. */
export const SHAPE_GROUPS = ["Basic", "Animals", "Bugs", "Sea", "Dinosaurs"] as const;
export type ShapeGroup = (typeof SHAPE_GROUPS)[number];

/** Every legend icon: the basic shapes (drawn from points in this file), then the traced pictures in `iconOutlines.json`. */
export const SHAPES: { id: string; label: string; group: ShapeGroup }[] = [
  { id: "star", label: "Star", group: "Basic" },
  { id: "square", label: "Square", group: "Basic" },
  { id: "circle", label: "Circle", group: "Basic" },
  { id: "triangle", label: "Triangle", group: "Basic" },
  { id: "heart", label: "Heart", group: "Basic" },
  { id: "diamond", label: "Diamond", group: "Basic" },
  { id: "hexagon", label: "Hexagon", group: "Basic" },
  { id: "pentagon", label: "Pentagon", group: "Basic" },
  { id: "octagon", label: "Octagon", group: "Basic" },
  { id: "plus", label: "Plus", group: "Basic" },
  { id: "sparkle", label: "Sparkle", group: "Basic" },
  { id: "arrow", label: "Arrow", group: "Basic" },
  { id: "lightning", label: "Lightning", group: "Basic" },
  ...(
    [
      ["bear", "Bear", "Animals"], ["rabbit", "Rabbit", "Animals"], 
      ["hedgehog", "Hedgehog", "Animals"], ["wolf", "Wolf", "Animals"], 
      ["bull", "Bull", "Animals"], ["buffalo", "Buffalo", "Animals"], ["cat", "Cat", "Animals"],
      ["dog", "Dog", "Animals"], ["elephant", "Elephant", "Animals"], ["giraffe", "Giraffe", "Animals"],
      ["eagle", "Eagle", "Animals"],
      ["butterfly", "Butterfly", "Bugs"], ["bee", "Bee", "Bugs"], ["moth", "Moth", "Bugs"],
      ["crab", "Crab", "Sea"], ["seahorse", "Seahorse", "Sea"], 
      ["shark", "Shark", "Sea"], ["dolphin", "Dolphin", "Sea"],
      ["octopus", "Octopus", "Sea"],
      ["turtle", "Turtle", "Sea"],
      ["t-rex", "T-Rex", "Dinosaurs"], ["brontosaurus", "Brontosaurus", "Dinosaurs"],
      ["triceratops", "Triceratops", "Dinosaurs"],
    ] as const
  ).map(([id, label, group]) => ({ id, label, group })),
];

/** An icon's id. Anything unknown draws as the star. */
export type ShapeId = string;

type Point = [number, number];

/** Points on a regular polygon (or a star, with an inner radius), y up, first point at the top unless `phase` turns it. */
function polygon(sides: number, outer: number, inner = outer, phase = Math.PI / 2): Point[] {
  const pts: Point[] = [];
  const n = inner === outer ? sides : sides * 2;
  for (let i = 0; i < n; i++) {
    const r = i % 2 === 0 || inner === outer ? outer : inner;
    const a = phase + (2 * Math.PI * i) / n;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}

const BASIC: Record<string, Point[]> = {
  star: polygon(5, 50, 20),
  square: [[-50, -50], [50, -50], [50, 50], [-50, 50]],
  circle: polygon(64, 50),
  triangle: [[-50, -43.3], [50, -43.3], [0, 43.3]],
  heart: Array.from({ length: 64 }, (_, i): Point => {
    const t = (2 * Math.PI * i) / 64;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [x * 3.1, (y + 2.5) * 3.1];
  }),
  diamond: [[0, 50], [-34, 0], [0, -50], [34, 0]],
  hexagon: polygon(6, 50),
  pentagon: polygon(5, 50),
  octagon: polygon(8, 50, 50, Math.PI / 2 + Math.PI / 8),
  plus: [[-17, -50], [17, -50], [17, -17], [50, -17], [50, 17], [17, 17], [17, 50], [-17, 50], [-17, 17], [-50, 17], [-50, -17], [-17, -17]],
  sparkle: polygon(4, 50, 12),
  arrow: [[0, 50], [40, 5], [15, 5], [15, -50], [-15, -50], [-15, 5], [-40, 5]],
  lightning: [[14, 50], [-30, -5], [-4, -5], [-14, -50], [30, 6], [4, 6]],
};

type Traced = { outer: Point[]; holes: Point[][] }[];
const TRACED = traced as unknown as Record<string, Traced>;

const toPath = <T extends THREE.Path>(path: T, pts: Point[]) => {
  pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
  return path;
};

/**
 * An icon's outlines as plain points (an outer ring and its holes, y up), about 100 units across and
 * centered. No three.js objects, so it is safe to call while a page renders: `new THREE.Shape()`
 * makes an id with `Math.random()`, which Next refuses during prerendering.
 */
export function shapeOutlines(id: ShapeId): Traced {
  return TRACED[id] ?? [{ outer: BASIC[id] ?? BASIC.star, holes: [] }];
}

/**
 * An icon's outlines as the same `THREE.Shape[]` that `textToShapes` returns, about 100 units
 * across and centered. A picture can be several outlines (a bee's stripes) and can have holes
 * (eyes). Pictures nested inside a hole (a pupil) were left out when they were traced.
 */
export function shapeToShapes(id: ShapeId): THREE.Shape[] {
  return shapeOutlines(id).map(({ outer, holes }) => {
    const shape = toPath(new THREE.Shape(), outer);
    shape.holes = holes.map((h) => toPath(new THREE.Path(), h));
    return shape;
  });
}
