const express = require('express');
const path = require('path');
const { initDb, getCv, saveCv } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

initDb();

app.use(express.json({ limit: '1mb' }));

app.get('/api/cv', (_req, res) => {
  try {
    res.json(getCv());
  } catch (err) {
    console.error('GET /api/cv:', err);
    res.status(500).json({ error: 'Failed to load CV data' });
  }
});

app.put('/api/cv', (req, res) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Request body must include a data object' });
    }
    const result = saveCv(data);
    res.json(result);
  } catch (err) {
    console.error('PUT /api/cv:', err);
    res.status(500).json({ error: 'Failed to save CV data' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`CV builder running at http://localhost:${PORT}`);
});
