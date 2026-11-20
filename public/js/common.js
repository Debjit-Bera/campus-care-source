/* =========================================================
   CampusCare – common.js
   Shared UI helpers, app shell (sidebar + top bar), page boot.
   ========================================================= */

window.Pages = window.Pages || {};

const UI = {
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },
  fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },
  fmtDateTime(iso) {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' day' + (Math.floor(s / 86400) > 1 ? 's' : '') + ' ago';
    return UI.fmtDate(iso);
  },
  statusClass: s => ({ 'Pending': 'pending', 'In Progress': 'progress', 'Resolved': 'resolved' }[s] || 'pending'),
  statusBadge(s) {
    return '<span class="badge badge-' + UI.statusClass(s) + '"><span class="dot"></span>' + UI.esc(s) + '</span>';
  },
  priorityBadge(p) {
    return '<span class="badge badge-pr-' + String(p).toLowerCase() + '">' + UI.esc(p) + '</span>';
  },
  categoryIcon(name) {
    const c = Store.CATEGORIES.find(x => x.name === name);
    return c ? c.icon : 'more-horizontal';
  },
  icons() { if (window.lucide) lucide.createIcons(); },

  toast(message, type) {
    let wrap = document.getElementById('toastWrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toastWrap'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    const icon = type === 'error' ? 'alert-circle' : type === 'success' ? 'check-circle-2' : 'info';
    t.innerHTML = '<i data-lucide="' + icon + '"></i><span>' + UI.esc(message) + '</span>';
    wrap.appendChild(t);
    UI.icons();
    setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 300); }, 3500);
  },
  /* show a toast on the NEXT page load */
  flash(message, type) {
    try { sessionStorage.setItem('cc_flash', JSON.stringify({ message, type: type || 'success' })); } catch (e) { /* ignore */ }
  },
  showFlash() {
    try {
      const raw = sessionStorage.getItem('cc_flash');
      if (!raw) return;
      sessionStorage.removeItem('cc_flash');
      const f = JSON.parse(raw);
      UI.toast(f.message, f.type);
    } catch (e) { /* ignore */ }
  },

  emptyState(icon, title, text, actionHtml) {
    return '<div class="empty"><div class="empty-icon"><i data-lucide="' + icon + '"></i></div><h3>' + UI.esc(title) + '</h3><p>' + UI.esc(text) + '</p>' + (actionHtml || '') + '</div>';
  },

  openModal(id) { const m = document.getElementById(id); if (m) { m.classList.add('open'); document.body.classList.add('no-scroll'); } },
  closeModal(id) { const m = document.getElementById(id); if (m) { m.classList.remove('open'); document.body.classList.remove('no-scroll'); } },

  /* debounce for search boxes */
  debounce(fn, ms) { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms || 200); }; }
};

/* ---------- filtering shared by student + admin lists ---------- */
function filterComplaints(list, f) {
  const q = (f.q || '').trim().toLowerCase();
  let out = list.filter(c => {
    if (q && !(c.id + ' ' + c.title + ' ' + c.location + ' ' + c.description + ' ' + c.category).toLowerCase().includes(q)) return false;
    if (f.status && c.status !== f.status) return false;
    if (f.category && c.category !== f.category) return false;
    if (f.priority && c.priority !== f.priority) return false;
    return true;
  });
  const rank = { High: 3, Medium: 2, Low: 1 };
  switch (f.sort) {
    case 'oldest': out.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case 'priority': out.sort((a, b) => rank[b.priority] - rank[a.priority] || new Date(b.createdAt) - new Date(a.createdAt)); break;
    case 'supported': out.sort((a, b) => b.supporters.length - a.supporters.length); break;
    default: out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return out;
}

/* fill <select> elements that have data-fill="categories|statuses|priorities" */
function fillSelects() {
  document.querySelectorAll('select[data-fill]').forEach(sel => {
    const kind = sel.dataset.fill;
    const items = kind === 'categories' ? Store.CATEGORIES.map(c => c.name) : kind === 'statuses' ? Store.STATUSES : Store.PRIORITIES;
    const keepFirst = sel.querySelector('option[value=""]');
    sel.innerHTML = '';
    if (keepFirst) sel.appendChild(keepFirst);
    items.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
  });
}

/* ---------- app shell ---------- */
function currentPageName() {
  return (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
}

function buildShell(user) {
  const isAdmin = user.role === 'admin';
  const nav = isAdmin
    ? [['admin-dashboard', 'layout-dashboard', 'Dashboard'], ['manage-complaints', 'clipboard-list', 'Manage Complaints'], ['profile', 'user-round', 'Profile']]
    : [['student-dashboard', 'layout-dashboard', 'Dashboard'], ['report', 'plus-circle', 'Report Issue'], ['my-complaints', 'list-checks', 'My Complaints'], ['profile', 'user-round', 'Profile']];
  const here = currentPageName();
  const active = here === 'complaint-details' ? (isAdmin ? 'manage-complaints' : 'my-complaints') : here;

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.innerHTML =
      '<a class="brand" href="' + Auth.home(user.role) + '"><img src="assets/logo.svg" alt="" width="34" height="34"><span>Campus<b>Care</b></span></a>' +
      '<div class="nav-label">' + (isAdmin ? 'Administration' : 'Student Portal') + '</div>' +
      '<nav class="nav">' + nav.map(n =>
        '<a href="' + n[0] + '.html" class="' + (active === n[0] ? 'active' : '') + '"><i data-lucide="' + n[1] + '"></i><span>' + n[2] + '</span></a>'
      ).join('') + '</nav>' +
      '<div class="sidebar-foot">' +
        '<div class="demo-note"><i data-lucide="database"></i><span>Demo mode: data is stored only in this browser.</span></div>' +
        '<button class="btn btn-ghost btn-block" id="sideLogout"><i data-lucide="log-out"></i> Log out</button>' +
      '</div>';
    document.getElementById('sideLogout').addEventListener('click', Auth.logout);
  }

  const top = document.getElementById('topbar');
  if (top) {
    top.innerHTML =
      '<button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu"><i data-lucide="menu"></i></button>' +
      '<div class="top-title"><h1>' + UI.esc(document.body.dataset.title || 'CampusCare') + '</h1></div>' +
      '<div class="top-actions">' +
        (isAdmin ? '' : '<a href="report.html" class="btn btn-primary btn-sm hide-sm"><i data-lucide="plus"></i> New Complaint</a>') +
        '<div class="notif">' +
          '<button class="icon-btn" id="notifBtn" aria-label="Notifications"><i data-lucide="bell"></i><span class="notif-count" id="notifCount" hidden>0</span></button>' +
          '<div class="notif-panel" id="notifPanel" hidden></div>' +
        '</div>' +
        '<a href="profile.html" class="user-chip" title="Profile"><span class="avatar">' + UI.esc(UI.initials(user.name)) + '</span><span class="user-meta hide-sm"><b>' + UI.esc(user.name) + '</b><small>' + (isAdmin ? 'Administrator' : 'Student') + '</small></span></a>' +
      '</div>';
  }

  // mobile drawer
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop'; backdrop.id = 'backdrop';
  document.body.appendChild(backdrop);
  const closeMenu = () => { document.body.classList.remove('menu-open'); };
  document.getElementById('menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  backdrop.addEventListener('click', closeMenu);
  sidebar.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });

  initNotifications(user);
}

function initNotifications(user) {
  const btn = document.getElementById('notifBtn');
  const panel = document.getElementById('notifPanel');
  const count = document.getElementById('notifCount');

  function render() {
    const list = Store.notifications.forUser(user);
    const unread = list.filter(n => !n.read).length;
    count.textContent = unread > 9 ? '9+' : unread;
    count.hidden = unread === 0;
    panel.innerHTML =
      '<div class="notif-head"><b>Notifications</b>' + (unread ? '<button class="link-btn" id="markAll">Mark all read</button>' : '') + '</div>' +
      '<div class="notif-list">' + (list.length ? list.slice(0, 12).map(n =>
        '<a class="notif-item ' + (n.read ? '' : 'unread') + '" href="' + UI.esc(n.link || '#') + '" data-id="' + n.id + '"><i data-lucide="bell-ring"></i><div><p>' + UI.esc(n.message) + '</p><small>' + UI.timeAgo(n.at) + '</small></div></a>'
      ).join('') : '<div class="notif-empty">You are all caught up.</div>') + '</div>';
    UI.icons();
    const mark = document.getElementById('markAll');
    if (mark) mark.addEventListener('click', e => { e.stopPropagation(); Store.notifications.markAllRead(user); render(); });
    panel.querySelectorAll('.notif-item').forEach(a => a.addEventListener('click', () => Store.notifications.markRead(a.dataset.id)));
  }

  btn.addEventListener('click', e => { e.stopPropagation(); panel.hidden = !panel.hidden; });
  document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target)) panel.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') panel.hidden = true; });
  render();
}

/* ---------- public pages: mobile nav + auth-aware buttons ---------- */
function initPublicNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.addEventListener('click', e => { if (e.target.closest('a')) links.classList.remove('open'); });
  }
  const user = Auth.current();
  const slot = document.getElementById('navAuth');
  if (slot && user) {
    slot.innerHTML = '<a class="btn btn-primary btn-sm" href="' + Auth.home(user.role) + '">Go to Dashboard</a>';
  }
  document.querySelectorAll('[data-cta-auth]').forEach(el => {
    if (user) { el.setAttribute('href', Auth.home(user.role)); el.textContent = 'Open your dashboard'; }
  });
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll); onScroll();
  }
}

/* close modals via data attributes */
function initModals() {
  document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', () => UI.closeModal(b.dataset.closeModal)));
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) UI.closeModal(m.id); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => UI.closeModal(m.id)); });
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.guard()) return;
  const user = Auth.current();
  fillSelects();
  if (user && document.getElementById('sidebar')) buildShell(user);
  initPublicNav();
  initModals();
  document.body.classList.add('ready');

  const page = document.body.dataset.page;
  if (page && Pages[page]) {
    try { Pages[page](user); } catch (err) { console.error(err); UI.toast('Something went wrong loading this page.', 'error'); }
  }
  UI.icons();
  UI.showFlash();
});
