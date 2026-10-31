# Kalipay 3D Prints: Keycap Fidget Lab

A free web app for designing mechanical keyboard keycaps with your own text legend. You see the
caps live in 3D and download a two-color 3MF file ready for a 3D printer. No account needed.

Made by Kalipay 3D Prints.

## What you can do

- **Up to 6 keys in a row**, each 1u to 2.25u wide, with its own legend (up to 6 characters).
- **Legend controls:** font, size, rotation, and raise. At 0 mm the legend sits flush in a
  pocket in the top; higher values make a raised legend you can feel.
- **Two colors**, one for the cap and one for the legend, printed as separate parts that fit
  together exactly.
- **Cherry MX-style stem**, so the caps fit MX-style switches.
- **Fidget housing:** a strip with one well per key for plate-mount MX switches, with an optional
  split ring tab so it can hang from a keychain.
- **3MF download:** caps (face down, or face up when the legend is raised) and the housing,
  laid out on the bed side by side.

## Printing notes

- The 3MF stores the cap and legend colors as a standard 3MF color group. In Bambu Studio
  (tested with 02.08.02.61) a "Standard 3mf Import color" dialog appears on open; click OK and
  it creates both filaments. Other slicers have not been tested yet.
- Sizes are standard MX numbers and have not been measured against every switch. Print one cap
  first and check the stem fit.
- The housing wells are about 21 mm apart (for 1u), not the 19.05 mm keyboard pitch, so the
  housing is a fidget toy and does not fit a real keyboard plate.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the tests (Vitest), including watertight checks of the printed parts |
| `npm run lint` | Lints the code |
| `npx tsc --noEmit` | Type-checks the code |
| `npm run build` | Builds the production site |

## Built with

Next.js, React, TypeScript, Tailwind CSS, three.js with React Three Fiber and drei, Zustand,
opentype.js and fflate.
