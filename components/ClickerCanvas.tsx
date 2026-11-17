"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import { Floor, Lights } from "@/components/KeycapCanvas";
import { fontUrl } from "@/lib/fonts";
import { buildKeycapParts } from "@/lib/geometry/cap";
import {
  CAP_BOTTOM_Y,
  clickerCapSettings,
  clickerChars,
  effectiveBodyColor,
  HEAD_BOTTOM_Y,
  buildClickerHeadParts,
  buildClickerHousing,
  buildClickerRing,
  clickerLayout,
  headColor,
} from "@/lib/geometry/clicker";
import { useFont } from "@/lib/useFont";
import { useClicker } from "@/store/useClicker";

/** Legend color when it does not fit inside the top face. */
const NO_FIT_COLOR = "#ff2a2a";

/** One cap over its well, at the released height. */
function Cap({ text, x }: { text: string; x: number }) {
  const fontId = useClicker((s) => s.font);
  const capColor = useClicker((s) => effectiveBodyColor(s.bodyColor, s.head, s.headShape));
  const accent = useClicker((s) => s.accentColor);
  const keyBorder = useClicker((s) => s.keyBorder);
  const { font } = useFont(fontUrl(fontId));
  const parts = useMemo(
    () =>
      buildKeycapParts(clickerCapSettings(text, keyBorder),
        font
      ),
    [text, font, keyBorder]
  );
  useEffect(
    () => () => {
      parts.cap.dispose();
      parts.legend?.dispose();
      parts.border?.dispose();
    },
    [parts]
  );
  return (
    <group position={[x, CAP_BOTTOM_Y, 0]}>
      <mesh geometry={parts.cap}>
        <meshStandardMaterial color={capColor} roughness={0.55} metalness={0.05} />
      </mesh>
      {parts.border && (
        <mesh geometry={parts.border}>
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
      )}
      {parts.legend && (
        <mesh geometry={parts.legend}>
          <meshStandardMaterial color={parts.fits ? accent : NO_FIT_COLOR} roughness={0.5} />
        </mesh>
      )}
    </group>
  );
}

/** The housing lying on the floor with a cap in each well, the head and the ring. */
function Scene({ onFloorReady }: { onFloorReady: () => void }) {
  const { text, grill, grillSize, grillSpacing, head, headShape, headSize, ring, border } = useClicker();
  const bodyColor = effectiveBodyColor(useClicker((s) => s.bodyColor), head, headShape);
  const chars = useMemo(() => clickerChars(text), [text]);
  const keys = chars.length;
  const spec = useMemo(() => (head ? { id: headShape, size: headSize } : undefined), [head, headShape, headSize]);
  const housing = useMemo(
    () => buildClickerHousing(keys, grill, spec, border, { size: grillSize, spacing: grillSpacing }),
    [keys, grill, spec, border, grillSize, grillSpacing]
  );
  const head3d = useMemo(() => (spec ? buildClickerHeadParts(spec.id, spec.size) : null), [spec]);
  const ringGeo = useMemo(() => (ring ? buildClickerRing(keys, spec, border) : null), [ring, keys, spec, border]);
  useEffect(() => () => housing.dispose(), [housing]);
  useEffect(
    () => () => {
      head3d?.plate.dispose();
      head3d?.features.forEach((f) => f.geometry.dispose());
    },
    [head3d]
  );
  useEffect(() => () => ringGeo?.dispose(), [ringGeo]);
  const { headX, keyXs, minX, maxX } = useMemo(() => clickerLayout(keys, spec, border), [keys, spec, border]);

  const body = <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.05} />;
  return (
    <>
      <Lights />
      {/* The bar runs front to back, head at the far end, so the letters read downward. */}
      <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={housing}>{body}</mesh>
      {ringGeo && <mesh geometry={ringGeo}>{body}</mesh>}
      {head3d && headX !== null && (
        <group position={[headX, HEAD_BOTTOM_Y, 0]}>
          <mesh geometry={head3d.plate}>
            <meshStandardMaterial color={headColor(spec!.id, bodyColor)} roughness={0.55} metalness={0.05} />
          </mesh>
          {head3d.features.map((f, i) => (
            <mesh key={i} geometry={f.geometry}>
              <meshStandardMaterial color={f.color} roughness={0.5} />
            </mesh>
          ))}
        </group>
      )}
      {keyXs.map((x, i) => (
        <Cap key={i} text={chars[i] ?? ""} x={x} />
      ))}
      </group>
      <Floor onReady={onFloorReady} />
      <OrbitControls makeDefault enablePan={false} target={[0, 8, (minX + maxX) / 2]} minDistance={30} maxDistance={700} />
    </>
  );
}

export default function ClickerCanvas() {
  const [floorReady, setFloorReady] = useState(false);
  const { font } = useFont(fontUrl(useClicker.getState().font));
  return (
    <div className={`relative h-full w-full bg-[#f4f3f0] transition-opacity duration-700 ${floorReady && font ? "opacity-100" : "opacity-0"}`}>
      <Canvas camera={{ position: [40, 100, 120], fov: 35 }}>
        <Scene onFloorReady={() => setFloorReady(true)} />
      </Canvas>
    </div>
  );
}
