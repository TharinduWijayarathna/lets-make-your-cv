# Build Your CV

A free online CV builder. Create an account, edit a professional resume in the browser, switch between three print-ready templates, and export to PDF.

## Features

- **Free accounts** — register and sign in to save your CV online
- **Three CV templates** — Classic Sidebar, Nordic Minimal, and Editorial Bold
- Switch templates anytime; your content stays the same
- Guided editor for personal info, summary, experience, projects, education, skills, and certifications
- Automatic save to your account
- Print / Save as PDF from the browser

## Tech stack

- **Frontend** — HTML, CSS, vanilla JavaScript
- **Backend** — Node.js, Express, express-session
- **Auth** — bcrypt password hashing, cookie sessions
- **Database** — SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

## Requirements

- Node.js 18 or newer

## Getting started

```bash
npm install
cp .env.example .env   # set SESSION_SECRET for production
npm start
```

- **Home:** [http://localhost:3000](http://localhost:3000)
- **Register:** [http://localhost:3000/register.html](http://localhost:3000/register.html)
- **CV builder:** [http://localhost:3000/app.html](http://localhost:3000/app.html) (requires sign-in)

```bash
npm run dev   # auto-restart on file changes
npm test      # run unit and API tests
```

## Usage

1. **Create a free account** on the home page.
2. Open the **CV builder** and fill in your details via **Edit CV**.
3. Choose a **template** from the toolbar.
4. Click **Apply Changes** to save to your account.
5. **Print / Save PDF** when ready.

## API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | `{ email, password, name }` |
| `POST` | `/api/auth/login` | — | `{ email, password }` |
| `POST` | `/api/auth/logout` | session | Sign out |
| `GET` | `/api/auth/me` | session | Current user or `null` |
| `GET` | `/api/cv` | session | Load your CV |
| `PUT` | `/api/cv` | session | Save CV `{ "data": { ... } }` |

## Deploying to the web

1. Set `NODE_ENV=production` and a strong `SESSION_SECRET` (see `.env.example`).
2. Run behind HTTPS (sessions use secure cookies in production).
3. Host on any Node-friendly platform (Railway, Render, Fly.io, VPS, etc.).
4. Persist the `data/` directory so SQLite survives restarts.

## Project structure

```
build-your-cv/
├── auth.js              # Password hashing and validation
├── db.js                # Users and per-user CV storage
├── server.js            # Express, sessions, API routes
├── public/
│   ├── index.html       # Landing page
│   ├── login.html       # Sign in
│   ├── register.html    # Sign up
│   ├── app.html         # CV builder
│   ├── js/              # app.js, auth-client.js, auth-page.js
│   ├── css/             # landing, auth, shared, template styles
│   └── templates/       # CV layout partials
├── scripts/             # CSS build tooling
└── data/cv.db           # SQLite (gitignored)
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `SESSION_SECRET` | *(dev fallback)* | **Required in production** — session signing key |
| `NODE_ENV` | — | Set to `production` when deployed |
