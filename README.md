# studyflow — School Schedule Builder

A weekly planner for students: add your classes, set a study-hours goal and your extracurriculars, and studyflow builds a balanced week around them.

**Live app:** https://coolgithub1.github.io/School-Schedule-Builder-App/

## Features

- **Screenshot import:** upload a screenshot of your Yeditepe timetable (Program tab) and your classes are filled in automatically — read on-device, the image never leaves your phone
- Guided setup that turns classes, study goals and activities into a weekly schedule
- **English and Turkish:** chosen on first launch (with flags) and switchable in Settings — 24-hour clock, Turkish day/month names
- Colour-coded types with matching icons everywhere — purple **class**, green **study time**, orange **activity** — and a “What do you want to add?” chooser
- Drag-and-drop calendar with conflict warnings, weekly or one-off blocks, and undo
- Overview of today, weekly focus progress, and upcoming deadlines
- Study goals page with per-subject focus hours and an assignments/exams tracker
- Search (Ctrl/⌘ K), reminders, and profile settings
- Works on desktop and mobile; your data is saved in your own browser (localStorage)

Tip: on the log-in screen, any email signs you in with a sample week.

Check that every UI string has a Turkish translation with `node scripts/check-i18n.mjs`.

## Run locally

```bash
npm install
npm run dev
```

## How screenshot import works

The app runs [Tesseract.js](https://github.com/naptha/tesseract.js) (Tesseract OCR compiled to WebAssembly) in a Web Worker, with the compact `best_int` English model (~3 MB). The engine and model are copied into `public/ocr` at build time (`scripts/copy-ocr-assets.mjs`) and served by the app itself — no third-party requests. The first import downloads ~7 MB once; after that it's cached.

`src/lib/scheduleOcr.ts` turns OCR output into classes:

1. Reads the page twice with two adaptive thresholding methods (Sauvola and local Otsu), so off-centre screenshots with black edges, overlays or uneven colour still work — Tesseract's default global threshold can lose every course code on those.
2. Finds the weekday headers (Pzt/Sal/Çar/Per/Cum or Mon–Fri) and reads the time column (9-10, 10-11, …) in a separate digits-only pass.
3. Joins course codes (e.g. `VCD 421`), fixes one-letter misreads by snapping to a more frequent confident code (`VED 321` → `VCD 321`), and takes a close-up single-line look at any cell where a prefix was read but its number wasn't (e.g. a thin "1" dropped from "371").
4. Maps each code to its day and hour by position and merges consecutive hours into class blocks.

### Testing on a computer

The same parser and engine run in Node, so desktop tests match what ships on phones:

```bash
npm run test:ocr                                   # synthetic fixtures in test/fixtures (incl. an off-centre one)
node scripts/test-ocr.mjs path/to/screenshot.png   # any screenshot
node scripts/test-ocr.mjs shot.png --expect "VCD 421@0:11-14,ART 207@2:9-12"
```

## Tech

React 19, TypeScript, Vite, Tailwind CSS 4, lucide-react icons. Deployed to GitHub Pages with GitHub Actions on every push to `main`.
