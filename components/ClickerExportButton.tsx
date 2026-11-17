"use client";

import { useRef, useState } from "react";
import type * as THREE from "three";
import DownloadNotice, { PRIMARY } from "@/components/DownloadNotice";
import { arrangeOnBed, build3mf, type ThreeMFItem, type ThreeMFPart } from "@/lib/export/threemf";
import { BED_MM } from "@/lib/geometry/keychain";
import { buildKeycapParts } from "@/lib/geometry/cap";
import {
  clickerCapSettings,
  clickerChars,
  effectiveBodyColor,
  buildClickerHeadParts,
  buildClickerHousing,
  buildClickerRing,
  headColor,
} from "@/lib/geometry/clicker";
import { fontUrl } from "@/lib/fonts";
import { loadFont } from "@/lib/useFont";
import { useClicker } from "@/store/useClicker";

/** Space (mm) between the parts on the bed. */
const GAP = 8;

export default function ClickerExportButton() {
  const s = useClicker();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notice = useRef<HTMLDialogElement>(null);

  const download = async () => {
    setBusy(true);
    try {
      const font = await loadFont(fontUrl(s.font));
      const chars = clickerChars(s.text);
      const keys = chars.length;
      const caps = chars.map((text) =>
        buildKeycapParts(clickerCapSettings(text, s.keyBorder),
          font
        )
      );
      const unfit = caps.findIndex((p) => p.legend && !p.fits);
      if (unfit >= 0) {
        caps.forEach((p) => [p.cap, p.legend, p.border].forEach((g) => g?.dispose()));
        setMessage(`The letter on key ${unfit + 1} does not fit inside the top face (it is red in the preview).`);
        return;
      }

      const bodyColor = effectiveBodyColor(s.bodyColor, s.head, s.headShape);
      const spec = s.head ? { id: s.headShape, size: s.headSize } : undefined;
      const housing = buildClickerHousing(keys, s.grill, spec, s.border, { size: s.grillSize, spacing: s.grillSpacing });
      const ring = s.ring ? buildClickerRing(keys, spec, s.border) : null;
      const head = spec ? buildClickerHeadParts(spec.id, spec.size) : null;
      // One filament per distinct color: body (housing, keys, ring) first, then letters, the head, its face.
      const plateColor = headColor(s.headShape, bodyColor);
      const colors = [...new Set([bodyColor, s.accentColor, plateColor, ...(head?.features.map((f) => f.color) ?? [])].map((c) => c.toUpperCase()))];
      const extruder = (c: string) => colors.indexOf(c.toUpperCase()) + 1;
      const body = (name: string, geometry: THREE.BufferGeometry): ThreeMFPart => ({ name, geometry, color: bodyColor, extruder: extruder(bodyColor) });

      // Two rows centered on the plate: the housing, then the head and the keys (both face down).
      const housingParts = [body("Housing", housing)];
      if (ring) housingParts.push(body("Split ring tab", ring));
      const small: ThreeMFItem[] = [];
      if (head) {
        small.push({
          name: "Head",
          faceDown: true,
          parts: [
            { name: "Head", geometry: head.plate, color: plateColor, extruder: extruder(plateColor) },
            ...head.features.map((f): ThreeMFPart => ({ name: "Face", geometry: f.geometry, color: f.color, extruder: extruder(f.color) })),
          ],
        });
      }
      caps.forEach((p, i) => {
        const parts: ThreeMFPart[] = [{ name: "Cap", geometry: p.cap, color: bodyColor, extruder: extruder(bodyColor) }];
        if (p.border) parts.push({ name: "Border", geometry: p.border, color: s.accentColor, extruder: extruder(s.accentColor) });
        if (p.legend) parts.push({ name: "Letter", geometry: p.legend, color: s.accentColor, extruder: extruder(s.accentColor) });
        small.push({ name: `Key ${i + 1}`, parts, faceDown: true });
      });
      const housingItem: ThreeMFItem = { name: "Housing", parts: housingParts, faceDown: false };
      const items = [housingItem, ...small];
      const block = arrangeOnBed([[housingItem], small], BED_MM, GAP);
      if (block.width > BED_MM - 20 || block.depth > BED_MM - 20) {
        caps.forEach((p) => [p.cap, p.legend, p.border].forEach((g) => g?.dispose()));
        [housing, ring, head?.plate, ...(head?.features.map((f) => f.geometry) ?? [])].forEach((g) => g?.dispose());
        setMessage(`Too big for a ${BED_MM} mm plate. Use fewer keys or a smaller head.`);
        return;
      }

      const bytes = build3mf(items);
      caps.forEach((p) => [p.cap, p.legend, p.border].forEach((g) => g?.dispose()));
      [housing, ring, head?.plate, ...(head?.features.map((f) => f.geometry) ?? [])].forEach((g) => g?.dispose());

      const word = chars.join("").replace(/[^a-z0-9]/gi, "") || "blank";
      const blob = new Blob([bytes as BlobPart], { type: "model/3mf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `key-clicker-${word}.3mf`;
      a.click();
      URL.revokeObjectURL(url);
      // Fire and forget: a failed notification must never block the download.
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `3MF downloaded: key clicker "${word}"${s.head ? `, head ${s.headShape}` : ""}` }),
      }).catch(() => {});
      setMessage(null);
    } catch (e) {
      console.error(e);
      setMessage("Could not build the file. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky bottom-0 z-10 -mx-3 -mb-3 mt-auto space-y-2 border-t border-black/10 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 desk:static desk:mx-0 desk:mb-0 desk:mt-0 desk:rounded-xl desk:glass desk:p-2.5">
      <button type="button" onClick={() => notice.current?.showModal()} disabled={busy} className={PRIMARY}>
        Download 3MF
      </button>
      <DownloadNotice ref={notice} onConfirm={download} />
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}
