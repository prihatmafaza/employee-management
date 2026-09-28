# Access Requests

A web app where employees request access (VPN, GitHub/GitLab, Figma, Jira) and
each request goes through a two-step approval: **Manager → Admin**.

The backend (Spring Boot + PostgreSQL) lives in the sibling folder
[`../employee-management-backend`](../employee-management-backend). Its README
covers prerequisites (JDK 21, Docker), the database and the tests.

## Running

Start PostgreSQL and the backend first (see the backend README):

```bash
cd ../employee-management-backend
docker compose up -d
./mvnw spring-boot:run           # http://localhost:8080
```

Then start the frontend. The Vite dev server proxies `/api` to `http://localhost:8080`:

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint
```

To run without a backend, use the in-browser mock (`src/api/mockApi.ts`, which
keeps its state in `localStorage`): `VITE_USE_MOCK=true npm run dev`.

## Demo accounts

All accounts use the password `password123`. There is no registration, since the accounts are seeded.

| Username  | Role    | Notes                  |
| --------- | ------- | ---------------------- |
| `alice`   | USER    | Reports to Maria       |
| `bob`     | USER    | Reports to Maria       |
| `charlie` | USER    | Reports to Mark        |
| `maria`   | MANAGER |                        |
| `mark`    | MANAGER |                        |
| `admin`   | ADMIN   |                        |

Login is kept per browser tab: the JWT access token lives in `sessionStorage`
and is sent as `Authorization: Bearer`. To walk through the whole workflow side
by side, open one tab as `alice`, one as `maria` and one as `admin`, then reload
each tab to see changes. Closing a tab logs it out.

To reset all data, run `docker compose down -v` in the backend folder. With the
mock, run `localStorage.clear(); sessionStorage.clear()` in the devtools console.

## Workflow

```
User submits ──► IN_PROGRESS (waiting: MANAGER)
                   │ manager approves           │ manager rejects
                   ▼                            ▼
                 IN_PROGRESS (waiting: ADMIN)   REJECTED
                   │ admin approves             │ admin rejects
                   ▼                            ▼
                 APPROVED                       REJECTED
```

Rules:

- A request only becomes `APPROVED` after both the manager and the admin approve it.
- A manager can only see and decide requests from their own direct reports.
- An admin only sees requests that a manager has already approved.
- A rejection needs a comment, and the comment is shown to the requester.
- A user can't request an access they already have or already have a pending request for. They can request it again after a rejection.
- Each request shows who decided each step, when they decided, and their comment.

## Pages

| Route             | Role           | Page                                            |
| ----------------- | -------------- | ----------------------------------------------- |
| `/login`          | everyone       | Login                                           |
| `/request-access` | USER           | Pick an access, enter a reason, submit          |
| `/my-requests`    | USER           | Table: ID, access, reason, request date, status |
| `/approvals`      | MANAGER, ADMIN | Requests waiting for my decision + history      |
| `/dashboard`      | everyone       | Live request counts: whole system (admin), team (manager), own (user) |

Opening a page your role can't use sends you to your own home page.

## Structure

```
src/
  types.ts          shared domain types
  routes.ts         menu per role and each role's home page
  api/index.ts      Api interface the UI depends on (+ which implementation is used)
  api/httpApi.ts    implementation that calls the real backend (default)
  api/mockApi.ts    in-browser implementation with seed data and workflow rules (VITE_USE_MOCK=true)
  demo.ts           demo account password shown on the login page
  auth/context.ts   logged-in user context, error handling that logs out on 401
  pages/            LoginPage, RequestAccessPage, MyRequestsPage, ApproveRequestPage
  components/       Layout (nav), RequestCard, ApprovalProgress, StatusBadge
```

- [`docs/api-contract.md`](docs/api-contract.md): the HTTP contract the backend must follow.
- [`docs/backend-prompt.md`](docs/backend-prompt.md): a ready-to-use brief for building the backend.
