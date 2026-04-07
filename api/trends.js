// api/trends.js — Vercel serverless function
// GET /api/trends?role=uiux
// Returns skill frequency grouped by date for the past 30 days

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VALID_ROLES = ['uiux', 'product', 'graphic', 'experiential', 'digital', 'visual', 'multidisciplinary'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { role } = req.query;

  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid or missing role parameter', validRoles: VALID_ROLES });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Trends always aggregate across all job types
    const allSkills = await prisma.skill.findMany({
      where: { role, jobType: 'all', date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' }
    });

    if (allSkills.length === 0) {
      return res.status(404).json({ error: `No trend data found for role: ${role} in the past 30 days` });
    }

    // Group records by date string (YYYY-MM-DD)
    const byDate = {};
    allSkills.forEach(skill => {
      const dateStr = skill.date.toISOString().split('T')[0];
      if (!byDate[dateStr]) byDate[dateStr] = [];
      byDate[dateStr].push(skill);
    });

    // For each date, sort by count and return top 5 with percentages
    const trends = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, skills]) => {
        const top5 = skills.sort((a, b) => b.count - a.count).slice(0, 5);
        const total = top5.reduce((sum, s) => sum + s.count, 0);
        return {
          date,
          skills: top5.map(s => ({
            skill: s.skill,
            count: s.count,
            percentage: total > 0 ? Math.round((s.count / total) * 100) : 0
          }))
        };
      });

    return res.status(200).json({ role, days: 30, snapshots: trends.length, trends });
  } catch (err) {
    console.error('/api/trends error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
