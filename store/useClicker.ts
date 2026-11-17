import { create } from "zustand";
import { GRILL_SIZE, GRILL_SPACING } from "@/lib/geometry/housing";
import type { FontId } from "@/lib/fonts";
import { type ClickerGrill, HEAD_SIZE } from "@/lib/geometry/clicker";

/** Everything the key clicker page edits. */
export type ClickerState = {
  /** The letters, typed in one box: one key per character (see `clickerChars`). */
  text: string;
  font: FontId;
  /** A thicker wall all round the keys (not the head), same color as the housing. */
  border: boolean;
  /** A band round the letter on each key's top, in the letter color. */
  keyBorder: boolean;
  grill: ClickerGrill;
  /** How far the grill stands out and the distance between its bumps, mm. */
  grillSize: number;
  grillSpacing: number;
  /** The clickable head at the left end. */
  head: boolean;
  headShape: string;
  headSize: number;
  /** The split ring tab at the left end. */
  ring: boolean;
  /** Housing, keys and ring: null follows the head's color (see `effectiveBodyColor`). */
  bodyColor: string | null;
  /** Letters. */
  accentColor: string;
  set: (patch: Partial<Omit<ClickerState, "set">>) => void;
};

export const useClicker = create<ClickerState>((set) => ({
  text: "JED",
  font: "roboto",
  border: true,
  keyBorder: true,
  grill: "wavy",
  grillSize: GRILL_SIZE,
  grillSpacing: GRILL_SPACING,
  head: true,
  headShape: "pikachu",
  headSize: HEAD_SIZE,
  ring: true,
  bodyColor: null,
  accentColor: "#FFFFFF",
  set: (patch) => set(patch),
}));
