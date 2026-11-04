import { shapeOutlines, type ShapeId } from "@/lib/geometry/shapes";

/** An icon drawn from the same outlines the cap uses. Takes the text color. */
export default function ShapeIcon({ id, className = "h-5 w-5" }: { id: ShapeId; className?: string }) {
  // The outlines have y up and SVG has y down, so flip y. Holes are cut out with even-odd fill.
  const d = shapeOutlines(id)
    .map(({ outer, holes }) =>
      [outer, ...holes]
        .map((pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${(-y).toFixed(1)}`).join("") + "Z")
        .join("")
    )
    .join("");
  return (
    <svg viewBox="-55 -55 110 110" className={className} fill="currentColor" fillRule="evenodd" aria-hidden>
      <path d={d} />
    </svg>
  );
}
