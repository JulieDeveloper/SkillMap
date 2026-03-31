// transform.js — Extract and normalize skills from job descriptions
// Handles keyword extraction, case normalization, and duplicate removal

/**
 * Skill keyword normalization map
 * Maps various forms (variations, abbreviations) to canonical labels
 */
const SKILL_NORMALIZATION = {
  // Adobe Creative Suite
  'adobe xd': 'Adobe XD',
  'xd': 'Adobe XD',
  'figma': 'Figma',
  'adobe illustrator': 'Adobe Illustrator',
  'illustrator': 'Adobe Illustrator',
  'ai': 'Adobe Illustrator', // Note: may conflict with "Artificial Intelligence", handle carefully
  'adobe indesign': 'Adobe InDesign',
  'indesign': 'Adobe InDesign',
  'adobe photoshop': 'Adobe Photoshop',
  'photoshop': 'Adobe Photoshop',
  'psd': 'Adobe Photoshop',
  'adobe lightroom': 'Adobe Lightroom',
  'lightroom': 'Adobe Lightroom',
  'after effects': 'After Effects',
  'ae': 'After Effects',
  'premiere pro': 'Premiere Pro',
  'premiere': 'Premiere Pro',

  // 3D & Motion
  'cinema 4d': 'Cinema 4D',
  'c4d': 'Cinema 4D',
  'blender': 'Blender',
  'lottie': 'Lottie',
  'maya': 'Autodesk Maya',
  'zbrush': 'ZBrush',

  // Programming & Web
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'html': 'HTML',
  'css': 'CSS',
  'html/css': 'HTML/CSS',
  'react': 'React',
  'vue': 'Vue.js',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'node.js': 'Node.js',
  'nodejs': 'Node.js',

  // Design Skills
  'user research': 'User Research',
  'research': 'User Research',
  'prototyping': 'Prototyping',
  'prototype': 'Prototyping',
  'usability testing': 'Usability Testing',
  'user testing': 'Usability Testing',
  'a/b testing': 'A/B Testing',
  'ab testing': 'A/B Testing',
  'design systems': 'Design Systems',
  'design system': 'Design Systems',
  'wireframing': 'Wireframing',
  'wireframe': 'Wireframing',
  'accessibility': 'Accessibility',
  'wcag': 'Accessibility',
  'responsive design': 'Responsive Design',
  'interaction design': 'Interaction Design',
  'ui design': 'UI Design',
  'ux design': 'UX Design',
  'visual design': 'Visual Design',
  'typography': 'Typography',
  'color theory': 'Color Theory',
  'brand strategy': 'Brand Strategy',
  'branding': 'Branding',
  'packaging design': 'Packaging Design',
  'print design': 'Print Design',
  'print production': 'Print Production',
  'layout design': 'Layout Design',
  'wayfinding': 'Wayfinding',
  'spatial design': 'Spatial Design',
  'concept development': 'Concept Development',
  'user journey mapping': 'User Journey Mapping',
  'user journey': 'User Journey Mapping',
  'cross-functional collaboration': 'Cross-functional Collaboration',
  'collaboration': 'Cross-functional Collaboration',
  'data-informed design': 'Data-informed Design',
  'data-driven design': 'Data-informed Design',
  'storyboarding': 'Storyboarding',
  '3d rendering': '3D Rendering',
  '3d modeling': '3D Modeling',
  '3d model': '3D Modeling',

  // Project & Process Skills
  'project management': 'Project Management',
  'communication': 'Communication',
  'problem-solving': 'Problem-solving',
  'time management': 'Time Management',
  'adaptability': 'Adaptability',
  'creative thinking': 'Creative Thinking',
  'critical thinking': 'Critical Thinking'
};

/**
 * Extract and normalize skills from a job description
 * @param {string} description - Job description text
 * @returns {Set} Set of normalized skill names (no duplicates)
 */
function extractSkills(description) {
  if (!description || typeof description !== 'string') {
    return new Set();
  }

  const skills = new Set();
  const textLower = description.toLowerCase();

  // Search for each skill in the normalization map
  for (const [variation, canonical] of Object.entries(SKILL_NORMALIZATION)) {
    // Use word boundaries to avoid partial matches where possible
    // Simple approach: look for the variation as a substring
    const regex = new RegExp(`\\b${variation}\\b`, 'gi');

    if (regex.test(textLower)) {
      skills.add(canonical);
    }
  }

  return skills;
}

/**
 * Transform raw job postings into structured skill data
 * @param {string} roleId - Role identifier (e.g., 'uiux')
 * @param {Array} jobs - Array of job posting objects from API
 * @returns {Object} Structured skill counts: { role, jobType, date, skills: Map }
 */
export function transformJobs(roleId, jobs) {
  if (!Array.isArray(jobs)) {
    return { role: roleId, skills: new Map(), totalJobs: 0 };
  }

  const skillCounts = new Map(); // Map of skill -> count
  const now = new Date();

  console.log(`🔍 Transforming ${jobs.length} postings for role: ${roleId}`);

  // Process each job posting
  jobs.forEach((job, index) => {
    // Extract skills from description or title
    const description = job.description || '';
    const title = job.title || '';
    const combined = `${title} ${description}`;

    const extractedSkills = extractSkills(combined);

    // Count each skill once per posting
    extractedSkills.forEach((skill) => {
      skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
    });

    if ((index + 1) % 10 === 0) {
      console.log(`  ✓ Processed ${index + 1}/${jobs.length} postings...`);
    }
  });

  console.log(`  ✓ Extracted ${skillCounts.size} unique skills`);

  return {
    role: roleId,
    totalJobs: jobs.length,
    date: now,
    skills: skillCounts
  };
}

/**
 * Batch transform results from multiple role fetches
 * @param {Array} fetchResults - Array of results from fetchJobs()
 * @returns {Array} Array of transformed skill data per role
 */
export function transformBatch(fetchResults) {
  console.log('\n📊 Starting batch transformation\n');

  const results = fetchResults
    .filter((result) => !result.error && result.jobs.length > 0)
    .map((result) => transformJobs(result.role, result.jobs));

  console.log(`\n✓ Batch transformation complete: ${results.length} roles processed\n`);

  return results;
}

/**
 * Get top N skills by frequency
 * @param {Map} skillCounts - Map of skill -> count
 * @param {number} topN - Number of top skills to return
 * @returns {Array} Array of [skill, count] sorted by count descending
 */
export function getTopSkills(skillCounts, topN = 10) {
  return Array.from(skillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

// CLI usage: test transformation on sample data
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('SkillMap Transform — Sample Test\n');

  const sampleJob = {
    title: 'Senior Product Designer',
    description: `
      We're looking for a Senior Product Designer to join our team.
      Required: Figma, User Research, Prototyping, Design Systems
      Nice to have: Adobe XD, Usability Testing, JavaScript basics
    `
  };

  const skills = extractSkills(`${sampleJob.title} ${sampleJob.description}`);
  console.log('Sample extracted skills:');
  skills.forEach((skill) => console.log(`  ✓ ${skill}`));

  const result = transformJobs('product', [sampleJob]);
  console.log(`\nTransform result for 1 job:`);
  console.log(`  Role: ${result.role}`);
  console.log(`  Total jobs: ${result.totalJobs}`);
  console.log(`  Unique skills: ${result.skills.size}`);
  console.log(`  Top 5 skills:`);
  getTopSkills(result.skills, 5).forEach(([skill, count]) => {
    console.log(`    ${skill}: ${count}`);
  });
}

export default transformJobs;
