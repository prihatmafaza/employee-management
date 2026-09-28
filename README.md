# Access Requests

A fullstack web application for managing employee access requests, with login,
three roles and a two-level approval workflow (**Manager → Admin**).

This repository is the **frontend**. The backend lives in the sibling folder
[`../employee-management-backend`](../employee-management-backend).

- [1. Project overview](#1-project-overview)
- [2. Technology stack](#2-technology-stack)
- [3. How to run the application](#3-how-to-run-the-application)
- [4. Security aspects](#4-security-aspects)
- [Project structure](#project-structure)

---

## 1. Project overview

Employees request access to internal tools (**VPN, GitHub / GitLab, Figma,
Jira**) and give a reason. Every request must be approved by the employee's
**manager** and then by an **admin**. It becomes `APPROVED` only after both.

### Roles

| Role        | What they can do |
| ----------- | ---------------- |
| **USER**    | Request access, see their own requests and their status. |
| **MANAGER** | Approve or reject requests from **their own team** (first step). |
| **ADMIN**   | Approve or reject requests **a manager has already approved** (second step). |

There is no registration page. Accounts already exist in the database (see [demo accounts](#demo-accounts)).

### Approval workflow

```
User submits ──► IN_PROGRESS (waiting: MANAGER)
                   │ manager approves           │ manager rejects
                   ▼                            ▼
                 IN_PROGRESS (waiting: ADMIN)   REJECTED
                   │ admin approves             │ admin rejects
                   ▼                            ▼
                 APPROVED                       REJECTED
```

- A request is `APPROVED` only after **both** the manager and the admin approve it.
- A rejection at either step makes it `REJECTED`, and it needs a comment, which the requester can see.
- Nobody can decide a request that isn't assigned to them or isn't at their step.
- A user can't request an access they already have or already have a pending request for. They can request it again after a rejection.
- Every request keeps a trail of who decided each step, when, and with what comment.

### Pages

| Route             | Roles          | Page |
| ----------------- | -------------- | ---- |
| `/login`          | everyone       | **Login**. Also lists the demo accounts. |
| `/request-access` | USER           | **Request Access**: view the available accesses, select one, enter a reason, submit. |
| `/my-requests`    | USER           | **My Requests**: table with Request ID, Access, Reason, Request date and Status, plus the approval trail per request. |
| `/approvals`      | MANAGER, ADMIN | **Approve Request**: "Waiting for me" queue with Approve / Reject, and "All requests" history with a status filter. |
| `/dashboard`      | everyone       | **Dashboard** (bonus): live request counts. See below. |

Opening a page the role can't use redirects to that role's own home page. The
backend enforces the same rules independently.

### Dashboard summary (bonus feature)

Shows **Total**, **In progress**, **Approved**, **Rejected**, **Waiting for
manager approval** and **Waiting for admin approval**, each with its share of
the total.

- **Scope by role:** an admin sees the whole system, a manager sees their team, and a user sees their own requests.
- **Real-time:** the page polls `GET /api/dashboard/summary` every 10 seconds while the
  tab is visible, refreshes immediately when the tab regains focus, and has a
  manual **Refresh** button. It also shows when the numbers were last updated.

---

## 2. Technology stack

### Frontend (this repository)

| Area            | Choice |
| --------------- | ------ |
| Language        | TypeScript 6 |
| UI              | React 19 |
| Routing         | React Router 7 |
| Build / dev     | Vite 8, with a dev proxy from `/api` to the backend |
| Styling         | Plain CSS with custom properties (light and dark mode), no UI framework |
| Code quality    | ESLint 10 (typescript-eslint, react-hooks), strict `tsc` type-check on build |
| HTTP            | `fetch`, wrapped in a typed `Api` interface (`src/api/`) |

### Backend

| Area            | Choice |
| --------------- | ------ |
| Language        | Java 21 |
| Framework       | Spring Boot 4 (Web MVC, Data JPA, Validation) |
| Security        | Spring Security with OAuth2 Resource Server (JWT, HS256), BCrypt |
| Database        | PostgreSQL 16 (Docker Compose), migrations with Flyway |
| Tests           | JUnit 5 and Testcontainers (real PostgreSQL) |
| Build           | Maven (wrapper included) |

The HTTP contract between the two (endpoints, types, error format, business
rules) is documented in [`docs/api-contract.md`](docs/api-contract.md).

---

## 3. How to run the application

### Prerequisites

- **Node.js** 20.19+ (22 or 24 recommended) and npm
- **JDK 21**
- **Docker** (for PostgreSQL and the backend tests)

### Steps

Run each step in its own terminal, starting from the parent folder that contains both repositories.

**1. Start PostgreSQL**

```bash
cd employee-management-backend
docker compose up -d
```

**2. Start the backend** on http://localhost:8080. Flyway creates the schema, and demo data is seeded on first start.

```bash
cd employee-management-backend
./mvnw spring-boot:run          # Windows: .\mvnw.cmd spring-boot:run
```

**3. Start the frontend** on http://localhost:5173.

```bash
cd employee-management
npm install
npm run dev
```

**4.** Open **http://localhost:5173** and log in with one of the demo accounts below.

In development, Vite proxies every `/api` call to `http://localhost:8080`, so
the browser talks to a single origin and the backend doesn't need CORS.

### Demo accounts

Every password is **`password123`**.

| Username  | Role    | Manager |
| --------- | ------- | ------- |
| `alice`   | USER    | maria   |
| `bob`     | USER    | maria   |
| `charlie` | USER    | mark    |
| `maria`   | MANAGER | —       |
| `mark`    | MANAGER | —       |
| `admin`   | ADMIN   | —       |

Login is kept **per browser tab**. To walk through the workflow side by side,
open one tab as `alice`, one as `maria` and one as `admin`.

### Useful commands

| Command                                  | What it does |
| ---------------------------------------- | ------------ |
| `npm run dev`                            | Frontend dev server with hot reload |
| `npm run build`                          | Type-check and production build into `dist/` |
| `npm run lint`                           | ESLint |
| `./mvnw verify` (backend folder)         | Backend unit and integration tests (Docker must be running) |
| `docker compose down -v` (backend folder)| Delete all data. The next backend start reseeds it. |

### Running the frontend without a backend

An in-browser mock implements the same API and rules (`src/api/mockApi.ts`), and keeps its data in `localStorage`:

```bash
VITE_USE_MOCK=true npm run dev                     # macOS / Linux / Git Bash
$env:VITE_USE_MOCK='true'; npm run dev             # Windows PowerShell
```

### Troubleshooting

- **Every call fails or login does nothing:** check that the backend is running on port 8080 and that
  you opened the app through `npm run dev` on port 5173. `npm run preview` doesn't proxy `/api`.
- **Port 5432/5433 already in use:** see the backend README for how to run the database on another port.

---

## 4. Security aspects

### Authentication

- **Login returns a JWT access token** (HS256, 2-hour expiry, unique `jti`). The frontend sends it as
  `Authorization: Bearer <token>` on every request. There are no cookies and no server-side session.
- **Passwords are hashed with BCrypt** and never returned by the API. Login gives the same error for an
  unknown user and a wrong password, so it doesn't reveal which usernames exist.
- **Brute-force protection:** 5 failed logins per username + IP within 15 minutes return `429`.
- **Logout revokes the token** on the server (a denylist by `jti` until expiry), and the frontend deletes its copy.
- **The token only carries the user ID.** The user and their role are reloaded from the database on every
  request, so a role change takes effect immediately.
- In production (`SPRING_PROFILES_ACTIVE=prod`), the app refuses to start without a `JWT_SECRET` of at least 32 bytes.

### Authorization

- **Every rule is enforced on the server.** Hiding menu items and redirecting pages in the
  frontend is only for user experience, not a security boundary.
- **Role checks per endpoint** in Spring Security. For example, only a USER can submit, and only a MANAGER or ADMIN can decide.
- **Visibility checks per request** in the service layer:
  - A manager only sees their own team's requests.
  - An admin only sees requests a manager has approved.
  - A user only sees their own requests.
- A request outside the caller's visibility returns **`404`**, not `403`, so its existence isn't revealed.
- **Step enforcement:** deciding a request that isn't at the caller's step returns `409`.
  An approval can never be changed once made.
- **Race conditions:** a decision inserts the approval (with a unique `(request_id, step)`) and updates the request
  (with optimistic locking, `@Version`) in one transaction. If two reviewers decide at the same moment, exactly one wins.

### Input handling and errors

- **Validation:** all input is validated and trimmed on the server (reason ≤ 500 characters, a required
  comment when rejecting, known access types only).
- **SQL injection:** database access uses JPA and parameterized queries only.
- **Request limits:** bodies over 10 kB are rejected (`413`), and non-JSON bodies are rejected (`415`).
- **Errors:** every error uses one JSON format (`{ "error": { "code", "message" } }`). Stack traces, SQL and
  internal details are never sent to the client.

### Browser-side protections

- **XSS:** React escapes all rendered text, and the code never uses `dangerouslySetInnerHTML` or `innerHTML`.
- **CSRF:** not possible with this design. Browsers never attach the `Authorization` header on their own, and
  CORS stays disabled, since the frontend reaches the API from the same origin.
- **Token storage:** the token is kept in `sessionStorage`. It is scoped to one tab, survives a reload, and is
  removed when the tab closes, on logout, or on any `401`.
- **No secrets in the frontend bundle:** the only build-time variable is `VITE_USE_MOCK`.

### Known limitations and production notes

- Any script running on the page could read a token in `sessionStorage`. The XSS measures above make this
  unlikely. An `HttpOnly` cookie would remove the risk, at the cost of adding CSRF protection.
- The logout denylist is in memory: it only works on a single backend instance and is cleared on restart.
  That's why the tokens are short-lived.
- The demo accounts share a known password. Real deployments would use their own accounts or SSO.
- Production should run behind **HTTPS**, with the frontend and `/api` served from the same origin, and a strong `JWT_SECRET`.

---

## Project structure

```
src/
  api/
    index.ts          Api interface used by the UI; picks the HTTP or mock implementation
    httpApi.ts        calls the real backend, handles the JWT
    mockApi.ts        in-browser mock with the same rules (VITE_USE_MOCK=true)
    errors.ts         ApiError
  auth/context.ts     logged-in user context; sends the user to login on 401
  components/         Layout (top bar and nav), RequestCard, ApprovalProgress, StatusBadge
  pages/              LoginPage, RequestAccessPage, MyRequestsPage, ApproveRequestPage, DashboardPage
  routes.ts           menu and home page per role
  types.ts            domain types shared with the API contract
  format.ts, demo.ts  date formatting, demo password
docs/
  api-contract.md     HTTP contract between frontend and backend
```
