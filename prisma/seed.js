// seed.js — Seed MongoDB with 30 days of historical skill snapshots
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Base skill counts per role — these are the "peak" values
const SKILL_DATA = {
  uiux: [
    { skill: 'Figma',            count: 48, trend:  1   },
    { skill: 'User Research',    count: 42, trend:  0.5 },
    { skill: 'Prototyping',      count: 40, trend:  2   },
    { skill: 'Usability Testing',count: 38, trend: -0.5 },
    { skill: 'Design Systems',   count: 36, trend:  1.5 },
    { skill: 'Wireframing',      count: 34, trend: -1   },
    { skill: 'Accessibility',    count: 32, trend:  0.8 },
    { skill: 'Adobe XD',         count: 28, trend: -1.5 }
  ],
  product: [
    { skill: 'Figma',                        count: 46, trend:  1   },
    { skill: 'Design Systems',               count: 42, trend:  1.5 },
    { skill: 'Cross-functional Collaboration',count: 40, trend:  0.5 },
    { skill: 'Prototyping',                  count: 38, trend:  0.8 },
    { skill: 'Data-informed Design',         count: 36, trend:  2   },
    { skill: 'Accessibility',                count: 34, trend:  0.5 },
    { skill: 'User Research',                count: 32, trend: -0.5 },
    { skill: 'A/B Testing',                  count: 30, trend:  1   }
  ],
  graphic: [
    { skill: 'Adobe Illustrator', count: 44, trend:  0   },
    { skill: 'Typography',        count: 42, trend:  0.5 },
    { skill: 'Adobe Photoshop',   count: 40, trend: -0.5 },
    { skill: 'Brand Strategy',    count: 38, trend:  1.5 },
    { skill: 'Adobe InDesign',    count: 36, trend: -0.5 },
    { skill: 'Figma',             count: 32, trend:  2   },
    { skill: 'Layout Design',     count: 30, trend:  0.5 },
    { skill: 'Color Theory',      count: 28, trend: -0.5 }
  ],
  experiential: [
    { skill: 'Concept Development', count: 40, trend:  1   },
    { skill: 'User Journey Mapping',count: 38, trend:  0.5 },
    { skill: 'Prototyping',         count: 36, trend:  1.5 },
    { skill: 'Interaction Design',  count: 34, trend:  2   },
    { skill: 'Figma',               count: 32, trend:  1   },
    { skill: 'Adobe XD',            count: 30, trend: -1   },
    { skill: 'Spatial Design',      count: 28, trend:  0.5 },
    { skill: 'Wayfinding',          count: 26, trend: -0.5 }
  ],
  digital: [
    { skill: 'Figma',             count: 46, trend:  1   },
    { skill: 'Adobe XD',          count: 42, trend: -1   },
    { skill: 'HTML/CSS',          count: 38, trend:  0.5 },
    { skill: 'Responsive Design', count: 36, trend:  0.5 },
    { skill: 'Design Systems',    count: 34, trend:  1.5 },
    { skill: 'Accessibility',     count: 32, trend:  1   },
    { skill: 'UI Design',         count: 30, trend:  0   },
    { skill: 'Adobe Photoshop',   count: 28, trend: -0.5 }
  ],
  visual: [
    { skill: 'Adobe Illustrator', count: 44, trend:  0   },
    { skill: 'Adobe Photoshop',   count: 42, trend: -0.5 },
    { skill: 'Typography',        count: 40, trend:  0.5 },
    { skill: 'Color Theory',      count: 38, trend:  0.5 },
    { skill: 'Adobe InDesign',    count: 36, trend: -0.5 },
    { skill: 'Figma',             count: 34, trend:  1.5 },
    { skill: 'Branding',          count: 32, trend:  1   },
    { skill: 'Layout Design',     count: 30, trend:  0   }
  ],
  multidisciplinary: [
    { skill: 'Figma',                 count: 40, trend:  1   },
    { skill: 'Adobe Creative Suite',  count: 36, trend:  0   },
    { skill: 'Project Management',    count: 34, trend:  1.5 },
    { skill: 'Communication',         count: 32, trend:  0.5 },
    { skill: 'Collaboration',         count: 30, trend:  0.5 },
    { skill: 'Adaptability',          count: 28, trend:  1   },
    { skill: 'Problem-solving',       count: 26, trend:  0.8 },
    { skill: 'Cross-functional Skills',count: 24, trend:  0.5 }
  ]
};

/**
 * Return a date object for N days ago (midnight UTC)
 */
function getDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Add realistic daily noise to a count value.
 * Uses a deterministic offset (skill name + day) so re-seeding is consistent,
 * then overlays a slow linear trend defined per skill.
 */
function variedCount(baseCount, trend, daysAgo) {
  // Linear drift: trend is daily change rate; daysAgo=0 is today (peak),
  // daysAgo=29 is 30 days back (start of window)
  const driftFromPeak = trend * daysAgo * -1; // negative = past is lower

  // Deterministic noise: ±10% of base, cycles every ~7 days
  const noise = Math.sin(daysAgo * 1.1) * baseCount * 0.08;

  const raw = Math.round(baseCount + driftFromPeak + noise);
  return Math.max(1, raw); // never below 1
}

async function main() {
  console.log('🌱 Starting seed — 30-day historical snapshots\n');

  // Wipe existing data
  await prisma.skill.deleteMany({});
  await prisma.apiQuota.deleteMany({});
  console.log('🗑️  Cleared existing records\n');

  const jobTypes = ['fulltime', 'parttime', 'contract', 'internship', 'all'];
  const DAYS = 30;
  let total = 0;

  for (let day = DAYS; day >= 0; day--) {
    const snapshotDate = getDaysAgo(day);

    for (const [roleId, skills] of Object.entries(SKILL_DATA)) {
      for (const jobType of jobTypes) {
        for (const skillData of skills) {
          // Multipliers for each job type (relative to fulltime baseline)
          const multipliers = { fulltime: 1.0, parttime: 0.7, contract: 0.6, internship: 0.4, all: 2.7 };
          const m = multipliers[jobType];

          const adjustedCount = Math.max(1, Math.round(
            variedCount(skillData.count, skillData.trend, day) * m
          ));
          const totalForType = jobType === 'all' ? 200 : Math.round(50 * m);

          await prisma.skill.create({
            data: {
              role:    roleId,
              skill:   skillData.skill,
              count:   adjustedCount,
              total:   totalForType,
              jobType: jobType,
              date:    snapshotDate
            }
          });
          total++;
        }
      }
    }

    if (day % 5 === 0) {
      console.log(`  ✓ Day -${day} seeded (${snapshotDate.toISOString().split('T')[0]})`);
    }
  }

  console.log(`\n✓ ${total} skill records created (${DAYS + 1} days × 7 roles × 8 skills × 5 job types)\n`);

  // Initialise API quota tracker
  await prisma.apiQuota.create({
    data: { requestsRemain: 25, jobsRemain: 250, lastUpdated: new Date() }
  });
  console.log('✓ API quota initialised\n');
  console.log('✅ Seed complete!');
}

main()
  .catch(err => { console.error('❌ Seed failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
