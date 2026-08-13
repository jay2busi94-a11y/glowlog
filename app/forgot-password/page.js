'use client'

import { useState } from 'react'
import Navbar from "../components/Navbar"
import { createClient } from '../../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Always land here on success. Supabase doesn't reveal whether the
      // address exists, and neither should we.
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center px-4 overflow-hidden">


      <Navbar />

      <div className="relative z-10 w-full max-w-md bg-card border border-rule rounded-card p-8 mt-10">

        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📩</div>
            <h2 className="text-2xl font-bold mb-2">Check your email</h2>
            <p className="text-ink-mute text-sm mb-6">
              If an account exists for <span className="text-ink">{email}</span>, we&apos;ve sent a link to reset your password. The link expires after a short while.
            </p>
            <a
              href="/login"
              className="inline-block w-full bg-card hover:border-ink-mute border border-rule text-ink text-sm font-semibold py-3 rounded-full transition"
            >
              Back to log in
            </a>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-2 text-center">Reset your password</h2>
            <p className="text-ink-mute text-sm text-center mb-8">
              Enter your email and we&apos;ll send you a link to set a new one.
            </p>

            <form onSubmit={handleReset} className="flex flex-col gap-4">

              <div>
                <label className="text-sm text-ink-mute mb-1 block">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-card border border-rule rounded-xl px-4 py-3 text-ink placeholder-ink-mute focus:outline-none focus:border-accent transition"
                />
              </div>

              {error && <p className="text-warn text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-paper font-semibold py-3 rounded-full hover:opacity-90 transition shadow-lg mt-2 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

            </form>

            <p className="text-center text-ink-mute text-sm mt-6">
              Remembered it?{" "}
              <a href="/login" className="text-accent hover:underline transition">Log in</a>
            </p>
          </>
        )}

      </div>
    </main>
  )
}
