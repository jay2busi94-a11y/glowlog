// Server-side auth gate for API routes.
//
// Every AI route calls Anthropic, and every Anthropic call costs real money
// against our key. Until this existed, all six were open to the internet:
// an anonymous POST to /api/suggest-products returned a full AI response.
// The "5 free per day" cap lives in localStorage, so it never applied to
// anyone calling the endpoint directly — it was a UI convenience, not a
// control.
//
// This verifies the caller's Supabase session from the request cookies. It
// does not trust anything in the request body.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * @returns {Promise<{ user: object|null, response: Response|null }>}
 *   `response` is a ready-to-return 401 when there's no valid session.
 */
export async function requireUser() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { /* read-only auth check */ },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { user: null, response: Response.json({ error: 'Sign in to use this feature.' }, { status: 401 }) }
    }
    return { user, response: null }
  } catch (err) {
    console.error('API auth check failed:', err)
    return {
      user: null,
      response: Response.json({ error: 'Could not verify your session. Try signing in again.' }, { status: 401 }),
    }
  }
}
