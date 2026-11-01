"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const EmptyCanvas = dynamic(() => import("@/components/EmptyCanvas"), { ssr: false });

/** A feature that has no tools yet: the full-screen canvas and a way back home. */
export default function EmptyFeature() {
  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#f4f3f0]">
      <EmptyCanvas />
      <Link
        href="/"
        className="absolute left-3 top-3 z-10 flex min-h-10 items-center rounded-full bg-white/90 px-4 text-sm font-semibold text-neutral-900 shadow-md hover:bg-white"
      >
        ← Kalipay3dprints
      </Link>
    </main>
  );
}
