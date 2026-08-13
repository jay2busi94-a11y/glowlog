# Data breach response procedure

Written 11 August 2026. This exists because the FTC's Health Breach Notification
Rule gives you **60 days** from *discovery* — not from the incident — and you
cannot design a notification process while the clock is running.

Not legal advice. Get this reviewed before you have real users.

## Why this applies to GlowLog

The FTC amended the Health Breach Notification Rule in 2024 to cover
direct-to-consumer health apps that aren't under HIPAA. GlowLog holds skin
condition ratings, free-text notes about skin, and face photos, drawn from more
than one source. That is likely "PHR identifiable health information".

Assume it applies. The cost of assuming it does and being wrong is a few hours
of writing. The cost of the reverse is a missed statutory deadline.

## What counts as a breach

Any unauthorised acquisition of user data. It does **not** require malice or a
hacker. All of these count:

- A storage bucket or table made publicly readable when it shouldn't be
- Credentials committed to a public repo (`SUPABASE_SERVICE_ROLE_KEY`,
  `ANTHROPIC_API_KEY`, `IMAGEKIT_PRIVATE_KEY`)
- An RLS policy that lets one user read another's rows
- A vendor (Supabase, Vercel, Anthropic, ImageKit) telling you they were breached
- Sending the wrong user's data to someone in an email or support reply

The near-miss on 11 August 2026 — all three storage buckets public, including
skin photos — is exactly the shape of thing that would have counted, had any
photo actually been read.

## The clock

| When | What | Who |
|---|---|---|
| Immediately | Stop the bleeding — revoke keys, flip the bucket, disable the route | You |
| Within hours | Write down what happened, when you found it, what data, how many people | You |
| Before day 60 | Notify every affected individual | You |
| Before day 60 | Notify the FTC **if 500+ people affected** | You |
| Within 10 days of that | Notify prominent media **if 500+ residents of one state** | You |

Sixty days is the outer limit, not the target. "Without unreasonable delay" is
the actual standard.

## Step 1 — contain

1. Rotate any exposed key. All four vendors let you do this from their dashboard.
   `SUPABASE_SERVICE_ROLE_KEY` is the worst one — it bypasses every RLS policy.
2. Close the hole. Prefer a config change (bucket privacy, RLS policy) over a
   deploy; it's faster and can't fail a build.
3. **Do not delete logs.** You need them to work out who was affected.

## Step 2 — work out who

This is the step people can't do, and it's why the logging matters more than it
seems.

- Supabase → Logs → Storage / API. Filter by the affected path or table.
- Vercel → the deployment's function logs.
- Ask: which `user_id`s appear? Which objects were actually *read*, not just
  readable?

Note the difference between **exposed** and **accessed**. If you can show from
logs that nothing was fetched, say so plainly in the notification — it changes
what people need to do. If you can't tell, assume the worst and say that too.

## Step 3 — notify

Notify by email to the address on the account, and put a notice on the site if
you can't reach people. The notice has to say, in plain language:

- What happened, and the date it happened and the date you found it
- Exactly what data was involved — name the fields, don't say "some information"
- What you have done about it
- What the person should do (change password, watch for phishing)
- How to contact you with questions

Write it the way the rest of GlowLog is written: no apologising into vagueness,
no "we take your privacy seriously". Say what happened and what you did.

## Step 4 — write it down

Keep a dated record of the incident, the decisions and the notifications, even
for incidents you conclude were not notifiable. If you're ever asked, the record
is the evidence you handled it properly.

## Contacts

| Vendor | Holds | Where to report / rotate |
|---|---|---|
| Supabase | Database, auth, all photos | Project dashboard → Settings → API |
| Vercel | Hosting, env vars, function logs | Project → Settings → Environment Variables |
| Anthropic | AI request contents in transit | console.anthropic.com → API keys |
| ImageKit | Avatars and product photos | Dashboard → Developer options |

FTC breach reporting: <https://www.ftc.gov/business-guidance/privacy-security>

## Prevention, in priority order

1. Never commit a key. `.gitignore` covers `.env*`, and it must stay that way.
2. Storage buckets default to public — check the flag whenever you add one.
3. Every table needs RLS. Every private bucket needs a SELECT policy scoped to
   the owner's folder.
4. Run `get_advisors` on the Supabase project periodically; it flags missing RLS.
