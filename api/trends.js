// api/trends.js — Vercel serverless function
// GET /api/trends?role=ux
// Returns skill frequency grouped by date for past 30 days
// TODO: Implement Prisma query and response formatting

export default function handler(req, res) {
  return res.status(200).json({ message: 'Trends endpoint — placeholder' });
}
