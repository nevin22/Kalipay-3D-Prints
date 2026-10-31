"use client";

import { MAX_KEYS, useGenerator } from "@/store/useGenerator";

const BUTTON =
  "flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-semibold transition";

/** One chip per key in the row, plus add and remove. The selected chip is the key being edited. */
export default function KeyRow() {
  const keys = useGenerator((s) => s.keys);
  const selectedKeyId = useGenerator((s) => s.selectedKeyId);
  const selectKey = useGenerator((s) => s.selectKey);
  const addKey = useGenerator((s) => s.addKey);
  const removeKey = useGenerator((s) => s.removeKey);

  const full = keys.length >= MAX_KEYS;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {keys.map((k) => {
          const selected = k.id === selectedKeyId;
          return (
            <button
              key={k.id}
              type="button"
              aria-pressed={selected}
              onClick={() => selectKey(k.id)}
              className={`${BUTTON} max-w-20 truncate ${
                selected
                  ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md shadow-orange-500/30"
                  : "border border-black/10 bg-white/70 text-neutral-700 hover:bg-white"
              }`}
            >
              {k.text || "·"}
            </button>
          );
        })}
        <button
          type="button"
          onClick={addKey}
          disabled={full}
          title={full ? `Up to ${MAX_KEYS} keys` : "Add a key (copies the selected one)"}
          aria-label="Add a key"
          className={`${BUTTON} border border-dashed border-neutral-400 text-neutral-600 hover:border-orange-400 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-400 disabled:hover:text-neutral-600`}
        >
          +
        </button>
      </div>
      {keys.length > 1 && (
        <button
          type="button"
          onClick={() => removeKey(selectedKeyId)}
          aria-label="Remove the selected key"
          title="Remove the selected key"
          className={`${BUTTON} shrink-0 text-neutral-500 hover:bg-red-500/10 hover:text-red-600`}
        >
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" />
          </svg>
        </button>
      )}
    </div>
  );
}
