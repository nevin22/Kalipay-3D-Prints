import { create } from "zustand";
import type { FontId } from "@/lib/fonts";
import type { KeychainSettings } from "@/lib/geometry/keychain";

/** Everything the keychain page edits: the geometry settings plus the font and the two colors. */
export type KeychainState = KeychainSettings & {
  font: FontId;
  baseColor: string;
  textColor: string;
  set: (patch: Partial<Omit<KeychainState, "set">>) => void;
};

export const useKeychain = create<KeychainState>((set) => ({
  text: "Minthara",
  font: "pacifico",
  // Fitted so "Minthara" in Pacifico is 100 mm wide (see the test in keychain.test.ts).
  fontSize: 20.5,
  bold: 0.6,
  base: "follow",
  padding: 2.3,
  puff: 0,
  thickness: 2, // no slider: the base is always this thick
  raise: 2,
  hole: "left",
  baseColor: "#FF6A00",
  textColor: "#FFFFFF",
  set: (patch) => set(patch),
}));
