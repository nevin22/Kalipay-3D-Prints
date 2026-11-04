"use client";

import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import SizeGuides from "@/components/SizeGuides";
import { capRow } from "@/lib/geometry/housing";
import { pose } from "@/lib/layoutPose";
import { useGenerator } from "@/store/useGenerator";

/** Label size (mm): the keycap view is zoomed out further than the keychain's, so a little bigger. */
const LABEL = 3.2;

/**
 * The same size lines as the keychain page, around the whole row of caps: the row's width along its
 * front and the cap depth along its right end, so neither line crosses a neighbouring cap. They sit
 * 5 mm outside the row, which is outside the housing's wall too when the housing is stacked around
 * the caps, so they show in every layout. They follow the caps as the layout animates (they read
 * the shared `pose` every frame). Preview only; never exported.
 */
export default function CapGuides() {
  // The key sizes as one string, so this only re-renders when a size changes.
  const sizes = useGenerator((s) => s.keys.map((k) => k.units).join(","));
  const group = useRef<Group>(null);

  const row = capRow(sizes.split(",").map(Number));
  const box = { minX: row.minX, maxX: row.maxX, minZ: -row.depth / 2, maxZ: row.depth / 2 };

  // Per frame: stand on the floor, shifted so the strip's coordinates line up with where the caps are right now.
  useFrame(() => {
    group.current?.position.set((pose.capXs[0] ?? 0) - row.firstCenter, pose.floorY, 0);
  });

  return (
    <Suspense fallback={null}>
      <group ref={group}>
        <SizeGuides box={box} tooBig={false} labelSize={LABEL} decimals={1} />
      </group>
    </Suspense>
  );
}
