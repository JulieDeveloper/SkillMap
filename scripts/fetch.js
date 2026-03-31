// fetch.js — RapidAPI Fantastic.jobs API fetcher with quota tracking
// Fetches job postings for design roles and updates API quota in MongoDB

import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';
import { ROLES, API_CONFIG, INITIAL_QUOTA } from './config.js';

const prisma = new PrismaClient();

/**
 * Fetch job postings from RapidAPI for a specific role
 * @param {Object} role - Role object from ROLES config
 * @returns {Promise<Array>} Array of job posting objects
 */
async function fetchJobsForRole(role) {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST;

  if (!apiKey || !apiHost) {
    throw new Error('Missing RAPIDAPI_KEY or RAPIDAPI_HOST in .env');
  }

  // Build query string with role and location filter
  const queryParams = new URLSearchParams({
    query: role.query,
    location: API_CONFIG.location,
    page: '1'
  });

  const url = `${API_CONFIG.baseUrl}?${queryParams}`;

  console.log(`📡 Fetching jobs for: ${role.label}...`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': apiHost
    }
  });

  if (!response.ok) {
    throw new Error(
      `RapidAPI error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  // Extract quota from response headers if available
  const quotaHeaderRequests = response.headers.get('x-ratelimit-requests-remaining');
  const quotaHeaderJobs = response.headers.get('x-ratelimit-jobs-remaining');

  // Log quota tracking info
  console.log(`  ✓ Fetched ${data.jobs?.length || 0} postings`);
  if (quotaHeaderRequests) {
    console.log(`  📊 Quota remaining: ${quotaHeaderRequests} requests, ${quotaHeaderJobs} jobs`);
  }

  return {
    role: role.id,
    roleLabel: role.label,
    jobs: data.jobs || [],
    quotaRequests: quotaHeaderRequests ? parseInt(quotaHeaderRequests) : null,
    quotaJobs: quotaHeaderJobs ? parseInt(quotaHeaderJobs) : null
  };
}

/**
 * Update API quota in MongoDB
 * @param {number} requestsRemain - Remaining API requests
 * @param {number} jobsRemain - Remaining job quota
 */
async function updateQuota(requestsRemain, jobsRemain) {
  // Delete old quota record and create new one
  await prisma.apiQuota.deleteMany({});
  const quota = await prisma.apiQuota.create({
    data: {
      requestsRemain,
      jobsRemain,
      lastUpdated: new Date()
    }
  });

  console.log(`\n📊 Quota Updated:`);
  console.log(`   Requests remaining: ${quota.requestsRemain}/25`);
  console.log(`   Jobs remaining: ${quota.jobsRemain}/250`);
  console.log(`   Last updated: ${quota.lastUpdated.toISOString()}\n`);
}

/**
 * Manually decrement quota if headers are not available
 * @param {number} rolesFetched - Number of roles fetched in this run
 * @returns {Promise<Object>} Updated quota object
 */
async function decrementQuota(rolesFetched) {
  const existingQuota = await prisma.apiQuota.findFirst();
  const currentQuota = existingQuota || {
    requestsRemain: INITIAL_QUOTA.requestsRemain,
    jobsRemain: INITIAL_QUOTA.jobsRemain
  };

  // Decrement requests by number of roles fetched
  const newRequestsRemain = Math.max(0, currentQuota.requestsRemain - rolesFetched);

  // For jobs, we'll estimate based on typical fetches (assume ~50 jobs per fetch)
  // This will be refined when we get actual counts from responses
  const newJobsRemain = Math.max(0, currentQuota.jobsRemain - (rolesFetched * 50));

  return {
    requestsRemain: newRequestsRemain,
    jobsRemain: newJobsRemain
  };
}

/**
 * Main fetch function: fetch jobs for specified roles with delay between requests
 * @param {Array<string>} roleIds - Array of role IDs to fetch (e.g., ['uiux', 'product'])
 * @returns {Promise<Array>} Array of fetch results per role
 */
export async function fetchJobs(roleIds = null) {
  const rolesToFetch = roleIds
    ? ROLES.filter((r) => roleIds.includes(r.id))
    : ROLES;

  console.log(`\n🚀 Starting API fetch for ${rolesToFetch.length} role(s)\n`);

  const results = [];

  // Fetch each role with delay between requests
  for (let i = 0; i < rolesToFetch.length; i++) {
    const role = rolesToFetch[i];

    try {
      const result = await fetchJobsForRole(role);
      results.push(result);

      // Add delay before next request (except on last request)
      if (i < rolesToFetch.length - 1) {
        console.log(`⏳ Waiting ${API_CONFIG.delayBetweenRequests}ms before next request...\n`);
        await new Promise((resolve) =>
          setTimeout(resolve, API_CONFIG.delayBetweenRequests)
        );
      }
    } catch (error) {
      console.error(`❌ Error fetching ${role.label}:`, error.message);
      results.push({
        role: role.id,
        roleLabel: role.label,
        error: error.message,
        jobs: []
      });
    }
  }

  // Determine quota from responses or decrement manually
  let quotaRequests = null;
  let quotaJobs = null;

  // Check if any result has quota info from headers
  const resultWithQuota = results.find((r) => r.quotaRequests !== null);
  if (resultWithQuota) {
    quotaRequests = resultWithQuota.quotaRequests;
    quotaJobs = resultWithQuota.quotaJobs;
  } else {
    // Manually decrement quota if headers weren't available
    const decremented = await decrementQuota(rolesToFetch.length);
    quotaRequests = decremented.requestsRemain;
    quotaJobs = decremented.jobsRemain;
  }

  // Update quota in MongoDB
  await updateQuota(quotaRequests, quotaJobs);

  return results;
}

/**
 * CLI usage: run fetch for specific roles
 * Example: node scripts/fetch.js uiux product
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const roleIds = process.argv.slice(2);

  console.log('SkillMap API Fetch — RapidAPI Fantastic.jobs\n');

  try {
    const results = await fetchJobs(roleIds.length > 0 ? roleIds : null);

    // Summary
    console.log('📋 Fetch Summary:');
    results.forEach((result) => {
      if (result.error) {
        console.log(`   ${result.roleLabel}: ❌ ${result.error}`);
      } else {
        console.log(`   ${result.roleLabel}: ✓ ${result.jobs.length} postings`);
      }
    });

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

export default fetchJobs;
