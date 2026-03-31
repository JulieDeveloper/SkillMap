// pipeline.js — Orchestrate fetch → transform → save pipeline
// Coordinates: fetch jobs → extract skills → normalize → save to MongoDB

import { fetchJobs } from './fetch.js';
import { transformBatch, getTopSkills } from './transform.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Save transformed skills to MongoDB
 * @param {Array} transformedResults - Array of transformed skill data from transformBatch()
 */
async function saveSkillsToDatabase(transformedResults) {
  console.log('\n💾 Saving skills to MongoDB...\n');

  let totalSkillsCreated = 0;

  for (const result of transformedResults) {
    const { role, totalJobs, date, skills } = result;

    // Create Skill documents for each skill in this role
    // Note: For this implementation, we store top skills to avoid bloat
    const topSkills = getTopSkills(skills, 50); // Store top 50 skills

    for (const [skillName, count] of topSkills) {
      try {
        await prisma.skill.create({
          data: {
            role,
            skill: skillName,
            count,
            total: totalJobs,
            jobType: 'all', // TODO: separate by job type when API supports it
            date
          }
        });
        totalSkillsCreated++;
      } catch (error) {
        console.error(`Error saving skill ${skillName} for role ${role}:`, error.message);
      }
    }

    console.log(`  ✓ ${role}: saved ${Math.min(topSkills.length, 50)} skills`);
  }

  console.log(`\n✓ Total skill records created: ${totalSkillsCreated}\n`);
}

/**
 * Run the complete pipeline: fetch → transform → save
 * @param {Array<string>} roleIds - Optional array of specific role IDs to fetch
 */
export async function runPipeline(roleIds = null) {
  console.log('\n' + '='.repeat(60));
  console.log('SkillMap Data Pipeline');
  console.log('='.repeat(60));

  try {
    // Step 1: Fetch jobs from API
    console.log('\n📡 STEP 1: Fetching jobs from RapidAPI...');
    const fetchResults = await fetchJobs(roleIds);

    // Step 2: Transform (extract and normalize skills)
    console.log('\n🔍 STEP 2: Transforming job data...');
    const transformedResults = transformBatch(fetchResults);

    // Step 3: Save to database
    console.log('\n💾 STEP 3: Saving to MongoDB...');
    await saveSkillsToDatabase(transformedResults);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✓ Pipeline Complete');
    console.log('='.repeat(60));
    console.log(`  Roles processed: ${transformedResults.length}`);
    console.log(`  Timestamp: ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      rolesProcessed: transformedResults.length,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('\n❌ Pipeline Error:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * CLI usage: run the pipeline
 * node scripts/pipeline.js [roleIds...]
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const roleIds = process.argv.slice(2);

  runPipeline(roleIds.length > 0 ? roleIds : null)
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default runPipeline;
