"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useFont } from "@/lib/useFont";
import { textToShapes } from "@/lib/geometry/legend";

const FILL = 0.92; // the text takes this much of the canvas width, whatever the screen
const TEXT = "Kalipay 3D Prints";
const PLATE = 8; // how far the orange backing sticks out around each letter (glyph units)
const LINE_HEIGHT = 150; // distance between the two lines on a phone (glyph units)
const SPACING = 12; // extra gap between letters (glyph units)

const ORANGE = "#ff8a4c";
const DARK_ORANGE = "#c9561a";

/**
 * A letter pushed out into a puffy solid. The edge is a big round bevel: `grow` widens the whole
 * outline (that makes the backing plate), and `puff` is how far the rounding goes in. Smooth
 * normals make it look inflated instead of faceted.
 */
function extrude(shapes: THREE.Shape[], grow: number, puff: number) {
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: 2,
    bevelEnabled: true,
    bevelOffset: grow - puff,
    bevelSize: puff,
    bevelThickness: puff,
    bevelSegments: 8,
    curveSegments: 12,
  });
  return toCreasedNormals(g, Math.PI / 3);
}

type Letter = { white: THREE.BufferGeometry; plate: THREE.BufferGeometry; x: number; y: number };

function Text() {
  const { font } = useFont("/fonts/mouldy-cheese.ttf");
  const viewport = useThree((s) => s.viewport); // the canvas size in scene units, so it fits any aspect
  const letters = useRef<(THREE.Group | null)[]>([]);

  // On a narrow canvas (a phone) the title is two lines, "Kalipay" over "3D Prints".
  const stacked = viewport.width / viewport.height < 3;

  // Per letter, from the same hand-laid-out glyph outlines the legend uses: a white letter and,
  // behind it, the same outline grown into an orange plate. Both are centered on the letter, and
  // `x`/`y` put it back, so each letter can move on its own.
  const { items, width, height } = useMemo(() => {
    if (!font) return {};
    const unit = 100 / font.unitsPerEm;
    const lines = stacked ? ["Kalipay", "3D Prints"] : [TEXT];
    const all = new THREE.Box3();
    const items: Letter[] = [];
    let width = 0;
    lines.forEach((line, row) => {
      const first = items.length;
      const box = new THREE.Box3();
      let pen = 0;
      for (const ch of Array.from(line)) {
        const advance = (font.charToGlyph(ch).advanceWidth ?? 0) * unit;
        if (ch !== " ") {
          const shapes = textToShapes(font, ch);
          const white = extrude(shapes, 0, 4);
          const plate = extrude(shapes, PLATE, 4);
          white.computeBoundingBox();
          const c = white.boundingBox!.getCenter(new THREE.Vector3());
          c.x += pen;
          for (const g of [white, plate]) g.translate(pen - c.x, -c.y, 0);
          const size = white.boundingBox!.getSize(new THREE.Vector3());
          box.union(new THREE.Box3().setFromCenterAndSize(c, size));
          items.push({ white, plate, x: c.x, y: c.y - row * LINE_HEIGHT });
        }
        pen += advance + SPACING;
      }
      // Center each line on its own.
      const mid = box.getCenter(new THREE.Vector3()).x;
      for (const it of items.slice(first)) it.x -= mid;
      width = Math.max(width, box.max.x - box.min.x);
      all.union(box);
    });
    // Center the block vertically (the glyph boxes of the rows are stacked by LINE_HEIGHT).
    const midY = (all.max.y + all.min.y) / 2 - ((lines.length - 1) * LINE_HEIGHT) / 2;
    for (const it of items) it.y -= midY;
    return {
      items,
      width: width + 2 * PLATE,
      height: all.max.y - all.min.y + (lines.length - 1) * LINE_HEIGHT + 2 * PLATE,
    };
  }, [font, stacked]);

  // A small wave: each letter rises, falls and drifts sideways a bit behind the one before it.
  useFrame(({ clock }) => {
    letters.current.forEach((g, i) => {
      if (!g || !items) return;
      const t = clock.elapsedTime * 2 - i * 0.5;
      g.position.y = items[i].y + Math.sin(t) * 4;
      // A quarter turn behind the bob, so each letter drifts in a small loop.
      g.position.x = items[i].x + Math.cos(t) * 3;
    });
  });

  if (!items) return null;
  return (
    <group scale={Math.min((viewport.width * FILL) / width!, (viewport.height * FILL) / height!)}>
      {items.map((it, i) => (
        <group
          key={i}
          ref={(g) => {
            letters.current[i] = g;
          }}
          position={[it.x, it.y, 0]}
        >
          {/* Shadow: the plate again, darker, behind and a little down and right. */}
          <mesh geometry={it.plate} position={[2, -4, -5]}>
            <meshStandardMaterial color={DARK_ORANGE} roughness={0.7} />
          </mesh>
          <mesh geometry={it.plate}>
            <meshStandardMaterial color={ORANGE} roughness={0.6} />
          </mesh>
          {/* The plate's top is at z = 6; the white letter sits on it. */}
          <mesh geometry={it.white} position={[0, 0, 5]}>
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function Title3D() {
  return (
    <div className="aspect-[5/3] w-full max-w-5xl drop-shadow-[0_12px_10px_rgba(0,0,0,0.3)] sm:aspect-[5/1]" aria-hidden>
      <Canvas camera={{ position: [0, 0, 6], fov: 30 }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 4, 6]} intensity={2.5} />
        <Text />
      </Canvas>
    </div>
  );
}
