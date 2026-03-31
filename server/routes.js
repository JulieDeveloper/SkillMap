// routes.js — API endpoint handlers
// GET /api/skills, GET /api/trends, POST /api/scrape

import express from 'express';
import { PrismaClient } from '@prisma/client';
import runPipeline from '../scripts/pipeline.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/skills?role=uiux&type=fulltime
 * Returns top 10 skills for a selected role and job type
 *
 * Query params:
 *   - role: one of: uiux, product, graphic, experiential, digital, visual, multidisciplinary
 *   - type: one of: fulltime, parttime, contract, internship (currently unused, returns 'all')
 *
 * Returns: { role, type, skills: [ {skill, count, percentage}, ... ] }
 */
router.get('/api/skills', async (req, res) => {
  try {
    const { role, type } = req.query;

    // Validate role parameter
    const validRoles = [
      'uiux',
      'product',
      'graphic',
      'experiential',
      'digital',
      'visual',
      'multidisciplinary'
    ];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid or missing role parameter',
        validRoles
      });
    }

    // Fetch top 10 skills for this role (latest snapshot)
    // Get the most recent date for this role
    const latestSnapshot = await prisma.skill.findFirst({
      where: { role },
      orderBy: { date: 'desc' },
      select: { date: true }
    });

    if (!latestSnapshot) {
      return res.status(404).json({
        error: `No data found for role: ${role}`
      });
    }

    // Fetch top 10 skills from latest snapshot
    const skills = await prisma.skill.findMany({
      where: {
        role,
        date: latestSnapshot.date
      },
      orderBy: { count: 'desc' },
      take: 10
    });

    // Calculate percentages
    const totalCount = skills.reduce((sum, s) => sum + s.count, 0);
    const skillsWithPercentage = skills.map((skill) => ({
      skill: skill.skill,
      count: skill.count,
      percentage: totalCount > 0 ? Math.round((skill.count / totalCount) * 100) : 0
    }));

    res.json({
      role,
      type: type || 'all',
      date: latestSnapshot.date.toISOString(),
      total: skills[0]?.total || 0,
      skills: skillsWithPercentage
    });
  } catch (error) {
    console.error('Error in /api/skills:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trends?role=uiux
 * Returns skill frequency grouped by date for the past 30 days
 *
 * Query params:
 *   - role: one of: uiux, product, graphic, experiential, digital, visual, multidisciplinary
 *
 * Returns: { role, trends: [ {date, skills: [ {skill, count, percentage}, ... ]}, ... ] }
 */
router.get('/api/trends', async (req, res) => {
  try {
    const { role } = req.query;

    // Validate role parameter
    const validRoles = [
      'uiux',
      'product',
      'graphic',
      'experiential',
      'digital',
      'visual',
      'multidisciplinary'
    ];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid or missing role parameter',
        validRoles
      });
    }

    // Get data from past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allSkills = await prisma.skill.findMany({
      where: {
        role,
        date: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: { date: 'desc' }
    });

    if (allSkills.length === 0) {
      return res.status(404).json({
        error: `No data found for role: ${role} in past 30 days`
      });
    }

    // Group by date and get top 5 skills for each date
    const trendsByDate = {};
    allSkills.forEach((skill) => {
      const dateStr = skill.date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!trendsByDate[dateStr]) {
        trendsByDate[dateStr] = [];
      }

      trendsByDate[dateStr].push(skill);
    });

    // Transform to array and sort by date
    const trends = Object.entries(trendsByDate)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, skills]) => {
        // Sort by count and take top 5
        const topSkills = skills
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const totalCount = topSkills.reduce((sum, s) => sum + s.count, 0);

        return {
          date,
          skills: topSkills.map((skill) => ({
            skill: skill.skill,
            count: skill.count,
            percentage: totalCount > 0 ? Math.round((skill.count / totalCount) * 100) : 0
          }))
        };
      });

    res.json({
      role,
      days: 30,
      snapshots: trends.length,
      trends
    });
  } catch (error) {
    console.error('Error in /api/trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/scrape
 * Manually triggers a complete fetch → transform → save pipeline
 * For testing and development only (not exposed in production UI)
 *
 * Optional body:
 *   - roles: array of role IDs to fetch (e.g., ["uiux", "product"])
 *     if not provided, fetches all available roles based on current week rotation
 *
 * Returns: { success, message, rolesProcessed, timestamp }
 */
router.post('/api/scrape', async (req, res) => {
  try {
    const { roles } = req.body;

    console.log('🔔 Manual scrape triggered');
    if (roles) {
      console.log('   Requested roles:', roles);
    }

    // Run pipeline
    const result = await runPipeline(roles || null);

    if (result.success) {
      res.json({
        success: true,
        message: 'Scrape completed successfully',
        rolesProcessed: result.rolesProcessed,
        timestamp: result.timestamp.toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in /api/scrape:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/quota
 * Returns current API quota status
 */
router.get('/api/quota', async (req, res) => {
  try {
    const quota = await prisma.apiQuota.findFirst();

    if (!quota) {
      return res.status(404).json({
        error: 'Quota not initialized'
      });
    }

    res.json({
      requestsRemain: quota.requestsRemain,
      jobsRemain: quota.jobsRemain,
      requestsUsed: 25 - quota.requestsRemain,
      jobsUsed: 250 - quota.jobsRemain,
      lastUpdated: quota.lastUpdated.toISOString()
    });
  } catch (error) {
    console.error('Error in /api/quota:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
