@AGENTS.md

# Keycap Fidget Lab

A Next.js web app where a user designs a mechanical keyboard keycap with a text legend, sees it live in 3D, and exports a two-color 3MF file for printing. Free, one cap at a time. No accounts, payments, memberships or "pro" features in v1. The goal is simply to make it usable.

## How to work with me (the owner)

- Work **one small step at a time**. Explain what each new file, hook or function is for, and why, before writing it.
- End every step with a **checkpoint**: what I should see in the browser, so I can confirm before the next step.
- Do not make large multi-file changes or add features beyond the current step unless I ask.
- Show code file by file. Do not hand me a zip.

## Setup

- Windows, PowerShell. Project root: `G:\Repos\keycap-gen`.
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4. This Next.js is newer than most training data, so check `node_modules/next/dist/docs/` before writing Next-specific code (see AGENTS.md above).
- There is **no `src/` folder**: `app/`, `components/`, `lib/`, `store/`, `public/` are at the root. The `@/*` import alias points at the project root.
- Commands: `npm run dev`, `npm run lint`, `npx tsc --noEmit` (type-check), `npm test` (Vitest 5, config in `vitest.config.mts`, tests live next to the code as `*.test.ts`).
- Vitest 5 needs `@types/node` 22 or newer. This is already set; do not downgrade it.
- Do **not** install `three-bvh-csg`. It conflicts with the `three-mesh-bvh` version that `@react-three/drei` needs, and we do not use boolean operations.

## Stack

three 0.186, @react-three/fiber 9, @react-three/drei 10, zustand 5, opentype.js 2, fflate (for the 3MF zip, not used yet). `@fontsource/roboto` is only there to supply the font file that was copied into `public/fonts`.

## Code map

- `store/useGenerator.ts`: one Zustand store. `keys` is an array of `KeyConfig` (id, units, text, font, fontSize, offsetX/Y, rotation, raise), `selectedKeyId` is the key the sidebar edits (`selectSelectedKey`, `updateKey(patch)` changes it), and the shared settings are stemTolerance (default 0.1 mm for FDM), housingLayout, housingRing, fontForAll, capColor and legendColor (`set(patch)`). Legend depth is not a setting: it is the fixed `LEGEND_DEPTH` in `cap.ts`. Components subscribe to slices with selectors. `addKey` copies the selected key (a single-letter legend moves on to the next one), `removeKey` keeps at least one, `MAX_KEYS` is 6. Keys sit in one row, in array order, and colors are global. Do not put per-key data in the shared settings or the other way round.
- `lib/geometry/keycap.ts`: `PITCH`, `CAP_HEIGHT`, `capDimensions(units)`. Rough Cherry-like numbers, refined later.
- `lib/geometry/legend.ts`: `textToShapes(font, text)` lays out glyphs by hand and returns `THREE.Shape[]` with holes.
- `lib/geometry/polygon.ts`: `cleanRing`, `jitterRing`, `orient`, `triangulate`.
- `lib/geometry/mesh.ts`: `MeshBuilder`, collects triangles into a BufferGeometry.
- `lib/geometry/stem.ts`: `stemRings(tolerance)` returns the jittered round stem outline and the MX "+" socket outline. Socket arm sizes come from memory of the Cherry spec; check them against a real switch.
- `lib/geometry/cap.ts`: `buildKeycapParts(settings, font)` returns `{ cap, legend, fits }`. The cap and the housing have rounded vertical corners (`CAP_CORNER_RADIUS` 1.5 mm in `keycap.ts`; the housing's well follows it a clearance further out): all outlines come from `roundedRectangle`, which always returns the same number of points so outlines of different sizes join point to point, and the loops go round `ring.length`, not 4. The top rim is rounded too (`CAP_EDGE_RADIUS` 1 mm): the outside is a stack of `roundedRectangle` rings, a straight wall and then a quarter-circle rim that shrinks the outline by the radius, ending at the flat top face. That flat face is smaller than the cap's nominal top (by the rim radius on each side), and the `fits` check measures the legend against it, rounded corners included. The housing's edges are not rounded. The cap is a hollow shell (`WALL`, `TOP_THICKNESS`) with an open bottom and an MX stem hanging from the underside of the top. It has a pocket in the shape of the legend, and the legend is a separate solid that fills it; `raise` lifts the legend above the top face. Size, offset and rotation are applied to the 2D rings here, not as a mesh transform. Also holds `EDGE_MARGIN`, `addFace` and `addWall`.
- `lib/geometry/housing.ts`: `buildHousing(units[])` is a fixed (no settings) closed strip for a row of MX plate-mount switches, one square well per key (`RIM` = 6 mm above the plate, 0.6 mm clearance around the cap skirt) with one wall (`WALL`) shared between neighbouring wells: each well has a 14.1 mm hole with latch notches in a 1.5 mm plate at its bottom and its own 8.6 mm cavity below, sized from the cap footprint. One key gives the same box as a lone housing. Because of the walls, the wells are about 21 mm apart for 1u, not the 19.05 mm keyboard pitch, so the strip does not fit a real plate. `housingLayout(units[])` returns the strip's size and each well's center x; `layoutExtent` gives the total width of a layout (the camera uses it). The outlines are jittered once and every height reuses the same points, which keeps the mesh welded. `previewLayout(units[], layout)` places the caps (`capXs`, each over its own well) and the housing in the preview for `housingLayout` (`separate` side by side on the same floor, the default; `below` stacked as they would sit on the switch, with the released skirt 4 mm, the switch travel, above the plate, so `RIM` keeps it inside the well; `hidden`). `components/Housing.tsx` renders it. The dimensions are standard MX numbers from memory, not measured on the owner's switches. The stem ends 1 mm above the skirt so the cap keeps its full travel.
- `lib/export/threemf.ts`: `build3mf(items)` takes items (`{ parts, faceDown, offsetX }`), welds the per-triangle vertices into an indexed mesh, writes one object per part (own base material), groups each item's parts as components under one build item, rests each item on the bed and zips with fflate. Slicers ignore the base material colors, so it also writes `Metadata/model_settings.config` (Bambu Studio's own format) giving each part a filament number (`extruder`: cap and housing 1, legend 2). It does not write a project settings file or claim to be Bambu Studio, and the owner's Bambu Studio 02.08.02.61 shows why: with a partial `project_settings.config` and no Application tag it opened silently with ONE filament and ignored the colors (the legend, on filament 2, went dark); with an Application tag of `BambuStudio-...` it showed "The 3mf file has invalid config, load geometry data only" and dropped the filament assignment too. So the file only carries each part's filament number, and the user adds a second filament and sets its color (orange) in the slicer once. Real fixes would need a full, version-matched Bambu project config (it would override the user's printer setup), The colors are now written as a standard 3MF color group (`m:colorgroup`, per-triangle `pid`/`p1`) instead of `basematerials`; confirmed in Bambu Studio 02.08.02.61: it shows the "Standard 3mf Import color" dialog with the cap color and the legend color already listed, and OK creates the filaments (the user picks Append, Color match or a manual mapping there). Other slicers were not tested. A full, version-matched Bambu project config is the other option (it would override the user's printer setup). `components/ExportButton.tsx` has the one download button: every key's cap (+ legend) goes face down (top on the bed) when its `raise` is 0, face up (stem on the bed) when its legend is raised, in a row at the well spacing, and the one housing goes floor down next to them when the "Include housing in the download" toggle (local state in the button, on by default) is on. Fonts are loaded on demand (`loadFont`) because each key has its own. `housingLayout` (the setting) only affects the preview; on the bed the caps and the housing are always side by side. It refuses to export when any legend does not fit.
- `lib/layoutPose.ts`: the animation state. `stepPose` is called once per frame from `Scene` in `KeycapCanvas.tsx` (negative `useFrame` priority, so it runs first) and moves the mutable `pose` (cap x per key, housing x/y, fade, floor y, camera target y) toward the chosen layout; `Keycap` and `Housing` read it in their own `useFrame`. Changing layout is one swoop: the housing drops under the caps, slides in and rises around them, with overlapping phases timed so it never passes through a cap. `Scene` also zooms the camera out to fit a wide row, but only when the row or layout changes and never after the user has grabbed the camera.
- `lib/geometry/ring.ts`: the split ring tab, a keychain loop on the **housing** (not on the keys): `buildRingTab(halfW, halfD, side, y0)` makes a flat 2 mm plate with a 4 mm hole that sticks out `RING_REACH` (8 mm) from a box wall, and `buildHousingTab(units[], side)` in `housing.ts` puts it on the housing's floor so it prints flat, floor down. `housingRing` is a shared setting: `"off"` or `"top" | "left" | "right" | "bottom"` ("top" is the back, where legend up points), on (`"left"`) by default. It is its own closed solid that overlaps the housing's 1.5 mm wall by 1 mm instead of being cut into it (no boolean operations), same filament as the housing; the slicer should fuse the two (not yet tried in a slicer). It only goes into the 3MF together with the housing. A tab on the left end points at the caps when they sit side by side, so `previewLayout` takes a `gapExtra` (the pose eases it in) and `layoutExtent` counts the reach for the camera.
- `lib/geometry/validate.ts`: `validateMesh(geometry)` is the watertight check (open edges, non-manifold edges, degenerate triangles, signed volume). Tests: `npm test` (Vitest), in `lib/geometry/*.test.ts`, `lib/export/threemf.test.ts` and `store/useGenerator.test.ts`.
- `lib/useFont.ts`: loads and caches the opentype.js font (`useFont` hook, `loadFont` promise).
- `components/Keycap.tsx` builds one key's parts and renders two meshes (`keyId` picks the key, `index` its place in the row). `components/KeyRow.tsx` is the row of key chips in the sidebar. `components/KeycapCanvas.tsx` is the scene and is loaded client-only with `dynamic(..., { ssr: false })` from `app/page.tsx`. `components/Slider.tsx` is a small input; `components/ui.tsx` has the shared card, field, dropdown, toggle and color controls.
- `public/fonts/roboto-latin-700-normal.woff` (Roboto Bold, Apache 2.0).

## Geometry rules (each one exists because of a real bug)

- All units are millimeters. Y is up. The cap is built with its origin at the center of the bottom face; `Keycap.tsx` shifts the group by `-CAP_HEIGHT / 2`.
- The legend's 2D plane maps onto the cap's XZ plane as `(x, y) -> (x, -y)`, so legend "up" points to the back of the cap.
- No boolean/CSG. The pocket is built from the same outline rings as the legend, so both parts share exact vertices and the pocket depth equals the legend depth.
- Outer rings run counter-clockwise and holes clockwise (in XZ). The wall-facing logic in `addWall` depends on it.
- Always `cleanRing` (5 micron tolerance) and then `jitterRing` (0.2 micron) before triangulating. The triangulator drops exactly-collinear points and draws edges through collinear points from different outlines (all capitals share a top line), which leaves open edges in the mesh.
- **No kerning.** Kerned pairs like "WA" overlap, and overlapping outlines cannot be cut as a clean pocket.
- The legend must stay at least `EDGE_MARGIN` (0.4 mm) inside the top face. Otherwise `fits` is false: the cap gets a plain top, the legend sits on top and renders red.
- Known limits: overlapping glyph outlines, and legend shapes nested inside another shape's counter (possible with SVG icons), are not handled yet.
- Print-ready means watertight: every directed edge appears exactly once and its reverse exactly once, with no degenerate triangles. A good sanity check is that cap volume plus legend volume equals the body volume (prismatoid formula).

## Roadmap

1. Done: preview, text legend, size/offset/rotation/depth controls.
2. Built (Step 4): pocket + flush legend. Cap and legend were checked watertight, with cap + legend volume equal to the body, for several legends. It counts as done once the owner has confirmed it in the browser.
3. Built: hollow cap, MX stem, stem fit-tolerance slider (confirm in the browser). Still open: optional homing bump.
4. Done: `validateMesh()` (watertight check) and Vitest tests for the housing, cap and legend, the 3MF file and the key list. Housings for 1 to 6 keys and mixed sizes, and caps with legends, are watertight.
4b. Built (multi-key, not yet confirmed in the browser or a slicer): up to 6 keys in one row over one housing strip with a well per key, key chips in the sidebar, animated layouts, camera fit, and a multi-key 3MF export.
5. Built (not yet tried in a slicer; the owner skipped step 4 for now): 3MF export. Original plan: cap and legend as two objects with two base materials in one build item (`[Content_Types].xml`, `_rels/.rels`, `3D/3dmodel.model`), zipped with fflate. Orient for face-down printing. Test in a real slicer (Bambu Studio / PrusaSlicer).
6. No SVG upload (the owner does not want it). A searchable built-in icon library (Lucide or Tabler), more fonts, print modes (two-color, shine-through, single-color engraving).
7. Deploy on Vercel, sample gallery, save/share designs through URL params.

Use only open-licensed fonts and icons (OFL, MIT, Apache) and keep a credits page.

## Planned next: mobile support, option B (NOT STARTED, waiting for the owner's "go")

Written 2026-10-30 so the work can be picked up the next day. Nothing in this section is built. A first attempt at step 1 was started by mistake and fully reverted (`app/page.tsx`, `app/layout.tsx` and `app/globals.css` are back to the desktop-only versions); the owner wants the plan approved before any building. Show this plan again and wait for "go" (see memory: plan requests mean no building).

### Why option B
The output is a .3mf opened in a desktop slicer, so a full mobile experience has limited payoff, but visitors from social posts (Kalipay Prints 3D) will land on phones and today see a sidebar covering the whole screen. Three options were weighed: **A** a "best on desktop" banner on small screens (small, no broken first impression); **B** a usable phone layout without tuning (chosen); **C** the full plan with speed tuning, a Share / Save button and a custom font picker. Revisit A/C after deploying (roadmap 7) and seeing real phone traffic. The owner picked B.

### What breaks on a phone today
- The sidebar is a fixed `w-[27rem]` (432 px) panel floating over a full-screen 3D view, and `SIDEBAR_PX = 432` in `components/KeycapCanvas.tsx` is subtracted when fitting the camera.
- Inputs and dropdowns are 12 px, so iPhone Safari zooms the page on focus (needs 16 px).
- Touch targets are far under 40 px (info icons 16, key chips 28, switches, slider thumbs).
- The `InfoTip` notes open on hover/focus only.
- The 4096 x 2304 `public/images/floor.svg` texture and the `backdrop-blur-3xl` sidebar are heavy for phones (iPhones can run out of graphics memory).
- A .3mf download behaves differently on iOS Safari, Android Chrome and in-app browsers (Instagram, TikTok often block downloads).

### Decisions (the owner accepted the defaults)
- Portrait phone: 3D view on top (about 40% of the screen height, `dvh`), controls scroll below.
- Phone on its side: 3D view left, controls right.
- Width 768 px and up, and tall enough (min-height 501 px): today's floating sidebar, unchanged. Desktop must look and behave exactly as now.
- Download bar pinned at the bottom on phones.
- Native font dropdown stays (iPhones ignore per-option fonts, so the preview is lost there; a custom picker is later and optional).
- Layout modes planned as Tailwind 4 custom variants in `globals.css`: `desk` = `@media (min-width: 768px) and (min-height: 501px)`, `short` = `@media (max-height: 500px)`; touch sizing keyed on `@media (pointer: coarse)`, not on width, so a small desktop window keeps the compact controls. The viewport comes from a static `viewport` export in `app/layout.tsx` (Next 16, see `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`) with `viewportFit: "cover"`.

### Scope
- **In:** stacked phone layout, touch-sized controls, pinned Download bar, smaller floor image on touch screens.
- **Out (not in B):** speed and battery tuning (pixel density cap, redrawing only when something moves), the Share / Save button (Web Share API for files), the custom font picker.

### Step 0: git safety (needs the owner's OK before it is done)
Git state on 2026-10-30: branch `master` only, ONE commit ("Initial commit from Create Next App"). All of the project (store, components, lib, tests, fonts, images, CLAUDE.md, vitest config) is uncommitted. Uncommitted work follows you across branches, so a branch alone would NOT make a revert easy.
1. Commit everything on `master` as a baseline ("Baseline before mobile layout"), leaving out `.claude/` (local tool settings). List the files first so the owner can see them. Commit messages end with the attribution line from the session's reminder.
2. Create branch `mobile-layout` from that commit and do all the mobile work there.
3. One commit per step (1 to 4), each only after `npx tsc --noEmit`, `npm run lint` and `npm test` pass.
4. Afterwards `git status` should be clean apart from `.claude/`, and `master` untouched.
- Throw the whole feature away: switch to `master` (optionally delete the branch). Undo one step: `git revert` that step's commit. Keep it: merge `mobile-layout` into `master`.

### Steps (each ends with a check by the owner, then one commit)
1. **Page shell.** `app/page.tsx` (main/section/aside), `app/layout.tsx` (viewport), `app/globals.css` (custom variants), `components/KeycapCanvas.tsx`. The canvas section comes first in the DOM (`relative h-[40dvh]`, `desk:absolute desk:inset-0`), the aside second (`flex-1 overflow-y-auto`, `desk:absolute` floating sidebar). Use `gap-2` instead of `space-y-2` on the aside. Phone sidebar is a plain `bg-white/90` panel (blur and gradient only under `desk:`). The camera fit stops subtracting the sidebar width unless the layout is the desktop one (detect with `matchMedia` or the canvas width, not a hard-coded 432). The round logo moves inside the canvas section and shrinks to about 56 px (`desk:` keeps 144 px). *Check: in browser phone mode the 3D view is on top and the controls scroll; a laptop window looks like today.*
2. **Touch-friendly controls.** `components/ui.tsx`, `Slider.tsx`, `KeyRow.tsx`, `globals.css`. `CONTROL` becomes 16 px on touch (`text-base`, desktop keeps `text-xs`); chips, switches, checkboxes and swatches about 40 px; slider thumb 24 to 28 px and a taller track under `pointer: coarse`; `.range { touch-action: pan-y }` so vertical swipes still scroll; `InfoTip` gets a `useState` open flag toggled on tap and closed by a tap outside (hover still works on desktop) and a bigger hit area on touch. Desktop sizes unchanged. *Check: tapping a text box does not zoom the page; everything is easy to hit with a thumb.*
3. **Pinned Download bar.** `components/ExportButton.tsx`: `sticky bottom-0` inside the scrolling aside on phones, padding `max(.., env(safe-area-inset-bottom))`, hint text hidden on phones (error messages still show), normal card on `desk:`. *Check: Download stays visible while scrolling and a download starts.*
4. **Smaller floor image on touch screens.** New `public/images/floor-small.svg` (same art, `width="2048" height="1152"`), chosen in `FloorArt` and in `useTexture.preload` when `matchMedia("(pointer: coarse)")` matches. Desktop keeps the 4096 one. *Check: the floor looks right on a phone and the page does not crash or go blank.*
5. **Finish.** `tsc`, lint, tests, `next build`, then update this file's code map.

### How it gets checked
Claude runs type-check, lint, tests and a production build (it cannot see a phone-sized window). The owner checks in the browser's phone mode (F12, device icon) and then on a real phone through a deployed preview or the home network.

### Risks
- Only partly testable by Claude, so spacing may need a tweak after the owner looks.
- A slider handle can still catch a scroll on some phones.
- The 3D view keeps redrawing constantly (left out of B), so an older phone may stutter or warm up.
- Downloads depend on the phone and browser; in-app browsers may block them. How Bambu Handy treats our .3mf is unknown; the colour-mapping dialog is a desktop Bambu Studio behaviour.

### Waiting on the owner
1. OK for the baseline commit (without `.claude/`)?
2. "go" to build step 0, then steps 1 to 4 back to back on the branch.
