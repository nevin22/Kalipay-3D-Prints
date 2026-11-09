"use client";

import dynamic from "next/dynamic";
import Slider from "@/components/Slider";
import StudioLayout from "@/components/StudioLayout";
import VaseExportButton from "@/components/VaseExportButton";
import { ColorField, Field, Section, Select } from "@/components/ui";
import { BED_MM } from "@/lib/geometry/keychain";
import { LIMITS, maxOverhang, OVERHANG_LIMIT, vaseMaxRadius, VASE_PRESETS, type VaseSection } from "@/lib/geometry/vase";
import { useVase } from "@/store/useVase";

const VaseCanvas = dynamic(() => import("@/components/VaseCanvas"), { ssr: false });

const CHIP =
  "rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-neutral-800 shadow-sm transition hover:border-orange-400 hover:bg-white touch:min-h-10";

const CHIP_ACTIVE = "!border-orange-500 !bg-orange-500 !text-white";

export default function VasesPage() {
  const s = useVase();
  const polygon = s.section === "polygon";
  const ribbed = s.ribDepth > 0;
  const lean = maxOverhang(s);
  const tooBig = vaseMaxRadius(s) * 2 > BED_MM;

  return (
    <StudioLayout canvas={<VaseCanvas />}>
      <Section title="Start from">
        <div className="flex flex-wrap gap-1.5">
          {VASE_PRESETS.map((p) => {
            // A preset counts as selected while every setting it sets still has its value.
            const active = (Object.keys(p.patch) as (keyof typeof p.patch)[]).every((k) => s[k] === p.patch[k]);
            return (
              <button key={p.id} type="button" aria-pressed={active} className={`${CHIP} ${active ? CHIP_ACTIVE : ""}`} onClick={() => s.set(p.patch)}>
                {p.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Size">
        <Slider label="Height" value={s.height} min={LIMITS.height.min} max={LIMITS.height.max} step={5} unit=" mm"
          onChange={(v) => s.set({ height: v })} />
        <Slider label="Base width" value={s.baseDiameter} min={LIMITS.baseDiameter.min} max={LIMITS.baseDiameter.max} step={1} unit=" mm"
          onChange={(v) => s.set({ baseDiameter: v })} />
        <Slider label="Top opening" value={s.topDiameter} min={LIMITS.topDiameter.min} max={LIMITS.topDiameter.max} step={1} unit=" mm"
          help="Width of the opening at the top."
          onChange={(v) => s.set({ topDiameter: v })} />
      </Section>

      <Section title="Shape">
        <Slider label="Belly" value={s.belly} min={LIMITS.belly.min} max={LIMITS.belly.max} step={1} unit=" mm"
          help="How far the middle bulges out. Below zero it pinches in like a waist."
          onChange={(v) => s.set({ belly: v })} />
        <Slider label="Belly height" value={s.bellyPos} min={LIMITS.bellyPos.min} max={LIMITS.bellyPos.max} step={0.05}
          help="Where the widest point sits: low for a pot, high for a bottle."
          onChange={(v) => s.set({ bellyPos: v })} />
        <Slider label="Lip flare" value={s.lip} min={LIMITS.lip.min} max={LIMITS.lip.max} step={1} unit=" mm"
          help="Flares the top edge outward. Strong flares lean out and are hard to print."
          onChange={(v) => s.set({ lip: v })} />
      </Section>

      <Section title="Style">
        <Field label="Outline">
          <Select aria-label="Outline" value={s.section} onChange={(e) => s.set({ section: e.target.value as VaseSection })}>
            <option value="round">Round</option>
            <option value="polygon">Faceted (flat sides)</option>
          </Select>
        </Field>
        {polygon && (
          <>
            <Slider label="Sides" value={s.sides} min={LIMITS.sides.min} max={LIMITS.sides.max} step={1}
              onChange={(v) => s.set({ sides: v })} />
            <Slider label="Round corners" value={s.corner} min={0} max={1} step={0.05}
              help="0 keeps the corners sharp, 1 rounds the sides into a circle."
              onChange={(v) => s.set({ corner: v })} />
          </>
        )}
        <Slider label="Ribs depth" value={s.ribDepth} min={LIMITS.ribDepth.min} max={LIMITS.ribDepth.max} step={0.01}
          help="Vertical grooves around the vase. Deep ribs turn the outline into a flower."
          onChange={(v) => s.set({ ribDepth: v })} />
        {ribbed && (
          <Slider label="Ribs" value={s.ribs} min={LIMITS.ribs.min} max={LIMITS.ribs.max} step={1}
            onChange={(v) => s.set({ ribs: v })} />
        )}
        {(polygon || ribbed) && (
          <Slider label="Twist" value={s.twist} min={LIMITS.twist.min} max={LIMITS.twist.max} step={5} unit="°"
            help="Turns the sides or ribs as they go up."
            onChange={(v) => s.set({ twist: v })} />
        )}
        <Slider label="Wave" value={s.wave} min={LIMITS.wave.min} max={LIMITS.wave.max} step={0.5} unit=" mm"
          help="Makes the silhouette ripple in and out up the height."
          onChange={(v) => s.set({ wave: v })} />
        {s.wave > 0 && (
          <Slider label="Waves" value={s.waveCount} min={LIMITS.waveCount.min} max={LIMITS.waveCount.max} step={1}
            onChange={(v) => s.set({ waveCount: v })} />
        )}
        <Slider label="Bands" value={s.bands} min={LIMITS.bands.min} max={LIMITS.bands.max} step={0.5} unit=" mm"
          help="Sharp horizontal ridges, like stacked rings."
          onChange={(v) => s.set({ bands: v })} />
        {s.bands > 0 && (
          <Slider label="Band count" value={s.bandCount} min={LIMITS.bandCount.min} max={LIMITS.bandCount.max} step={1}
            onChange={(v) => s.set({ bandCount: v })} />
        )}
        <Slider label="Scalloped rim" value={s.scallop} min={LIMITS.scallop.min} max={LIMITS.scallop.max} step={1} unit=" mm"
          help="Dips the top edge between points. 0 keeps it flat."
          onChange={(v) => s.set({ scallop: v })} />
        {s.scallop > 0 && (
          <Slider label="Scallops" value={s.scallopCount} min={LIMITS.scallopCount.min} max={LIMITS.scallopCount.max} step={1}
            onChange={(v) => s.set({ scallopCount: v })} />
        )}
      </Section>

      {(lean > OVERHANG_LIMIT || tooBig) && (
        <Section title="Print check">
          {lean > OVERHANG_LIMIT && (
            <p className="text-xs text-red-600">
              The wall leans out {Math.round(lean)}° from straight up. Past {OVERHANG_LIMIT}° it needs supports or prints droopy.
            </p>
          )}
          {tooBig && <p className="text-xs text-red-600">Wider than a {BED_MM} mm print bed.</p>}
        </Section>
      )}

      <Section title="Color">
        <ColorField label="Vase" value={s.color} onChange={(v) => s.set({ color: v })} />
      </Section>

      <VaseExportButton />
    </StudioLayout>
  );
}
