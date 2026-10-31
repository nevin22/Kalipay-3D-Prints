import { useId, type CSSProperties } from "react";
import { InfoTip } from "@/components/ui";

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Short explanation shown in a popup when hovering the "?" icon. */
  help?: string;
  onChange: (v: number) => void;
};

/** One line: label (with a "?" note), the track, and the value. */
export default function Slider({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  help,
  onChange,
}: SliderProps) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;

  return (
    <div className="relative grid grid-cols-[4.75rem_1fr_3.75rem] items-center gap-2">
      <div className="flex items-center gap-1">
        <label htmlFor={id} className="text-xs font-medium text-neutral-600">
          {label}
        </label>
        {help && <InfoTip text={help} />}
      </div>
      <input
        id={id}
        type="range"
        className="range"
        style={{ "--fill": `${fill}%` } as CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-center text-xs tabular-nums text-neutral-700">
        {value}
        {unit}
      </span>
    </div>
  );
}
