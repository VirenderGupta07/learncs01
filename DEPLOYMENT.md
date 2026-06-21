# Deploying LearnCS01 for testing: Vercel + Render

This deploys the **frontend to Vercel** and the **backend to Render**, both on
free tiers, plus a free MongoDB Atlas cluster for the database. Total cost:
**$0**, with the caveats noted below.

```
┌─────────────┐        ┌──────────────────────────┐        ┌──────────────────┐
│   Vercel    │  HTTPS │           Render          │  TLS   │  MongoDB Atlas   │
│  (frontend) │───────▶│  API + certificate worker │───────▶│   (free M0)      │
│  React/Vite │◀───────│   (single free Web Svc)   │        └──────────────────┘
└─────────────┘  CORS  └──────────┬───────────────┘
                                   │ private network
                                   ▼
                        ┌──────────────────────────┐
                        │   Render Key Value (Redis)│
                        │        (free)             │
                        └──────────────────────────┘
```

## Before you start: what's free and what isn't

| Service | Free tier | Card required? |
|---|---|---|
| **Vercel** (frontend) | Yes, Hobby plan | No |
| **Render** (backend) | Yes, Hobby plan - free Web Service + free Key Value (Redis) | **Yes** - Render charges a refundable $1 verification hold when you add a card, even on the free tier |
| **MongoDB Atlas** (database) | Yes, M0 cluster, free forever | No |

Two behaviors of Render's free tier worth knowing going in:
- **Cold starts**: a free Web Service spins down after 15 minutes of no traffic and takes 30-60 seconds to wake back up on the next request. The first request after idle will just look slow - that's expected, not a bug.
- **No free Background Worker instance type** (only Web Services get one). This repo works around that: `RUN_WORKER_INLINE=true` runs the certificate-generation worker inside the same process as the API (see `backend/src/server.js` and `backend/src/jobs/certificateWorkerCore.js`), so everything still fits on one free service. If you later move to a paid Render plan, switch this off and run `backend/src/jobs/certificate.worker.js` as its own Background Worker service instead - that's the architecture the main README describes.

---

## 1. Push this repo to GitHub

Both Render and Vercel deploy from a connected Git repository.

```bash
cd learncs01
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<you>/learncs01.git
git push -u origin main
```

## 2. MongoDB Atlas (free, no card)

1. Go to `cloud.mongodb.com` and create a free account.
2. Create a cluster, selecting **M0 (Free)**, any provider/region close to you.
3. **Database Access** → add a database user (password auth) - save the username/password.
4. **Network Access** → add IP address `0.0.0.0/0` (allow from anywhere - Render's free tier doesn't have static outbound IPs, so this is required; it's safe because the connection still requires the username/password from step 3).
5. **Connect** → "Drivers" → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/learncs01?retryWrites=true&w=majority
   ```
   Replace `<user>`/`<password>` with your actual credentials and keep the database name `learncs01` (or change it - either works). Save this string; you'll paste it into Render in the next step.

## 3. Backend on Render

### Option A - Blueprint (recommended)

1. In the [Render Dashboard](https://dashboard.render.com), click **New > Blueprint**.
2. Connect the GitHub repo you pushed in step 1. Render finds `render.yaml` at the repo root automatically.
3. Render lists the resources it's about to create (`learncs01-api`, `learncs01-redis`) and prompts you for the env vars marked `sync: false` in `render.yaml`. At minimum, provide:
   - `MONGO_URI` → the Atlas connection string from step 2
   - `CLIENT_URLS` → for now, put a placeholder like `https://placeholder.vercel.app` - you'll come back and fix this in step 5 once your real Vercel URL exists
   - You can leave `STRIPE_SECRET_KEY`, `SSLCOMMERZ_*`, and `AWS_*` blank for now (see "Optional credentials" below) - just leave the field empty and continue.
4. Click **Deploy Blueprint**. First deploy takes a few minutes.
5. Once live, your API is reachable at `https://learncs01-api.onrender.com` (or whatever Render named it - check the dashboard).

### Option B - Manual web service (if you'd rather not use the Blueprint)

1. **New > Web Service** → connect your repo.
2. **Root Directory**: `backend`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. **Instance Type**: Free
6. Add environment variables (Settings → Environment):
   - `NODE_ENV=production`
   - `RUN_WORKER_INLINE=true`
   - `JWT_SECRET=` (any long random string)
   - `MONGO_URI=` (your Atlas connection string)
   - `CLIENT_URLS=` (placeholder for now, fixed in step 5)
7. Separately, **New > Key Value** → Free plan → name it anything → once created, copy its **internal connection string** and add it to the web service's env vars as `REDIS_URL`.

## 4. Frontend on Vercel

1. In the [Vercel Dashboard](https://vercel.com/new), import the same GitHub repo.
2. **Root Directory**: `frontend` (Vercel auto-detects the Vite framework preset once you set this).
3. **Environment Variables** → add:
   - `VITE_API_URL` = your Render URL from step 3, e.g. `https://learncs01-api.onrender.com` (no trailing slash)
4. Deploy. Vercel gives you a URL like `https://learncs01.vercel.app`.

`frontend/vercel.json` is already configured to rewrite all paths to `index.html`, which React Router needs for direct loads/refreshes on non-root routes to work.

## 5. Connect them: fix CORS

Now that you have your real Vercel URL:

1. Back in Render, open `learncs01-api` → **Environment**.
2. Set `CLIENT_URLS` to your real Vercel URL, e.g. `https://learncs01.vercel.app` (comma-separate multiple origins if needed, e.g. also `http://localhost:5173` for local dev).
3. Save - Render redeploys automatically.

This matters because the app uses a secure, `httpOnly` cookie for auth (not a token in localStorage), and that requires the backend's CORS `origin` to be your *exact* frontend URL with `credentials: true` - it can't be a wildcard. (The cookie itself is already configured correctly for this cross-domain setup - see `backend/src/utils/generateToken.js` - you don't need to touch that.)

## 6. Seed demo accounts and content

Run this from your own machine, pointed at your Atlas database (fastest - no need to wait for a Render deploy or use its Shell):

```bash
cd backend
npm install
MONGO_URI="<your Atlas connection string>" npm run seed
```

This creates one account per role, a published demo course ("Intro to Python") with a real YouTube lecture and a quiz, grants the demo student account access to it (so you can test the course player/quiz/certificate flow without needing real payment credentials), and a demo coupon. It's safe to run again any time - it resets the demo accounts' passwords rather than erroring on duplicates.

You'll see a credentials summary printed at the end - it's also reproduced below.

## Test credentials

| Role | Email | Password | Notes |
|---|---|---|---|
| **Super Admin** | `superadmin@learncs01.com` | `SuperAdmin123!` | All permissions; can manage staff permissions |
| **Admin** | `admin@learncs01.com` | `Admin123!` | Limited permissions (courses, videos, coupons, instructors) - log in as both admins to see the dashboard nav differ |
| **Instructor** | `instructor@learncs01.com` | `Instructor123!` | Can author course/lecture metadata |
| **Student** | `student@learncs01.com` | `Student123!` | Already owns the demo course - no payment needed to test the course player, quiz, and certificate flow |

Demo coupon: `WELCOME20` (20% off).

## What works without any extra setup

Browsing the catalog, registering/logging in as any role, the student dashboard and course player (video + quiz + certificate request), the instructor course editor, the admin dashboard including **Video Management** (YouTube path) and **Staff & Permissions**, real-time chat. None of this needs Stripe/SSLCommerz/AWS credentials.

## What needs additional (free) credentials to fully test

| Feature | Needs | How to get it (free) |
|---|---|---|
| Stripe checkout | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Create a free Stripe account → Developers → API keys → copy the **test mode** secret key (`sk_test_...`). Then Developers → Webhooks → Add endpoint → URL `https://<your-render-url>/api/v1/webhooks/stripe` → select events `checkout.session.completed` and `payment_intent.payment_failed` → copy the signing secret (`whsec_...`). |
| SSLCommerz checkout | `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD` | Register for a free sandbox account at sslcommerz.com → copy the sandbox Store ID/Password. Optional - Stripe alone is enough to demonstrate the dual-gateway architecture. |
| S3 video upload + certificate PDF storage | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` | Create a free-tier AWS account → S3 → create a bucket → IAM → create a user with `PutObject`/`GetObject` permissions scoped to that bucket → generate access keys. Without this, certificate generation will produce the PDF in memory but fail to store it (the quiz/grading flow itself still works fully). |

Without these set, the corresponding actions fail gracefully with an error message (e.g. "Could not connect to the payment gateway") rather than crashing the app - everything else keeps working.

Add any of these later the same way you set `MONGO_URI`/`CLIENT_URLS`: Render dashboard → `learncs01-api` → Environment → add the variable → save (auto-redeploys).

## Troubleshooting

- **Login works but every other request 401s** - `CLIENT_URLS` on Render doesn't exactly match your Vercel URL (check for a trailing slash mismatch or `http` vs `https`).
- **First request after a while hangs for ~30-60s** - that's the free tier cold start described above, not an error.
- **CORS error in the browser console** - same root cause as the first bullet; double check step 5.
- **Certificate stuck on "processing" forever** - either Redis isn't reachable (check `REDIS_URL` is set, which the Blueprint does automatically) or AWS credentials aren't configured (see table above) - check the Render service logs for the actual error.
