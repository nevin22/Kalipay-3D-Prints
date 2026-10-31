export const PITCH = 19.05; // mm per 1u
/** Height of the cap. The "Cap height" slider changes it, between MIN and MAX. */
export const DEFAULT_CAP_HEIGHT = 9; // mm
export const MIN_CAP_HEIGHT = 7.5; // mm
export const MAX_CAP_HEIGHT = 12; // mm
/** Depth (and width of a 1u cap) of the base. It never changes with the height. */
const BASE_DEPTH = 18.2; // mm
/** Radius of the cap's rounded vertical corners, seen from above. */
export const CAP_CORNER_RADIUS = 1.5; // mm
/** Radius of the rounded rim between the cap's sides and its flat top face. */
export const CAP_EDGE_RADIUS = 1; // mm

/**
 * How much smaller the top face is than the base, per side. A short cap leans in a lot (3 mm at
 * the lowest height, so a small top face) and a tall one leans in less (1.5 mm at the highest, so
 * a bigger top face that is still clearly narrower than the base), in a straight line between.
 */
export const capTaper = (height: number) =>
  3 - ((height - MIN_CAP_HEIGHT) * 1.5) / (MAX_CAP_HEIGHT - MIN_CAP_HEIGHT);

/**
 * Outer size of the cap in mm (rough Cherry-like numbers, refined later). The base is fixed;
 * a taller cap leans in more, so its top face gets smaller.
 */
export function capDimensions(units: number, height = DEFAULT_CAP_HEIGHT) {
  const bottomW = units * PITCH - 0.85;
  const taper = capTaper(height);
  return {
    bottomW,
    bottomD: BASE_DEPTH,
    topW: bottomW - 2 * taper,
    topD: BASE_DEPTH - 2 * taper,
  };
}
