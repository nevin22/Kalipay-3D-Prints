"use client";

import { useRef, useState } from "react";
import { useGenerator } from "@/store/useGenerator";
import { loadFont } from "@/lib/useFont";
import { fontUrl } from "@/lib/fonts";
import DownloadNotice, { PRIMARY } from "@/components/DownloadNotice";
import { Toggle } from "@/components/ui";
import { buildKeycapParts } from "@/lib/geometry/cap";
import { buildHousing, buildHousingTab, previewLayout } from "@/lib/geometry/housing";
import { RING_REACH } from "@/lib/geometry/ring";
import { build3mf, type ThreeMFItem, type ThreeMFPart } from "@/lib/export/threemf";

export default function ExportButton() {
  const s = useGenerator();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [withHousing, setWithHousing] = useState(true);
  // The note shown before every download. A native <dialog> opened with showModal() sits above
  // the whole page, dims it, and closes on Esc.
  const notice = useRef<HTMLDialogElement>(null);

  const many = s.keys.length > 1;

  const download = async () => {
    setBusy(true);
    try {
      // Each key can use its own font.
      const fonts = await Promise.all(s.keys.map((k) => loadFont(fontUrl(k.font))));
      const built = s.keys.map((k, i) =>
        buildKeycapParts({ ...k, stemTolerance: s.stemTolerance, capHeight: s.capHeight }, fonts[i])
      );
      const disposeAll = () =>
        built.forEach((p) => {
          p.cap.dispose();
          p.legend?.dispose();
        });

      const unfit = built.findIndex((p) => p.legend && !p.fits);
      if (unfit >= 0) {
        disposeAll();
        const which = many ? `on key ${unfit + 1} ` : "";
        setMessage(
          `The legend ${which}does not fit inside the top face (it is red in the preview). Make it smaller or move it.`
        );
        return;
      }

      // On the bed the caps and the housing are always side by side, whatever the
      // preview shows. The preview's housing setting does not matter here.
      const units = s.keys.map((k) => k.units);
      // The split ring belongs to the housing, so it only comes along with it. A tab on the
      // housing's left end points at the caps and needs room in the gap.
      const ring = withHousing ? s.housingRing : "off";
      const layout = previewLayout(
        units,
        withHousing ? "separate" : "hidden",
        ring === "left" ? RING_REACH : 0,
        s.capHeight
      );

      const items: ThreeMFItem[] = built.map((p, i) => {
        const parts: ThreeMFPart[] = [
          { name: "Cap", geometry: p.cap, color: s.capColor, extruder: 1 },
        ];
        if (p.legend) parts.push({ name: "Legend", geometry: p.legend, color: s.legendColor, extruder: 2 });
        return {
          name: many ? `Keycap ${i + 1}` : "Keycap",
          parts,
          faceDown: s.keys[i].raise === 0,
          offsetX: layout.capXs[i],
        };
      });

      const housing = withHousing ? buildHousing(units) : null;
      const tab = ring === "off" ? null : buildHousingTab(units, ring);
      if (housing) {
        const parts: ThreeMFPart[] = [
          { name: "Housing", geometry: housing, color: s.capColor, extruder: 1 },
        ];
        // Same filament as the housing; it overlaps the housing's wall, so the slicer fuses them.
        if (tab) parts.push({ name: "Split ring tab", geometry: tab, color: s.capColor, extruder: 1 });
        items.push({ name: "Housing", parts, faceDown: false, offsetX: layout.housingX });
      }

      const bytes = build3mf(items);
      disposeAll();
      housing?.dispose();
      tab?.dispose();

      const slug = (t: string) => t.replace(/[^a-z0-9]/gi, "");
      // A shape key is named by its shape ("star"), a text key by its text.
      const legend = (k: (typeof s.keys)[number]) => slug(k.legendKind === "shape" ? k.shape : k.text);
      const name = many
        ? `keycaps-${s.keys.length}-${s.keys.map((k) => legend(k) || "x").join("").slice(0, 16)}`
        : `keycap-${legend(s.keys[0]) || "blank"}-${s.keys[0].units}u`;
      const blob = new Blob([bytes as BlobPart], { type: "model/3mf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.3mf`;
      a.click();
      URL.revokeObjectURL(url);
      // Fire and forget: a failed notification must never block the download.
      const summary = s.keys
        .map((k) => (k.legendKind === "shape" ? k.shape : `"${k.text}"`))
        .join(", ");
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `3MF downloaded: ${s.keys.length} key(s): ${summary}` }),
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
    // On a phone this is a bar pinned to the bottom of the scrolling sidebar (it cancels the
    // sidebar's padding and clears the home indicator); on a laptop it is a normal card.
    <div className="sticky bottom-0 z-10 -mx-3 -mb-3 mt-auto space-y-2 border-t border-black/10 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 desk:static desk:mx-0 desk:mb-0 desk:mt-0 desk:rounded-xl desk:glass desk:p-2.5">
      <Toggle
        label="Include housing in the download"
        checked={withHousing}
        onChange={setWithHousing}
      />
      <button
        type="button"
        onClick={() => notice.current?.showModal()}
        disabled={busy}
        className={PRIMARY}
      >
        Download 3MF
      </button>

      <DownloadNotice ref={notice} onConfirm={download} />
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}
