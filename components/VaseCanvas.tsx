"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { MathUtils, Vector3, type PerspectiveCamera } from "three";
import { OrbitControls } from "@react-three/drei";
import { useShallow } from "zustand/react/shallow";
import { DESK_QUERY, Floor, Lights, SIDEBAR_PX } from "@/components/KeycapCanvas";
import VaseGuides from "@/components/VaseGuides";
import { BED_MM } from "@/lib/geometry/keychain";
import { buildVase, DEFAULT_VASE, type VaseSettings } from "@/lib/geometry/vase";
import { useVase } from "@/store/useVase";

/** Closest the camera comes (mm) however small the vase is. */
const MIN_DISTANCE = 120;
/** Spare room around the vase when fitting it to the window. */
const FIT_MARGIN = 1.5;
const offset = new Vector3();
const SETTING_KEYS = Object.keys(DEFAULT_VASE) as (keyof VaseSettings)[];

/** The vase standing on the floor, plus the camera that keeps all of it in view (until the user grabs it). */
function Scene({ onFloorReady }: { onFloorReady: () => void }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const fit = useRef({ need: 0, active: false });

  const settings = useVase(
    useShallow((s): VaseSettings => Object.fromEntries(SETTING_KEYS.map((k) => [k, s[k]])) as VaseSettings)
  );
  const color = useVase((s) => s.color);

  const geometry = useMemo(() => buildVase(settings), [settings]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const box = geometry.boundingBox!;
  const width = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  const height = settings.height;
  const tooBig = width > BED_MM;

  useFrame(({ camera, size }, delta) => {
    const c = controls.current;
    if (!c) return;
    const dt = Math.min(delta, 0.1);

    // Aim at the middle of the vase's height.
    const y = MathUtils.damp(c.target.y, height * 0.4, 6, dt);
    camera.position.y += y - c.target.y;
    c.target.y = y;

    const fov = ((camera as PerspectiveCamera).fov * Math.PI) / 180;
    const covered = window.matchMedia(DESK_QUERY).matches ? SIDEBAR_PX : 0;
    const aspect = Math.max((size.width - covered) / size.height, 0.5);
    const half = 2 * Math.tan(fov / 2);
    const need = Math.max(MIN_DISTANCE, (width * FIT_MARGIN) / (half * aspect), (height * FIT_MARGIN) / half);

    offset.copy(camera.position).sub(c.target);
    const dist = offset.length();
    const f = fit.current;
    if (f.need === 0) {
      // First frame: start already fitted.
      f.need = need;
      camera.position.copy(c.target).add(offset.setLength(need));
    }
    if (need !== f.need) {
      // Same rule as the keychain page: follow the size unless the user moved the camera away.
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
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      <Suspense fallback={null}>
        <VaseGuides box={{ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z }} height={height} tooBig={tooBig} />
      </Suspense>
      <Floor onReady={onFloorReady} />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        minDistance={40}
        maxDistance={900}
        onStart={() => {
          fit.current.active = false;
        }}
      />
    </>
  );
}

export default function VaseCanvas() {
  // Invisible until the floor image has loaded, then it fades in.
  const [floorReady, setFloorReady] = useState(false);

  return (
    <div
      className={`relative h-full w-full bg-[#f4f3f0] transition-opacity duration-700 ${
        floorReady ? "opacity-100" : "opacity-0"
      }`}
    >
      <Canvas camera={{ position: [140, 150, 190], fov: 35 }}>
        <Scene onFloorReady={() => setFloorReady(true)} />
      </Canvas>
    </div>
  );
}
