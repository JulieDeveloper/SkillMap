// api/skills.js — Vercel serverless function
// GET /api/skills?role=uiux&type=fulltime
// Returns top 10 skills for the selected role and job type

import { PrismaClient } from '@prisma/client';

// Module-level singleton — reused across warm invocations
const prisma = new PrismaClient();

const VALID_ROLES = ['uiux', 'product', 'graphic', 'experiential', 'digital', 'visual', 'multidisciplinary'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { role, type = 'all' } = req.query;

  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid or missing role parameter', validRoles: VALID_ROLES });
  }

  try {
    // Find the most recent snapshot date for this role + job type
    const latestSnapshot = await prisma.skill.findFirst({
      where: { role, jobType: type },
      orderBy: { date: 'desc' },
      select: { date: true }
    });

    if (!latestSnapshot) {
      return res.status(404).json({ error: `No data found for role: ${role}, type: ${type}` });
    }

    // Fetch top 10 skills from that snapshot
    const skills = await prisma.skill.findMany({
      where: { role, jobType: type, date: latestSnapshot.date },
      orderBy: { count: 'desc' },
      take: 10
    });

    // Compute each skill's share of the total count across these 10 skills
    const totalCount = skills.reduce((sum, s) => sum + s.count, 0);
    const skillsWithPercentage = skills.map(s => ({
      skill: s.skill,
      count: s.count,
      percentage: totalCount > 0 ? Math.round((s.count / totalCount) * 100) : 0
    }));

    return res.status(200).json({
      role,
      type,
      date: latestSnapshot.date.toISOString(),
      total: skills[0]?.total || 0,
      skills: skillsWithPercentage
    });
  } catch (err) {
    console.error('/api/skills error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
