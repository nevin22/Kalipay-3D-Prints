"use client";

import dynamic from "next/dynamic";

// three.js needs the browser, so the title is loaded client-only, like the keycap canvas.
const Title3D = dynamic(() => import("@/components/Title3D"), { ssr: false });

export default function HomeTitle() {
  return (
    <>
      <h1 className="sr-only">Kalipay 3D Prints</h1>
      <Title3D />
    </>
  );
}
