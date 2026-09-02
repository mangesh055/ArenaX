# ArenaX Project Documentation

## 1. Project Overview

ArenaX is a full-stack tournament and sports-room management platform designed for VIT domain users. It supports role-based workflows for students, organizers, faculty, and sports authority staff.

Core product capabilities:
- User authentication and profile sync
- Organizer application and approval system
- Tournament creation and faculty approval
- Team registration with email invitations
- Team approval/rejection by tournament owners
- Leaderboard management
- Reporting and moderation workflows
- Admin dashboard (stats, bans, student analytics)
- Sport room check-in/check-out tracking
- Notification system

Tech stack:
- Frontend: React 18, React Router, Axios, Tailwind CSS, Framer Motion, Vite
- Backend: Flask, SQLAlchemy, Flask-Mail, APScheduler, Clerk token verification
- Database: MySQL (schema-first SQL and ORM models)

---

## 2. High-Level Architecture

### 2.1 System Layers

1. Presentation Layer (frontend)
- React SPA under `frontend/src`
- Page-driven routing with protected routes
- Context-driven auth state (`AuthContext`)

2. API Layer (backend)
- Flask app with modular Blueprints
- Middleware decorators for authentication and role-based authorization
- Domain modules for auth, tournament, team, organizer, reports, admin, and sports

3. Persistence Layer (database)
- SQLAlchemy ORM models in `backend/models.py`
- MySQL schema and migration scripts in `database/`
- Relational model with FK constraints, enum states, and indexes

### 2.2 Backend Module Architecture

Backend is organized by Blueprints:
- `auth_routes`: profile and notifications
- `tournament_routes`: tournament lifecycle and approvals
- `team_routes`: team registration, invitations, approvals
- `other_routes`: organizer workflows, leaderboard, reports, admin
- `sport_routes`: sports room entry operations

Shared infrastructure:
- `extensions.py`: `db`, `mail`, and JWT extension objects
- `middleware/auth.py`: token verification and role guards
- `utils/scheduler.py`: periodic background jobs

### 2.3 Request/Authorization/Data Flow

1. Frontend sends request to `/api/*`
2. Vite proxy forwards to Flask server
3. Auth middleware validates token and user domain
4. Role guard checks required role (if route-protected)
5. Route handler validates payload/business rules
6. ORM reads/writes DB and commits transaction
7. Response returned to frontend; UI updates state

---

## 3. Detailed Feature Workflows

## 3.1 Authentication and User Sync

Actors: student/organizer/faculty/sport_authority

Flow:
1. User logs in (currently supports mock token flow for local development, Clerk flow scaffolding exists).
2. Frontend stores token and triggers `authAPI.getMe()`.
3. Backend `require_auth` verifies token and synchronizes user into DB if needed.
4. User data is returned and stored in `AuthContext`.
5. User can update profile using `authAPI.syncUser()`.

Important logic:
- Email domain restricted to `@vit.edu`
- Banned users are blocked with 403
- Notifications can be read and marked read

## 3.2 Organizer Approval Workflow

Actors: student -> faculty

Flow:
1. Student submits organizer application via `/api/organizer/apply`.
2. Faculty reviews pending applications via `/api/organizer/requests`.
3. Faculty approves/rejects via `/api/organizer/requests/<id>/review`.
4. On approval, user role changes to `organizer`.

## 3.3 Tournament Lifecycle Workflow

Actors: organizer -> faculty -> student

Flow:
1. Organizer creates tournament (`POST /api/tournaments`), status is `pending_approval`.
2. Faculty reviews pending tournaments (`GET /api/tournaments/pending`).
3. Faculty approves/rejects (`POST /api/tournaments/<id>/approve`).
4. Approved tournaments move to `published`.
5. Scheduler auto-transitions:
- `published` -> `ongoing` when start date arrives
- `ongoing` -> `completed` when end date passes
6. Organizer/faculty can update status manually when allowed.

Validation rules:
- Registration deadline must be before start date
- Start date must be before end date

## 3.4 Team Registration and Invitation Workflow

Actors: student leader -> invited members -> organizer/faculty

Flow:
1. Leader registers team via `POST /api/teams`.
2. Backend validates:
- tournament availability
- deadline
- team size constraints
- duplicate participation constraints
- email domain constraints
3. Backend creates Team + TeamMember records.
4. Backend creates Invitation tokens and sends email invites.
5. Invited members respond via `/api/teams/invite/<token>/respond`.
6. Team member acceptance updates counts and potentially auto-confirms team.
7. Tournament creator/faculty reviews pending teams and approves/rejects.

## 3.5 Team Approval Workflow

Actors: organizer/faculty

Flow:
1. Admin/organizer UI fetches pending teams for selected tournament.
2. Approve endpoint sets team to `confirmed` and updates participant counts.
3. Reject endpoint sets team to `disqualified` with reason.
4. Leader receives notification.

## 3.6 Leaderboard Workflow

Actors: organizer/faculty -> all users

Flow:
1. Authorized user submits leaderboard entries (`POST /api/leaderboard/<id>`).
2. Existing entries for tournament are replaced.
3. Public users fetch leaderboard (`GET /api/leaderboard/<id>`).

## 3.7 Reports and Moderation Workflow

Actors: student -> faculty

Flow:
1. User files report on tournament (`POST /api/reports`).
2. Faculty views reports (`GET /api/reports`).
3. Faculty resolves/dismisses (`POST /api/reports/<id>/resolve`).
4. Resolve action can cancel tournament and reduce organizer reputation.

## 3.8 Sports Room Management Workflow

Actors: sport_authority

Flow:
1. Entry created (`POST /api/sport/entries`) with check-in time.
2. Optional checkout updates record (`PUT /api/sport/entries/<id>`).
3. Duration computed from in/out timestamps.
4. Stats endpoint gives total/today/active entries.
5. Frontend page includes countdown/notification UX for active entries.

---

## 4. Database Design and Concepts

## 4.1 Core Tables

1. `users`
- Stores identity, role, and detailed profile fields
- Includes moderation fields (`is_banned`, `ban_reason`) and reputation score

2. `organizer_requests`
- Tracks organizer applications and faculty decisions

3. `tournaments`
- Tournament metadata, schedule, status lifecycle, capacity, and approval metadata

4. `teams`
- Team-level registration state and member-count tracking

5. `team_members`
- Member-level records for invited/accepted/declined status

6. `invitations`
- Tokenized invitation links with expiry and response state

7. `leaderboard`
- Score/rank entries for tournaments

8. `reports`
- Abuse/fraud reporting pipeline and review outcome

9. `notifications`
- User notifications with read state and related object references

10. `sport_room_entries`
- Check-in/out data and calculated stay duration

## 4.2 Relational Concepts Used

- Primary keys and foreign keys with `ON DELETE CASCADE` or `SET NULL`
- Unique constraints to prevent duplicate business entities
- Enum columns for finite-state workflows
- Indexed lookup columns for frequently filtered queries
- Denormalized counters (e.g., tournament participants) with recalculation logic

## 4.3 Constraints and Integrity Rules

Examples:
- Unique `(tournament_id, leader_id)` to prevent multiple teams per leader in same tournament
- Unique `(tournament_id, team_name)` to prevent duplicate team names
- Unique invitation token
- Deadline and date ordering checks in application logic

## 4.4 Migration and Evolution

- `database/schema.sql` defines baseline schema + sample seed data.
- `database/migration_v2.sql` extends schema with enhanced registration fields and indexes.
- ORM models in `backend/models.py` mirror these schema concepts.

## 4.5 DBMS Concepts Used, Where They Are Used, and Why

This section maps core DBMS concepts to the exact implementation areas in ArenaX and the practical use case each concept solves.

1. Relational Model
- Where used:
- `database/schema.sql` table design (`users`, `tournaments`, `teams`, `team_members`, `invitations`, `leaderboard`, `reports`, `notifications`, `sport_room_entries`, `organizer_requests`)
- `backend/models.py` ORM mapping for these tables
- Use case in project:
- Representing campus tournament data as related entities (one user can create many tournaments, one tournament has many teams, one team has many members).

2. Entity Integrity (Primary Keys)
- Where used:
- Primary keys in every table in `database/schema.sql`
- Model primary keys in `backend/models.py`
- Use case in project:
- Uniquely identifying records for updates and joins (example: updating one team status by `team_id`, resolving one report by `report_id`).

3. Referential Integrity (Foreign Keys)
- Where used:
- FK constraints in `database/schema.sql` and model relationships in `backend/models.py`
- Examples: `teams.tournament_id -> tournaments.id`, `teams.leader_id -> users.id`, `reports.reporter_id -> users.id`
- Use case in project:
- Preventing orphan records and preserving valid relationships (a team cannot exist without a tournament).

4. Cascading and Nullifying Deletes
- Where used:
- `ON DELETE CASCADE` and `ON DELETE SET NULL` choices in `database/schema.sql`
- Mirrored in SQLAlchemy relationships in `backend/models.py`
- Use case in project:
- Automatic cleanup of dependent data (delete tournament -> remove related teams/invitations), while preserving historical rows where appropriate (set reviewer fields to null instead of deleting row).

5. Domain Constraints with ENUM
- Where used:
- ENUM columns in `database/schema.sql` (roles, tournament status, team status, invitation status, report reasons and states, notification type)
- Enum definitions in `backend/models.py`
- Use case in project:
- Restricting status values to valid workflow states so business logic remains consistent (example: tournament approval pipeline only uses known statuses).

6. Candidate Keys and Uniqueness Constraints
- Where used:
- Unique constraints in `database/schema.sql`:
- `users.email`
- `teams (tournament_id, leader_id)`
- `teams (tournament_id, team_name)`
- `team_members (team_id, email)`
- `invitations.token`
- Use case in project:
- Enforcing business rules at DB level (one leader cannot create duplicate teams in same tournament; invitation links are globally unique).

7. Indexing for Query Performance
- Where used:
- Explicit indexes in `database/schema.sql` and `database/migration_v2.sql`
- Common indexed fields: status columns, email, organizer_id, category, date fields
- Use case in project:
- Faster list and filter endpoints (pending approvals, role-based user listing, invitation lookup by token, tournament browsing by status/category).

8. Normalization (1NF/2NF/3NF-Oriented Design)
- Where used:
- Separation of concerns across tables in `database/schema.sql`
- Example decomposition: `teams` and `team_members` instead of storing member arrays inside `teams`
- Use case in project:
- Reducing redundancy and update anomalies (editing one member detail in one row rather than rewriting serialized team blobs).

9. Controlled Denormalization
- Where used:
- `tournaments.current_participants` in `database/schema.sql` and update/recalc logic in `backend/blueprints/tournament_routes.py` and `backend/blueprints/team_routes.py`
- Use case in project:
- Reducing repeated expensive counts in UI-heavy endpoints while still periodically recalculating for consistency.

10. Transaction Management (ACID-Oriented Unit of Work)
- Where used:
- `db.session` operations and `db.session.commit()` patterns across backend routes
- Registration logic in `backend/blueprints/team_routes.py` writes team + members + invitations in one transaction
- Use case in project:
- Ensuring atomic behavior: either full team registration persists or none of it does, preventing partially created registrations.

11. Application-Level Validation + DB-Level Enforcement
- Where used:
- Date/deadline checks in `backend/blueprints/tournament_routes.py`
- Team size/deadline/capacity validation in `backend/blueprints/team_routes.py`
- Hard constraints still anchored by keys/indexes in SQL schema
- Use case in project:
- Combining business validation (workflow rules) with structural enforcement (integrity rules) for robust correctness.

12. Temporal Data Modeling
- Where used:
- Timestamp/datetime columns in `database/schema.sql`: `created_at`, `updated_at`, `registration_deadline`, `start_date`, `end_date`, `expires_at`, `in_time`, `out_time`
- Scheduler jobs in `backend/utils/scheduler.py`
- Use case in project:
- Time-driven automation: tournament state transitions and pending team deadline expiration.

13. Derived/Computed Data
- Where used:
- `sport_room_entries.duration_minutes` computed from `in_time` and `out_time`
- `teams.confirmed_members` and participant recalculation logic in team/tournament routes
- Use case in project:
- Supporting operational dashboards and live progress displays without expensive repeated recomputation in the frontend.

14. Soft Moderation State in Data Model
- Where used:
- `users.is_banned`, `users.ban_reason`, `reports.status`, `reports.reviewed_by`, `reports.reviewed_at`
- Admin/report flows in `backend/blueprints/other_routes.py`
- Use case in project:
- Moderation without destructive deletion, preserving audit context while enforcing platform safety.

---

## 5. Frontend Architecture and Implementation

## 5.1 Routing and Access Control

- All route declarations live in `frontend/src/App.jsx`.
- `ProtectedRoute` wraps restricted pages.
- Role gating is applied for admin/sport-authority/organizer actions.

## 5.2 Auth State Management

- `frontend/src/context/AuthContext.jsx` is the central source of truth for:
- `user`
- `token`
- `loading`
- Exposes `login`, `logout`, and `refreshUser`.

## 5.3 API Strategy

- `frontend/src/api/index.js` exports domain-specific API wrappers.
- Axios interceptors inject auth token and handle 401 globally.
- Most pages/components use these wrappers.

## 5.4 UI System

- Tailwind custom theme in `frontend/tailwind.config.js`
- Global styles and utility classes in `frontend/src/index.css`
- Reusable components for navbar, forms, cards, and admin panels

---

## 6. Detailed File-by-File Explanation

This section explains what each project file does and how it participates in the overall system.

### 6.1 Root Documentation Files

1. `README.md`
- Primary project readme with setup, architecture notes, and feature summary.
- Acts as developer entry point for running backend/frontend and understanding high-level routes.

2. `REGISTRATION_FEATURE.md`
- Functional specification for enhanced registration/profile and team-member details.
- Documents expected behavior for additional student data collection.

3. `TEAM_APPROVAL_SYSTEM.md`
- Detailed specification for organizer/faculty review of pending teams.
- Describes API-level and UI-level approval/rejection workflow.

### 6.2 Backend Core Files

4. `backend/__init__.py`
- Package marker; no business logic.

5. `backend/app.py`
- Flask application factory and runtime entry point.
- Loads config from environment.
- Initializes extensions (`db`, `mail`, JWT manager).
- Registers all blueprints.
- Configures CORS and SQLAlchemy engine options.
- Creates tables on startup.
- Starts scheduler unless running in testing mode.

6. `backend/extensions.py`
- Central place where Flask extension instances are declared.
- Prevents circular imports by separating extension construction from app initialization.

7. `backend/models.py`
- Defines all SQLAlchemy models and relationships.
- Encodes domain states (roles, statuses, report reasons) as enums.
- Contains serialization helpers (`to_dict`) used by API responses.
- Is the canonical domain model for users, tournaments, teams, invitations, leaderboard, reports, notifications, and sport room entries.

8. `backend/requirements.txt`
- Python dependency manifest.
- Includes Flask stack, ORM, scheduler, mail, MySQL driver, and utility packages.

### 6.3 Backend Blueprint Files

9. `backend/blueprints/__init__.py`
- Blueprint package marker.

10. `backend/blueprints/auth_routes.py`
- Authenticated profile endpoints:
- current user (`/me`)
- profile sync (`/sync`)
- notifications listing and mark-read
- Connects user context (`g.current_user`) with profile update UX.

11. `backend/blueprints/tournament_routes.py`
- Tournament query, create, update, approve, status, and personal listing endpoints.
- Implements approval lifecycle and faculty decision logic.
- Calculates/refreshes participant counts for list/detail outputs.
- Emits notifications to relevant users on approval/rejection.

12. `backend/blueprints/team_routes.py`
- Implements complete team domain:
- registration
- invitation generation and email sending
- invite response handling
- pending-team listing
- team approval/rejection
- Contains business-critical validations for deadline, capacity, uniqueness, and membership constraints.

13. `backend/blueprints/other_routes.py`
- Multi-domain file containing:
- organizer request routes
- leaderboard routes
- report/moderation routes
- admin routes (stats, users, bans, analytics)
- Central administrative and governance logic for the platform.

14. `backend/blueprints/sport_routes.py`
- Sports room CRUD and statistics endpoints.
- Role-restricted to `sport_authority`.
- Handles in/out time validation and duration computation.

### 6.4 Backend Middleware and Utilities

15. `backend/middleware/__init__.py`
- Middleware package marker.

16. `backend/middleware/auth.py`
- Authentication and authorization middleware decorators:
- token verification against Clerk
- dev mock-token fallback
- user auto-provision/sync
- role guards (`require_role`, `require_faculty`, etc.)
- banned-user blocking
- This file is the security gate for almost all protected backend routes.

17. `backend/utils/__init__.py`
- Utility package marker.

18. `backend/utils/scheduler.py`
- Configures APScheduler jobs.
- Job 1: drop teams whose verification deadlines expired.
- Job 2: auto-progress tournament statuses based on schedule windows.
- Provides autonomous lifecycle automation independent of user actions.

19. `backend/utils/seed_demo_data.py`
- Data seeding helper module with idempotent ensure-functions.
- Creates/updates users, tournaments, teams, members, invitations, leaderboard rows.
- Useful for generating demo datasets and validating workflows quickly in development.

### 6.5 Database SQL Files

20. `database/schema.sql`
- Full SQL schema definition with constraints, enums, and indexes.
- Includes sample records to bootstrap a local environment.
- Represents a DB-first snapshot that aligns with ORM model intent.

21. `database/migration_v2.sql`
- Incremental schema evolution script.
- Adds enhanced registration fields and supporting indexes.
- Used when upgrading existing DB instances without dropping tables.

### 6.6 Frontend Build and Config Files

22. `frontend/package.json`
- Frontend dependencies and npm scripts (`dev`, `build`, `preview`).
- Defines React + tooling ecosystem versions.

23. `frontend/postcss.config.js`
- PostCSS plugin chain; enables Tailwind and autoprefixing.

24. `frontend/tailwind.config.js`
- Theme extension (colors, fonts, keyframes, animations).
- Controls visual identity and reusable design tokens.

25. `frontend/vite.config.js`
- Vite bundler config.
- Enables React plugin and API proxy to backend (`/api` -> localhost:5000).

26. `frontend/index.html`
- HTML shell that hosts root mounting element for React app.

### 6.7 Frontend App Core

27. `frontend/src/main.jsx`
- React bootstrapping entry point.
- Renders root `App` component into DOM.

28. `frontend/src/App.jsx`
- Route table and guarded route logic.
- Injects global layout elements such as navbar/toast and page-level routing.

29. `frontend/src/index.css`
- Global CSS and Tailwind directives.
- Houses custom utilities (theme colors, effects, status classes, typography base).

30. `frontend/src/api/index.js`
- Central API abstraction and Axios client setup.
- Contains request/response interceptors and grouped endpoint helper methods.
- Prevents repetitive fetch boilerplate in page components.

31. `frontend/src/context/AuthContext.jsx`
- Authentication context provider and hook.
- Manages user/session lifecycle and app-wide auth state propagation.

### 6.8 Frontend Common Components

32. `frontend/src/components/common/Navbar.jsx`
- Global navigation UI.
- Handles role-based links, mobile menu, notification dropdown, and logout flow.

33. `frontend/src/components/common/EnhancedRegistrationForm.jsx`
- Detailed student profile form used in profile completion/editing.
- Performs client-side validation and submits via auth sync API.

### 6.9 Frontend Tournament Components

34. `frontend/src/components/tournament/TournamentCard.jsx`
- Reusable card renderer for tournament previews.
- Displays status/category metadata, capacity progress, and key tournament fields.

35. `frontend/src/components/tournament/TournamentRegistrationForm.jsx`
- Multi-step registration form for solo/team enrollment.
- Captures leader details, dynamic member list, and final confirmation before submission.

### 6.10 Frontend Sports Component

36. `frontend/src/components/sport/SportRoomEntryForm.jsx`
- Form for check-in entries in sport room management module.
- Collects participant data and submits entry record.

### 6.11 Frontend Admin Components

37. `frontend/src/components/admin/TeamApprovalPanel.jsx`
- Approval workspace for pending team registrations.
- Loads organizer tournaments, shows pending teams, handles approve/reject actions.

38. `frontend/src/components/admin/StudentDashboard.jsx`
- Faculty tool for browsing students and viewing analytics.
- Supports search/filter and student-detail analytics panel.

### 6.12 Frontend Pages

39. `frontend/src/pages/HomePage.jsx`
- Landing and discovery screen.
- Loads grouped tournament lists (published/ongoing/completed) and renders promotional/featured layout.

40. `frontend/src/pages/LoginPage.jsx`
- Login screen with development mock login options and Clerk-ready paths.
- Kicks off token/session initialization.

41. `frontend/src/pages/SignupPage.jsx`
- Signup screen, integrates Clerk component when configured.

42. `frontend/src/pages/TournamentsPage.jsx`
- Search/filter/paginated tournament listing page.
- Uses URL query params to preserve filter state.

43. `frontend/src/pages/TournamentDetailPage.jsx`
- Tournament deep-dive page.
- Handles tabs, registration modal, teams/leaderboard fetch, and report action.

44. `frontend/src/pages/CreateTournamentPage.jsx`
- Multi-step organizer form for creating tournaments.
- Validates schedule/capacity inputs and submits creation request.

45. `frontend/src/pages/EditTournamentPage.jsx`
- Edit form for existing tournaments.
- Loads tournament data, applies permission checks, and updates editable fields.

46. `frontend/src/pages/MyTournamentsPage.jsx`
- Personalized tournament workspace.
- Shows created/joined tournaments and actions (scores, teams, status updates).

47. `frontend/src/pages/AdminPage.jsx`
- Faculty control center with multiple tabs:
- system overview stats
- tournament approvals
- team approvals
- organizer requests
- reports
- user management
- student analytics

48. `frontend/src/pages/InvitePage.jsx`
- Invitation acceptance page for team members.
- Validates invite token, user identity/email, and handles accept/decline actions.

49. `frontend/src/pages/SportRoomManagementPage.jsx`
- Sports authority operations dashboard.
- Manages entries, search, pagination, timer-driven notifications, and checkouts.

50. `frontend/src/pages/ProfilePage.jsx`
- User profile and account details page.
- Integrates enhanced registration form for editing personal data.

51. `frontend/src/pages/OtherPages.jsx`
- Contains additional page components:
- organizer application page
- global leaderboard page

52. `frontend/src/pages/NotFoundPage.jsx`
- 404 fallback page for unmatched routes.

---

## 7. API Surface Summary by Domain

Auth:
- `/api/auth/me`
- `/api/auth/sync`
- `/api/auth/notifications`
- `/api/auth/notifications/read`

Tournaments:
- `/api/tournaments`
- `/api/tournaments/<id>`
- `/api/tournaments/<id>/approve`
- `/api/tournaments/<id>/status`
- `/api/tournaments/my`
- `/api/tournaments/pending`

Teams:
- `/api/teams`
- `/api/teams/tournament/<id>`
- `/api/teams/tournament/<id>/pending`
- `/api/teams/<id>/approve`
- `/api/teams/<id>/reject`
- `/api/teams/invite/<token>`
- `/api/teams/invite/<token>/respond`

Organizer:
- `/api/organizer/apply`
- `/api/organizer/status`
- `/api/organizer/requests`
- `/api/organizer/requests/<id>/review`
- `/api/organizer/my-tournaments`

Leaderboard:
- `/api/leaderboard/<tournament_id>`

Reports:
- `/api/reports`
- `/api/reports/<id>/resolve`

Admin:
- `/api/admin/stats`
- `/api/admin/users`
- `/api/admin/users/<id>/ban`
- `/api/admin/users/<id>/unban`
- `/api/admin/students`
- `/api/admin/students/<id>/analytics`

Sport:
- `/api/sport/entries`
- `/api/sport/entries/<id>`
- `/api/sport/stats`

---

## 8. Notable Design Strengths

- Clear domain separation through Flask Blueprints and React page/component structure
- Strong role-based access control and moderation capabilities
- Rich workflow support for team tournaments with invitations and approvals
- Comprehensive DB schema with strong relational constraints
- Practical admin tooling and operational visibility

## 9. Areas to Improve (Implementation Quality)

- Standardize all frontend network calls through `frontend/src/api/index.js` (some direct `axios/fetch` bypass interceptors)
- Continue tightening server-side validation consistency for all form-heavy flows
- Improve real-time participant/notification updates (events/polling/websocket strategy)
- Add automated test coverage for critical workflows (team registration, approvals, reports, scheduler transitions)

---

## 10. Conclusion

ArenaX is an advanced campus tournament platform with robust end-to-end workflows: identity, organizer governance, tournament lifecycle management, team invitation/approval, leaderboard publication, reporting/moderation, and sports-room operations. The project uses solid relational design and modular API/frontend architecture, and is well-positioned for production hardening with focused improvements in API call consistency, testing, and realtime UX updates.
