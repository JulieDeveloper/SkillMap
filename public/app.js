// SkillMap Frontend Application
// Fetches data from API endpoints and renders interactive charts

// Global state
let currentRole = 'uiux';
let currentType = 'all';
let skillsChart = null;
let trendsChart = null;
let quotaData = null;

const API_BASE = '/api';
const LOCAL_STORAGE_KEY = 'skillmap_gap_checker';

// ============================================================================
// API Fetch Functions
// ============================================================================

async function fetchSkills(role, type) {
  try {
    const res = await fetch(`${API_BASE}/skills?role=${role}&type=${type}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching skills:', error);
    return null;
  }
}

async function fetchTrends(role) {
  try {
    const res = await fetch(`${API_BASE}/trends?role=${role}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching trends:', error);
    return null;
  }
}

async function fetchQuota() {
  try {
    const res = await fetch(`${API_BASE}/quota`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching quota:', error);
    return null;
  }
}

// ============================================================================
// UI Update Functions
// ============================================================================

async function updateStats() {
  const skillsData = await fetchSkills(currentRole, currentType);

  if (skillsData) {
    // Update stats
    const totalJobs = skillsData.total || 0;
    const totalSkills = skillsData.skills?.length || 0;
    const lastUpdated = new Date(skillsData.date).toLocaleDateString();

    document.getElementById('stat-jobs').textContent = totalJobs;
    document.getElementById('stat-skills').textContent = totalSkills;
    document.getElementById('stat-refresh').textContent = lastUpdated;
    document.getElementById('timestamp').textContent = `Last updated: ${skillsData.date}`;
  }
}

async function renderSkillsChart() {
  const container = document.getElementById('skills-chart');
  const skillsData = await fetchSkills(currentRole, currentType);

  if (!skillsData || !skillsData.skills || skillsData.skills.length === 0) {
    container.innerHTML = '<p class="error">No skills data available</p>';
    return;
  }

  // Create horizontal bar chart
  const skills = skillsData.skills;
  const labels = skills.map((s) => s.skill);
  const data = skills.map((s) => s.percentage);

  // Destroy existing chart if it exists
  if (skillsChart) skillsChart.destroy();

  const canvas = document.createElement('canvas');
  container.innerHTML = '';
  container.appendChild(canvas);

  skillsChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Percentage (%)',
          data: data,
          backgroundColor: '#378ADD',
          borderColor: '#2a5fa3',
          borderWidth: 1
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.parsed.x + '%';
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function (value) {
              return value + '%';
            }
          }
        }
      }
    }
  });
}

async function renderTrendsChart() {
  const container = document.getElementById('trends-chart');
  const trendsData = await fetchTrends(currentRole);

  if (!trendsData || !trendsData.trends || trendsData.trends.length === 0) {
    container.innerHTML = '<p class="error">No trends data available</p>';
    return;
  }

  // Prepare data for line chart
  const trends = trendsData.trends;
  const dates = trends.map((t) => t.date);

  // Get all unique skills across all dates
  const allSkills = new Set();
  trends.forEach((t) => {
    t.skills.forEach((s) => allSkills.add(s.skill));
  });

  // Create dataset for each skill
  const datasets = Array.from(allSkills).map((skillName, index) => {
    const colors = [
      '#378ADD', // blue
      '#1D9E75', // teal
      '#E67E22', // orange
      '#9B59B6', // purple
      '#E74C3C'  // red
    ];
    const color = colors[index % colors.length];

    const data = trends.map((t) => {
      const skillData = t.skills.find((s) => s.skill === skillName);
      return skillData ? skillData.percentage : 0;
    });

    return {
      label: skillName,
      data: data,
      borderColor: color,
      backgroundColor: `${color}20`,
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    };
  });

  // Destroy existing chart if it exists
  if (trendsChart) trendsChart.destroy();

  const canvas = document.createElement('canvas');
  container.innerHTML = '';
  container.appendChild(canvas);

  trendsChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dates,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.dataset.label + ': ' + context.parsed.y + '%';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function (value) {
              return value + '%';
            }
          }
        }
      }
    }
  });
}

function renderGapChecker() {
  const skillsData = fetchSkills(currentRole, currentType).then((data) => {
    if (!data || !data.skills || data.skills.length === 0) {
      document.getElementById('gap-checker').innerHTML =
        '<p class="error">No skills data available</p>';
      return;
    }

    const container = document.getElementById('gap-checker');
    container.innerHTML = '';

    const skills = data.skills.slice(0, 10); // Top 10 skills
    const savedState = getSavedGapCheckerState(currentRole);

    const list = document.createElement('div');
    list.className = 'gap-list';

    skills.forEach((skill) => {
      const item = document.createElement('div');
      item.className = 'gap-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'gap-checkbox';
      checkbox.value = skill.skill;
      checkbox.checked = savedState[skill.skill] || false;
      checkbox.addEventListener('change', () => {
        updateGapScore();
        saveGapCheckerState();
      });

      const label = document.createElement('label');
      label.className = 'gap-label';
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(skill.skill));

      item.appendChild(label);
      list.appendChild(item);
    });

    container.appendChild(list);
    updateGapScore();
  });
}

function updateGapScore() {
  const checkboxes = document.querySelectorAll('.gap-checkbox');
  const checked = Array.from(checkboxes).filter((cb) => cb.checked).length;
  const total = checkboxes.length;
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

  document.getElementById('gap-score').innerHTML = `
    <strong>${checked} of ${total} skills covered (${percentage}%)</strong>
  `;
}

function getSavedGapCheckerState(role) {
  const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${role}`);
  return saved ? JSON.parse(saved) : {};
}

function saveGapCheckerState() {
  const checkboxes = document.querySelectorAll('.gap-checkbox');
  const state = {};

  checkboxes.forEach((cb) => {
    state[cb.value] = cb.checked;
  });

  localStorage.setItem(`${LOCAL_STORAGE_KEY}_${currentRole}`, JSON.stringify(state));
}

async function updateQuotaStatus() {
  const quota = await fetchQuota();
  if (quota) {
    const quotaInfo = `
      Requests: ${quota.requestsRemain}/25 remaining (${quota.requestsUsed} used) •
      Jobs: ${quota.jobsRemain}/250 remaining (${quota.jobsUsed} used) •
      Last updated: ${new Date(quota.lastUpdated).toLocaleString()}
    `;
    document.getElementById('quota-info').textContent = quotaInfo;
  }
}

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
  // Role selector
  document.getElementById('role-select').addEventListener('change', (e) => {
    currentRole = e.target.value;
    renderSkillsChart();
    renderTrendsChart();
    renderGapChecker();
    updateStats();
  });

  // Job type selector
  document.getElementById('type-select').addEventListener('change', (e) => {
    currentType = e.target.value;
    renderSkillsChart();
    updateStats();
  });

  // Tab buttons
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;

      // Update active button
      document.querySelectorAll('.tab-button').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');

      // Update active tab
      document.querySelectorAll('.tab-content').forEach((tab) => tab.classList.remove('active'));
      document.getElementById(`${tabName}-tab`).classList.add('active');

      // Render chart for this tab
      if (tabName === 'skills') {
        renderSkillsChart();
      } else if (tabName === 'trends') {
        renderTrendsChart();
      } else if (tabName === 'gap') {
        renderGapChecker();
      }
    });
  });
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('SkillMap frontend initializing...');

  setupEventListeners();

  // Load initial data
  await updateStats();
  await renderSkillsChart();
  await updateQuotaStatus();

  console.log('SkillMap frontend ready!');
});
