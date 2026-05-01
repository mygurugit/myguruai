# MyGuru AI — Wednesday Day 1 Quick Start
# Follow this exactly on Wednesday morning

## Morning Session (6am–8am) — Architecture document

### What to do:
1. Open VS Code → open myguruai folder
2. Open docs/architecture/architecture.md
3. Write the architecture diagram (ask Claude to generate)
4. Write key decisions doc (ask Claude to generate)
5. Commit: git add . && git commit -m "Day 1: Architecture docs"

## Evening Session (8pm–11pm) — Supabase setup

### What to do:

### 1. Create Supabase project (15 min)
- Go to supabase.com → Sign in with GitHub
- New Project → name: "myguruai" → region: Southeast Asia (Singapore)
- Wait 2 minutes for project to be ready

### 2. Run schema.sql (5 min)
- Supabase Dashboard → SQL Editor
- Copy entire content of supabase/schema.sql
- Paste → click Run
- Check all tables created: users, subscriptions, usage_logs, question_cache, trial_phones, plans

### 3. Enable pgvector (2 min)
- SQL Editor → run:
  CREATE EXTENSION IF NOT EXISTS vector;

### 4. Enable Email Auth (5 min)
- Supabase Dashboard → Authentication → Providers
- Email → Enable → Save
- Set: Confirm email = ON, Secure email change = ON

### 5. Get API keys (5 min)
- Settings → API
- Copy: Project URL → paste in .env as SUPABASE_URL
- Copy: anon public key → paste in .env as SUPABASE_ANON_KEY
- Copy: service_role key → paste in .env as SUPABASE_SERVICE_KEY

### 6. Get Anthropic key (5 min)
- console.anthropic.com → API Keys → Create Key
- Paste in .env as ANTHROPIC_API_KEY
- Add $5 credit → moves to Tier 1 (1000 requests/day)

### 7. Test connection (5 min)
- Run: node -e "require('./api/server.js')"
- Should start without errors

### 8. Commit everything (2 min)
- git add .
- git commit -m "Day 1: Supabase setup + API keys configured"
- git push

## End of Day 1 — you should have:
✅ Architecture document written
✅ Supabase project created
✅ All 6 tables created
✅ pgvector enabled
✅ Email auth enabled
✅ All API keys in .env
✅ Committed to GitHub

## Day 2 (Thursday) — Build login page
- Morning: Design login page wireframe
- Evening: Code login.html with Supabase email OTP
