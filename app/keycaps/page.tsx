"use client";

import { ICON_SIZE_RATIO, MIN_LEGEND_HEIGHT } from "@/lib/geometry/printLimits";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import ExportButton from "@/components/ExportButton";
import KeyRow from "@/components/KeyRow";
import Slider from "@/components/Slider";
import { MAX_CAP_HEIGHT, MIN_CAP_HEIGHT } from "@/lib/geometry/keycap";
import {
  Checkbox,
  ColorField,
  CONTROL,
  Field,
  InfoTip,
  Section,
  Select,
} from "@/components/ui";
import IconPicker from "@/components/IconPicker";
import { RING_SIDES, type RingSide } from "@/lib/geometry/ring";
import { FONT_FACE_CSS, FONTS, fontFamily, type FontId } from "@/lib/fonts";
import { selectSelectedKey, useGenerator, type HousingLayout } from "@/store/useGenerator";

const KeycapCanvas = dynamic(() => import("@/components/KeycapCanvas"), {
  ssr: false,
});

const SIZES = [1, 1.25, 1.5, 1.75, 2, 2.25];

export default function KeycapsPage() {
  const s = useGenerator();
  const key = selectSelectedKey(s);

  // Fetch every font now, so the dropdown shows them in their own style the first time it opens.
  useEffect(() => {
    FONTS.forEach((f) => document.fonts.load(`16px ${fontFamily(f.id)}`).catch(() => {}));
  }, []);

  return (
    <main className="relative flex h-dvh w-screen flex-col overflow-hidden bg-[#f4f3f0] short:flex-row desk:block">
      <style>{FONT_FACE_CSS}</style>

      {/* The 3D view comes first: on top on a phone, on the left when it is on its side, and
          behind the floating sidebar on a laptop. */}
      <section className="relative h-[40dvh] shrink-0 short:h-auto short:min-w-0 short:flex-1 desk:absolute desk:inset-0 desk:h-auto">
        <KeycapCanvas />
        <Image
          src="/images/profile.jpg"
          alt="Kalipay Prints 3D"
          width={144}
          height={144}
          className="absolute bottom-3 right-3 z-10 h-14 w-14 rounded-full border-2 border-white object-cover shadow-lg desk:bottom-6 desk:right-6 desk:h-[144px] desk:w-[144px]"
        />
      </section>

      <aside className="z-10 flex min-h-0 flex-1 flex-col gap-2 [&>*]:shrink-0 overflow-y-auto overflow-x-hidden border-t border-white/80 bg-white/90 p-3 text-neutral-900 short:w-[22rem] short:flex-none short:border-l short:border-t-0 desk:absolute desk:left-0 desk:top-0 desk:h-full desk:w-[27rem] desk:flex-none desk:border-r desk:border-t-0 desk:bg-transparent desk:bg-gradient-to-b desk:from-white/50 desk:to-white/20 desk:shadow-[inset_-1px_0_0_rgba(255,255,255,0.7),inset_0_1px_0_rgba(255,255,255,1),inset_0_0_40px_rgba(255,255,255,0.35),8px_0_40px_rgba(0,0,0,0.15)] desk:backdrop-blur-3xl desk:backdrop-saturate-200">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            aria-label="Home"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff8a4c] to-[#ffc46b] text-white shadow-md transition hover:brightness-110 touch:h-10 touch:w-10"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 touch:h-5 touch:w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />
            </svg>
          </Link>
          <h1 className="flex-1 whitespace-nowrap bg-gradient-to-r from-[#ff8a4c] via-[#b57cff] to-[#5fd8b4] bg-clip-text py-0.5 text-center text-[3vw] font-bold uppercase tracking-[0.08em] desk:text-[14px] desk:tracking-[0.12em] text-transparent">
          <Link href="/" className="hover:opacity-70">Kalipay3dprints</Link>
        </h1>
          {/* Same width as the home button, so the title stays centered. */}
          <span className="h-7 w-7 shrink-0 touch:w-10" aria-hidden />
        </div>

        <Section title="Keys">
          <KeyRow />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Key size">
              <Select
                value={key.units}
                onChange={(e) => s.updateKey({ units: Number(e.target.value) })}
              >
                {SIZES.map((u) => (
                  <option key={u} value={u}>
                    {u}u
                  </option>
                ))}
              </Select>
            </Field>

            <div className="min-w-0 space-y-0.5">
              <div className="flex h-5 items-center gap-1.5">
                <span className="text-xs font-medium text-neutral-600">Housing</span>
                <InfoTip
                  align="right"
                  text="For display only. This changes how the preview looks. The download always puts the housing next to the keycaps, whatever you pick here."
                />
              </div>
              <Select
                aria-label="Housing"
                value={s.housingLayout}
                onChange={(e) => s.set({ housingLayout: e.target.value as HousingLayout })}
              >
                <option value="separate">Separate</option>
                <option value="below">Below keycap</option>
                <option value="hidden">Don&apos;t display</option>
              </Select>
            </div>
          </div>
          <Slider label="Cap height" value={s.capHeight} min={MIN_CAP_HEIGHT} max={MAX_CAP_HEIGHT} step={0.5} unit=" mm"
            help="How tall every keycap is. The base stays the same; a taller cap is straighter-sided, so its top face gets bigger."
            onChange={(v) => s.set({ capHeight: v })} />
        </Section>

        <Section title="Legend">
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Legend type">
            {(["text", "shape"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={key.legendKind === kind}
                // Only shapes can be raised, so a key going back to text goes flush again.
                onClick={() => s.updateKey(kind === "text" ? { legendKind: kind, raise: 0 } : { legendKind: kind })}
                className={`h-7 rounded-lg text-xs font-semibold capitalize transition touch:h-10 touch:text-sm ${
                  key.legendKind === kind
                    ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md shadow-orange-500/30"
                    : "border border-black/10 bg-white/70 text-neutral-700 hover:bg-white"
                }`}
              >
                {kind === "shape" ? "icon" : kind}
              </button>
            ))}
          </div>

          {key.legendKind === "shape" ? (
            // A div, not a Field: a label around the picker would click its button again
            // whenever the window inside it is clicked.
            <div className="space-y-0.5">
              <span className="flex h-5 items-center text-xs font-medium text-neutral-600">Icon</span>
              <IconPicker value={key.shape} onChange={(shape) => s.updateKey({ shape })} />
            </div>
          ) : (
            <>
              <Field label="Text">
                <input
                  className={CONTROL}
                  value={key.text}
                  maxLength={6}
                  placeholder="Up to 6 characters"
                  onChange={(e) => s.updateKey({ text: e.target.value })}
                />
              </Field>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-neutral-600">Font</span>
                  <Checkbox
                    label="Use for all keys"
                    checked={s.fontForAll}
                    onChange={(v) => {
                      s.set({ fontForAll: v });
                      // Turning it on makes every key match the one being edited.
                      if (v) s.updateKey({ font: key.font });
                    }}
                  />
                </div>
                <Select
                  aria-label="Font"
                  value={key.font}
                  style={{ fontFamily: fontFamily(key.font) }}
                  onChange={(e) => s.updateKey({ font: e.target.value as FontId })}
                >
                  {FONTS.map((f) => (
                    <option key={f.id} value={f.id} style={{ fontFamily: fontFamily(f.id) }}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          <Slider label="Size" value={key.fontSize} min={key.legendKind === "shape" ? Math.ceil((MIN_LEGEND_HEIGHT / ICON_SIZE_RATIO) * 2) / 2 : MIN_LEGEND_HEIGHT} max={24} step={0.5} unit=" mm"
            help={`${key.legendKind === "shape" ? "Size of the icon" : "Height of the legend text"}. If it gets too close to the edge of the top face, it turns red.`}
            onChange={(v) => s.updateKey({ fontSize: v })} />
          <Slider label="Rotation" value={key.rotation} min={-180} max={180} step={1} unit="°"
            help="Turns the legend around its center, in degrees."
            onChange={(v) => s.updateKey({ rotation: v })} />
        </Section>

        <div className="grid grid-cols-2 gap-2">
          <Section title="Color">
            <div className="flex flex-col gap-1.5">
              <ColorField label="Cap" value={s.capColor}
                onChange={(v) => s.set({ capColor: v })} />
              <ColorField label="Legend" value={s.legendColor}
                onChange={(v) => s.set({ legendColor: v })} />
            </div>
          </Section>

          <Section title="Split ring" center>
            <Checkbox
              label="Add to housing"
              checked={s.housingRing !== "off"}
              onChange={(on) => s.set({ housingRing: on ? "left" : "off" })}
            />
            {s.housingRing !== "off" && (
              <div className="w-full">
                <Select
                  aria-label="Where the split ring is"
                  value={s.housingRing}
                  onChange={(e) => s.set({ housingRing: e.target.value as RingSide })}
                >
                  {RING_SIDES.map((side) => (
                    <option key={side} value={side}>
                      {side[0].toUpperCase() + side.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </Section>
        </div>

        <ExportButton />
      </aside>

    </main>
  );
}
