import { create } from "zustand";
import { DEFAULT_VASE, type VaseSettings } from "@/lib/geometry/vase";

/** Everything the vase page edits: the geometry settings plus the preview color. */
export type VaseState = VaseSettings & {
  color: string;
  set: (patch: Partial<Omit<VaseState, "set">>) => void;
};

export const useVase = create<VaseState>((set) => ({
  ...DEFAULT_VASE,
  color: "#C9A27A", // light brown
  set: (patch) => set(patch),
}));
