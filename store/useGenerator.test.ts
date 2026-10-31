import { beforeEach, describe, expect, it } from "vitest";
import { MAX_KEYS, selectSelectedKey, useGenerator } from "@/store/useGenerator";

const reset = () => {
  const first = useGenerator.getState().keys[0];
  useGenerator.setState({ keys: [first], selectedKeyId: first.id });
  useGenerator.getState().updateKey({ text: "A", units: 1 });
};

describe("key list", () => {
  beforeEach(reset);

  it("adds a copy of the selected key with the next letter and selects it", () => {
    const { updateKey, addKey } = useGenerator.getState();
    updateKey({ units: 2, fontSize: 7 });
    addKey();
    const s = useGenerator.getState();
    expect(s.keys).toHaveLength(2);
    expect(selectSelectedKey(s)).toMatchObject({ text: "B", units: 2, fontSize: 7 });
    expect(new Set(s.keys.map((k) => k.id)).size).toBe(2);
  });

  it("edits only the selected key", () => {
    const s = useGenerator.getState();
    s.addKey();
    useGenerator.getState().updateKey({ text: "Z" });
    const keys = useGenerator.getState().keys;
    expect(keys.map((k) => k.text)).toEqual(["A", "Z"]);
  });

  it("sets the font on every key while 'font for all' is on, and only one when it is off", () => {
    useGenerator.getState().addKey();
    useGenerator.getState().addKey();
    expect(useGenerator.getState().fontForAll).toBe(true);

    useGenerator.getState().updateKey({ font: "super-kindly" });
    expect(useGenerator.getState().keys.map((k) => k.font)).toEqual(Array(3).fill("super-kindly"));

    useGenerator.getState().set({ fontForAll: false });
    useGenerator.getState().updateKey({ font: "roboto" });
    expect(useGenerator.getState().keys.map((k) => k.font)).toEqual(["super-kindly", "super-kindly", "roboto"]);
    useGenerator.getState().set({ fontForAll: true });
  });

  it("stops at the maximum", () => {
    for (let i = 0; i < MAX_KEYS + 3; i++) useGenerator.getState().addKey();
    expect(useGenerator.getState().keys).toHaveLength(MAX_KEYS);
  });

  it("removes keys, moves the selection, and keeps the last one", () => {
    useGenerator.getState().addKey();
    useGenerator.getState().addKey();
    const [a, b, c] = useGenerator.getState().keys;
    useGenerator.getState().selectKey(b.id);
    useGenerator.getState().removeKey(b.id);
    expect(useGenerator.getState().keys.map((k) => k.id)).toEqual([a.id, c.id]);
    expect(useGenerator.getState().selectedKeyId).toBe(c.id);

    useGenerator.getState().removeKey(c.id);
    useGenerator.getState().removeKey(a.id);
    expect(useGenerator.getState().keys).toHaveLength(1);
  });
});
