import type { ReactNode, SelectHTMLAttributes } from "react";

/** Shared look for text inputs and dropdowns. */
export const CONTROL =
  "w-full rounded-lg border border-black/10 bg-white/70 px-2.5 py-1 text-xs text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-300/40";

/** A titled card that groups related controls. */
export function Section({
  title,
  children,
  center = false,
}: {
  title: string;
  children: ReactNode;
  /** Centers the content in the space under the title, horizontally and vertically. */
  center?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-white/70 bg-white/40 p-2.5 shadow-sm">
      <h2 className="text-[10px] font-semibold uppercase leading-none tracking-widest text-neutral-500">
        {title}
      </h2>
      {center ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}

/** A small label above a control. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 space-y-0.5">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

/** A small "i" icon that shows a note on hover or keyboard focus. `align` is the side the note opens toward. */
export function InfoTip({ text, align = "left" }: { text: string; align?: "left" | "right" }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 transition hover:text-orange-500 focus:text-orange-500 focus:outline-none"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="10" cy="10" r="8" />
          <path d="M10 9v5" />
          <circle cx="10" cy="6.2" r="0.6" fill="currentColor" />
        </svg>
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-full z-20 mt-2 hidden w-56 rounded-xl bg-neutral-800/95 p-3 text-xs font-normal leading-snug text-neutral-100 shadow-xl group-focus-within:block group-hover:block ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {text}
      </span>
    </span>
  );
}

/** A plain checkbox with a label. */
export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="checkbox"
      />
      {label}
    </label>
  );
}

/** A dropdown with its own chevron instead of the browser's. */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${CONTROL} cursor-pointer appearance-none pr-8 [&_option]:bg-white`} />
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 8l5 5 5-5" />
      </svg>
    </div>
  );
}

/** An on/off switch with a label. */
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-2 py-0.5 text-left text-xs text-neutral-700"
    >
      <span>{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-gradient-to-r from-orange-400 to-orange-500" : "bg-neutral-300"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}

/** A round color swatch with its hex value. */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-1 items-center gap-2 rounded-lg border border-black/10 bg-white/70 p-1 shadow-sm">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="swatch"
      />
      <span className="min-w-0">
        <span className="block text-xs font-medium leading-tight text-neutral-600">{label}</span>
        <span className="block text-xs uppercase leading-tight text-neutral-500">{value}</span>
      </span>
    </label>
  );
}
