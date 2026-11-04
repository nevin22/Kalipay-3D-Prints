"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import { OrbitControls } from "@react-three/drei";
import { useShallow } from "zustand/react/shallow";
import { DESK_QUERY, Floor, Lights, SIDEBAR_PX } from "@/components/KeycapCanvas";
import { fontUrl } from "@/lib/fonts";
import SizeGuides from "@/components/SizeGuides";
import { BED_MM, buildKeychainParts, type KeychainSettings } from "@/lib/geometry/keychain";
import { useFont } from "@/lib/useFont";
import { useKeychain } from "@/store/useKeychain";

/** Closest the camera comes (mm) however small the keychain is. */
const MIN_DISTANCE = 70;
/** Spare room around the keychain when fitting it to the window. */
const FIT_MARGIN = 1.5;
const offset = new Vector3();

/**
 * The keychain lying on the floor, plus the camera that follows its size: type more and it
 * grows, and the camera eases back to keep all of it in view (until the user grabs the camera).
 */
function Scene({ onFloorReady }: { onFloorReady: () => void }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const fit = useRef({ need: 0, active: false });

  const settings = useKeychain(
    useShallow((s): KeychainSettings => ({
      text: s.text,
      fontSize: s.fontSize,
      bold: s.bold,
      base: s.base,
      padding: s.padding,
      puff: s.puff,
      thickness: s.thickness,
      raise: s.raise,
      hole: s.hole,
    }))
  );
  const fontId = useKeychain((s) => s.font);
  const baseColor = useKeychain((s) => s.baseColor);
  const textColor = useKeychain((s) => s.textColor);
  const { font, error } = useFont(fontUrl(fontId));
  if (error) console.error(error);

  const parts = useMemo(() => buildKeychainParts(settings, font), [settings, font]);
  useEffect(
    () => () => {
      parts.base.dispose();
      parts.text?.dispose();
    },
    [parts]
  );

  const box = parts.base.boundingBox!;
  const width = box.max.x - box.min.x;
  const centerX = (box.min.x + box.max.x) / 2;
  const depth = box.max.z - box.min.z;
  const tooBig = Math.max(width, depth) > BED_MM;

  useFrame(({ camera, size }, delta) => {
    const c = controls.current;
    if (!c) return;
    const dt = Math.min(delta, 0.1);

    // Keep the middle of the keychain (the lug included) in the middle of the view.
    const x = MathUtils.damp(c.target.x, centerX, 6, dt);
    camera.position.x += x - c.target.x;
    c.target.x = x;

    const fov = ((camera as PerspectiveCamera).fov * Math.PI) / 180;
    const covered = window.matchMedia(DESK_QUERY).matches ? SIDEBAR_PX : 0;
    const aspect = Math.max((size.width - covered) / size.height, 0.5);
    const need = Math.max(MIN_DISTANCE, (width * FIT_MARGIN) / (2 * Math.tan(fov / 2) * aspect));

    offset.copy(camera.position).sub(c.target);
    const dist = offset.length();
    const f = fit.current;
    if (f.need === 0) {
      // First frame: start already fitted.
      f.need = need;
      camera.position.copy(c.target).add(offset.setLength(need));
    }
    if (need !== f.need) {
      // Same rule as the keycap page: follow the size unless the user moved the camera away.
      if (dist < need || Math.abs(dist - f.need) < 1) f.active = true;
      f.need = need;
    }
    if (f.active) {
      const next = MathUtils.damp(dist, f.need, 3, dt);
      camera.position.copy(c.target).add(offset.setLength(next));
      if (Math.abs(next - f.need) < 0.5) f.active = false;
    }
  }, -2);

  return (
    <>
      <Lights />
      <mesh geometry={parts.base}>
        <meshStandardMaterial color={baseColor} roughness={0.55} metalness={0.05} />
      </mesh>
      {parts.text && (
        <mesh geometry={parts.text}>
          <meshStandardMaterial color={textColor} roughness={0.5} />
        </mesh>
      )}
      <Suspense fallback={null}>
        <SizeGuides box={{ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z }} tooBig={tooBig} />
      </Suspense>
      <Floor onReady={onFloorReady} />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        minDistance={15}
        maxDistance={700}
        onStart={() => {
          fit.current.active = false;
        }}
      />
    </>
  );
}

export default function KeychainCanvas() {
  // Invisible until the floor image and the font have loaded, then it fades in.
  const [floorReady, setFloorReady] = useState(false);
  const { font } = useFont(fontUrl(useKeychain.getState().font));

  return (
    <div
      className={`relative h-full w-full bg-[#f4f3f0] transition-opacity duration-700 ${
        floorReady && font ? "opacity-100" : "opacity-0"
      }`}
    >
      <Canvas camera={{ position: [60, 70, 80], fov: 35 }}>
        <Scene onFloorReady={() => setFloorReady(true)} />
      </Canvas>
    </div>
  );
}
