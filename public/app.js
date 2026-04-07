// SkillMap — V2 Frontend Application

// ── Global State ─────────────────────────────────────────────────────────────

let currentRole = 'uiux';
let currentType = 'all';
let currentView = 'market-demand';
let trendsChart  = null;
let currentSkillsData = null; // cache for bento + gap cross-reference

const API_BASE = '/api';
const LOCAL_STORAGE_KEY = 'skillmap_gap_checker';

// View metadata (title + subtitle per nav item)
const VIEW_META = {
  'market-demand': {
    title: 'Market Demand',
    subtitle: 'Real-time analysis of market demand and designer expertise.'
  },
  'skill-trend': {
    title: 'Skill Trend Over Time',
    subtitle: 'See how skill demand has shifted over the past 30 days.'
  },
  'gap-analysis': {
    title: 'Gap Analysis',
    subtitle: 'Check which in-demand skills you already have.'
  }
};

// Tier thresholds — percentage of postings a skill appears in
const TIER_HIGH   = 50; // ≥ 50%
const TIER_MEDIUM = 20; // 20–49%
// < 20% = low

// ── API Helpers ───────────────────────────────────────────────────────────────

async function fetchSkills(role, type) {
  try {
    const res = await fetch(`${API_BASE}/skills?role=${role}&type=${type}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('fetchSkills error:', err);
    return null;
  }
}

async function fetchTrends(role) {
  try {
    const res = await fetch(`${API_BASE}/trends?role=${role}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('fetchTrends error:', err);
    return null;
  }
}

// ── Tier Classification ───────────────────────────────────────────────────────

function getTier(percentage) {
  if (percentage >= TIER_HIGH)   return 'high';
  if (percentage >= TIER_MEDIUM) return 'medium';
  return 'low';
}

// ── Bento Cards ───────────────────────────────────────────────────────────────

function updateBentoTopSkill(skills) {
  const el = document.getElementById('bento-top-skill');
  el.textContent = skills && skills.length > 0 ? skills[0].skill : '—';
}

function updateBentoFastestGrowing(skills) {
  // Without multi-snapshot delta data we use the second-ranked skill as a
  // stand-in for "fastest growing" (consistent with seed data ordering).
  const el = document.getElementById('bento-fastest-growing');
  el.textContent = skills && skills.length > 1 ? skills[1].skill : '—';
}

function updateBentoYourMatch() {
  const checkboxes = document.querySelectorAll('.gap-checkbox');
  const el = document.getElementById('bento-your-match');
  if (checkboxes.length === 0) {
    el.textContent = '—';
    return;
  }
  const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
  const pct = Math.round((checked / checkboxes.length) * 100);
  el.textContent = `${pct}%`;
}

// ── Market Demand View ────────────────────────────────────────────────────────

async function renderMarketDemand() {
  const container = document.getElementById('skills-bars');
  const subtitle  = document.getElementById('market-demand-subtitle');

  const data = await fetchSkills(currentRole, currentType);
  currentSkillsData = data;

  if (!data || !data.skills || data.skills.length === 0) {
    container.innerHTML = '<p class="error">No skills data available.</p>';
    return;
  }

  const totalJobs = data.total || 0;
  if (subtitle) {
    subtitle.textContent = `Based on ${totalJobs.toLocaleString()} active job listings this month.`;
  }

  updateBentoTopSkill(data.skills);
  updateBentoFastestGrowing(data.skills);

  container.innerHTML = '';

  data.skills.forEach(skill => {
    // Use actual % of job postings if total is available, else fall back to
    // the relative percentage the API already computed.
    const pct = totalJobs > 0
      ? Math.round((skill.count / totalJobs) * 100)
      : skill.percentage;

    const tier = getTier(pct);

    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-row-header">
        <span class="bar-skill-name">${skill.skill}</span>
        <span class="bar-skill-caption">${skill.skill} appears in ${pct}% of postings</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill tier-${tier}" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

// ── Skill Trend Over Time View ────────────────────────────────────────────────

async function renderTrends() {
  const wrapper = document.getElementById('trends-chart-wrapper');
  const data = await fetchTrends(currentRole);

  if (!data || !data.trends || data.trends.length === 0) {
    wrapper.innerHTML = '<p class="error">No trends data available.</p>';
    return;
  }

  // Destroy existing chart
  if (trendsChart) {
    trendsChart.destroy();
    trendsChart = null;
  }

  const trends = data.trends;
  const dates  = trends.map(t => t.date);

  // Collect top 5 skills from the most recent snapshot
  const latestSkills = trends[trends.length - 1]?.skills || [];
  const topSkillNames = latestSkills.slice(0, 5).map(s => s.skill);

  // Palette aligned to design system — distinct but warm
  const palette = ['#2e2f2d', '#10b981', '#f59e0b', '#9b59b6', '#ef4444'];

  const datasets = topSkillNames.map((skillName, i) => {
    const color = palette[i % palette.length];
    const values = trends.map(t => {
      const s = t.skills.find(sk => sk.skill === skillName);
      return s ? s.percentage : 0;
    });
    return {
      label: skillName,
      data: values,
      borderColor: color,
      backgroundColor: `${color}18`,
      tension: 0.4,
      fill: false,
      pointRadius: 4,
      pointBackgroundColor: color,
      pointBorderColor: '#f7f6f3',
      pointBorderWidth: 2
    };
  });

  wrapper.innerHTML = '';
  const canvas = document.createElement('canvas');
  wrapper.appendChild(canvas);

  trendsChart = new Chart(canvas, {
    type: 'line',
    data: { labels: dates, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { family: 'Inter', size: 13, weight: '500' },
            color: '#2e2f2d',
            usePointStyle: true,
            pointStyleWidth: 10,
            boxHeight: 8,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: '#2e2f2d',
          titleFont: { family: 'Plus Jakarta Sans', size: 13, weight: '700' },
          bodyFont: { family: 'Inter', size: 13 },
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%`
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#e8e8e5', drawBorder: false },
          ticks: {
            font: { family: 'Inter', size: 12 },
            color: '#9a9a97',
            maxTicksLimit: 8
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: '#e8e8e5', drawBorder: false },
          ticks: {
            font: { family: 'Inter', size: 12 },
            color: '#9a9a97',
            callback: v => v + '%'
          }
        }
      }
    }
  });
}

// ── Gap Analysis View ─────────────────────────────────────────────────────────

async function renderGapChecker() {
  const checkerEl = document.getElementById('gap-checker');

  // Re-use cached data if available, otherwise fetch
  const data = currentSkillsData || await fetchSkills(currentRole, currentType);
  currentSkillsData = data;

  if (!data || !data.skills || data.skills.length === 0) {
    checkerEl.innerHTML = '<p class="error">No skills data available.</p>';
    return;
  }

  const savedState = getSavedState(currentRole);
  const totalJobs  = data.total || 0;

  checkerEl.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'gap-list';

  data.skills.forEach(skill => {
    const pct  = totalJobs > 0 ? Math.round((skill.count / totalJobs) * 100) : skill.percentage;
    const item = document.createElement('div');
    item.className = 'gap-item';

    const id       = `gap-skill-${skill.skill.replace(/\s+/g, '-')}`;
    const checkbox = document.createElement('input');
    checkbox.type      = 'checkbox';
    checkbox.className = 'gap-checkbox';
    checkbox.id        = id;
    checkbox.value     = skill.skill;
    checkbox.dataset.percentage = pct;
    checkbox.checked   = savedState[skill.skill] || false;

    checkbox.addEventListener('change', () => {
      updateGapScore();
      updateRecommendations(data.skills, data.total || 0);
      updateBentoYourMatch();
      saveState(currentRole);
    });

    const label = document.createElement('label');
    label.className  = 'gap-label';
    label.htmlFor    = id;
    label.textContent = skill.skill;
    label.prepend(checkbox);

    item.appendChild(label);
    list.appendChild(item);
  });

  checkerEl.appendChild(list);
  updateGapScore();
  updateRecommendations(data.skills, totalJobs);
  updateBentoYourMatch();
}

function updateGapScore() {
  const checkboxes = document.querySelectorAll('.gap-checkbox');
  const scoreEl    = document.getElementById('gap-score');
  if (!checkboxes.length) { scoreEl.textContent = ''; return; }

  const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
  const total   = checkboxes.length;
  const pct     = Math.round((checked / total) * 100);

  scoreEl.textContent = `${checked} of ${total} skills covered — ${pct}% match`;
}

function updateRecommendations(skills, totalJobs) {
  const recsEl     = document.getElementById('gap-recommendations');
  const checkboxes = document.querySelectorAll('.gap-checkbox');

  // Build a set of checked skill names
  const checked = new Set(
    Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value)
  );

  // Unchecked skills, ordered by in-demand (original sort order = count desc)
  const unchecked = skills.filter(s => !checked.has(s.skill));

  if (unchecked.length === 0) {
    recsEl.innerHTML = '<p class="gap-recs-empty">You have all the top skills for this role — great work.</p>';
    return;
  }

  recsEl.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'gap-recs-list';

  unchecked.forEach(skill => {
    const pct  = totalJobs > 0 ? Math.round((skill.count / totalJobs) * 100) : skill.percentage;
    const tier = getTier(pct);

    const item = document.createElement('div');
    item.className = 'rec-item';
    item.innerHTML = `
      <span class="rec-skill-name">${skill.skill}</span>
      <div class="rec-bar-track">
        <div class="rec-bar-fill tier-${tier}" style="width:${pct}%"></div>
      </div>
      <span class="rec-badge tier-${tier}">${tier}</span>
    `;
    list.appendChild(item);
  });

  recsEl.appendChild(list);
}

// ── LocalStorage ──────────────────────────────────────────────────────────────

function getSavedState(role) {
  const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${role}`);
  return saved ? JSON.parse(saved) : {};
}

function saveState(role) {
  const checkboxes = document.querySelectorAll('.gap-checkbox');
  const state = {};
  checkboxes.forEach(cb => { state[cb.value] = cb.checked; });
  localStorage.setItem(`${LOCAL_STORAGE_KEY}_${role}`, JSON.stringify(state));
}

// ── Navigation ────────────────────────────────────────────────────────────────

function switchView(viewId) {
  currentView = viewId;

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.view === viewId);
  });

  // Update view heading
  const meta = VIEW_META[viewId] || {};
  document.getElementById('view-title').textContent    = meta.title    || '';
  document.getElementById('view-subtitle').textContent = meta.subtitle || '';

  // Show/hide view panels
  document.querySelectorAll('.view-content').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById(`view-${viewId}`)?.classList.add('active');

  // Render content for the activated view
  if (viewId === 'market-demand')  renderMarketDemand();
  if (viewId === 'skill-trend')    renderTrends();
  if (viewId === 'gap-analysis')   renderGapChecker();
}

// ── Event Listeners ───────────────────────────────────────────────────────────

function setupListeners() {
  document.getElementById('role-select').addEventListener('change', e => {
    currentRole       = e.target.value;
    currentSkillsData = null; // invalidate cache on role change
    if (currentView === 'market-demand') renderMarketDemand();
    if (currentView === 'skill-trend')   renderTrends();
    if (currentView === 'gap-analysis')  renderGapChecker();
  });

  document.getElementById('type-select').addEventListener('change', e => {
    currentType       = e.target.value;
    currentSkillsData = null;
    if (currentView === 'market-demand') renderMarketDemand();
    if (currentView === 'gap-analysis')  renderGapChecker();
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  setupListeners();

  // Pre-load gap checker state so "Your Match" bento reflects stored data
  // without requiring the user to navigate there first.
  const savedData = await fetchSkills(currentRole, currentType);
  if (savedData?.skills) {
    currentSkillsData = savedData;
    updateBentoTopSkill(savedData.skills);
    updateBentoFastestGrowing(savedData.skills);

    // Temporarily inject hidden checkboxes to compute "Your Match"
    const savedState = getSavedState(currentRole);
    const total   = savedData.skills.length;
    const checked = savedData.skills.filter(s => savedState[s.skill]).length;
    const pct     = total > 0 ? Math.round((checked / total) * 100) : 0;
    document.getElementById('bento-your-match').textContent = `${pct}%`;
  }

  // Render initial view
  renderMarketDemand();
});
