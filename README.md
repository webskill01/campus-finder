# CampusFinder — Lost & Found Management System

Dark-themed single-page web app for campus lost and found. Students report lost/found items. An AI matching engine automatically links them. Groq LLM enriches descriptions and parses natural language search.

**Stack:** React 18 + Vite · Node/Express · MongoDB Atlas · Groq · Cloudinary · Brevo SMTP

---

## Prerequisites

You need accounts and credentials from these services before running the app.

### 1. MongoDB Atlas (free)
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free M0 cluster
2. Database Access → Add user with password
3. Network Access → Add your IP (or `0.0.0.0/0` for dev)
4. Connect → Drivers → Copy connection string → replace `<password>`
5. Add to `.env` as `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/campusfinder`

### 2. Groq API (free, no credit card)
1. Go to [console.groq.com](https://console.groq.com) → Sign up
2. API Keys → Create API Key
3. Add to `.env` as `GROQ_API_KEY=gsk_...`

### 3. Cloudinary (free)
1. Go to [cloudinary.com](https://cloudinary.com) → Sign up
2. Dashboard → Copy Cloud Name, API Key, API Secret
3. Add to `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   ```

### 4. Brevo SMTP (free tier — 300 emails/day)
1. Go to [brevo.com](https://www.brevo.com) → Sign up
2. Settings → SMTP & API → SMTP
3. Copy your SMTP login and SMTP key
4. Verify the sender address or domain you want to use in outgoing mail
5. Add to `.env`:
   ```
   BREVO_SMTP_USER=your_brevo_login@example.com
   BREVO_SMTP_PASS=xsmtpsib-...
   MAIL_FROM=CampusFinder <noreply@yourdomain.com>
   ```

### 5. Node.js v18+
- Install from [nodejs.org](https://nodejs.org)

---

## Project Structure

```
campusfinder/
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/api.js              # All fetch calls (only file that calls fetch)
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── TabBar.jsx
│       │   ├── ItemCard.jsx
│       │   ├── MatchCard.jsx
│       │   ├── Popup.jsx
│       │   ├── SearchBar.jsx
│       │   ├── Upload.jsx
│       │   ├── PostPopup.jsx
│       │   ├── DetailPopup.jsx
│       │   ├── InterestPopup.jsx
│       │   ├── LoginPopup.jsx
│       │   ├── FilterPanel.jsx
│       │   ├── ChipRow.jsx
│       │   ├── ResolvedStrip.jsx
│       │   └── FAB.jsx
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Manage.jsx
│       │   └── Admin.jsx
│       ├── context/AppContext.jsx  # Global state
│       └── hooks/
│           ├── useDebounce.js
│           ├── useScrollDirection.js
│           └── useTimeAgo.js
├── server/
│   ├── index.js
│   ├── config/db.js
│   ├── models/
│   │   ├── Item.js
│   │   └── Token.js
│   ├── routes/
│   │   ├── items.js
│   │   ├── auth.js
│   │   └── admin.js
│   ├── services/
│   │   ├── groq.js
│   │   ├── matcher.js
│   │   ├── mailer.js
│   │   └── tagger.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── rateLimit.js
│   └── jobs/expiry.js
├── .env.example
├── ecosystem.config.js             # PM2 config for VPS deployment
└── package.json
```

---

## Running Locally

```bash
# 1. Clone and install
git clone https://github.com/yourusername/campusfinder.git
cd campusfinder
npm install

# 2. Set up environment
cp .env.example .env
# Fill in all values in .env

# 3. Start dev server (runs both frontend and backend)
npm run dev
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `PORT` | Backend port (default: 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random 32+ char string (`openssl rand -hex 32`) |
| `GROQ_API_KEY` | Groq API key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `BREVO_SMTP_USER` | Brevo SMTP login |
| `BREVO_SMTP_PASS` | Brevo SMTP key |
| `MAIL_FROM` | Verified sender address used in outgoing emails |
| `ADMIN_PASSWORD` | Password for `/admin` page |
| `CLIENT_URL` | Frontend URL (for CORS) — `http://localhost:3000` in dev |

---

## Deployment

Frontend on **Vercel**, backend on a **VPS** (or any Node host).

### Backend (VPS + PM2)

```bash
git clone https://github.com/yourusername/campusfinder.git /opt/campusfinder
cd /opt/campusfinder
npm install --omit=dev

# Create .env with production values (CLIENT_URL = your Vercel URL)
nano .env

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
```

Expose via Nginx or Cloudflare Tunnel on a subdomain (e.g. `api.yourdomain.com`).

### Frontend (Vercel)

In the Vercel dashboard, import the repo with these settings:

| Setting | Value |
|---|---|
| Root Directory | `client` |
| Framework | Vite |
| Build Command | `vite build` |
| Output Directory | `dist` |

Add environment variable:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://api.yourdomain.com` |

---

## npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start frontend + backend concurrently (development) |
| `npm run build` | Build React frontend to `client/dist` |
| `npm start` | Start backend only (production) |
| `npm run client` | Start Vite dev server only |

---

## Features

### Core
- Single-page app — all interactions via popup windows
- JWT identity: Gmail + Roll No + DOB → 14-day browser token, no passwords
- Found / Lost tab switch with 20 items/page grid
- Category pills: Phone, Keys, Bag, Documents, Electronics, Accessories, Clothing, Other
- Filters: Recent, Oldest, A→Z, Best match · Date: Today, This week, All time
- Resolved items strip at bottom (last 48h, text-only, no images)

### AI Matching Engine
- TF-IDF text similarity, runs entirely server-side (zero API cost)
- Multi-signal scoring: text (40) + category (25) + location (20) + date (15) + color (10)
- Matches shown only if score > 40%
- Top 3 matches with % badge and signal pills in detail popup
- Bidirectional — both poster and finder see the match

### Groq LLM (async, graceful degradation)
- Description enrichment: extracts keywords, color, brand
- Natural language search: converts plain-text queries into structured filters
- Icon selection: picks best Lucide icon when no image is uploaded
- All Groq calls are fire-and-forget — app works fully if Groq is unavailable

### Image Handling
- Optional upload with nsfwjs client-side safety check
- ColorThief extracts dominant color client-side for color matching
- Cloudinary storage

### Contact & Privacy
- "This might be mine" → email sent to poster, contact never shown publicly
- Manage link emailed to poster on creation (`/manage/:token`)
- Manage page: edit, resolve, delete

### Admin
- Password-protected `/admin` page
- View/filter/delete all items
- Stats dashboard (active / resolved / expired)

---

## Colour Palette

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#1b1b1b` | Page background |
| `--surface` | `#292929` | Cards, popups, nav |
| `--mid` | `#232323` | Inputs, hover states |
| `--accent` | `#ffa500` | Buttons, active state, match indicators |
| `--gray` | `#808080` | Secondary text, icons, metadata |
