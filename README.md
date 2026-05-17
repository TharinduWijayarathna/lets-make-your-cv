# Build Your CV

A single-page CV builder with a print-ready layout. Edit your details in the browser, persist them in SQLite, and export to PDF via the browser print dialog.

## Features

- Two-column A4 CV layout (sidebar + main content)
- In-browser editor for personal info, summary, experience, projects, education, skills, and certifications
- Automatic load/save to a local SQLite database
- Print / Save as PDF from the browser

## Tech stack

- **Frontend** — HTML, CSS, vanilla JavaScript (`public/index.html`)
- **Backend** — Node.js, Express
- **Database** — SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

## Requirements

- Node.js 18 or newer

## Getting started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

For development with auto-restart on file changes:

```bash
npm run dev
```

## Usage

1. Click **Edit CV** to update your information.
2. Click **Apply Changes** to update the preview and save to the database.
3. Click **Print / Save PDF** to export (use “Save as PDF” in the print dialog).

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
│   └── index.html  # CV UI and editor
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
