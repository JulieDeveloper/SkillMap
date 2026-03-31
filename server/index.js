// SkillMap Server — Express.js entry point
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes placeholder — will be filled in with /api/skills, /api/trends, /api/scrape
// TODO: Import API routes here

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
