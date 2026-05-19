# Let's Make Your CV

Free online CV builder — sign up, edit your resume, pick a layout, save to your account, export as PDF.

**Stack:** Node.js, Express, SQLite, Astro (full frontend), vanilla JS (CV editor runtime).

## Project layout

```
server.js          # entry point
src/               # backend (Express app, auth, db, analytics)
web/               # Astro site + static assets (css, js, templates)
  src/pages/       # routes: /, /login, /register, /app, /admin
  public/          # built CSS, client JS, template HTML fragments
scripts/           # build tools (template CSS from sources)
test/              # API and unit tests
dist/web/          # production frontend build (generated)
data/              # SQLite database (created at runtime)
```

## Run locally

```bash
npm install
cd web && npm install && cd ..
cp .env.example .env   # SESSION_SECRET; SITE_URL; optional AdSense
npm run build          # template CSS + Astro (all pages)
npm start
```

Open [http://localhost:3000](http://localhost:3000). CV editor: [/app](http://localhost:3000/app).

**Development**

```bash
# Terminal 1 — API (serves dist/web after build, or rebuild on change)
npm run dev

# Terminal 2 — Astro dev server with hot reload (proxies API to :3000)
npm run dev:web
```

Astro dev: [http://localhost:4321](http://localhost:4321) (proxies `/api`, `/css`, `/js`, `/templates`, `/app`, `/admin`).

```bash
npm run build:css   # regenerate template CSS into web/public/css
npm run build:web   # Astro static build → dist/web
npm test
```

## Production

Set `SESSION_SECRET` and `SITE_URL` (public HTTPS origin) in `.env`. Use HTTPS and persist `data/`.

`npm start` runs a full build, then Express serves **only** `dist/web/` plus API routes. Legacy URLs redirect (`/app.html` → `/app`, etc.).

**AdSense:** `ADSENSE_CLIENT`, `ADSENSE_SLOT_LEFT`, `ADSENSE_SLOT_RIGHT` (optional).

**Admin:** [/admin](http://localhost:3000/admin) — `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`.
