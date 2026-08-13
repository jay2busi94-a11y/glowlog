# CLAUDE.md

Instructions for AI agents working in this repo. `README.md` covers what GlowLog is and
how to run it — this file covers how to work on it without breaking things.

## The three pillars

Every feature gets judged against these. If a proposal doesn't serve one, say so.

1. **Total beginners** — no blank slates. They need a starting point handed to them.
2. **People who own products but don't know the order** — this is the core value. Order,
   dose, frequency, and what shouldn't be layered. Most design decisions should serve this.
3. **People looking for what's next** — AI suggestions with the reason attached.

## Conventions to match, not fight

- **Supabase queries are written inline in page files**, not centralised in `lib/`. This is
  deliberate. There is intentionally no `lib/follows.js`. Don't introduce an abstraction
  layer because it feels tidier — match the surrounding style.
- Pages are client components with inline Tailwind classes. Keep comment density and naming
  consistent with the file you're editing.
- The user is a beginner coder. Explain *why*, give one step at a time, and confirm each
  landed before moving on.
- The user sometimes edits via the GitHub web editor on a second machine, so local `main`
  can drift. **`git fetch origin main` before starting local work.**

## Traps that have already bitten

- **`/u/[username]` must also accept UUIDs.** `profiles.username` is nullable, so users
  without one are unreachable by name. The page checks for a UUID shape and queries
  `user_id` in that case. Always link as `` `/u/${p.username || p.user_id}` ``. Display
  fallback order: `display_name` → `@username` → `'GlowLog User'`.
- **PostgREST cannot embed `follows` → `profiles`.** `follows.follower_id` /
  `following_id` FK to `auth.users.id`, not `public.profiles.user_id`, so a nested
  `select('following_id, profiles(...)')` silently returns nulls. Fetch the follow IDs
  first, then a separate `.in('user_id', allIds)` against profiles. Don't add a direct FK
  unless every auth user is guaranteed a profile row — today rows are only created when a
  user edits `/profile`.
- **`.env.local` is gitignored** and must be recreated by hand after a fresh clone.
  `ANTHROPIC_API_KEY` and `IMAGEKIT_PRIVATE_KEY` are secret — never give them a
  `NEXT_PUBLIC_` prefix, never paste them into a chat, never commit them.

## ImageKit

Product photos and avatars are optimised through ImageKit; **skin photos deliberately are
not**. Those are users' face photos and `/privacy` names Supabase as the storage processor —
routing them through a second vendor would make that statement untrue. Adding `skin-photos`
to `PROXIED_BUCKETS` in `lib/imagekit.js` is a legal decision, not a technical one: update
`/privacy` first.

The whole path is gated behind `NEXT_PUBLIC_IMAGEKIT_ENABLED`. While unset, every helper
returns the original Supabase URL, so the feature ships inert. That flag is also the kill
switch — unset and redeploy rather than reverting code.

**Blocked:** ImageKit returns 404 for Supabase paths because no *web folder origin* exists
yet. It must be created in the ImageKit dashboard (Settings → Origins) with base URL
`https://efcjvfpvttgvziddhzcs.supabase.co/storage/v1/object/public`, then attached to the
`jayj64` URL endpoint. The accounts/origins API returns 403 on this plan, so an agent cannot
do this — only the account owner can. Do not set the flag to `1` before that exists or every
product image breaks.

## Profile privacy — read this before touching `profiles`

`profiles` RLS is `owner OR public_profile = true`. It used to be
`USING (true)`, which meant anyone holding the anon key — public by design —
could read every user's `skin_type`, `concerns`, `age_range` and `bio`,
including for accounts set to Private. `/privacy` promises the opposite.

The privacy policy also promises that name and avatar stay visible when
private, "so people can still find and follow you". RLS is row-level and
can't do that, so `public.profile_cards` is a view exposing exactly five
non-sensitive columns for every row. Follower lists, search and the
`/u/[username]` lookup read from it; everything else reads `profiles`.

**Never add a column to `profile_cards`.** It runs `security_invoker = false`
so it can see rows RLS would hide — that is the whole point, and it is also
why adding `concerns` or `skin_type` to it would silently undo the fix.
Supabase's linter flags it as `security_definer_view`; that is a known,
accepted trade-off, not an oversight.

Two consequences to remember:
- **Username availability must query `profile_cards`, not `profiles`.**
  `username` is UNIQUE, so checking against RLS-filtered rows reports a name
  held by a private account as free, and the save then fails.
- **`/u/[username]` does a two-step lookup** — card first, then the full row.
  Falling back to the card means RLS refused, which can only mean private and
  not ours, so it sets `public_profile: false` explicitly. `isPublicProfile()`
  reads a missing flag as *public*, so the explicit value matters.

## Design system

Designed but **not yet wired into the app** — the app still uses the old dark pink/purple
gradient styling. Standalone reference pages live in `design/`:

- `design/v1-clinic.html` — hard-edged: 4px radius, hairline rules, Archivo Expanded
- `design/v2-soft.html` — rounded scale, shadow-based depth, Manrope
- `design/v3-motion.html` — v2 plus a motion budget (**current preferred version**)
- `design/landing.html` — the marketing page, heavy scroll animation

Each is self-contained with fonts embedded; open directly in a browser.

**The rules, which are the point:**

- **One accent, and it means one thing: you can act on this.** Nothing decorative gets it.
  Status colours (warn / ok) are a separate axis and never travel without words.
- **No gradients.** Not on text, not on buttons, not behind the hero. Soft is achieved with
  shadow and radius. The single exception is the hero scan line's `box-shadow` bloom.
- **Mono (`DM Mono`) is for data only** — percentages, pH, dates, step numbers, uppercase
  eyebrows. Never prose.
- **No emoji as UI.** They render differently per platform and can't be styled.
- **Morning/night is a glyph, not a colour** — filled circle for AM, hollow for PM. Keeps
  colour single-purpose and stays readable for colour-vision deficiency.
- **Radius scale:** 10 inputs / 16 cards / 22 large surfaces / full pill for buttons+chips.
- **Spacing:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64, applied with `gap` on a flex or grid
  parent — not margins on children.
- Three themes (Clinic / Darkroom / Sachet) define the **same nine token names**, so
  switching is a variable swap and no component changes.

### Motion budget

How much a surface animates depends on how often it's seen:

| Surface | Budget |
|---|---|
| Landing, About — seen once | Generous: scroll-driven reveals, 400–600ms |
| Onboarding, scanning — weekly | Measured: 240–320ms |
| Dashboard, routine, shelf — twice daily | Nearly none: 120–180ms, state changes only |

- **Animate `transform` and `opacity` only** on anything large or hover-triggered. Cost
  scales with repainted area — a shadow transition on a full-width card is expensive; a
  focus ring on a chip is not.
- To animate a card lift, pre-paint the raised shadow on an `::after` and fade its opacity.
  Note `overflow: hidden` on the card clips that shadow — round the inner image instead.
- Scroll effects use CSS `animation-timeline: view()` inside `@supports`, never a scroll
  listener. Never on daily screens.
- `prefers-reduced-motion` must yield a fully static, correct page. Never hardcode
  `opacity: 0` inline as an animation start state — it strands content when motion is off.

## Needs the account owner (an agent cannot do these)

1. ImageKit web folder origin (above), then `NEXT_PUBLIC_IMAGEKIT_ENABLED=1` in Vercel.
2. `SUPABASE_SERVICE_ROLE_KEY` in Vercel — `/api/delete-account` returns a clean 503
   without it, and in-app deletion is an App Store requirement.
3. `/reset-password` added to Supabase → Authentication → URL Configuration redirect
   allowlist, or password resets fail in production.

## Don't

- Don't fabricate testimonials, reviews, or user counts. GlowLog has no users yet; the
  landing page uses verifiable claims instead.
- Don't present "Premium" as a real tier. It unlocks via a hardcoded client-visible code
  (`GLOWLUX` in `lib/profile.js`), the upgrade button is disabled, and no payment processor
  is integrated.
- Don't give medical advice. Ingredient-pairing guidance ships with "general guidance, not
  medical advice" alongside it.
