"use client";

import { useRef, useState } from "react";
import ShapeIcon from "@/components/ShapeIcon";
import { CONTROL } from "@/components/ui";
import { SHAPE_GROUPS, SHAPES, type ShapeId } from "@/lib/geometry/shapes";

/**
 * Picks a legend icon. The button shows the current one; it opens a window with a search box and
 * every icon in groups. A native <dialog> opened with showModal() sits above the page and closes
 * on Esc, like the download note.
 */
export default function IconPicker({ value, onChange }: { value: ShapeId; onChange: (id: ShapeId) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");

  const current = SHAPES.find((s) => s.id === value) ?? SHAPES[0];
  const q = query.trim().toLowerCase();
  const matches = (s: (typeof SHAPES)[number]) =>
    !q || s.label.toLowerCase().includes(q) || s.group.toLowerCase().includes(q);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setQuery("");
          dialog.current?.showModal();
        }}
        className={`${CONTROL} flex cursor-pointer items-center gap-2 text-left`}
      >
        <ShapeIcon id={current.id} className="h-5 w-5 shrink-0 text-orange-600" />
        <span className="flex-1 truncate">{current.label}</span>
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>

      <dialog
        ref={dialog}
        aria-label="Choose an icon"
        // A tap on the dimmed area outside the card closes it.
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto max-h-[min(36rem,85dvh)] w-[min(28rem,calc(100vw-2rem))] flex-col rounded-2xl bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/40 open:flex"
      >
        <div className="flex items-center gap-2 border-b border-black/10 p-3">
          <input
            type="search"
            className={CONTROL}
            value={query}
            placeholder="Search icons, e.g. cat or sea"
            aria-label="Search icons"
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="shrink-0 rounded-lg border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 touch:py-2 touch:text-base"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-3">
          {SHAPE_GROUPS.map((group) => {
            const items = SHAPES.filter((s) => s.group === group && matches(s));
            if (!items.length) return null;
            return (
              <section key={group}>
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">{group}</h3>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                  {items.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={s.id === value}
                      onClick={() => {
                        onChange(s.id);
                        dialog.current?.close();
                      }}
                      className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition ${
                        s.id === value
                          ? "bg-orange-500/15 text-orange-600 ring-2 ring-orange-500"
                          : "border border-black/10 bg-white/70 text-neutral-700 hover:bg-orange-50"
                      }`}
                    >
                      <ShapeIcon id={s.id} className="h-9 w-9" />
                      <span className="w-full truncate text-center text-[10px] leading-tight">{s.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
          {!SHAPES.some(matches) && <p className="py-6 text-center text-sm text-neutral-500">No icon matches &ldquo;{query}&rdquo;.</p>}
        </div>
      </dialog>
    </>
  );
}
