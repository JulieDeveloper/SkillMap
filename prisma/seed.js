// seed.js — Seed MongoDB with 14 days of historical skill snapshots
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Skill reference data for each role (from CLAUDE.md)
const SKILL_DATA = {
  uiux: [
    { skill: 'Figma', count: 48 },
    { skill: 'User Research', count: 42 },
    { skill: 'Prototyping', count: 40 },
    { skill: 'Usability Testing', count: 38 },
    { skill: 'Design Systems', count: 36 },
    { skill: 'Wireframing', count: 34 },
    { skill: 'Accessibility', count: 32 },
    { skill: 'Adobe XD', count: 28 }
  ],
  product: [
    { skill: 'Figma', count: 46 },
    { skill: 'Design Systems', count: 42 },
    { skill: 'Cross-functional Collaboration', count: 40 },
    { skill: 'Prototyping', count: 38 },
    { skill: 'Data-informed Design', count: 36 },
    { skill: 'Accessibility', count: 34 },
    { skill: 'User Research', count: 32 },
    { skill: 'A/B Testing', count: 30 }
  ],
  graphic: [
    { skill: 'Adobe Illustrator', count: 44 },
    { skill: 'Typography', count: 42 },
    { skill: 'Adobe Photoshop', count: 40 },
    { skill: 'Brand Strategy', count: 38 },
    { skill: 'Adobe InDesign', count: 36 },
    { skill: 'Figma', count: 32 },
    { skill: 'Layout Design', count: 30 },
    { skill: 'Color Theory', count: 28 }
  ],
  experiential: [
    { skill: 'Concept Development', count: 40 },
    { skill: 'User Journey Mapping', count: 38 },
    { skill: 'Prototyping', count: 36 },
    { skill: 'Interaction Design', count: 34 },
    { skill: 'Figma', count: 32 },
    { skill: 'Adobe XD', count: 30 },
    { skill: 'Spatial Design', count: 28 },
    { skill: 'Wayfinding', count: 26 }
  ],
  digital: [
    { skill: 'Figma', count: 46 },
    { skill: 'Adobe XD', count: 42 },
    { skill: 'HTML/CSS', count: 38 },
    { skill: 'Responsive Design', count: 36 },
    { skill: 'Design Systems', count: 34 },
    { skill: 'Accessibility', count: 32 },
    { skill: 'UI Design', count: 30 },
    { skill: 'Adobe Photoshop', count: 28 }
  ],
  visual: [
    { skill: 'Adobe Illustrator', count: 44 },
    { skill: 'Adobe Photoshop', count: 42 },
    { skill: 'Typography', count: 40 },
    { skill: 'Color Theory', count: 38 },
    { skill: 'Adobe InDesign', count: 36 },
    { skill: 'Figma', count: 34 },
    { skill: 'Branding', count: 32 },
    { skill: 'Layout Design', count: 30 }
  ],
  multidisciplinary: [
    { skill: 'Figma', count: 40 },
    { skill: 'Adobe Creative Suite', count: 36 },
    { skill: 'Project Management', count: 34 },
    { skill: 'Communication', count: 32 },
    { skill: 'Collaboration', count: 30 },
    { skill: 'Adaptability', count: 28 },
    { skill: 'Problem-solving', count: 26 },
    { skill: 'Cross-functional Skills', count: 24 }
  ]
};

/**
 * Generate a date string for N days ago
 */
function getDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Seed the database with historical snapshots
 */
async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.skill.deleteMany({});
    await prisma.apiQuota.deleteMany({});

    // Generate 14 days of historical snapshots
    console.log('📊 Creating 14-day historical snapshots...\n');

    let totalSkillsCreated = 0;

    // For each day in the past 14 days
    for (let day = 14; day >= 0; day--) {
      const snapshotDate = getDaysAgo(day);
      const dayLabel = new Date(snapshotDate).toLocaleDateString();

      // For each role
      for (const [roleId, skills] of Object.entries(SKILL_DATA)) {
        // Create skill records for this role on this day
        for (const skillData of skills) {
          await prisma.skill.create({
            data: {
              role: roleId,
              skill: skillData.skill,
              count: skillData.count, // Same counts for all days (simulates stable trends)
              total: 50, // Assume 50 jobs fetched per snapshot
              jobType: 'all',
              date: snapshotDate
            }
          });
          totalSkillsCreated++;
        }

        // Progress indicator
        if (day % 3 === 0) {
          console.log(`  ✓ ${dayLabel}: ${roleId}`);
        }
      }
    }

    console.log(
      `\n✓ Created ${totalSkillsCreated} skill records (14 days × 7 roles × 8 skills)\n`
    );

    // Initialize API quota
    console.log('📊 Initializing API quota...');
    await prisma.apiQuota.create({
      data: {
        requestsRemain: 25,
        jobsRemain: 250,
        lastUpdated: new Date()
      }
    });

    console.log('✓ API quota initialized: 25 requests, 250 jobs\n');

    console.log('✅ Seed completed successfully!\n');
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
