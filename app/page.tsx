"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import ExportButton from "@/components/ExportButton";
import KeyRow from "@/components/KeyRow";
import Slider from "@/components/Slider";
import {
  Checkbox,
  ColorField,
  CONTROL,
  Field,
  InfoTip,
  Section,
  Select,
} from "@/components/ui";
import { RING_SIDES, type RingSide } from "@/lib/geometry/ring";
import { FONT_FACE_CSS, FONTS, fontFamily, type FontId } from "@/lib/fonts";
import { selectSelectedKey, useGenerator, type HousingLayout } from "@/store/useGenerator";

const KeycapCanvas = dynamic(() => import("@/components/KeycapCanvas"), {
  ssr: false,
});

const SIZES = [1, 1.25, 1.5, 1.75, 2, 2.25];

export default function Home() {
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
        <h1 className="whitespace-nowrap bg-gradient-to-r from-[#ff8a4c] via-[#b57cff] to-[#5fd8b4] bg-clip-text py-0.5 text-center text-[3vw] font-bold uppercase tracking-[0.08em] desk:text-[14px] desk:tracking-[0.12em] text-transparent">
          Keycap Fidget Lab
        </h1>

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
              <div className="flex items-center gap-1.5">
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
        </Section>

        <Section title="Legend">
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

          <Slider label="Size" value={key.fontSize} min={3} max={12} step={0.5} unit=" mm"
            help="Height of the legend text. If it gets too close to the edge of the top face, it turns red."
            onChange={(v) => s.updateKey({ fontSize: v })} />
          <Slider label="Rotation" value={key.rotation} min={-180} max={180} step={1} unit="°"
            help="Turns the legend around its center, in degrees."
            onChange={(v) => s.updateKey({ rotation: v })} />
          <Slider label="Raise" value={key.raise} min={0} max={1} step={0.05} unit=" mm"
            help="How far the legend stands above the top face. At 0 it is flush and the top is smooth; higher values give a raised, tactile legend."
            onChange={(v) => s.updateKey({ raise: v })} />
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
