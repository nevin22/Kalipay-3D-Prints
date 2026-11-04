"use client";

import { useRef, useState } from "react";
import DownloadNotice, { PRIMARY } from "@/components/DownloadNotice";
import { build3mf } from "@/lib/export/threemf";
import { fontUrl } from "@/lib/fonts";
import { buildKeychainParts } from "@/lib/geometry/keychain";
import { loadFont } from "@/lib/useFont";
import { useKeychain } from "@/store/useKeychain";

/** The one download button of the keychain page: base on filament 1, text on filament 2, printed flat. */
export default function KeychainExportButton() {
  const s = useKeychain();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notice = useRef<HTMLDialogElement>(null);

  const download = async () => {
    setBusy(true);
    try {
      const font = await loadFont(fontUrl(s.font));
      const parts = buildKeychainParts(s, font);
      if (!parts.text) {
        parts.base.dispose();
        setMessage("Type something first: there is no text to print yet.");
        return;
      }

      // Base down on the bed, text on top: no supports, and one color change at the base's top layer.
      const bytes = build3mf([
        {
          name: "Keychain",
          parts: [
            { name: "Base", geometry: parts.base, color: s.baseColor, extruder: 1 },
            { name: "Text", geometry: parts.text, color: s.textColor, extruder: 2 },
          ],
          faceDown: false,
        },
      ]);
      parts.base.dispose();
      parts.text.dispose();

      const slug = s.text.replace(/[^a-z0-9]/gi, "");
      const blob = new Blob([bytes as BlobPart], { type: "model/3mf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `keychain-${slug || "blank"}.3mf`;
      a.click();
      URL.revokeObjectURL(url);
      // Fire and forget: a failed notification must never block the download.
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `3MF downloaded: keychain "${s.text}" (${s.base} base)` }),
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
    // Pinned to the bottom of the sidebar on a phone, a normal card on a laptop (same as the keycap page).
    <div className="sticky bottom-0 z-10 -mx-3 -mb-3 mt-auto space-y-2 border-t border-black/10 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 desk:static desk:mx-0 desk:mb-0 desk:mt-0 desk:rounded-xl desk:glass desk:p-2.5">
      <button type="button" onClick={() => notice.current?.showModal()} disabled={busy} className={PRIMARY}>
        Download 3MF
      </button>
      <DownloadNotice ref={notice} onConfirm={download} />
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}
