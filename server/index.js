// SkillMap Server — Express.js entry point
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initCron } from '../scripts/cron.js';
import apiRoutes from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize cron scheduler on startup
initCron();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Mount API routes
app.use(apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SkillMap server is running' });
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
