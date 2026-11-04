import type { Ref } from "react";

/** Orange gradient button used for the download actions. */
export const PRIMARY =
  "w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-xs touch:py-3 touch:text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none";

/**
 * The note shown before every download. A native <dialog> opened with showModal() sits above
 * the whole page, dims it, and closes on Esc. The caller opens it with `ref.current?.showModal()`.
 */
export default function DownloadNotice({
  ref,
  onConfirm,
}: {
  ref: Ref<HTMLDialogElement>;
  onConfirm: () => void;
}) {
  const close = (el: HTMLDialogElement | null) => el?.close();
  return (
    <dialog
      ref={ref}
      aria-labelledby="download-notice-title"
      // A tap on the dimmed area outside the card closes it.
      onClick={(e) => e.target === e.currentTarget && close(e.currentTarget)}
      className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/40"
    >
      <div className="space-y-3 p-5">
        <h2 id="download-notice-title" className="text-base font-semibold">
          Your file is ready to print
        </h2>
        <p className="text-sm leading-relaxed text-neutral-600">
          You are about to download a 3MF file that is ready for printing.
        </p>
        <p className="text-sm leading-relaxed text-neutral-600">
          No 3D printer? Just message our page, <strong>Kalipay 3D Prints</strong>, and we can
          print it for you right away!
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={(e) => close(e.currentTarget.closest("dialog"))}
            className="w-full rounded-lg border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 touch:py-3 touch:text-base"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              close(e.currentTarget.closest("dialog"));
              onConfirm();
            }}
            className={PRIMARY}
          >
            Download 3MF
          </button>
        </div>
      </div>
    </dialog>
  );
}
