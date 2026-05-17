# Let's Make Your CV

Free online CV builder — sign up, edit your resume, pick a layout, save to your account, export as PDF.

**Stack:** Node.js, Express, SQLite, vanilla HTML/CSS/JS.

## Project layout

```
server.js          # entry point
src/               # backend (Express app, auth, db, analytics)
public/            # static site, editor, and client JS
scripts/           # build tools (template CSS)
test/              # API and unit tests
data/              # SQLite database (created at runtime)
```

## Run locally

```bash
npm install
cp .env.example .env   # SESSION_SECRET; optional AdSense vars
npm start
```

Open [http://localhost:3000](http://localhost:3000). Builder: [/app.html](http://localhost:3000/app.html).

```bash
npm run dev    # watch mode
npm test       # tests
```

## Production

Copy `.env.example` to `.env` and set `SESSION_SECRET`. Use HTTPS and persist the `data/` folder.

**AdSense:** `ADSENSE_CLIENT`, `ADSENSE_SLOT_LEFT`, `ADSENSE_SLOT_RIGHT` (optional).

**Admin:** `/admin/` — set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`.
