"use client";

import { useRef, useState } from "react";
import DownloadNotice, { PRIMARY } from "@/components/DownloadNotice";
import { build3mf } from "@/lib/export/threemf";
import { BED_MM } from "@/lib/geometry/keychain";
import { buildVase, vaseMaxRadius } from "@/lib/geometry/vase";
import { useVase } from "@/store/useVase";

/** The one download button of the vase page: a single object on filament 1, bottom on the bed. */
export default function VaseExportButton() {
  const s = useVase();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notice = useRef<HTMLDialogElement>(null);

  const download = () => {
    if (vaseMaxRadius(s) * 2 > BED_MM) {
      setMessage(`This vase is wider than a ${BED_MM} mm print bed. Make it narrower first.`);
      return;
    }
    setBusy(true);
    try {
      const geometry = buildVase(s);
      const bytes = build3mf([
        { name: "Vase", parts: [{ name: "Vase", geometry, color: s.color, extruder: 1 }], faceDown: false },
      ]);
      geometry.dispose();

      const blob = new Blob([bytes as BlobPart], { type: "model/3mf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vase-${s.mode === "vase" ? "spiral" : "cup"}.3mf`;
      a.click();
      URL.revokeObjectURL(url);
      // Fire and forget: a failed notification must never block the download.
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `3MF downloaded: vase ${s.height} mm (${s.mode})` }),
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
    // Pinned to the bottom of the sidebar on a phone, a normal card on a laptop (same as the keychain page).
    <div className="sticky bottom-0 z-10 -mx-3 -mb-3 mt-auto space-y-2 border-t border-black/10 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 desk:static desk:mx-0 desk:mb-0 desk:mt-0 desk:rounded-xl desk:glass desk:p-2.5">
      <button type="button" onClick={() => notice.current?.showModal()} disabled={busy} className={PRIMARY}>
        Download 3MF
      </button>
      <DownloadNotice ref={notice} onConfirm={download} />
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}
