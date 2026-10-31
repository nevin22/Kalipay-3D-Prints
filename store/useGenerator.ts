import { create } from "zustand";
import type { FontId } from "@/lib/fonts";
import { DEFAULT_CAP_HEIGHT } from "@/lib/geometry/keycap";
import type { RingSide } from "@/lib/geometry/ring";

/** Where the housing is shown: next to the cap, under it, or not at all. */
export type HousingLayout = "separate" | "below" | "hidden";

/** Everything that belongs to one keycap and its legend. */
export type KeyConfig = {
  id: string;
  units: number;
  text: string;
  font: FontId;
  fontSize: number; // mm
  offsetX: number; // mm
  offsetY: number; // mm
  rotation: number; // degrees
  raise: number; // mm the legend stands above the top face
};

/** Settings shared by every key. */
type SharedSettings = {
  capColor: string;
  legendColor: string;
  stemTolerance: number; // mm added to the stem's "+" socket
  capHeight: number; // mm, height of every cap; its taper grows with it
  housingLayout: HousingLayout; // preview only
  /** When on, choosing a font for one key sets it for every key. */
  fontForAll: boolean;
  /** Side of the housing the split ring tab sticks out from, or "off" for no tab. */
  housingRing: RingSide | "off";
};

export type GeneratorState = SharedSettings & {
  keys: KeyConfig[];
  /** The key the sidebar edits. */
  selectedKeyId: string;
  /** Changes shared settings. */
  set: (patch: Partial<SharedSettings>) => void;
  /** Changes the selected key. */
  updateKey: (patch: Partial<Omit<KeyConfig, "id">>) => void;
  /** Adds a copy of the selected key to the end of the row and selects it. */
  addKey: () => void;
  /** Removes a key (the last one cannot be removed). */
  removeKey: (id: string) => void;
  selectKey: (id: string) => void;
};

export const MAX_KEYS = 6;

/** The legend of a copied key moves on to the next letter or digit: A -> B, 1 -> 2. */
function nextLegend(text: string): string {
  if (text.length !== 1) return text;
  const next = String.fromCharCode(text.charCodeAt(0) + 1);
  return /[A-Za-z0-9]/.test(next) ? next : text;
}

/** Ids are never reused, so this starts after the default keys. */
let keyCounter = 3;

const DEFAULT_KEYS: KeyConfig[] = ["A", "B", "C"].map((text, i) => ({
  id: `key-${i + 1}`,
  units: 1,
  text,
  font: "roboto",
  fontSize: 12,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  raise: 0,
}));

export const useGenerator = create<GeneratorState>((set) => ({
  keys: DEFAULT_KEYS,
  selectedKeyId: DEFAULT_KEYS[0].id,
  capColor: "#e8e8e8",
  legendColor: "#ff6a00",
  // Printed holes come out small; a little extra clearance helps the cap fit the switch.
  stemTolerance: 0.1,
  capHeight: DEFAULT_CAP_HEIGHT,
  housingLayout: "separate",
  fontForAll: true,
  housingRing: "left",
  set: (patch) => set(patch),
  updateKey: (patch) =>
    set((s) => ({
      keys: s.keys.map((k) => {
        const next = k.id === s.selectedKeyId ? { ...k, ...patch } : k;
        return s.fontForAll && patch.font ? { ...next, font: patch.font } : next;
      }),
    })),
  addKey: () =>
    set((s) => {
      if (s.keys.length >= MAX_KEYS) return s;
      const from = selectSelectedKey(s);
      const key: KeyConfig = { ...from, id: `key-${++keyCounter}`, text: nextLegend(from.text) };
      return { keys: [...s.keys, key], selectedKeyId: key.id };
    }),
  removeKey: (id) =>
    set((s) => {
      if (s.keys.length <= 1) return s;
      const index = s.keys.findIndex((k) => k.id === id);
      const keys = s.keys.filter((k) => k.id !== id);
      const selectedKeyId =
        s.selectedKeyId === id ? keys[Math.min(index, keys.length - 1)].id : s.selectedKeyId;
      return { keys, selectedKeyId };
    }),
  selectKey: (id) => set({ selectedKeyId: id }),
}));

/** The key the sidebar is editing. Use as a selector: `useGenerator(selectSelectedKey)`. */
export const selectSelectedKey = (s: GeneratorState): KeyConfig =>
  s.keys.find((k) => k.id === s.selectedKeyId) ?? s.keys[0];
