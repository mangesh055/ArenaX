# ⚡ ArenaX — College Tournament Management System

> VIT-exclusive tournament platform with team management, real-time leaderboards, and faculty oversight.

---

## 📸 Screenshots

**Home Page** — Netflix/Hotstar-style hero banner with horizontal scroll rows  
**Admin Panel** — Faculty dashboard with approvals, reports, and user management  
**Tournament Detail** — Tabbed detail page with registration modal  
**Leaderboard** — Podium + ranked table with live scores  

---

## 🚀 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, React Router 6, Axios, Tailwind CSS, Framer Motion |
| Backend | Flask, Flask Blueprints, SQLAlchemy |
| Auth | Clerk (restricted to @vit.edu) |
| Database | MySQL 8+ via SQLAlchemy ORM |
| Email | Flask-Mail / SMTP |
| Scheduler | APScheduler (team deadline checks every 5 min) |

---

## 📁 Project Structure

```
arenax/
├── frontend/                 # React 18 app
│   ├── src/
│   │   ├── api/              # Axios API client
│   │   ├── components/       # Navbar, TournamentCard
│   │   ├── context/          # AuthContext
│   │   ├── pages/            # All page components
│   │   └── App.jsx           # Router + providers
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                  # Flask API
│   ├── app.py                # App factory + entry point
│   ├── extensions.py         # db, mail, jwt instances
│   ├── models.py             # SQLAlchemy models
│   ├── blueprints/
│   │   ├── auth_routes.py    # /api/auth/*
│   │   ├── tournament_routes.py # /api/tournaments/*
│   │   ├── team_routes.py    # /api/teams/*
│   │   └── other_routes.py   # organizer, leaderboard, reports, admin
│   ├── middleware/
│   │   └── auth.py           # Clerk token verification + RBAC
│   └── utils/
│       └── scheduler.py      # APScheduler cron jobs
│
└── database/
    └── schema.sql            # Full MySQL schema + sample data
```

---

## ⚙️ Setup Guide

### 1. Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL 8.0+
- A Clerk account (https://clerk.com)

---

### 2. Database Setup

```bash
# Start MySQL and run:
mysql -u root -p < database/schema.sql
```

---

### 3. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy and configure env
cp .env.example .env
# Edit .env with your MySQL credentials, Clerk keys, SMTP settings

# Run the server
python app.py
# → Running on http://localhost:5000
```

#### Key .env variables:
```env
DATABASE_URL=mysql+pymysql://root:PASSWORD@localhost:3306/arenax
CLERK_SECRET_KEY=sk_test_...
MAIL_USERNAME=your_gmail@gmail.com
MAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:5173
```

---

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure env
cp .env.example .env
# Set VITE_CLERK_PUBLISHABLE_KEY

# Run dev server
npm run dev
# → Running on http://localhost:5173
```

---

### 5. Clerk Configuration

1. Create a Clerk app at https://dashboard.clerk.com
2. In **User & Authentication → Email, Phone, Username**, enable Email
3. In **Restrictions → Allowlist**, set allowed email pattern: `*@vit.edu`
4. Copy your Publishable Key → frontend `.env`
5. Copy your Secret Key → backend `.env`

In production, replace the mock login in `LoginPage.jsx` with Clerk's `<SignIn />` component.

---

## 🔐 Role System

| Role | Permissions |
|------|------------|
| **Student** | Browse tournaments, register as participant/team leader, invite members |
| **Organizer** | Create tournaments (after approval), manage their own tournaments, update leaderboard |
| **Faculty** | Full admin access: approve/reject everything, ban users, resolve reports |

---

## 📡 API Routes

### Auth
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/auth/me` | ✅ |
| POST | `/api/auth/sync` | ✅ |
| GET | `/api/auth/notifications` | ✅ |

### Tournaments
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/tournaments` | Public |
| GET | `/api/tournaments/:id` | Public |
| POST | `/api/tournaments` | Organizer+ |
| PUT | `/api/tournaments/:id` | Organizer+ |
| POST | `/api/tournaments/:id/approve` | Faculty |
| GET | `/api/tournaments/pending` | Faculty |
| GET | `/api/tournaments/my` | ✅ |

### Teams
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/teams` | ✅ |
| GET | `/api/teams/tournament/:id` | ✅ |
| GET | `/api/teams/invite/:token` | Public |
| POST | `/api/teams/invite/:token/respond` | ✅ |

### Organizer
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/organizer/apply` | ✅ |
| GET | `/api/organizer/status` | ✅ |
| GET | `/api/organizer/requests` | Faculty |
| POST | `/api/organizer/requests/:id/review` | Faculty |

### Leaderboard
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/leaderboard/:tid` | Public |
| POST | `/api/leaderboard/:tid` | Organizer+ |

### Reports
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/reports` | ✅ |
| GET | `/api/reports` | Faculty |
| POST | `/api/reports/:id/resolve` | Faculty |

### Admin
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/admin/stats` | Faculty |
| GET | `/api/admin/users` | Faculty |
| POST | `/api/admin/users/:id/ban` | Faculty |
| POST | `/api/admin/users/:id/unban` | Faculty |

---

## 🔄 Cron Jobs (APScheduler)

| Job | Interval | Action |
|-----|----------|--------|
| `check_team_deadlines` | Every 5 min | Drops teams with expired verification deadlines |
| `update_tournament_statuses` | Every 30 min | Auto-transitions Published→Ongoing→Completed |

---

## 🎨 UI Highlights

- **Dark theme** with `#080810` background and orange (`#f97316`) accent
- **Syne** display font + **DM Sans** body font
- **Netflix-style** horizontal scroll carousels on homepage
- **Framer Motion** page transitions and card animations
- **React Hot Toast** notifications (bottom-right, styled to match theme)
- Responsive from mobile → desktop

---

## 🚀 Production Deployment

### Backend (Gunicorn)
```bash
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

### Frontend (Vite build)
```bash
npm run build
# Serve /dist with Nginx or deploy to Vercel/Netlify
```

### Nginx config snippet
```nginx
server {
    location /api/ { proxy_pass http://localhost:5000; }
    location / { root /var/www/arenax/dist; try_files $uri /index.html; }
}
```

---

## 🔒 Security Notes

- All API endpoints validate input before DB operations
- Clerk JWT verified on every authenticated request
- Domain restriction enforced server-side (@vit.edu only)
- SQL injection prevented via SQLAlchemy ORM parameterized queries
- CORS restricted to frontend URL
- Users cannot join multiple teams in same tournament
- Duplicate team names blocked per tournament

---

## 📝 Sample Test Accounts (Dev Mode)

| User | Role | Mock Token |
|------|------|-----------|
| Dr. Rajesh Kumar | Faculty | `mock_faculty_001` |
| Priya Sharma | Organizer | `mock_org_001` |
| Kavya Reddy | Student | `mock_student_001` |

---

Built for VIT. Powered by ArenaX. ⚡
