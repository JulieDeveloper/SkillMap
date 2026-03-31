// cron.js — Weekly rotating scheduler for API fetch
// Runs every Monday at midnight UTC
// Rotates through roles on a 4-week cycle to stay within API quota (25 requests/month)

import cron from 'node-cron';
import runPipeline from './pipeline.js';

/**
 * Define the 4-week rotation schedule
 * Each week fetches different roles to distribute quota usage
 */
const ROTATION_SCHEDULE = [
  {
    week: 1,
    roles: ['uiux', 'product'],
    label: 'UI/UX + Product Designer'
  },
  {
    week: 2,
    roles: ['graphic', 'experiential'],
    label: 'Graphic + Experiential Designer'
  },
  {
    week: 3,
    roles: ['digital', 'visual'],
    label: 'Digital + Visual Designer'
  },
  {
    week: 4,
    roles: ['multidisciplinary'],
    label: 'Multidisciplinary Designer'
  }
];

/**
 * Determine which roles to fetch this week
 * @returns {Object} Object with week number, roles array, and label
 */
function getScheduleForThisWeek() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Calculate week of month (1-4)
  // Day 1-7 = week 1, 8-14 = week 2, 15-21 = week 3, 22-31 = week 4
  const dayOfMonth = today.getDate();
  let weekOfMonth;

  if (dayOfMonth <= 7) {
    weekOfMonth = 1;
  } else if (dayOfMonth <= 14) {
    weekOfMonth = 2;
  } else if (dayOfMonth <= 21) {
    weekOfMonth = 3;
  } else {
    weekOfMonth = 4;
  }

  const schedule = ROTATION_SCHEDULE[weekOfMonth - 1];

  return {
    weekOfMonth,
    year,
    month: new Date(year, month).toLocaleString('default', { month: 'long' }),
    roles: schedule.roles,
    label: schedule.label
  };
}

/**
 * Cron job handler: run pipeline with roles for this week
 */
async function cronHandler() {
  console.log('\n' + '='.repeat(60));
  console.log('SkillMap Weekly Cron Job');
  console.log('='.repeat(60));
  console.log(`⏰ Triggered at: ${new Date().toISOString()}\n`);

  const schedule = getScheduleForThisWeek();

  console.log(`📅 Schedule for ${schedule.month} ${schedule.year}:`);
  console.log(`   Week ${schedule.weekOfMonth}: ${schedule.label}`);
  console.log(`   Roles: ${schedule.roles.join(', ')}`);
  console.log('');

  try {
    const result = await runPipeline(schedule.roles);

    if (result.success) {
      console.log('✓ Cron job completed successfully');
    } else {
      console.error('✗ Cron job failed:', result.error);
    }
  } catch (error) {
    console.error('✗ Cron job error:', error.message);
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Initialize the cron scheduler
 * Runs every Monday at 00:00 (midnight) UTC
 */
export function initCron() {
  console.log('🚀 Initializing SkillMap Cron Scheduler');
  console.log('   Schedule: Every Monday at 00:00 UTC');
  console.log('   Rotation: 4-week cycle, 2-3 roles per week');
  console.log('   Estimated quota usage: ~4-5 requests/month\n');

  // Schedule: every Monday at midnight (0 0 * * 1)
  // 0 = minute, 0 = hour, * = day, * = month, 1 = Monday
  const task = cron.schedule('0 0 * * 1', cronHandler, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('✓ Cron scheduler initialized\n');

  return task;
}

/**
 * Stop the cron scheduler (useful for testing/shutdown)
 */
export function stopCron(task) {
  if (task) {
    task.stop();
    console.log('✓ Cron scheduler stopped');
  }
}

/**
 * Manually trigger the cron job (for testing)
 */
export async function triggerCronManually() {
  console.log('🔔 Manually triggering cron job...');
  await cronHandler();
}

// CLI usage: start the cron scheduler
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\nSkillMap Cron Scheduler\n');

  const task = initCron();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down cron scheduler...');
    stopCron(task);
    process.exit(0);
  });

  // Keep the process alive
  console.log('Cron scheduler is running. Press Ctrl+C to stop.\n');
}

export default initCron;
