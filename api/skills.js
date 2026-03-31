// api/skills.js — Vercel serverless function
// GET /api/skills?role=ux&type=fulltime
// Returns top 10 skills for selected role and job type
// TODO: Implement Prisma query and response formatting

export default function handler(req, res) {
  return res.status(200).json({ message: 'Skills endpoint — placeholder' });
}
