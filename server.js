require('dotenv').config();

const { initDb } = require('./db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;

initDb();

const app = createApp();
app.listen(PORT, () => {
  console.log(`CV builder running at http://localhost:${PORT}`);
});
