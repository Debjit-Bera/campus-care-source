/* =========================================================
   CampusCare – student.js
   Student dashboard, report form, my complaints, complaint details.
   (complaint-details is shared with admins.)
   ========================================================= */

window.Pages = window.Pages || {};

/* ---------- reusable complaint card ---------- */
function complaintCard(c, opts) {
  opts = opts || {};
  const user = opts.user;
  const supported = user && c.supporters.indexOf(user.email) >= 0;
  const own = user && c.createdBy === user.email;
  return '<article class="c-card">' +
    '<div class="c-icon"><i data-lucide="' + UI.categoryIcon(c.category) + '"></i></div>' +
    '<div class="c-body">' +
      '<div class="c-top"><span class="c-id">' + UI.esc(c.id) + '</span>' + UI.statusBadge(c.status) + UI.priorityBadge(c.priority) + (own && opts.community ? '<span class="badge badge-own">Yours</span>' : '') + '</div>' +
      '<h3><a href="complaint-details.html?id=' + encodeURIComponent(c.id) + '">' + UI.esc(c.title) + '</a></h3>' +
      '<p class="c-desc">' + UI.esc(c.description) + '</p>' +
      '<div class="c-meta">' +
        '<span><i data-lucide="tag"></i>' + UI.esc(c.category) + '</span>' +
        '<span><i data-lucide="map-pin"></i>' + UI.esc(c.location) + '</span>' +
        '<span><i data-lucide="clock"></i>' + UI.timeAgo(c.createdAt) + '</span>' +
        '<span><i data-lucide="thumbs-up"></i>' + c.supporters.length + ' support</span>' +
      '</div>' +
    '</div>' +
    '<div class="c-actions">' +
      '<a class="btn btn-soft btn-sm" href="complaint-details.html?id=' + encodeURIComponent(c.id) + '">View</a>' +
      (opts.community && !own ? '<button class="btn ' + (supported ? 'btn-primary' : 'btn-outline') + ' btn-sm support-btn" data-id="' + c.id + '"><i data-lucide="thumbs-up"></i> ' + (supported ? 'Supported' : 'Me too') + '</button>' : '') +
    '</div>' +
  '</article>';
}

/* ---------- dashboard ---------- */
Pages['student-dashboard'] = function (user) {
  const mine = Store.complaints.byUser(user.email);
  const st = Store.complaints.stats(mine);
  document.getElementById('welcomeName').textContent = user.name.split(' ')[0];

  const cards = [
    ['Total Complaints', st.total, 'clipboard-list', 'blue'],
    ['Pending', st.pending, 'hourglass', 'amber'],
    ['In Progress', st.inProgress, 'wrench', 'indigo'],
    ['Resolved', st.resolved, 'check-circle-2', 'green']
  ];
  document.getElementById('statGrid').innerHTML = cards.map(c =>
    '<div class="stat-card"><div class="stat-icon ' + c[3] + '"><i data-lucide="' + c[2] + '"></i></div><div><span class="stat-num" data-count="' + c[1] + '">' + c[1] + '</span><span class="stat-label">' + c[0] + '</span></div></div>'
  ).join('');

  const rate = st.total ? Math.round(st.resolved / st.total * 100) : 0;
  document.getElementById('rateNum').textContent = rate + '%';
  document.getElementById('rateBar').style.width = rate + '%';
  document.getElementById('rateText').textContent = st.total
    ? st.resolved + ' of ' + st.total + ' of your complaints are resolved.'
    : 'File your first complaint to start tracking.';

  const recent = mine.slice(0, 4);
  document.getElementById('recentList').innerHTML = recent.length
    ? recent.map(c => complaintCard(c, { user })).join('')
    : UI.emptyState('inbox', 'No complaints yet', 'Report a campus problem and track it here.', '<a class="btn btn-primary" href="report.html">Report an issue</a>');

  // trending community issues
  const trending = Store.complaints.all().filter(c => c.status !== 'Resolved' && c.createdBy !== user.email)
    .sort((a, b) => b.supporters.length - a.supporters.length).slice(0, 3);
  document.getElementById('trendList').innerHTML = trending.length ? trending.map(c =>
    '<a class="mini-item" href="complaint-details.html?id=' + encodeURIComponent(c.id) + '"><div class="mini-icon"><i data-lucide="' + UI.categoryIcon(c.category) + '"></i></div><div><b>' + UI.esc(c.title) + '</b><small>' + c.supporters.length + ' students affected · ' + UI.esc(c.location) + '</small></div></a>'
  ).join('') : '<p class="muted">No open community issues right now.</p>';
};

/* ---------- report a complaint ---------- */
function compressImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

Pages.report = function (user) {
  const form = document.getElementById('reportForm');
  const f = id => document.getElementById(id);
  let imageData = '';

  // category chips
  f('category').innerHTML = '<option value="">Select a category</option>' + Store.CATEGORIES.map(c => '<option>' + c.name + '</option>').join('');

  // counters
  const desc = f('description'), counter = f('descCount');
  desc.addEventListener('input', () => { counter.textContent = desc.value.length + ' / 500'; });

  // image upload
  const drop = f('dropzone'), file = f('image'), preview = f('imgPreview');
  file.addEventListener('change', async () => {
    const fl = file.files[0];
    if (!fl) return;
    if (!/^image\//.test(fl.type)) { setFieldError(file, 'Please choose an image file.'); file.value = ''; return; }
    if (fl.size > 5 * 1024 * 1024) { setFieldError(file, 'Image must be under 5 MB.'); file.value = ''; return; }
    try {
      imageData = await compressImage(fl, 900);
      setFieldError(file, '');
      preview.innerHTML = '<img src="' + imageData + '" alt="Preview"><button type="button" class="icon-btn remove-img" aria-label="Remove image"><i data-lucide="x"></i></button>';
      preview.hidden = false; drop.hidden = true; UI.icons();
      preview.querySelector('.remove-img').addEventListener('click', () => { imageData = ''; file.value = ''; preview.hidden = true; drop.hidden = false; });
    } catch (e) { setFieldError(file, e.message); }
  });

  // similar complaints suggestions
  const sugg = f('similar');
  const showSimilar = UI.debounce(() => {
    const cat = f('category').value, words = f('title').value.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    if (!cat && !words.length) { sugg.hidden = true; return; }
    const hits = Store.complaints.all().filter(c => c.status !== 'Resolved' && c.createdBy !== user.email &&
      ((cat && c.category === cat) && (!words.length || words.some(w => (c.title + ' ' + c.location).toLowerCase().includes(w))) ||
       (!cat && words.some(w => c.title.toLowerCase().includes(w))))).slice(0, 3);
    if (!hits.length) { sugg.hidden = true; return; }
    sugg.hidden = false;
    sugg.innerHTML = '<div class="similar-head"><i data-lucide="lightbulb"></i><b>Is it one of these existing issues?</b></div>' + hits.map(c =>
      '<a class="mini-item" target="_blank" href="complaint-details.html?id=' + encodeURIComponent(c.id) + '"><div class="mini-icon"><i data-lucide="' + UI.categoryIcon(c.category) + '"></i></div><div><b>' + UI.esc(c.title) + '</b><small>' + UI.esc(c.id) + ' · ' + UI.esc(c.location) + ' · ' + c.supporters.length + ' support</small></div></a>'
    ).join('') + '<small class="muted">Open an issue and tap “Me too” instead of filing a duplicate.</small>';
    UI.icons();
  }, 300);
  f('title').addEventListener('input', showSimilar);
  f('category').addEventListener('change', showSimilar);

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    const check = (el, cond, msg) => { if (!cond) { setFieldError(el, msg); ok = false; } else setFieldError(el, ''); };
    const prio = form.querySelector('input[name="priority"]:checked');

    check(f('title'), f('title').value.trim().length >= 5 && f('title').value.trim().length <= 100, 'Title must be 5 to 100 characters.');
    check(f('category'), !!f('category').value, 'Please select a category.');
    check(f('location'), f('location').value.trim().length >= 3, 'Enter where the problem is (e.g. Block A – Room 101).');
    check(f('description'), f('description').value.trim().length >= 20 && f('description').value.trim().length <= 500, 'Description must be 20 to 500 characters.');
    const pg = f('priorityGroup');
    pg.classList.toggle('has-error', !prio);
    pg.querySelector('.error-text').textContent = prio ? '' : 'Please choose a priority.';
    if (!prio) ok = false;
    if (!ok) { const bad = form.querySelector('.has-error'); if (bad) bad.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

    const c = Store.complaints.add({
      title: f('title').value.trim(), category: f('category').value, location: f('location').value.trim(),
      description: f('description').value.trim(), priority: prio.value, image: imageData
    }, user);
    if (!c) { UI.toast('Could not save the complaint. Try a smaller image.', 'error'); return; }

    UI.flash('Complaint submitted. Your ID is ' + c.id);
    location.href = 'complaint-details.html?id=' + encodeURIComponent(c.id);
  });
};

/* ---------- my complaints + community ---------- */
Pages['my-complaints'] = function (user) {
  const state = { tab: 'mine', q: '', status: '', category: '', priority: '', sort: 'newest' };
  const listEl = document.getElementById('complaintList');
  const countEl = document.getElementById('resultCount');

  function render() {
    const base = state.tab === 'mine' ? Store.complaints.byUser(user.email) : Store.complaints.all();
    const rows = filterComplaints(base, state);
    countEl.textContent = rows.length + (rows.length === 1 ? ' complaint' : ' complaints');
    listEl.innerHTML = rows.length
      ? rows.map(c => complaintCard(c, { user, community: state.tab === 'community' })).join('')
      : UI.emptyState('search-x', 'No complaints found', state.tab === 'mine' && !base.length ? 'You have not reported anything yet.' : 'Try changing your search or filters.',
          state.tab === 'mine' && !base.length ? '<a class="btn btn-primary" href="report.html">Report an issue</a>' : '');
    UI.icons();
    document.querySelectorAll('#tabMine .tab-count').forEach(el => el.textContent = Store.complaints.byUser(user.email).length);
    document.querySelectorAll('#tabCommunity .tab-count').forEach(el => el.textContent = Store.complaints.all().length);
  }

  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active'); state.tab = t.dataset.tab; render();
  }));
  document.getElementById('search').addEventListener('input', UI.debounce(e => { state.q = e.target.value; render(); }, 150));
  ['status', 'category', 'priority', 'sort'].forEach(k => document.getElementById('f-' + k).addEventListener('change', e => { state[k] = e.target.value; render(); }));
  document.getElementById('clearFilters').addEventListener('click', () => {
    state.q = state.status = state.category = state.priority = ''; state.sort = 'newest';
    document.getElementById('search').value = '';
    ['status', 'category', 'priority'].forEach(k => document.getElementById('f-' + k).value = '');
    document.getElementById('f-sort').value = 'newest';
    render();
  });

  listEl.addEventListener('click', e => {
    const b = e.target.closest('.support-btn');
    if (!b) return;
    const res = Store.complaints.toggleSupport(b.dataset.id, user);
    if (!res.ok) { UI.toast(res.error, 'error'); return; }
    UI.toast(res.supported ? 'Thanks! Your support has been added.' : 'Support removed.', 'success');
    render();
  });

  if (new URLSearchParams(location.search).get('tab') === 'community') document.getElementById('tabCommunity').click();
  else render();
};

/* ---------- complaint details (student + admin) ---------- */
Pages['complaint-details'] = function (user) {
  const id = new URLSearchParams(location.search).get('id');
  const root = document.getElementById('detailRoot');
  const c = id ? Store.complaints.byId(id) : null;
  const isAdmin = user.role === 'admin';
  document.getElementById('backLink').setAttribute('href', isAdmin ? 'manage-complaints.html' : 'my-complaints.html');

  if (!c) {
    root.innerHTML = UI.emptyState('file-question', 'Complaint not found', 'The complaint ID may be wrong or the data was cleared.', '<a class="btn btn-primary" href="' + Auth.home(user.role) + '">Back to dashboard</a>');
    UI.icons(); return;
  }

  const own = c.createdBy === user.email;
  const showReporter = isAdmin || own;
  const steps = Store.STATUSES;
  const idx = steps.indexOf(c.status);

  function render() {
    const cur = Store.complaints.byId(id);
    const supported = cur.supporters.indexOf(user.email) >= 0;
    const idx = steps.indexOf(cur.status);
    root.innerHTML =
      '<div class="detail-grid">' +
        '<div class="col-main">' +
          '<section class="card">' +
            '<div class="detail-head"><div><span class="c-id">' + UI.esc(cur.id) + '</span><h2>' + UI.esc(cur.title) + '</h2></div><div class="badge-row">' + UI.statusBadge(cur.status) + UI.priorityBadge(cur.priority) + '</div></div>' +
            '<div class="progress-steps">' + steps.map((s, i) =>
              '<div class="step ' + (i < idx ? 'done' : '') + (i === idx ? ' current' : '') + '"><div class="step-dot">' + (i <= idx ? '<i data-lucide="check"></i>' : (i + 1)) + '</div><span>' + s + '</span></div>'
            ).join('<div class="step-line ' + '"></div>') + '</div>' +
            '<div class="info-grid">' +
              '<div><small>Category</small><b><i data-lucide="' + UI.categoryIcon(cur.category) + '"></i> ' + UI.esc(cur.category) + '</b></div>' +
              '<div><small>Location</small><b><i data-lucide="map-pin"></i> ' + UI.esc(cur.location) + '</b></div>' +
              '<div><small>Reported on</small><b><i data-lucide="calendar"></i> ' + UI.fmtDateTime(cur.createdAt) + '</b></div>' +
              '<div><small>Reported by</small><b><i data-lucide="user-round"></i> ' + (showReporter ? UI.esc(cur.createdByName) : 'A fellow student') + '</b></div>' +
              '<div><small>Last updated</small><b><i data-lucide="refresh-cw"></i> ' + UI.timeAgo(cur.updatedAt) + '</b></div>' +
              '<div><small>Students affected</small><b><i data-lucide="users"></i> ' + (cur.supporters.length + 1) + '</b></div>' +
            '</div>' +
            '<h4>Description</h4><p class="desc-text">' + UI.esc(cur.description).replace(/\n/g, '<br>') + '</p>' +
            (cur.image ? '<h4>Attached photo</h4><img class="detail-img" src="' + cur.image + '" alt="Complaint photo">' : '') +
            (!isAdmin && !own ? '<div class="support-row"><div><b>Facing the same problem?</b><small>Add your support so admins can prioritise it.</small></div><button class="btn ' + (supported ? 'btn-primary' : 'btn-outline') + '" id="supportBtn"><i data-lucide="thumbs-up"></i> ' + (supported ? 'Supported' : 'Me too') + ' · ' + cur.supporters.length + '</button></div>' : '') +
          '</section>' +
        '</div>' +
        '<div class="col-side">' +
          (isAdmin ? '<section class="card" id="adminPanel"><h3>Update complaint</h3>' +
            '<form id="updateForm" novalidate><div class="field"><label for="uStatus">Status</label><select id="uStatus" class="input">' + steps.map(s => '<option' + (s === cur.status ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>' +
            '<div class="field"><label for="uRemark">Remark / update</label><textarea id="uRemark" class="input" rows="3" maxlength="300" placeholder="Tell the student what is happening…"></textarea></div>' +
            '<button class="btn btn-primary btn-block" type="submit"><i data-lucide="save"></i> Save update</button></form></section>' : '') +
          '<section class="card"><h3>Status history</h3><ol class="timeline">' +
            cur.updates.slice().reverse().map(u =>
              '<li class="tl-' + UI.statusClass(u.status) + '"><span class="tl-dot"></span><div><div class="tl-top">' + UI.statusBadge(u.status) + '<small>' + UI.fmtDateTime(u.at) + '</small></div><p>' + UI.esc(u.remark) + '</p><small>by ' + UI.esc(u.by) + (u.role === 'admin' ? ' (Admin)' : '') + '</small></div></li>'
            ).join('') + '</ol></section>' +
        '</div>' +
      '</div>';
    UI.icons();

    const sb = document.getElementById('supportBtn');
    if (sb) sb.addEventListener('click', () => {
      const r = Store.complaints.toggleSupport(id, user);
      if (!r.ok) { UI.toast(r.error, 'error'); return; }
      UI.toast(r.supported ? 'Thanks! Your support has been added.' : 'Support removed.', 'success');
      render();
    });
    const uf = document.getElementById('updateForm');
    if (uf) uf.addEventListener('submit', e => {
      e.preventDefault();
      const res = Store.complaints.update(id, document.getElementById('uStatus').value, document.getElementById('uRemark').value, user);
      if (!res.ok) { UI.toast(res.error, 'error'); return; }
      UI.toast('Complaint updated and student notified.', 'success');
      render();
    });
  }
  render();
};
