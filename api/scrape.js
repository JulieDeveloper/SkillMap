// api/scrape.js — Vercel serverless function
// POST /api/scrape
// Manually triggers API fetch and transformation (testing only)
// TODO: Implement API call trigger with auth/validation

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json({ message: 'Scrape endpoint — placeholder' });
}
