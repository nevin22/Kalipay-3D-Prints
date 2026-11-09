"use client";

import { Billboard, Line, Text } from "@react-three/drei";

/** How far (mm) the lines sit off the vase, and how long the end ticks are. */
const GAP = 8;
const TICK = 2;
/** Just above the floor grid. */
const Y = 0.1;
/** Drawn after the vase so the lines and labels are never hidden behind it. */
const ON_TOP = 10;

const WIDTH_COLOR = "#e8590c";
const HEIGHT_COLOR = "#7c4dff";
const WARN = "#dc2626";

/**
 * Floating size guides for the vase preview: a width line along the front and a height line up the
 * right side. Both draw on top of the vase and their labels always face the camera, so a big vase
 * never covers them and they read from any angle. Preview only; not exported.
 */
export default function VaseGuides({
  box,
  height,
  tooBig,
}: {
  box: { minX: number; maxX: number; minZ: number; maxZ: number };
  height: number;
  tooBig: boolean;
}) {
  const widthColor = tooBig ? WARN : WIDTH_COLOR;
  const width = Math.max(box.maxX - box.minX, box.maxZ - box.minZ);
  const size = Math.min(9, Math.max(4, Math.max(width, height) / 22));
  const midX = (box.minX + box.maxX) / 2;
  const frontZ = box.maxZ + GAP;
  const sideX = box.maxX + GAP;

  const line = (points: [number, number, number][], color: string) => (
    <Line points={points} color={color} lineWidth={1.5} depthTest={false} renderOrder={ON_TOP} />
  );
  const label = (text: string, color: string, anchorX: "center" | "left") => (
    <Text
      font="/fonts/roboto-latin-700-normal.woff"
      fontSize={size}
      color={color}
      anchorX={anchorX}
      anchorY="middle"
      outlineWidth={size * 0.12}
      outlineColor="#ffffff"
      renderOrder={ON_TOP + 1}
      material-depthTest={false}
    >
      {text}
    </Text>
  );

  return (
    <group>
      {/* Width, along the front at floor level, its label floating above the line. */}
      {line([[box.minX, Y, frontZ], [box.maxX, Y, frontZ]], widthColor)}
      {line([[box.minX, Y, frontZ - TICK], [box.minX, Y, frontZ + TICK]], widthColor)}
      {line([[box.maxX, Y, frontZ - TICK], [box.maxX, Y, frontZ + TICK]], widthColor)}
      <Billboard position={[midX, size * 1.2, frontZ]}>{label(`${Math.round(width)} mm`, widthColor, "center")}</Billboard>

      {/* Height, straight up the right side, its label beside the middle of the line. */}
      {line([[sideX, 0, 0], [sideX, height, 0]], HEIGHT_COLOR)}
      {line([[sideX - TICK, 0, 0], [sideX + TICK, 0, 0]], HEIGHT_COLOR)}
      {line([[sideX - TICK, height, 0], [sideX + TICK, height, 0]], HEIGHT_COLOR)}
      <Billboard position={[sideX + size * 0.6, height / 2, 0]}>{label(`${Math.round(height)} mm`, HEIGHT_COLOR, "left")}</Billboard>
    </group>
  );
}
