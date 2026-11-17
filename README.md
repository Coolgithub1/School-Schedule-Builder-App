# studyflow — School Schedule Builder

A weekly planner for students: add your classes, set a study-hours goal and your extracurriculars, and studyflow builds a balanced week around them.

**Live app:** https://coolgithub1.github.io/School-Schedule-Builder-App/

## Features

- **Screenshot import:** upload a screenshot of your Yeditepe timetable (Program tab) and your classes are filled in automatically — read on-device, the image never leaves your phone
- Guided setup that turns classes, study goals and activities into a weekly schedule
- Drag-and-drop calendar with conflict warnings, weekly or one-off blocks, and undo
- Overview of today, weekly focus progress, and upcoming deadlines
- Study goals page with per-subject focus hours and an assignments/exams tracker
- Search (Ctrl/⌘ K), reminders, and profile settings
- Works on desktop and mobile; your data is saved in your own browser (localStorage)

Tip: on the log-in screen, any email signs you in with a sample week.

## Run locally

```bash
npm install
npm run dev
```

## How screenshot import works

The app runs [Tesseract.js](https://github.com/naptha/tesseract.js) (Tesseract OCR compiled to WebAssembly) in a Web Worker, with the compact `best_int` English model (~3 MB). The engine and model are copied into `public/ocr` at build time (`scripts/copy-ocr-assets.mjs`) and served by the app itself — no third-party requests. The first import downloads ~7 MB once; after that it's cached.

`src/lib/scheduleOcr.ts` turns OCR output into classes: it finds the weekday headers (Pzt/Sal/Çar/Per/Cum or Mon–Fri), runs a second digits-only pass over the time column (9-10, 10-11, …), maps each course code (e.g. `VCD 421`) to its day and hour by position, and merges consecutive hours into class blocks.

### Testing on a computer

The same parser and engine run in Node, so desktop tests match what ships on phones:

```bash
npm run test:ocr                                   # synthetic fixtures in test/fixtures
node scripts/test-ocr.mjs path/to/screenshot.png   # any screenshot
node scripts/test-ocr.mjs shot.png --expect "VCD 421@0:11-14,ART 207@2:9-12"
```

## Tech

React 19, TypeScript, Vite, Tailwind CSS 4, lucide-react icons. Deployed to GitHub Pages with GitHub Actions on every push to `main`.
