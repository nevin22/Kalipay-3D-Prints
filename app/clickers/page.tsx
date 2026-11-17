"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import ClickerExportButton from "@/components/ClickerExportButton";
import Slider from "@/components/Slider";
import StudioLayout from "@/components/StudioLayout";
import { CONTROL, ColorField, Field, Section, Select, Toggle } from "@/components/ui";
import { FONT_FACE_CSS, FONTS, fontFamily, type FontId } from "@/lib/fonts";
import { CUSTOM_HEADS, type ClickerGrill, MAX_CLICKER_KEYS, effectiveBodyColor } from "@/lib/geometry/clicker";
import { useClicker } from "@/store/useClicker";

const ClickerCanvas = dynamic(() => import("@/components/ClickerCanvas"), { ssr: false });

export default function ClickersPage() {
  const s = useClicker();
  // Fetch every font now, so the dropdown shows them in their own style the first time it opens.
  useEffect(() => {
    FONTS.forEach((f) => document.fonts.load(`16px ${fontFamily(f.id)}`).catch(() => {}));
  }, []);
  return (
    <StudioLayout canvas={<ClickerCanvas />}>
      <style>{FONT_FACE_CSS}</style>
      <Section title="Letters">
        <Field label={`Type up to ${MAX_CLICKER_KEYS} letters, one per key`}>
          <input
            className={CONTROL}
            value={s.text}
            maxLength={MAX_CLICKER_KEYS}
            aria-label="Letters"
            onChange={(e) => s.set({ text: e.target.value })}
          />
        </Field>
        <Field label="Font">
          <Select
            aria-label="Font"
            value={s.font}
            style={{ fontFamily: fontFamily(s.font) }}
            onChange={(e) => s.set({ font: e.target.value as FontId })}
          >
            {FONTS.map((f) => (
              <option key={f.id} value={f.id} style={{ fontFamily: fontFamily(f.id) }}>
                {f.name}
              </option>
            ))}
          </Select>
        </Field>
        <Toggle label="Border around the letters" checked={s.keyBorder} onChange={(keyBorder) => s.set({ keyBorder })} />
      </Section>
      <Section title="Head">
        <Toggle label="Clickable head on top" checked={s.head} onChange={(head) => s.set({ head })} />
        {s.head && (
          <>
            <Field label="Character">
              <Select
                aria-label="Character"
                value={s.headShape}
                onChange={(e) => s.set({ headShape: e.target.value })}
              >
                {Object.entries(CUSTOM_HEADS).filter(([, h]) => !h.hidden).map(([id, h]) => (
                  <option key={id} value={id}>{h.label}</option>
                ))}
              </Select>
            </Field>
            <Slider label="Head size" value={s.headSize} min={32} max={45} step={1} unit=" mm"
              onChange={(v) => s.set({ headSize: v })} />
          </>
        )}
      </Section>
      <Section title="Housing">
        <Field label="Side grills">
          <Select aria-label="Side grills" value={s.grill} onChange={(e) => s.set({ grill: e.target.value as ClickerGrill })}>
            <option value="none">None</option>
            <option value="teeth">Teeth</option>
            <option value="round">Round</option>
            <option value="wavy">Wavy</option>
          </Select>
        </Field>
        {s.grill !== "none" && (
          <>
            <Slider label="Grill size" value={s.grillSize} min={0.6} max={3} step={0.1} unit=" mm"
              help="How far the bumps stand out from the side."
              onChange={(v) => s.set({ grillSize: v })} />
            <Slider label="Grill spacing" value={s.grillSpacing} min={4} max={8} step={0.5} unit=" mm"
              help="Distance from one bump to the next. Smaller means more bumps."
              onChange={(v) => s.set({ grillSpacing: v })} />
          </>
        )}
        <Toggle label="Thick border around the keys" checked={s.border} onChange={(border) => s.set({ border })} />
        <Toggle label="Ring hole for a keychain" checked={s.ring} onChange={(ring) => s.set({ ring })} />
      </Section>
      <Section title="Color">
        <ColorField label="Body, keys and ring" value={effectiveBodyColor(s.bodyColor, s.head, s.headShape)} onChange={(v) => s.set({ bodyColor: v })} />
        <ColorField label="Letters and their border" value={s.accentColor} onChange={(v) => s.set({ accentColor: v })} />
      </Section>
      <ClickerExportButton />
    </StudioLayout>
  );
}
