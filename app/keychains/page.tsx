"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import KeychainExportButton from "@/components/KeychainExportButton";
import Slider from "@/components/Slider";
import StudioLayout from "@/components/StudioLayout";
import { ColorField, CONTROL, Field, Section, Select } from "@/components/ui";
import { FONT_FACE_CSS, FONTS, fontFamily, type FontId } from "@/lib/fonts";
import { DEFAULT_PADDING, KEYCHAIN_BASES, LIMITS, MAX_TEXT, MIN_HEIGHT, type KeychainBase, type KeychainHole } from "@/lib/geometry/keychain";
import { useKeychain } from "@/store/useKeychain";

const KeychainCanvas = dynamic(() => import("@/components/KeychainCanvas"), { ssr: false });

export default function KeychainsPage() {
  const s = useKeychain();

  // Fetch every font now, so the dropdown shows them in their own style the first time it opens.
  useEffect(() => {
    FONTS.forEach((f) => document.fonts.load(`16px ${fontFamily(f.id)}`).catch(() => {}));
  }, []);

  return (
    <StudioLayout canvas={<KeychainCanvas />}>
      <style>{FONT_FACE_CSS}</style>

      <Section title="Text">
        <Field label="Your text">
          <input
            className={CONTROL}
            value={s.text}
            maxLength={MAX_TEXT}
            placeholder={`Up to ${MAX_TEXT} characters`}
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
        <Slider label="Size" value={s.fontSize} min={LIMITS.fontSize.min} max={LIMITS.fontSize.max} step={0.5} unit=" mm"
          help="Height of the text. The keychain grows to fit it."
          onChange={(v) => s.set({ fontSize: v })} />
        <Slider label="Bold" value={s.bold} min={LIMITS.bold.min} max={LIMITS.bold.max} step={0.1} unit=" mm"
          help="Makes every letter chunkier. Thin script letters print better with a little bold."
          onChange={(v) => s.set({ bold: v })} />
      </Section>

      <Section title="Base">
        <Field label="Shape">
          <Select
            aria-label="Base shape"
            value={s.base}
            onChange={(e) => {
              // Each base starts at its own padding.
              const base = e.target.value as KeychainBase;
              s.set({ base, padding: DEFAULT_PADDING[base] });
            }}
          >
            {KEYCHAIN_BASES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>
        <Slider label="Padding" value={s.padding} min={LIMITS.padding.min} max={LIMITS.padding.max} step={0.5} unit=" mm"
          help="How much base there is around the text."
          onChange={(v) => s.set({ padding: v })} />
        {s.base === "follow" && (
          <Slider label="Smooth" value={s.puff} min={LIMITS.puff.min} max={LIMITS.puff.max} step={0.5} unit=" mm"
            help="0 hugs every letter closely. Higher fills the gaps between letters and rounds the outline into a cloud."
            onChange={(v) => s.set({ puff: v })} />
        )}
        <Slider label="Text raise" value={s.raise} min={MIN_HEIGHT / 2} max={2} step={0.2} unit=" mm"
          help="How far the text stands above the base."
          onChange={(v) => s.set({ raise: v })} />
      </Section>

      <div className="grid grid-cols-2 gap-2">
        <Section title="Color">
          <div className="flex flex-col gap-1.5">
            <ColorField label="Base" value={s.baseColor} onChange={(v) => s.set({ baseColor: v })} />
            <ColorField label="Text" value={s.textColor} onChange={(v) => s.set({ textColor: v })} />
          </div>
        </Section>

        <Section title="Ring hole" center>
          <div className="w-full">
            <Select
              aria-label="Where the split ring hole is"
              value={s.hole}
              onChange={(e) => s.set({ hole: e.target.value as KeychainHole })}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="off">None</option>
            </Select>
          </div>
        </Section>
      </div>

      <KeychainExportButton />
    </StudioLayout>
  );
}
