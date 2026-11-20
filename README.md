# CampusCare – Smart Campus Issue Reporting & Resolution Tracking Platform

A hackathon prototype where students report campus problems (broken fans, leaking water coolers, slow Wi-Fi, unclean washrooms…) and administrators manage and resolve them transparently.

Built with **plain HTML5, CSS3 and Vanilla JavaScript**. There is no framework and no build step.

## Features

**Student**
- Register, log in, edit profile, change password
- Submit complaints: title, category, location, description, priority, optional photo
- Unique complaint ID (e.g. `CC-2026-0009`)
- Dashboard with live statistics and resolution progress
- Search, filter and sort complaints; open full details with status timeline and admin remarks
- "Me too" support on other students' complaints, with duplicate suggestions while reporting
- In-app notifications for submissions, status changes and remarks

**Admin**
- Dashboard with stats and Chart.js analytics (status, category, 7-day trend, priority)
- View, search, filter and sort all complaints
- Change status (Pending / In Progress / Resolved) and add remarks, from a table or a details page
- Export the filtered list to CSV

**General:** role-based navigation and page access checks, form validation, responsive layout (desktop, tablet, mobile), sample data preloaded.

## Demo credentials

| Role    | Email                     | Password   |
|---------|---------------------------|------------|
| Student | student@campuscare.demo   | Student123 |
| Admin   | admin@campuscare.demo     | Admin123   |

## Project structure

```
CampusCare/
├── index.html               Landing page
├── login.html, register.html
├── student-dashboard.html, report.html, my-complaints.html
├── complaint-details.html   (shared by students and admins)
├── admin-dashboard.html, manage-complaints.html
├── profile.html
├── css/style.css            Design system and components
├── css/responsive.css       Tablet and mobile layouts
├── js/storage.js            LocalStorage data layer and sample data
├── js/auth.js               Login, register, access guard, profile page
├── js/common.js             Shared UI helpers, sidebar, notifications
├── js/student.js            Student pages and complaint details
├── js/admin.js              Admin dashboard and management
├── assets/                  Logo and favicon
├── vercel.json              Vercel configuration
└── README.md
```

## Run locally

Open `index.html` in a browser, or serve the folder for a more realistic test:

```bash
npx serve .          # or: python -m http.server 3000
```

In VS Code you can also use the **Live Server** extension. An internet connection is needed for Google Fonts, Lucide icons and Chart.js (loaded from CDNs).

## Deploy to Vercel

**Option A – Dashboard (easiest)**
1. Push this folder to a GitHub repository (the `index.html` file must be at the repo root).
2. Go to vercel.com, choose **Add New → Project** and import the repository.
3. Framework Preset: **Other**. Leave Build Command and Output Directory empty, then click **Deploy**.

**Option B – CLI**
```bash
npm i -g vercel
cd CampusCare
vercel --prod
```

You can also drag and drop the folder at vercel.com/new. The homepage loads from the root URL.

## Important limitations

- **Demo-only authentication.** Users and passwords live in the browser's LocalStorage in plain text. This is *not* secure and must never be used in production.
- **No shared data.** Each browser and device has its own separate LocalStorage, so a complaint filed on one phone will not appear on the admin's laptop. A real deployment needs a backend and database (for example Firebase, Supabase or Node + MongoDB).
- Uploaded photos are compressed and stored in LocalStorage, which has a limit of about 5 MB in total.
- Clearing browser data erases everything. Use **Profile → Reset demo data** to restore the sample data.
- Notifications are in-app only (no email or SMS).

## Customising

- Colours and spacing: CSS variables at the top of `css/style.css`
- Categories, statuses and sample complaints: `js/storage.js`
- Admin accounts: add users with `role: 'admin'` in `js/storage.js`
