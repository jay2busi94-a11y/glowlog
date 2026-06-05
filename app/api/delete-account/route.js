// Hard-deletes the signed-in user. Apple's App Store rules require account
// deletion to be possible from INSIDE the app — this endpoint is what
// /settings → Danger zone → Delete account calls.
//
// Two pieces of work:
// 1. Clean up Storage objects (avatars, product-photos, skin-photos)
//    under the user's folder. Storage doesn't cascade on auth.users delete.
// 2. Call auth.admin.deleteUser(userId). The FK relationships on profiles,
//    routines, products, skin_logs, and follows all CASCADE on auth.users
//    delete, so the row + every related row vanishes together.
//
// Requires SUPABASE_SERVICE_ROLE_KEY to be set in env. It must NEVER be
// prefixed with NEXT_PUBLIC_ — it's strictly server-side.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STORAGE_BUCKETS = ['avatars', 'product-photos', 'skin-photos']

export async function POST() {
  if (!SERVICE_KEY) {
    return Response.json(
      {
        error: "Account deletion isn't fully configured. The site owner needs to add SUPABASE_SERVICE_ROLE_KEY to Vercel's environment variables and redeploy.",
      },
      { status: 503 }
    )
  }
  if (!SUPABASE_URL) {
    return Response.json({ error: 'Missing Supabase URL.' }, { status: 500 })
  }

  // 1. Identify the signed-in user via the cookie-based browser session.
  let userId
  try {
    const cookieStore = await cookies()
    const ssrClient = createServerClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { /* not needed for read-only auth check */ },
        },
      }
    )
    const { data: { user } } = await ssrClient.auth.getUser()
    if (!user) return Response.json({ error: 'Not signed in.' }, { status: 401 })
    userId = user.id
  } catch (err) {
    console.error('delete-account auth check failed:', err)
    return Response.json({ error: 'Could not verify your session. Try signing in again.' }, { status: 401 })
  }

  // 2. Admin client (service role bypasses RLS).
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 3. Delete every storage object under {userId}/ in each bucket. We list
  // first and pass the resulting paths to remove() so partial failures
  // don't take down the whole flow.
  const cleanupErrors = []
  for (const bucket of STORAGE_BUCKETS) {
    try {
      const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 })
      if (files && files.length > 0) {
        const paths = files.map(f => `${userId}/${f.name}`)
        const { error: rmErr } = await admin.storage.from(bucket).remove(paths)
        if (rmErr) cleanupErrors.push(`${bucket}: ${rmErr.message}`)
      }
    } catch (err) {
      cleanupErrors.push(`${bucket}: ${err.message || String(err)}`)
    }
  }

  // 4. Delete the auth user. FK CASCADE handles every public.* row.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId)
  if (delErr) {
    return Response.json(
      {
        error: 'Could not delete your account. Try again, or contact jayflare94@gmail.com.',
        detail: delErr.message,
        storage_cleanup_errors: cleanupErrors,
      },
      { status: 500 }
    )
  }

  return Response.json({
    ok: true,
    storage_cleanup_errors: cleanupErrors,
  })
}
