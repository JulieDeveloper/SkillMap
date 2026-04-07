// api/quota.js — Vercel serverless function
// GET /api/quota
// Returns current RapidAPI quota status

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const quota = await prisma.apiQuota.findFirst({
      orderBy: { lastUpdated: 'desc' }
    });

    if (!quota) {
      return res.status(404).json({ error: 'Quota not initialized' });
    }

    return res.status(200).json({
      requestsRemain: quota.requestsRemain,
      jobsRemain: quota.jobsRemain,
      requestsUsed: 25 - quota.requestsRemain,
      jobsUsed: 250 - quota.jobsRemain,
      lastUpdated: quota.lastUpdated.toISOString()
    });
  } catch (err) {
    console.error('/api/quota error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
