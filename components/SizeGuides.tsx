"use client";

import { Line, Text } from "@react-three/drei";

/** How far (mm) the lines sit off the object, and how long the end ticks are. */
const GAP = 5;
const TICK = 1;
/** Just above the floor grid, so the lines never sink into it. */
const Y = 0.1;

/** Brand colors from the floor art: orange for the width, purple for the length. Red when too big for the bed. */
const WIDTH_COLOR = "#e8590c";
const LENGTH_COLOR = "#7c4dff";
const WARN = "#dc2626";

/**
 * Size lines on the floor around an object, with the sizes in mm: one along the front (width) and
 * one along the right side (length). For the preview only; they are not exported. `box` is the
 * object's extent on the floor (x across, z front to back). The keychain and keycap pages share it.
 */
export default function SizeGuides({
  box,
  tooBig,
  labelSize,
  decimals = 0,
}: {
  box: { minX: number; maxX: number; minZ: number; maxZ: number };
  tooBig: boolean;
  /** Label height in mm; by default it grows a little with the object. */
  labelSize?: number;
  /** Digits after the point in the labels. */
  decimals?: number;
}) {
  const widthColor = tooBig ? WARN : WIDTH_COLOR;
  const lengthColor = tooBig ? WARN : LENGTH_COLOR;
  const width = box.maxX - box.minX;
  const depth = box.maxZ - box.minZ;
  const size = labelSize ?? Math.min(5, Math.max(2.5, Math.max(width, depth) / 36));
  const mm = (v: number) => `${v.toFixed(decimals)} mm`;

  const frontZ = box.maxZ + GAP;
  const sideX = box.maxX + GAP;
  const midX = (box.minX + box.maxX) / 2;
  const midZ = (box.minZ + box.maxZ) / 2;

  const label = (text: string, color: string) => (
    <Text
      font="/fonts/roboto-latin-700-normal.woff"
      fontSize={size}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={size * 0.12}
      outlineColor="#ffffff"
      rotation={[-Math.PI / 2, 0, 0]}
    >
      {text}
    </Text>
  );

  return (
    <group>
      {/* Width, along the front edge. */}
      <Line points={[[box.minX, Y, frontZ], [box.maxX, Y, frontZ]]} color={widthColor} lineWidth={1} />
      <Line points={[[box.minX, Y, frontZ - TICK], [box.minX, Y, frontZ + TICK]]} color={widthColor} lineWidth={1} />
      <Line points={[[box.maxX, Y, frontZ - TICK], [box.maxX, Y, frontZ + TICK]]} color={widthColor} lineWidth={1} />
      <group position={[midX, Y, frontZ + size * 1.1]}>{label(mm(width), widthColor)}</group>

      {/* Length, along the right side; its label reads from back to front. */}
      <Line points={[[sideX, Y, box.minZ], [sideX, Y, box.maxZ]]} color={lengthColor} lineWidth={1} />
      <Line points={[[sideX - TICK, Y, box.minZ], [sideX + TICK, Y, box.minZ]]} color={lengthColor} lineWidth={1} />
      <Line points={[[sideX - TICK, Y, box.maxZ], [sideX + TICK, Y, box.maxZ]]} color={lengthColor} lineWidth={1} />
      <group position={[sideX + size * 1.1, Y, midZ]} rotation={[0, -Math.PI / 2, 0]}>
        {label(mm(depth), lengthColor)}
      </group>
    </group>
  );
}
