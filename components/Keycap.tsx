"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useGenerator } from "@/store/useGenerator";
import { useFont } from "@/lib/useFont";
import { fontUrl } from "@/lib/fonts";
import { buildKeycapParts } from "@/lib/geometry/cap";import { pose } from "@/lib/layoutPose";

/** Legend color when it does not fit inside the top face. */
const NO_FIT_COLOR = "#ff2a2a";

/** `index` is the key's place in the row; it picks its x from the shared pose. */
export default function Keycap({ keyId, index }: { keyId: string; index: number }) {
  // Only this key's own settings: editing another key does not rebuild this one.
  const key = useGenerator((s) => s.keys.find((k) => k.id === keyId) ?? s.keys[0]);
  const stemTolerance = useGenerator((s) => s.stemTolerance);
  const capHeight = useGenerator((s) => s.capHeight);
  const capColor = useGenerator((s) => s.capColor);
  const legendColor = useGenerator((s) => s.legendColor);

  const { font, error } = useFont(fontUrl(key.font));

  const parts = useMemo(
    () => buildKeycapParts({ ...key, stemTolerance, capHeight }, font),
    [key, stemTolerance, capHeight, font]
  );

  useEffect(
    () => () => {
      parts.cap.dispose();
      parts.legend?.dispose();
    },
    [parts]
  );
  // Slides sideways as the housing moves; KeycapCanvas advances the shared pose each frame.
  // A new cap grows out of the floor instead of popping in.
  const group = useRef<Group>(null);
  const born = useRef<number | null>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.x = pose.capXs[index] ?? 0;
    born.current ??= performance.now();
    const t = Math.min((performance.now() - born.current) / 280, 1);
    g.scale.setScalar(0.4 + 0.6 * t * (2 - t));
  });

  if (error) console.error(error);

  // The parts are built with the origin at the center of the bottom face.
  return (
    <group ref={group} position={[0, -capHeight / 2, 0]}>
      <mesh geometry={parts.cap}>
        <meshStandardMaterial color={capColor} roughness={0.55} metalness={0.05} />
      </mesh>
      {parts.legend && (
        <mesh geometry={parts.legend}>
          <meshStandardMaterial
            color={parts.fits ? legendColor : NO_FIT_COLOR}
            roughness={0.5}
          />
        </mesh>
      )}
    </group>
  );
}
