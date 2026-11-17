"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

type Feature = {
  name: string;
  icon: string;
  title: string;
  text: string;
  href?: string;
  soon?: true;
  // A group: clicking it slides in these entries instead of navigating.
  choices?: Feature[];
};

const FEATURES: Feature[] = [
  {
    name: "Clickers", icon: "fidget-keycap", title: "from-[#e8590c] to-[#e8b800]",
    text: "Clicky fidget toys: a single keycap with your name, or a bar of keys with a character head.",
    choices: [
      { href: "/keycaps", icon: "fidget-keycap", name: "Fidget Keycaps", title: "from-[#e8590c] to-[#d97706]", text: "Design a custom fidget keycap with your name, initials or favorite word, ready to 3D print." },
      { href: "/clickers", icon: "fidget-keycap", name: "Key Clickers", title: "from-[#e8b800] to-[#e8590c]", text: "Build a fidget bar of clicky keys with a clickable character head on top." },
    ],
  },
  { href: "/keychains", icon: "keychain", name: "Keychains", title: "from-[#4a6cf0] to-[#9333ea]", text: "Make a personalized keychain for yourself, or as a gift for someone special." },
  { href: "/vases", icon: "vase", name: "Vases", title: "from-[#0f9d74] to-[#0284c7]", text: "Create a one-of-a-kind vase to brighten up any room." },
];

// shortcut: only one group exists; make this state hold the group if a second one is added.
const GROUP = FEATURES.find((f) => f.choices)!;

const FOCUS = "outline-none transition hover:bg-white/40 focus-visible:bg-white/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400";
const ROW = `group flex w-full items-center gap-4 p-4 text-left ${FOCUS}`;
// Both panels share one grid cell, so the card keeps its height and only the content slides.
const PANEL = "col-start-1 row-start-1 transition-[opacity,translate,visibility] duration-300 ease-out motion-reduce:transition-none";

function Row({ f }: { f: Feature }) {
  return (
    <>
      <Image src={`/images/icon-${f.icon}.webp`} alt="" width={64} height={64} unoptimized className="h-16 w-16 shrink-0 drop-shadow-[0_4px_5px_rgb(0_0_0/0.28)]" />
      <span className={`min-w-0 flex-1 ${f.soon ? "opacity-60" : ""}`}>
        <span className="flex items-center gap-2">
          <span className={`bg-gradient-to-r bg-clip-text text-lg font-extrabold tracking-tight text-transparent ${f.title}`}>{f.name}</span>
          {f.soon && <span className="rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Coming soon</span>}
        </span>
        <span className="mt-0.5 block text-balance text-sm leading-snug text-neutral-700">{f.text}</span>
      </span>
      {!f.soon && (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#ffa066] to-[#e8590c] text-white shadow-[0_3px_6px_rgb(0_0_0/0.2),inset_0_2px_0_rgb(255_255_255/0.45)] transition group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current transition group-hover:translate-x-0.5" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </span>
      )}
    </>
  );
}

function List({ items, onGroup, groupRef }: { items: Feature[]; onGroup?: (e: React.MouseEvent) => void; groupRef?: React.Ref<HTMLButtonElement> }) {
  return (
    <ul className="divide-y divide-white/70">
      {items.map((f) => (
        <li key={f.name}>
          {f.soon ? (
            // Not built yet: a plain row, not a link, so it cannot be opened from here.
            <div aria-disabled className="flex cursor-not-allowed select-none items-center gap-4 p-4"><Row f={f} /></div>
          ) : f.choices ? (
            <button ref={groupRef} type="button" onClick={onGroup} className={ROW}><Row f={f} /></button>
          ) : (
            <Link href={f.href!} className={ROW}><Row f={f} /></Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function FeatureList() {
  const [open, setOpen] = useState(false);
  const groupRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  // The clicked panel becomes inert. For keyboard users (detail 0) hand focus to the other one; mouse and touch get no ring.
  const toggle = (next: boolean) => (e: React.MouseEvent) => {
    flushSync(() => setOpen(next));
    if (e.detail === 0) (next ? backRef : groupRef).current?.focus();
  };

  return (
    <nav aria-label="Features" className="grid w-full max-w-xl overflow-hidden rounded-3xl glass !bg-white/20 backdrop-blur-[6px] backdrop-saturate-150">
      <div inert={open} className={`${PANEL} ${open ? "invisible -translate-x-12 opacity-0" : ""}`}>
        <List items={FEATURES} onGroup={toggle(true)} groupRef={groupRef} />
      </div>
      <div inert={!open} className={`${PANEL} ${open ? "" : "invisible translate-x-12 opacity-0"}`}>
        <button ref={backRef} type="button" onClick={toggle(false)} aria-label={`Back to all designers`} className={`group relative w-full border-b border-white/70 px-14 py-3 text-center ${FOCUS}`}>
          {/* Pinned to the left edge so the text stays centered on the card. */}
          <span className="absolute left-4 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-b from-[#ffa066] to-[#e8590c] text-white shadow-[0_2px_4px_rgb(0_0_0/0.2),inset_0_1px_0_rgb(255_255_255/0.45)] transition group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current transition group-hover:-translate-x-0.5" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5m6 6-6-6 6-6" />
            </svg>
          </span>
          <span>
            <span className={`block bg-gradient-to-r bg-clip-text text-lg font-extrabold leading-tight tracking-tight text-transparent ${GROUP.title}`}>{GROUP.name}</span>
            <span className="block text-sm leading-snug text-neutral-700">Pick what you want to make</span>
          </span>
        </button>
        <List items={GROUP.choices!} />
      </div>
    </nav>
  );
}
