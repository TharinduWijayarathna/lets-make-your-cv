# Build Your CV

A single-page CV builder with a print-ready layout. Edit your details in the browser, persist them in SQLite, and export to PDF via the browser print dialog.

## Features

- **Three CV templates** — Classic Sidebar, Nordic Minimal, and Editorial Bold
- Switch templates from the toolbar; your content stays the same and the choice is saved in SQLite
- In-browser editor for personal info, summary, experience, projects, education, skills, and certifications
- Automatic load/save to a local SQLite database
- Print / Save as PDF from the browser

## Tech stack

- **Frontend** — HTML, CSS, vanilla JavaScript (`public/index.html` landing, `public/app.html` builder)
- **Backend** — Node.js, Express
- **Database** — SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

## Requirements

- Node.js 18 or newer

## Getting started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) for the overview, or go straight to the [CV builder](http://localhost:3000/app.html).

For development with auto-restart on file changes:

```bash
npm run dev
```

## Usage

1. Choose a **Template** from the dropdown (Classic, Nordic, or Editorial).
2. Click **Edit CV** to update your information.
3. Click **Apply Changes** to update the preview and save to the database.
4. Click **Print / Save PDF** to export (use “Save as PDF” in the print dialog).

The toolbar shows load and save status.

## API

| Method | Endpoint    | Description                          |
|--------|-------------|--------------------------------------|
| `GET`  | `/api/cv`   | Load CV data from the database       |
| `PUT`  | `/api/cv`   | Save CV data (`{ "data": { ... } }`) |

Example save request:

```bash
curl -X PUT http://localhost:3000/api/cv \
  -H "Content-Type: application/json" \
  -d '{"data":{"personal":{"name":"Jane Doe",...},"summary":"...",...}}'
```

## Project structure

```
build-your-cv/
├── db.js           # SQLite setup and CV read/write
├── server.js       # Express server and API routes
├── public/
│   ├── index.html       # Landing / app overview
│   ├── app.html         # CV builder (editor, preview, template picker)
│   ├── css/landing.css  # Landing page styles
│   ├── js/app.js        # Load/save, template switching, renderers
│   ├── css/             # shared.css + classic|nordic|editorial.css (active template only)
│   └── templates/       # CV layout HTML (classic, nordic, editorial)
├── data/
│   └── cv.db       # Created on first run (gitignored)
└── package.json
```

## Data storage

CV content is stored as JSON in a single SQLite row (`data/cv.db`). On first run, the database is created and seeded with sample data. Delete `data/cv.db` to reset to the default CV.

## Environment

| Variable | Default | Description        |
|----------|---------|--------------------|
| `PORT`   | `3000`  | HTTP server port   |
