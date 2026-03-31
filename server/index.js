// SkillMap Server — Express.js entry point
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initCron } from '../scripts/cron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize cron scheduler on startup
initCron();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Import cron trigger utility
import { triggerCronManually } from '../scripts/cron.js';

// Routes placeholder — will be filled in with /api/skills, /api/trends, /api/scrape
// TODO: Import API routes here

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SkillMap server is running' });
});

// Manual cron trigger (for testing)
app.post('/api/trigger-cron', async (req, res) => {
  console.log('📡 Manual cron trigger requested');

  try {
    await triggerCronManually();
    res.json({ status: 'success', message: 'Cron job triggered' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Root route — serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ SkillMap server running on http://localhost:${PORT}`);
});
