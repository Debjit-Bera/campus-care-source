/* =========================================================
   CampusCare – storage.js
   All data lives in the browser's LocalStorage (demo only).
   ========================================================= */

const Store = (() => {
  const KEYS = {
    users: 'cc_users',
    complaints: 'cc_complaints',
    notifications: 'cc_notifications',
    session: 'cc_session',
    seeded: 'cc_seeded_v1'
  };

  const CATEGORIES = [
    { name: 'Electrical', icon: 'zap' },
    { name: 'Classroom Maintenance', icon: 'school' },
    { name: 'Water Supply', icon: 'droplets' },
    { name: 'Cleanliness', icon: 'sparkles' },
    { name: 'Internet/Wi-Fi', icon: 'wifi' },
    { name: 'Furniture', icon: 'armchair' },
    { name: 'Infrastructure', icon: 'building-2' },
    { name: 'Others', icon: 'more-horizontal' }
  ];
  const STATUSES = ['Pending', 'In Progress', 'Resolved'];
  const PRIORITIES = ['Low', 'Medium', 'High'];

  /* ---------- low level helpers ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('LocalStorage write failed', e);
      return false;
    }
  }

  /* ---------- seed demo data ---------- */
  function ago(days, hours) {
    return new Date(Date.now() - ((days || 0) * 24 + (hours || 0)) * 3600 * 1000).toISOString();
  }

  function seed() {
    if (read(KEYS.seeded, false)) return;

    const users = [
      { name: 'Demo Student', email: 'student@campuscare.demo', password: 'Student123', role: 'student', department: 'Computer Science', createdAt: ago(60) },
      { name: 'Campus Admin', email: 'admin@campuscare.demo', password: 'Admin123', role: 'admin', department: 'Facilities Office', createdAt: ago(90) },
      { name: 'Ananya Sharma', email: 'ananya@campuscare.demo', password: 'Student123', role: 'student', department: 'Electronics', createdAt: ago(45) },
      { name: 'Rohan Mehta', email: 'rohan@campuscare.demo', password: 'Student123', role: 'student', department: 'Mechanical', createdAt: ago(40) }
    ];

    const S = 'student@campuscare.demo', A = 'ananya@campuscare.demo', R = 'rohan@campuscare.demo';
    const sample = [
      { t: 'Ceiling fans not working in Room 204', c: 'Electrical', l: 'Block B – Room 204', d: 'Three of the four ceiling fans in Room 204 have stopped working. Classes become very uncomfortable in the afternoon heat.', p: 'High', u: S, n: 'Demo Student', age: [12, 0], st: 'Resolved', sup: [A, R],
        hist: [['In Progress', 'Electrician assigned. Inspection scheduled for tomorrow.', 11], ['Resolved', 'Capacitors replaced and all fans tested. Issue closed.', 8]] },
      { t: 'Water cooler leaking near library', c: 'Water Supply', l: 'Library – Ground Floor', d: 'The water cooler outside the library has been leaking for days. The floor is slippery and could cause accidents.', p: 'High', u: S, n: 'Demo Student', age: [6, 0], st: 'In Progress', sup: [A],
        hist: [['In Progress', 'Plumbing team has been informed. Replacement part ordered.', 5]] },
      { t: 'Wi-Fi extremely slow in hostel block C', c: 'Internet/Wi-Fi', l: 'Hostel Block C', d: 'Internet speed drops below 1 Mbps in the evenings, making online classes and assignment uploads nearly impossible.', p: 'Medium', u: A, n: 'Ananya Sharma', age: [4, 3], st: 'Pending', sup: [S, R], hist: [] },
      { t: 'Broken benches in the main canteen', c: 'Furniture', l: 'Main Canteen', d: 'Several benches have broken legs and loose planks. Students are at risk of injury while sitting.', p: 'Medium', u: R, n: 'Rohan Mehta', age: [3, 0], st: 'Pending', sup: [], hist: [] },
      { t: 'Washrooms not cleaned regularly', c: 'Cleanliness', l: 'Block A – 2nd Floor', d: 'The washrooms on the second floor are not cleaned on a daily basis. Soap dispensers are empty and the smell is unbearable.', p: 'High', u: A, n: 'Ananya Sharma', age: [2, 5], st: 'In Progress', sup: [S, R],
        hist: [['In Progress', 'Housekeeping supervisor notified. Cleaning schedule will be revised.', 1]] },
      { t: 'Projector flickering in Seminar Hall', c: 'Classroom Maintenance', l: 'Seminar Hall 1', d: 'The projector keeps flickering and shuts down mid-presentation. It disrupts every seminar and guest lecture.', p: 'Low', u: S, n: 'Demo Student', age: [1, 6], st: 'Pending', sup: [], hist: [] },
      { t: 'Street light not working near parking', c: 'Electrical', l: 'Main Parking Area', d: 'The street lights near the two-wheeler parking are off, so the area is very dark after 6 PM and feels unsafe.', p: 'Medium', u: R, n: 'Rohan Mehta', age: [0, 8], st: 'Pending', sup: [S], hist: [] },
      { t: 'Cracked floor tiles in corridor', c: 'Infrastructure', l: 'Admin Block Corridor', d: 'Several floor tiles are cracked and uneven near the admin block entrance, causing tripping hazards.', p: 'Low', u: A, n: 'Ananya Sharma', age: [9, 0], st: 'Resolved', sup: [], hist: [['In Progress', 'Contractor has measured the area.', 8], ['Resolved', 'Tiles replaced and polished.', 5]] }
    ];

    const complaints = sample.map((s, i) => {
      const created = ago(s.age[0], s.age[1]);
      const updates = [{ status: 'Pending', remark: 'Complaint submitted by student.', by: s.n, role: 'student', at: created }];
      s.hist.forEach(h => updates.push({ status: h[0], remark: h[1], by: 'Campus Admin', role: 'admin', at: ago(h[2], 0) }));
      return {
        id: 'CC-2026-' + String(i + 1).padStart(4, '0'),
        title: s.t, category: s.c, location: s.l, description: s.d, priority: s.p,
        image: '', status: s.st, createdBy: s.u, createdByName: s.n,
        createdAt: created, updatedAt: updates[updates.length - 1].at,
        supporters: s.sup, updates
      };
    });

    const notifications = [
      { id: 'n1', to: 'student@campuscare.demo', message: 'Your complaint CC-2026-0001 has been marked Resolved.', link: 'complaint-details.html?id=CC-2026-0001', read: false, at: ago(8) },
      { id: 'n2', to: 'student@campuscare.demo', message: 'Your complaint CC-2026-0002 is now In Progress.', link: 'complaint-details.html?id=CC-2026-0002', read: false, at: ago(5) },
      { id: 'n3', to: 'role:admin', message: 'New complaint CC-2026-0007 submitted: Street light not working near parking.', link: 'complaint-details.html?id=CC-2026-0007', read: false, at: ago(0, 8) }
    ];

    write(KEYS.users, users);
    write(KEYS.complaints, complaints);
    write(KEYS.notifications, notifications);
    write(KEYS.seeded, true);
  }

  function resetDemoData() {
    [KEYS.users, KEYS.complaints, KEYS.notifications, KEYS.seeded].forEach(k => localStorage.removeItem(k));
    seed();
  }

  /* ---------- users ---------- */
  const users = {
    all: () => read(KEYS.users, []),
    save: list => write(KEYS.users, list),
    find: email => users.all().find(u => u.email.toLowerCase() === String(email).trim().toLowerCase()),
    add(user) { const l = users.all(); l.push(user); return users.save(l); },
    update(email, patch) {
      const l = users.all();
      const i = l.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (i < 0) return false;
      l[i] = Object.assign({}, l[i], patch);
      return users.save(l);
    }
  };

  /* ---------- session ---------- */
  const session = {
    get: () => read(KEYS.session, null),
    set: user => write(KEYS.session, { email: user.email, name: user.name, role: user.role }),
    clear: () => localStorage.removeItem(KEYS.session)
  };

  /* ---------- notifications ---------- */
  const notifications = {
    all: () => read(KEYS.notifications, []),
    save: list => write(KEYS.notifications, list),
    add(to, message, link) {
      const l = notifications.all();
      l.unshift({ id: 'n' + Date.now() + Math.floor(Math.random() * 1000), to, message, link: link || '', read: false, at: new Date().toISOString() });
      notifications.save(l.slice(0, 200));
    },
    forUser(user) {
      return notifications.all().filter(n => n.to === user.email || (user.role === 'admin' && n.to === 'role:admin'));
    },
    markRead(id) {
      const l = notifications.all();
      const n = l.find(x => x.id === id);
      if (n) { n.read = true; notifications.save(l); }
    },
    markAllRead(user) {
      const l = notifications.all();
      l.forEach(n => { if (n.to === user.email || (user.role === 'admin' && n.to === 'role:admin')) n.read = true; });
      notifications.save(l);
    }
  };

  /* ---------- complaints ---------- */
  const complaints = {
    all: () => read(KEYS.complaints, []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    save: list => write(KEYS.complaints, list),
    byId: id => complaints.all().find(c => c.id === id),
    byUser: email => complaints.all().filter(c => c.createdBy === email),

    nextId() {
      const year = new Date().getFullYear();
      const nums = read(KEYS.complaints, []).map(c => parseInt(String(c.id).split('-')[2], 10) || 0);
      const next = (nums.length ? Math.max.apply(null, nums) : 0) + 1;
      return 'CC-' + year + '-' + String(next).padStart(4, '0');
    },

    add(data, user) {
      const now = new Date().toISOString();
      const c = {
        id: complaints.nextId(),
        title: data.title, category: data.category, location: data.location,
        description: data.description, priority: data.priority, image: data.image || '',
        status: 'Pending', createdBy: user.email, createdByName: user.name,
        createdAt: now, updatedAt: now, supporters: [],
        updates: [{ status: 'Pending', remark: 'Complaint submitted by student.', by: user.name, role: 'student', at: now }]
      };
      const list = read(KEYS.complaints, []);
      list.push(c);
      if (!complaints.save(list)) return null;
      notifications.add(user.email, 'Your complaint ' + c.id + ' was submitted successfully.', 'complaint-details.html?id=' + c.id);
      notifications.add('role:admin', 'New complaint ' + c.id + ' submitted: ' + c.title + '.', 'complaint-details.html?id=' + c.id);
      return c;
    },

    /* Admin updates status and/or adds a remark */
    update(id, status, remark, admin) {
      const list = read(KEYS.complaints, []);
      const c = list.find(x => x.id === id);
      if (!c) return { ok: false, error: 'Complaint not found.' };
      remark = (remark || '').trim();
      if (status === c.status && !remark) return { ok: false, error: 'Change the status or add a remark.' };
      const now = new Date().toISOString();
      const changed = status !== c.status;
      c.status = status;
      c.updatedAt = now;
      c.updates.push({ status, remark: remark || ('Status changed to ' + status + '.'), by: admin.name, role: 'admin', at: now });
      if (!complaints.save(list)) return { ok: false, error: 'Could not save. Storage may be full.' };
      const msg = changed
        ? 'Your complaint ' + id + ' is now ' + status + '.'
        : 'New remark added on your complaint ' + id + '.';
      notifications.add(c.createdBy, msg, 'complaint-details.html?id=' + id);
      return { ok: true, complaint: c };
    },

    toggleSupport(id, user) {
      const list = read(KEYS.complaints, []);
      const c = list.find(x => x.id === id);
      if (!c) return { ok: false, error: 'Complaint not found.' };
      if (c.createdBy === user.email) return { ok: false, error: 'You cannot support your own complaint.' };
      const i = c.supporters.indexOf(user.email);
      let supported;
      if (i >= 0) { c.supporters.splice(i, 1); supported = false; }
      else {
        c.supporters.push(user.email); supported = true;
        notifications.add(c.createdBy, user.name + ' reported the same problem on ' + id + '.', 'complaint-details.html?id=' + id);
      }
      complaints.save(list);
      return { ok: true, supported, count: c.supporters.length };
    },

    stats(list) {
      return {
        total: list.length,
        pending: list.filter(c => c.status === 'Pending').length,
        inProgress: list.filter(c => c.status === 'In Progress').length,
        resolved: list.filter(c => c.status === 'Resolved').length
      };
    }
  };

  seed();

  return { KEYS, CATEGORIES, STATUSES, PRIORITIES, users, session, notifications, complaints, resetDemoData, seed };
})();
