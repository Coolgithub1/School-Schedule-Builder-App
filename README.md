# studyflow — School Schedule Builder

A weekly planner for students: add your classes, set a study-hours goal and your extracurriculars, and studyflow builds a balanced week around them.

**Live app:** https://coolgithub1.github.io/School-Schedule-Builder-App/

## Features

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

## Tech

React 19, TypeScript, Vite, Tailwind CSS 4, lucide-react icons. Deployed to GitHub Pages with GitHub Actions on every push to `main`.
