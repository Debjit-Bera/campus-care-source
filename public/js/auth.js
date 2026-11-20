/* =========================================================
   CampusCare – auth.js
   DEMO AUTHENTICATION ONLY. Passwords are kept in LocalStorage
   in plain text. Never use this approach in a real product.
   ========================================================= */

window.Pages = window.Pages || {};

const Auth = {
  EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,

  current() {
    const s = Store.session.get();
    if (!s) return null;
    const u = Store.users.find(s.email);
    if (!u) { Store.session.clear(); return null; }
    return { email: u.email, name: u.name, role: u.role, department: u.department || '' };
  },

  home(role) {
    return role === 'admin' ? 'admin-dashboard.html' : 'student-dashboard.html';
  },

  login(email, password) {
    const u = Store.users.find(email);
    if (!u || u.password !== password) return { ok: false, error: 'Invalid email or password.' };
    Store.session.set(u);
    return { ok: true, user: u };
  },

  register(data) {
    if (Store.users.find(data.email)) return { ok: false, error: 'An account with this email already exists.' };
    const user = {
      name: data.name.trim(), email: data.email.trim().toLowerCase(), password: data.password,
      role: 'student', department: (data.department || '').trim(), createdAt: new Date().toISOString()
    };
    if (!Store.users.add(user)) return { ok: false, error: 'Could not save account. Storage may be full.' };
    Store.session.set(user);
    return { ok: true, user };
  },

  logout() {
    Store.session.clear();
    location.href = 'login.html';
  },

  /* Page access check. Pages declare data-role="student|admin|any" on <body>. */
  guard() {
    const need = document.body.dataset.role;
    if (!need) return true;
    const user = Auth.current();
    if (!user) {
      const page = location.pathname.split('/').pop() || 'index.html';
      location.replace('login.html?next=' + encodeURIComponent(page + location.search));
      return false;
    }
    if (need !== 'any' && need !== user.role) {
      location.replace(Auth.home(user.role));
      return false;
    }
    return true;
  },

  safeNext(next) {
    // only allow same-folder .html pages
    return next && /^[\w-]+\.html(\?[\w=&%-]*)?$/.test(next) ? next : null;
  }
};

/* ---------- field helpers for forms ---------- */
function setFieldError(input, message) {
  const group = input.closest('.field');
  if (!group) return;
  group.classList.toggle('has-error', !!message);
  let el = group.querySelector('.error-text');
  if (!el) { el = document.createElement('div'); el.className = 'error-text'; group.appendChild(el); }
  el.textContent = message || '';
}

function bindPasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePassword);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = '<i data-lucide="' + (show ? 'eye-off' : 'eye') + '"></i>';
      if (window.lucide) lucide.createIcons();
    });
  });
}

/* ---------- login page ---------- */
Pages.login = function () {
  const existing = Auth.current();
  if (existing) { location.replace(Auth.home(existing.role)); return; }

  const form = document.getElementById('loginForm');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const alertBox = document.getElementById('formAlert');
  bindPasswordToggles();

  document.querySelectorAll('[data-demo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const isAdmin = btn.dataset.demo === 'admin';
      email.value = isAdmin ? 'admin@campuscare.demo' : 'student@campuscare.demo';
      password.value = isAdmin ? 'Admin123' : 'Student123';
      setFieldError(email, ''); setFieldError(password, ''); alertBox.hidden = true;
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    alertBox.hidden = true;
    let ok = true;
    if (!Auth.EMAIL_RE.test(email.value.trim())) { setFieldError(email, 'Enter a valid email address.'); ok = false; } else setFieldError(email, '');
    if (!password.value) { setFieldError(password, 'Enter your password.'); ok = false; } else setFieldError(password, '');
    if (!ok) return;

    const res = Auth.login(email.value, password.value);
    if (!res.ok) { alertBox.textContent = res.error; alertBox.hidden = false; return; }
    const next = Auth.safeNext(new URLSearchParams(location.search).get('next'));
    const target = next && (res.user.role === 'admin' || !/^(admin|manage)/.test(next)) ? next : Auth.home(res.user.role);
    location.href = target;
  });
};

/* ---------- register page ---------- */
Pages.register = function () {
  const existing = Auth.current();
  if (existing) { location.replace(Auth.home(existing.role)); return; }

  const form = document.getElementById('registerForm');
  const f = id => document.getElementById(id);
  const alertBox = document.getElementById('formAlert');
  bindPasswordToggles();

  form.addEventListener('submit', e => {
    e.preventDefault();
    alertBox.hidden = true;
    let ok = true;
    const check = (input, cond, msg) => { if (!cond) { setFieldError(input, msg); ok = false; } else setFieldError(input, ''); };

    check(f('name'), f('name').value.trim().length >= 2, 'Enter your full name (min 2 characters).');
    check(f('email'), Auth.EMAIL_RE.test(f('email').value.trim()), 'Enter a valid email address.');
    check(f('password'), /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(f('password').value), 'Use at least 6 characters with a letter and a number.');
    check(f('confirm'), f('confirm').value === f('password').value && f('confirm').value !== '', 'Passwords do not match.');
    if (!ok) return;

    const res = Auth.register({ name: f('name').value, email: f('email').value, password: f('password').value, department: f('department').value });
    if (!res.ok) { alertBox.textContent = res.error; alertBox.hidden = false; return; }
    UI.flash('Welcome to CampusCare, ' + res.user.name.split(' ')[0] + '!');
    location.href = Auth.home('student');
  });
};

/* ---------- profile page (student + admin) ---------- */
Pages.profile = function () {
  const user = Auth.current();
  const stored = Store.users.find(user.email);
  const mine = user.role === 'admin' ? Store.complaints.all() : Store.complaints.byUser(user.email);
  const st = Store.complaints.stats(mine);

  document.getElementById('profAvatar').textContent = UI.initials(user.name);
  document.getElementById('profName').textContent = user.name;
  document.getElementById('profEmail').textContent = user.email;
  document.getElementById('profRole').textContent = user.role === 'admin' ? 'Administrator' : 'Student';
  document.getElementById('profSince').textContent = UI.fmtDate(stored.createdAt);
  document.getElementById('profTotal').textContent = st.total;
  document.getElementById('profResolved').textContent = st.resolved;
  document.getElementById('profTotalLabel').textContent = user.role === 'admin' ? 'Complaints managed' : 'Complaints filed';

  const nameIn = document.getElementById('editName');
  const deptIn = document.getElementById('editDept');
  nameIn.value = user.name; deptIn.value = stored.department || '';

  document.getElementById('profileForm').addEventListener('submit', e => {
    e.preventDefault();
    if (nameIn.value.trim().length < 2) { setFieldError(nameIn, 'Enter your full name (min 2 characters).'); return; }
    setFieldError(nameIn, '');
    Store.users.update(user.email, { name: nameIn.value.trim(), department: deptIn.value.trim() });
    Store.session.set(Store.users.find(user.email));
    UI.toast('Profile updated.', 'success');
    setTimeout(() => location.reload(), 600);
  });

  const cur = document.getElementById('curPass'), np = document.getElementById('newPass'), cp = document.getElementById('confPass');
  document.getElementById('passwordForm').addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    if (cur.value !== stored.password) { setFieldError(cur, 'Current password is incorrect.'); ok = false; } else setFieldError(cur, '');
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(np.value)) { setFieldError(np, 'Use at least 6 characters with a letter and a number.'); ok = false; } else setFieldError(np, '');
    if (cp.value !== np.value) { setFieldError(cp, 'Passwords do not match.'); ok = false; } else setFieldError(cp, '');
    if (!ok) return;
    Store.users.update(user.email, { password: np.value });
    e.target.reset();
    UI.toast('Password changed.', 'success');
  });

  document.getElementById('logoutBtn').addEventListener('click', Auth.logout);
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Reset all demo data in this browser? Your session will be cleared and sample data restored.')) {
      Store.session.clear();
      Store.resetDemoData();
      location.href = 'login.html';
    }
  });
};
