"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Floor, Lights } from "@/components/KeycapCanvas";

/** The keycap page's floor and camera with nothing on them. Does not read the keycap store. */
export default function EmptyCanvas() {
  const [shown, setShown] = useState(false);

  return (
    <div
      className={`h-full w-full bg-[#f4f3f0] transition-opacity duration-700 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <Canvas camera={{ position: [114, 90, 114], fov: 35 }}>
        <Lights />
        <Floor onReady={() => setShown(true)} />
        <OrbitControls makeDefault enablePan={false} minDistance={15} maxDistance={700} />
      </Canvas>
    </div>
  );
}
