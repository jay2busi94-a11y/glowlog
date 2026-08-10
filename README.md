# GlowLog

A skincare app for people who don't know where to begin.

GlowLog helps you build a routine that fits your skin, learn what each step actually does, and track whether it's working — with AI that can read your product labels and ingredient lists.

**Live:** https://glowlog-neon.vercel.app

## Who it's for

1. **Total beginners** — guided onboarding generates a starter morning/night routine from your skin type, concerns, and age. No blank slates.
2. **People who own products but aren't sure how to use them** — every routine step explains what it does, when to use it, and what not to layer it with.
3. **People looking for their next product** — AI suggestions by concern and skin type, plus a curated brand library.

## Features

- **Routines** — Simple mode (curated checklist) or Advanced mode (drag-and-drop builder, unlimited custom routines), with products linked to individual steps
- **Daily logging** — rate your skin 1–5, add a note and a photo, check off routine steps
- **Progress** — rating chart, streak tracking, and a photo timeline with full-screen compare
- **Product catalog** — track what you own, what's in active use, and what's sitting unused
- **AI features** (Claude):
  - Scan a product label to auto-fill its details
  - Scan a whole shelf to add several products at once
  - Photograph an ingredient list and get it checked against your concerns
  - "Fix My Skin" — a conversational advisor that sees your logs and routine
  - Personalized product suggestions and per-product usage tips
- **Social** — usernames, public profiles, follow other users, browse their routines and shelves

## Tech stack

- **Next.js** (App Router, Turbopack) + **React 19**
- **Tailwind CSS v4**
- **Supabase** — auth, Postgres with RLS, and storage (avatars, product photos, skin photos)
- **Anthropic Claude** — all AI and vision features
- Deployed on **Vercel**, auto-deploys on push to `main`

## Running locally

```bash
git clone https://github.com/jay2busi94-a11y/glowlog.git
cd glowlog
npm install
npm run dev
```

Then open http://localhost:3000.

### Environment variables

`.env.local` is gitignored, so you have to create it by hand after cloning. Without it, login and signup fail silently and the AI features won't work.

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ANTHROPIC_API_KEY=your-anthropic-key
```

`ANTHROPIC_API_KEY` is secret — never prefix it with `NEXT_PUBLIC_`.

`SUPABASE_SERVICE_ROLE_KEY` is also needed in the deployed environment for account deletion (`/api/delete-account`) to work. Without it that route returns a 503 explaining as much. Get it from Supabase → Settings → API → `service_role`, and set it in Vercel only — never commit it.

## Notes

- Email confirmation is enabled in Supabase, so new accounts have to click the emailed link before they can log in.
- If you deploy to a new domain, add it to Supabase → Authentication → URL Configuration (Site URL + Redirect URLs) or email confirmation and password resets will break.
