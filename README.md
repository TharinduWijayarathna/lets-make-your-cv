# Build Your CV

Free online CV builder — sign up, edit your resume, pick a template, save to your account, export as PDF.

**Stack:** Node.js, Express, SQLite, vanilla HTML/CSS/JS.

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Builder: [/app.html](http://localhost:3000/app.html).

```bash
npm run dev    # watch mode
npm test       # tests
```

## Production

Copy `.env.example` to `.env` and set `SESSION_SECRET`. Use HTTPS and persist the `data/` folder.
