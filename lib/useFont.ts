"use client";

import { useEffect, useState } from "react";
import { parse, type Font } from "opentype.js";

const cache = new Map<string, Promise<Font>>();

export function loadFont(url: string): Promise<Font> {
  let promise = cache.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load font ${url} (${res.status})`);
        return res.arrayBuffer();
      })
      .then((buffer) => parse(buffer));
    cache.set(url, promise);
  }
  return promise;
}

export function useFont(url: string) {
  const [font, setFont] = useState<Font | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadFont(url)
      .then((f) => alive && setFont(f))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [url]);

  return { font, error };
}