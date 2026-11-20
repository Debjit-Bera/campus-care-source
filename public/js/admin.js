/* =========================================================
   CampusCare – admin.js
   Admin dashboard (Chart.js analytics) and complaint management.
   ========================================================= */

window.Pages = window.Pages || {};

const adminCharts = {};
function drawChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  if (!window.Chart) {
    canvas.parentElement.innerHTML = '<p class="muted center">Charts could not load (check your internet connection).</p>';
    return;
  }
  if (adminCharts[id]) adminCharts[id].destroy();
  adminCharts[id] = new Chart(canvas, config);
}

Pages['admin-dashboard'] = function (user) {
  const all = Store.complaints.all();
  const st = Store.complaints.stats(all);
  const highOpen = all.filter(c => c.priority === 'High' && c.status !== 'Resolved').length;
  const rate = st.total ? Math.round(st.resolved / st.total * 100) : 0;

  const cards = [
    ['Total Complaints', st.total, 'clipboard-list', 'blue'],
    ['Pending', st.pending, 'hourglass', 'amber'],
    ['In Progress', st.inProgress, 'wrench', 'indigo'],
    ['Resolved', st.resolved, 'check-circle-2', 'green'],
    ['High Priority Open', highOpen, 'flame', 'red'],
    ['Resolution Rate', rate + '%', 'trending-up', 'teal']
  ];
  document.getElementById('statGrid').innerHTML = cards.map(c =>
    '<div class="stat-card"><div class="stat-icon ' + c[3] + '"><i data-lucide="' + c[2] + '"></i></div><div><span class="stat-num">' + c[1] + '</span><span class="stat-label">' + c[0] + '</span></div></div>'
  ).join('');

  const BLUE = '#2563eb', AMBER = '#f59e0b', GREEN = '#10b981', INDIGO = '#6366f1', RED = '#ef4444', GRID = '#e2e8f0';
  if (window.Chart) Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

  drawChart('statusChart', {
    type: 'doughnut',
    data: { labels: Store.STATUSES, datasets: [{ data: [st.pending, st.inProgress, st.resolved], backgroundColor: [AMBER, BLUE, GREEN], borderWidth: 3, borderColor: '#fff' }] },
    options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } } }
  });

  const catCounts = Store.CATEGORIES.map(c => all.filter(x => x.category === c.name).length);
  drawChart('categoryChart', {
    type: 'bar',
    data: { labels: Store.CATEGORIES.map(c => c.name.replace('Classroom Maintenance', 'Classroom').replace('Internet/Wi-Fi', 'Wi-Fi')), datasets: [{ label: 'Complaints', data: catCounts, backgroundColor: BLUE, borderRadius: 8, maxBarThickness: 38 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: GRID } }, x: { grid: { display: false } } } }
  });

  // last 7 days trend
  const days = [], counts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    days.push(d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }));
    counts.push(all.filter(c => { const t = new Date(c.createdAt); return t >= d && t < next; }).length);
  }
  drawChart('trendChart', {
    type: 'line',
    data: { labels: days, datasets: [{ label: 'New complaints', data: counts, borderColor: INDIGO, backgroundColor: 'rgba(99,102,241,.12)', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderWidth: 2 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: GRID } }, x: { grid: { display: false } } } }
  });

  // priority breakdown
  drawChart('priorityChart', {
    type: 'bar',
    data: { labels: Store.PRIORITIES, datasets: [{ data: Store.PRIORITIES.map(p => all.filter(c => c.priority === p).length), backgroundColor: ['#94a3b8', AMBER, RED], borderRadius: 8, maxBarThickness: 46 }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: GRID } }, y: { grid: { display: false } } } }
  });

  // recent complaints table
  const recent = all.slice(0, 6);
  document.getElementById('recentBody').innerHTML = recent.map(c =>
    '<tr><td data-label="ID"><a class="c-id" href="complaint-details.html?id=' + encodeURIComponent(c.id) + '">' + UI.esc(c.id) + '</a></td><td data-label="Title" class="td-title">' + UI.esc(c.title) + '</td><td data-label="Category">' + UI.esc(c.category) + '</td><td data-label="Priority">' + UI.priorityBadge(c.priority) + '</td><td data-label="Status">' + UI.statusBadge(c.status) + '</td><td data-label="Reported" class="muted">' + UI.timeAgo(c.createdAt) + '</td></tr>'
  ).join('') || '<tr><td colspan="6" class="muted center">No complaints yet.</td></tr>';

  // most supported open issues
  const top = all.filter(c => c.status !== 'Resolved').sort((a, b) => b.supporters.length - a.supporters.length).slice(0, 4);
  document.getElementById('topList').innerHTML = top.length ? top.map(c =>
    '<a class="mini-item" href="complaint-details.html?id=' + encodeURIComponent(c.id) + '"><div class="mini-icon"><i data-lucide="' + UI.categoryIcon(c.category) + '"></i></div><div><b>' + UI.esc(c.title) + '</b><small>' + (c.supporters.length + 1) + ' students affected · ' + UI.esc(c.location) + '</small></div></a>'
  ).join('') : '<p class="muted">Nothing open. Great job!</p>';
};

Pages['manage-complaints'] = function (user) {
  const state = { q: '', status: '', category: '', priority: '', sort: 'newest' };
  const body = document.getElementById('manageBody');
  const countEl = document.getElementById('resultCount');
  let editingId = null;

  function summary() {
    const st = Store.complaints.stats(Store.complaints.all());
    document.getElementById('sumTotal').textContent = st.total;
    document.getElementById('sumPending').textContent = st.pending;
    document.getElementById('sumProgress').textContent = st.inProgress;
    document.getElementById('sumResolved').textContent = st.resolved;
  }

  let rows = [];
  function render() {
    rows = filterComplaints(Store.complaints.all(), state);
    countEl.textContent = rows.length + (rows.length === 1 ? ' complaint' : ' complaints');
    body.innerHTML = rows.length ? rows.map(c =>
      '<tr>' +
        '<td data-label="ID"><a class="c-id" href="complaint-details.html?id=' + encodeURIComponent(c.id) + '">' + UI.esc(c.id) + '</a></td>' +
        '<td data-label="Complaint" class="td-title"><b>' + UI.esc(c.title) + '</b><small>' + UI.esc(c.location) + ' · ' + UI.esc(c.createdByName) + '</small></td>' +
        '<td data-label="Category">' + UI.esc(c.category) + '</td>' +
        '<td data-label="Priority">' + UI.priorityBadge(c.priority) + '</td>' +
        '<td data-label="Support">' + c.supporters.length + '</td>' +
        '<td data-label="Status">' + UI.statusBadge(c.status) + '</td>' +
        '<td data-label="Date" class="muted">' + UI.fmtDate(c.createdAt) + '</td>' +
        '<td data-label="Actions" class="td-actions"><a class="btn btn-soft btn-sm" href="complaint-details.html?id=' + encodeURIComponent(c.id) + '">View</a><button class="btn btn-primary btn-sm" data-update="' + c.id + '">Update</button></td>' +
      '</tr>'
    ).join('') : '<tr><td colspan="8">' + UI.emptyState('search-x', 'No complaints match', 'Try adjusting your search or filters.') + '</td></tr>';
    UI.icons();
    summary();
  }

  document.getElementById('search').addEventListener('input', UI.debounce(e => { state.q = e.target.value; render(); }, 150));
  ['status', 'category', 'priority', 'sort'].forEach(k => document.getElementById('f-' + k).addEventListener('change', e => { state[k] = e.target.value; render(); }));
  document.getElementById('clearFilters').addEventListener('click', () => {
    state.q = state.status = state.category = state.priority = ''; state.sort = 'newest';
    document.getElementById('search').value = '';
    ['status', 'category', 'priority'].forEach(k => document.getElementById('f-' + k).value = '');
    document.getElementById('f-sort').value = 'newest';
    render();
  });

  // update modal
  body.addEventListener('click', e => {
    const b = e.target.closest('[data-update]');
    if (!b) return;
    const c = Store.complaints.byId(b.dataset.update);
    editingId = c.id;
    document.getElementById('mTitle').textContent = c.id + ' – ' + c.title;
    document.getElementById('mStatus').value = c.status;
    document.getElementById('mRemark').value = '';
    UI.openModal('updateModal');
  });
  document.getElementById('modalForm').addEventListener('submit', e => {
    e.preventDefault();
    const res = Store.complaints.update(editingId, document.getElementById('mStatus').value, document.getElementById('mRemark').value, user);
    if (!res.ok) { UI.toast(res.error, 'error'); return; }
    UI.closeModal('updateModal');
    UI.toast('Complaint updated and student notified.', 'success');
    render();
  });

  // CSV export of the currently filtered list
  document.getElementById('exportBtn').addEventListener('click', () => {
    if (!rows.length) { UI.toast('Nothing to export.', 'error'); return; }
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const head = ['ID', 'Title', 'Category', 'Location', 'Priority', 'Status', 'Reported By', 'Supporters', 'Created', 'Last Updated'];
    const lines = [head.join(',')].concat(rows.map(c => [c.id, c.title, c.category, c.location, c.priority, c.status, c.createdByName, c.supporters.length, c.createdAt, c.updatedAt].map(q).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'campuscare-complaints.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  });

  render();
};
