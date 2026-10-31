export const PITCH = 19.05; // mm per 1u
export const CAP_HEIGHT = 9; // mm
/** Radius of the cap's rounded vertical corners, seen from above. */
export const CAP_CORNER_RADIUS = 1.5; // mm
/** Radius of the rounded rim between the cap's sides and its flat top face. */
export const CAP_EDGE_RADIUS = 1; // mm

/** Outer size of the cap in mm (rough Cherry-like numbers, refined later). */
export function capDimensions(units: number) {
  const bottomW = units * PITCH - 0.85;
  return {
    bottomW,
    bottomD: 18.2,
    topW: bottomW - 6.3,
    topD: 13.2,
  };
}
