# LearnCS01.com — Production Architecture

A minimal, premium e-learning platform (MERN + React Native), inspired by
the structure of cs50.com / pll.harvard.edu. Paid individual courses,
YouTube-or-S3 video delivery, dual payment gateways (Stripe + SSLCommerz),
automated quiz grading + PDF certification, and real-time chat.

```
learncs01/
├── backend/        Express API + Socket.io + BullMQ worker (Node 18+)
├── frontend/        React 18 web app (Vite)
├── mobile/           React Native app (Expo)
├── database/        Schema/ERD documentation
├── render.yaml      Render Blueprint (backend, free tier)
├── DEPLOYMENT.md    Vercel + Render + MongoDB Atlas deployment guide
└── docker-compose.yml
```

## Deploying this for testing (Vercel + Render)

**See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full walkthrough.** Short version:
frontend → Vercel, backend → Render (using `render.yaml`), database → MongoDB
Atlas free tier. All free, $0 total. Once deployed, run:

```bash
cd backend && MONGO_URI="<your Atlas connection string>" npm run seed
```

to create one ready-to-use login per role (Super Admin, Admin, Instructor,
Student) plus a published demo course - credentials are printed at the end
and also listed in `DEPLOYMENT.md`.

## Running in production

```bash
cd backend
npm ci --omit=dev
pm2 start ecosystem.config.js --env production   # API in cluster mode (all CPU cores) + the certificate worker
```

`ecosystem.config.js` runs the API across every CPU core via PM2 cluster
mode - the cheap way to use one multi-core box for the 500-5,000 DAU range
without a separate orchestration layer. This is also why
`sockets/index.js` wires up `@socket.io/redis-adapter` (so chat/notification
events reach a user regardless of *which* cluster worker their socket
landed on) and why the certificate worker pushes live notifications through
`sockets/emitter.js` (`@socket.io/redis-emitter`) rather than only writing
to MongoDB - both reuse the same Redis instance already running for BullMQ.

`.github/workflows/ci.yml` runs on every push/PR: backend lint + syntax
check, frontend production build. Both were also run manually against this
exact codebase before delivery (see below).

## Quick start (local dev)

```bash
# 1. Database + Redis
docker compose up mongo redis -d

# 2. Backend
cd backend
cp .env.example .env        # fill in Stripe/SSLCommerz/AWS/SMTP keys
npm install
npm run dev                 # API on :5000
npm run worker:dev          # separate terminal - certificate generation worker
npm run seed                # optional - creates one demo login per role, see DEPLOYMENT.md

# 3. Frontend
cd ../frontend
npm install
npm run dev                 # web app on :5173 (proxies /api to :5000)

# 4. Mobile (optional)
cd ../mobile
npm install
npx expo start
```

`docker compose up` (full stack, no separate `npm install` steps) also works
once `backend/.env` exists — see `docker-compose.yml`.

> **Mongo replica set requirement**: the codebase relies on multi-document
> ACID transactions (see `database/DATABASE.md`), which MongoDB only
> supports on a replica set — `docker-compose.yml` already initializes a
> single-node replica set (`rs0`) for this reason. MongoDB Atlas clusters
> are replica sets by default, so production needs no extra configuration.

## How video delivery works (YouTube or S3, admin-only)

Every lecture stores `videoSource: 'youtube' | 's3'`. Both paths are written
**exclusively** through admin-dashboard endpoints
(`backend/src/controllers/upload.controller.js`,
`backend/src/routes/upload.routes.js`), never directly by instructors:

- **YouTube** — admin pastes a URL/ID; the backend extracts and stores the
  11-character video ID; the frontend renders a standard `<iframe>` embed.
  Zero hosting cost.
- **S3** — admin requests a short-lived presigned `PUT` URL
  (`POST /admin/courses/:courseId/lectures/:lectureId/video/presign`), the
  *browser* uploads the file directly to S3 (video bytes never transit the
  API server), then confirms
  (`PATCH .../video/confirm`). Playback later uses a short-lived signed
  `GET` URL (`GET /courses/lectures/:lectureId/playback-url`), issued only
  to users who own the course (or for `isPreview` lectures).

Instructors create lecture **metadata** only (title, description, ordering)
via `POST /courses/:id/modules/:moduleId/lectures` — the video itself is
attached later, by an admin-dashboard user.

## Admin-dashboard permission system

`User.role === 'admin'` accounts are not all-powerful. Each one (except the
**Super Admin**, `isSuperAdmin: true`) carries a `permissions` object with
independent booleans:

```
manageCourses · manageVideos · manageInstructors · manageCoupons
manageUsers · viewAnalytics · manageCertificates · moderateChat · manageOrders
```

- `middleware/auth.middleware.js → hasPermission(...keys)` gates every
  sensitive admin route. The Super Admin always passes; everyone else needs
  at least one of the listed keys set `true`.
- Only the **Super Admin** can grant/revoke another admin's permissions
  (`PATCH /admin/staff/:userId/permissions` — hardcoded to
  `req.user.isSuperAdmin`, not itself a delegable permission, so privilege
  escalation chains aren't possible).
- The frontend's `Staff & Permissions` page
  (`frontend/src/pages/admin/StaffPermissions.jsx`) is the UI for this —
  checkbox grid per staff member, Super-Admin-only.
- The Sidebar (`frontend/src/components/layout/Sidebar.jsx`) hides nav
  links the current admin hasn't been granted, so staff genuinely only
  *see* what they can act on, not just get blocked after clicking.

This is what lets the Super Admin appoint a "content admin" who can only
manage videos and courses, separately from a "finance admin" who only
handles coupons/orders, without either one touching the other's domain.

## The three required routes

| Route | File | Notes |
|---|---|---|
| `POST /api/v1/courses/:id/purchase` | `controllers/payment.controller.js` | Validates coupon, atomically creates a `pending` Order, then initializes Stripe Checkout or SSLCommerz session. **Never** grants access itself. |
| `POST /api/v1/courses/:id/verify-quiz` | `controllers/quiz.controller.js` | Grades server-side against `select:false` answer keys, atomically updates progress, issues a `Certificate` record, enqueues background PDF generation. |
| `GET /api/v1/chat/messages` | `controllers/chat.controller.js` | Cursor-paginated history from the isolated `Message` collection, participant-authorized. |

Payment **settlement** (marking an order `paid`) happens only in
`controllers/webhook.controller.js`, never in the purchase route — Stripe
signature verification + SSLCommerz IP allowlist/`val_id` validation +
MongoDB transactions, as required.

## Automated tests

```bash
cd backend
npm test     # node's built-in test runner - 40 tests, zero external dependencies needed
```

`backend/tests/` covers:
- `models.test.js` — Mongoose model business logic (password hashing/comparison,
  password-reset tokens, the quiz answer-key `select:false` guarantee, schema
  validation, coupon validity rules, cart math). No live DB required.
- `logic.test.js` — the extracted pure-function utilities used by the
  controllers: `utils/gradeQuiz.js`, `utils/calculateDiscount.js`,
  `utils/extractYoutubeId.js`. These were pulled out of the controllers
  specifically so they're unit-testable in isolation rather than only
  reachable through a full HTTP request.
- `pdf-and-s3.test.js` — generates real certificate PDFs (actual bytes, not
  mocked) and verifies S3 presigned URLs are correctly SigV4-signed. Includes
  a regression test for a real bug found during verification (see below).

## Verified before delivery

This was actually installed, built, booted, and tested - not just read for
syntax:

- `cd backend && npm install` → 469 packages, zero resolution errors.
- `npx eslint src --ext .js` → zero errors, zero warnings.
- `npm test` → **40/40 passing** (see "Automated tests" above).
- Full app boot test against a real local Redis: `app.js` + `sockets/index.js`
  (Socket.io + `@socket.io/redis-adapter`) started for real on an HTTP
  server; `GET /health` → `200`; `GET /api/v1/auth/me` (no session) → `401`;
  an unknown route → `404`; a real `socket.io-client` handshake with a
  validly-signed JWT correctly waited on the (absent) database and then
  rejected the connection rather than hanging or crashing.
- A real BullMQ job was enqueued and processed end-to-end against the local
  Redis instance.
- `cd frontend && npm install && npm run build` → Vite production build,
  125 modules, zero errors.
- All 13 mobile source files parsed cleanly with esbuild (JSX included).

**A real bug was found and fixed during this process**: the certificate PDF
generator (`pdfCertificate.service.js`) used hardcoded pixel offsets for
every line of text. Long course titles or student names that wrapped to a
second line would push the footer (Certificate ID / Verification Code) past
PDFKit's implicit bottom margin, which silently triggered extra blank pages
instead of the intended single-page certificate - confirmed visually by
rendering the output to PNG. Fixed by removing the implicit margin and
measuring each text block's real rendered height before placing the next
one, so the layout now flows correctly regardless of name/title length.
`tests/pdf-and-s3.test.js` encodes this as a permanent regression test.

**Deployment-readiness additions** (Vercel + Render + MongoDB Atlas, see
`DEPLOYMENT.md`) were verified the same way: `render.yaml` was structurally
validated against Render's documented Blueprint schema; the frontend was
built twice - once with `VITE_API_URL` unset (confirms the local-dev
relative-path fallback) and once with it set to a fake Render URL (confirms
the value is actually embedded in the production bundle, by grepping the
built JS for it) - both builds succeeded and behaved as designed. The
extracted `createCertificateWorker()` function (used for both the standalone
worker process and Render's free-tier `RUN_WORKER_INLINE` mode) was run
against real local Redis and closed cleanly. The seed script's demo data
(`scripts/seedData.js`) is schema-validated in `tests/seed-data.test.js`
using the real Mongoose models' `validateSync()` - including a bounds-check
that every quiz question's `correctOptionIndex` is actually a valid index
into its own `options` array.

What this sandbox *can't* exercise end-to-end (no outbound network to
MongoDB Atlas, Docker Hub, AWS, Stripe, or SSLCommerz from here): an actual
purchase → webhook → certificate → S3 round trip against real managed
services, or a real Render/Vercel deploy. The transaction logic for that
path is reviewable in `webhook.controller.js` and `quiz.controller.js`;
following `DEPLOYMENT.md` end-to-end in your own accounts is the natural
next verification step.

## What's fully implemented vs. scaffolded

- **Backend**: complete, runnable, no placeholder logic — every model,
  controller, route, middleware, transaction, and background job described
  above is real code, not a stub.
- **Frontend**: the routing tree, auth/cart state, API layer, role guards,
  and the two pages most specific to this brief (Video Management, Staff &
  Permissions) are fully wired to the real API. Several secondary pages
  (analytics, user management table, instructor "Students" view) are left
  as light page shells ready for UI work — the backend endpoints they'd
  need either already exist or are a small, obvious extension of the
  existing controller patterns.
- **Mobile**: navigation tree, Bearer-token auth (SecureStore-backed, since
  React Native can't rely on the web app's httpOnly cookie the same way),
  and one fully wired screen (course catalog) demonstrate the pattern;
  remaining screens are intentionally thin shells with comments pointing at
  their web equivalents.

## Environment variables

See `backend/.env.example` for the full list with inline explanations
(Stripe keys, SSLCommerz store credentials + IP allowlist, AWS S3/CloudFront,
Redis, SMTP).
