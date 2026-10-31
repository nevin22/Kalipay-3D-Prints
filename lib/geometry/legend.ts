import * as THREE from "three";
import type { Font } from "opentype.js";

/** Glyphs are generated at this size, then scaled to the requested mm size. */
export const LEGEND_FONT_UNITS = 100;

export function textToShapes(
  font: Font,
  text: string,
  size = LEGEND_FONT_UNITS
): THREE.Shape[] {
  // Lay out glyphs by hand: opentype.js's text shaping throws on some
  // fonts (e.g. Roboto) for multi-letter strings.
  // No kerning: kerned pairs like "WA" overlap, and overlapping outlines
  // cannot be cut as a clean pocket.
  const scale = size / font.unitsPerEm;
  const shapePath = new THREE.ShapePath();
  let x = 0;

  for (const ch of Array.from(text)) {
    const glyph = font.charToGlyph(ch);

    for (const c of glyph.getPath(x, 0, size).commands) {
      switch (c.type) {
        case "M":
          shapePath.moveTo(c.x, -c.y);
          break;
        case "L":
          shapePath.lineTo(c.x, -c.y);
          break;
        case "Q":
          shapePath.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
          break;
        case "C":
          shapePath.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
          break;
        case "Z":
          break;
      }
    }

    x += (glyph.advanceWidth ?? 0) * scale;
  }

  return shapePath.toShapes();
}
