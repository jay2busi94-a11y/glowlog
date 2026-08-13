# App Store privacy labels — what to declare

Written 11 August 2026, from the live database schema rather than from the
privacy policy. Apple's labels must match what the app actually does; a
mismatch is both a review rejection and an FTC §5 problem.

Fill this into App Store Connect → App Privacy.

## The three questions Apple asks per data type

1. **Is it collected?**
2. **Is it linked to the user's identity?** — for GlowLog, almost everything is,
   because every row is keyed to `user_id`.
3. **Is it used for tracking?** — **no**, for everything. GlowLog has no
   analytics, no ad SDK, no third-party cookies, and shares nothing with data
   brokers. Answer "No" to tracking across the board, and protect that answer:
   adding one analytics SDK changes it.

## Declare these

| Apple category | GlowLog data | Linked? | Purpose |
|---|---|---|---|
| Contact Info → Email Address | Sign-in email | Yes | App Functionality |
| User Content → Photos | Progress photos, avatar, product photos | Yes | App Functionality |
| User Content → Other | Skin notes, bio | Yes | App Functionality |
| Health & Fitness → Health | Skin type, concerns, daily skin rating | Yes | App Functionality |
| Identifiers → User ID | `user_id`, username | Yes | App Functionality |
| Usage Data → Product Interaction | Routine completion, streaks | Yes | App Functionality |

**Health & Fitness is the row people miss.** Skin type, skin concerns and a
daily 1–5 skin rating are health data as Apple defines it. Declaring it is what
makes the rest of the submission consistent — and under-declaring is worse than
declaring, because Apple checks.

## Do NOT declare

- **Location** — never collected.
- **Contacts** — the follow graph is in-app only; the address book is never read.
- **Purchases** — no payment processor exists yet. This changes when Premium
  becomes real.
- **Diagnostics / crash data** — not collected today.

## Also required by Apple

- **Account deletion in-app.** Done — `/settings` → Danger zone →
  `/api/delete-account`. Apple's reviewer will test this path, so make sure the
  deployed environment has `SUPABASE_SERVICE_ROLE_KEY` set or it returns a 503
  and fails review.
- **A reachable privacy policy URL.** `/privacy`.
- **Age rating.** Signup gates at 13+. Expect the health category and
  user-generated content (public profiles, follows) to push the rating up and
  slow review.

## Expect a slower review

Apple reviews health, AI, and user-generated content more carefully. GlowLog is
all three. Have ready:

- A test account with data already in it — a reviewer who signs up into an empty
  app can't see the features work.
- A note in App Review Notes explaining that AI output is guidance, not
  diagnosis, and pointing at where the disclaimers appear.
- The account deletion path spelled out step by step.

## When Premium becomes real

Auto-renewable subscriptions add their own requirements: price and term shown
before purchase, a link to terms, restore-purchases, and cancellation guidance.
Revisit this file at that point — none of it applies while the upgrade button is
disabled.
