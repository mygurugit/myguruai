# MyGuru AI — உங்கள் doubt-க்கு உடனடி பதில்

India's first Tamil AI exam tutor for NEET, JEE, TNPSC, UPSC, Bank PO and SSC.

**Live site:** https://myguruai.in

---

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | HTML + CSS + JS | Free (Vercel) |
| Backend API | Node.js (Express) | Free (Railway) |
| Database | Supabase (PostgreSQL) | Free tier |
| Auth | Supabase Email OTP | Free |
| AI | Claude (Anthropic) | Pay per use |
| Payments | Razorpay | 2% per txn |
| Email | Resend | Free 3K/mo |
| Cache | Supabase pgvector | Free tier |

---

## Project Structure

```
myguruai/
├── frontend/          ← All HTML pages → deployed to Vercel
│   ├── index.html     ← Homepage (live on myguruai.in)
│   ├── login.html     ← Student login
│   ├── signup.html    ← Plan selection + trial
│   ├── dashboard.html ← Main chat interface
│   ├── pricing.html   ← Subscription page
│   └── admin.html     ← Your admin dashboard
├── api/               ← Node.js backend → deployed to Railway
│   ├── server.js      ← Main API server
│   ├── emails.js      ← Email templates
│   └── cache.js       ← Semantic cache logic
├── supabase/          ← Database
│   ├── schema.sql     ← All tables + functions
│   └── functions/     ← Edge functions
├── docs/              ← Architecture + API docs
├── tests/             ← QA test files
└── scripts/           ← Utility scripts
```

---

## Local Development Setup

### 1. Install prerequisites
- Node.js LTS: https://nodejs.org
- Git: https://git-scm.com

### 2. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/myguruai.git
cd myguruai
npm install
```

### 3. Set up environment variables
```bash
copy .env.example .env
# Fill in your API keys in .env
```

### 4. Run locally
```bash
# Terminal 1 — Start API server
nodemon api/server.js

# Terminal 2 — Open frontend
cd frontend && start index.html
```

---

## Environment Variables

See `.env.example` for all required variables.

| Variable | Where to get |
|---------|-------------|
| SUPABASE_URL | supabase.com → Settings → API |
| SUPABASE_SERVICE_KEY | supabase.com → Settings → API |
| ANTHROPIC_API_KEY | console.anthropic.com |
| RAZORPAY_KEY_ID | dashboard.razorpay.com |
| RAZORPAY_KEY_SECRET | dashboard.razorpay.com |
| RESEND_API_KEY | resend.com |

---

## Deployment

**Frontend** — Push to GitHub → Vercel auto-deploys to myguruai.in

**Backend** — Push to GitHub → Railway auto-deploys API server

**Database** — Supabase hosted (no deployment needed)

---

## Subscription Plans

| Plan | Price | Daily Limit |
|------|-------|-------------|
| Free | ₹0 | 10 Q/day |
| TNPSC | ₹79/mo | 50 Q/day |
| NEET | ₹129/mo | 60 Q/day |
| JEE | ₹129/mo | 60 Q/day |
| UPSC | ₹199/mo | 60 Q/day |
| Bank PO | ₹79/mo | 50 Q/day |
| SSC | ₹79/mo | 50 Q/day |

---

## 8-Week Build Plan

- **Week 1–2:** Documentation + Supabase + Railway setup
- **Week 3–4:** Login + Dashboard + Chat + Voice
- **Week 5–6:** Payments + Admin + Emails
- **Week 7:** QA Testing
- **Week 8:** Launch 🚀

**Launch date:** Wednesday June 18, 2025

---

## Contact

- Email: contact@myguruai.in
- Website: https://myguruai.in

---

*MyGuru AI is not affiliated with NTA, UPSC, TNPSC or any government body.*
