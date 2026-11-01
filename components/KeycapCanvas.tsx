"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState, type ComponentRef, type Ref } from "react";
import { Color, MathUtils, SRGBColorSpace, Vector3, type Group, type PerspectiveCamera } from "three";
import { OrbitControls, Grid, Text, useTexture } from "@react-three/drei";
import { PITCH } from "@/lib/geometry/keycap";
import Keycap from "@/components/Keycap";
import Housing from "@/components/Housing";
import { layoutExtent } from "@/lib/geometry/housing";
import { pose, stepPose } from "@/lib/layoutPose";
import { useShallow } from "zustand/react/shallow";
import { useGenerator } from "@/store/useGenerator";
import { fontUrl } from "@/lib/fonts";
import { loadFont } from "@/lib/useFont";

// Touch screens (phones) get a half-size floor image, so they do not run out of graphics memory.
const FLOOR_SRC =
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
    ? "/images/floor-small.svg"
    : "/images/floor.svg";

// Start fetching the floor image as soon as this file loads, not when the scene first draws it.
useTexture.preload(FLOOR_SRC);

/** Camera distance (mm) at the start, matching the camera prop below. */
const BASE_DISTANCE = Math.hypot(114, 90, 114);
/** Width of the floating sidebar in pixels: the scene should fit in what is left of the window. */
const SIDEBAR_PX = 432;
/** Same query as the `desk` variant in globals.css: only then does the sidebar float over the view. */
const DESK_QUERY = "(min-width: 768px) and (min-height: 501px)";
/** Spare room around the row when fitting it to the window. */
const FIT_MARGIN = 1.3;
const offset = new Vector3();

/** Floor size in mm. Keeps the 16:9 shape of floor.svg. */
const FLOOR_WIDTH = 640;
const FLOOR_HEIGHT = 360;

/** The abstract artwork, lying flat on the floor so it moves with the camera. */
function FloorArt() {
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const map = useTexture(FLOOR_SRC, (t) => {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = maxAnisotropy;
  });

  return (
    <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <planeGeometry args={[FLOOR_WIDTH, FLOOR_HEIGHT]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Calls `onReady` once it is mounted, which inside a Suspense means everything beside it has loaded. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

const TITLE = "KALIPAY 3D PRINTS";
/** Same warm, cool and mint colors as the shapes in floor.svg. */
const TITLE_STOPS = ["#ff8a4c", "#b57cff", "#6c8dff", "#5fd8b4"].map((c) => new Color(c));

/** One color per letter, blended along the stops, so the text reads as a gradient. */
const TITLE_COLORS = Object.fromEntries(
  Array.from(TITLE, (_, i) => {
    const t = (i / (TITLE.length - 1)) * (TITLE_STOPS.length - 1);
    const a = Math.min(Math.floor(t), TITLE_STOPS.length - 2);
    const color = TITLE_STOPS[a].clone().lerp(TITLE_STOPS[a + 1], t - a);
    return [i, `#${color.getHexString()}`];
  })
);

/** troika's `colorRanges` works on the Text object but is missing from drei's prop types. */
const TITLE_PROPS = { colorRanges: TITLE_COLORS };

/**
 * Page name written on the floor, in front of the keycap. The outer group turns it 45° so it
 * reads left to right from the default camera angle; the text itself is lying flat.
 */
function FloorTitle() {
  return (
    <group rotation={[0, Math.PI / 4, 0]} position={[0, -0.2, 0]}>
      <Text
        position={[0, 0, 48]}
        rotation={[-Math.PI / 2, 0, 0]}
        font="/fonts/roboto-latin-700-normal.woff"
        fontSize={11}
        letterSpacing={0.12}
        anchorX="center"
        anchorY="middle"
        {...TITLE_PROPS}
      >
        {TITLE}
      </Text>
    </group>
  );
}

export function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 30, 10]} intensity={1.6} />
      <directionalLight position={[-20, 10, -10]} intensity={0.5} />
    </>
  );
}

/** The floor artwork, the page name and the grid. `onReady` fires once the artwork and font have loaded. */
export function Floor({ onReady, ref }: { onReady: () => void; ref?: Ref<Group> }) {
  return (
    <group ref={ref}>
      <Suspense fallback={null}>
        <FloorArt />
        <FloorTitle />
        <Ready onReady={onReady} />
      </Suspense>
      <Grid
        position={[0, -0.1, 0]}
        args={[200, 200]}
        cellSize={PITCH}
        cellThickness={0.6}
        sectionSize={PITCH * 5}
        sectionThickness={1}
        fadeDistance={150}
        infiniteGrid
      />
    </group>
  );
}

/**
 * The whole 3D scene. It also advances the shared `pose` once per frame (before the cap and the
 * housing read it), which is what animates the housing layouts: the housing slides and fades,
 * and the floor and the camera target follow it.
 */
function Scene({ onFloorReady }: { onFloorReady: () => void }) {
  const floor = useRef<Group>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const keyIds = useGenerator(useShallow((s) => s.keys.map((k) => k.id)));
  // Automatic zoom to keep a wide row in view. It only runs when the row or layout changes
  // and stops as soon as the user grabs the camera.
  const fit = useRef({ need: 0, active: false });

  // Negative priority: run before the other useFrame callbacks, so they see this frame's pose.
  useFrame(({ camera, size }, delta) => {
    const dt = Math.min(delta, 0.1);
    const { keys, housingLayout, housingRing, capHeight } = useGenerator.getState();
    const units = keys.map((k) => k.units);
    stepPose(dt, units, housingLayout, housingRing, capHeight);
    if (floor.current) floor.current.position.y = pose.floorY;
    const c = controls.current;
    if (!c) return;
    c.target.y = pose.targetY;

    // Distance at which the whole row fits in the part of the window the sidebar leaves free.
    const fov = ((camera as PerspectiveCamera).fov * Math.PI) / 180;
    const covered = window.matchMedia(DESK_QUERY).matches ? SIDEBAR_PX : 0;
    const aspect = Math.max((size.width - covered) / size.height, 0.5);
    const need = Math.max(
      BASE_DISTANCE,
      (layoutExtent(units, housingLayout, housingRing) * FIT_MARGIN) / (2 * Math.tan(fov / 2) * aspect)
    );

    offset.copy(camera.position).sub(c.target);
    const dist = offset.length();
    const f = fit.current;
    if (f.need === 0) {
      // First frame: start already fitted instead of zooming out after the page appears.
      f.need = need;
      camera.position.copy(c.target).add(offset.setLength(need));
    }
    if (need !== f.need) {
      // Zoom out if the content no longer fits; zoom back in only if the user never moved away
      // from the previous automatic distance.
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

      {keyIds.map((id, index) => (
        <Keycap key={id} keyId={id} index={index} />
      ))}
      <Housing />

      <Floor ref={floor} onReady={onFloorReady} />

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

export default function KeycapCanvas() {
  // The scene stays invisible until the floor image, the title font and the legend fonts have
  // all loaded, then fades in, so the pieces never arrive one by one.
  const [floorReady, setFloorReady] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let alive = true;
    const urls = new Set(useGenerator.getState().keys.map((k) => fontUrl(k.font)));
    Promise.all([...urls].map(loadFont))
      .catch(() => {})
      .finally(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!floorReady || !fontsReady) return;
    // A short beat so the caps have built their meshes and the title has drawn once.
    const t = setTimeout(() => setShown(true), 200);
    return () => clearTimeout(t);
  }, [floorReady, fontsReady]);

  return (
    <div
      className={`relative h-full w-full bg-[#f4f3f0] transition-opacity duration-700 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <Canvas camera={{ position: [114, 90, 114], fov: 35 }}>
        <Scene onFloorReady={() => setFloorReady(true)} />
      </Canvas>
    </div>
  );
}