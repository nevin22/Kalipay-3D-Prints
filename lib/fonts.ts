/** Built-in legend fonts, kept in public/fonts. Roboto is open-licensed (Apache 2.0); see the notes below for the rest. */
export const FONTS = [
  { id: "roboto", name: "Roboto Bold", url: "/fonts/roboto-latin-700-normal.woff" },
  // Freeware, not OFL: check each license before deploying publicly.
  { id: "super-shiny", name: "Super Shiny (All Super Font)", url: "/fonts/super-shiny.ttf" },
  { id: "super-adorable", name: "Super Adorable (All Super Font)", url: "/fonts/super-adorable.ttf" },
  { id: "super-kindly", name: "Super Kindly (All Super Font)", url: "/fonts/super-kindly.ttf" },
  { id: "mouldy-cheese", name: "Mouldy Cheese (Niskala Huruf)", url: "/fonts/mouldy-cheese.ttf" },
  // Non-commercial only: remove before any public deployment.
  { id: "kinder-child", name: "Kinder Child Kawaii Bubble (GraphicSauce)", url: "/fonts/kinder-child-kawaii-bubble.otf" },
  // Script, SIL Open Font License 1.1 (free to use commercially). Its letters overlap; the keychain merges them.
  { id: "pacifico", name: "Pacifico (script)", url: "/fonts/pacifico-latin-400-normal.woff" },
] as const;

export type FontId = (typeof FONTS)[number]["id"];

/** CSS font-family for showing a font in the page itself (the dropdown), see FONT_FACE_CSS. */
export function fontFamily(id: FontId): string {
  return `"legend-${id}", sans-serif`;
}

/** @font-face rules so the browser can draw the dropdown's choices in their own fonts. */
export const FONT_FACE_CSS = FONTS.map(
  (f) => `@font-face{font-family:"legend-${f.id}";src:url("${f.url}");font-display:swap}`
).join("\n");

export function fontUrl(id: FontId): string {
  return (FONTS.find((f) => f.id === id) ?? FONTS[0]).url;
}
