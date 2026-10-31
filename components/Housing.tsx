"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, MeshStandardMaterial } from "three";
import { useShallow } from "zustand/react/shallow";
import { useGenerator } from "@/store/useGenerator";
import { buildHousing, buildHousingTab } from "@/lib/geometry/housing";
import { pose } from "@/lib/layoutPose";

export default function Housing() {
  // One strip with a well for every key, in the same order as the caps.
  const units = useGenerator(useShallow((s) => s.keys.map((k) => k.units)));
  const capColor = useGenerator((s) => s.capColor);
  const ring = useGenerator((s) => s.housingRing);
  const geometry = useMemo(() => buildHousing(units), [units]);
  const tab = useMemo(() => (ring === "off" ? null : buildHousingTab(units, ring)), [units, ring]);
  const group = useRef<Group>(null);
  // The strip's material and the split ring tab's, faded together.
  const materials = useRef<(MeshStandardMaterial | null)[]>([null, null]);
  // When keys are added or removed the strip changes shape; it eases in so that does not pop.
  const born = useRef(0);

  useEffect(() => {
    born.current = performance.now();
    return () => geometry.dispose();
  }, [geometry]);
  useEffect(() => () => tab?.dispose(), [tab]);

  // Position and fade come from the shared pose, which KeycapCanvas advances each frame.
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.set(pose.housingX, pose.housingY, 0);
    const grow = Math.min((performance.now() - born.current) / 300, 1);
    const visible = pose.shown * pose.shown * (3 - 2 * pose.shown);
    const opacity = visible * (0.55 + 0.45 * grow);
    // Only blend while fading; a fully visible housing is drawn as a normal solid.
    const blending = opacity < 0.999;
    for (const mat of materials.current) {
      if (!mat) continue;
      mat.opacity = opacity;
      if (mat.transparent !== blending) {
        mat.transparent = blending;
        mat.needsUpdate = true;
      }
    }
    g.visible = opacity > 0.003;
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          ref={(m) => {
            materials.current[0] = m;
          }}
          color={capColor}
          roughness={0.7}
        />
      </mesh>
      {tab && (
        <mesh geometry={tab}>
          <meshStandardMaterial
            ref={(m) => {
              materials.current[1] = m;
            }}
            color={capColor}
            roughness={0.7}
          />
        </mesh>
      )}
    </group>
  );
}
