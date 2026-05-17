require('dotenv').config();

const { initDb } = require('./src/db');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;

initDb();

const app = createApp();
app.listen(PORT, () => {
  console.log(`Let's Make Your CV running at http://localhost:${PORT}`);
});
