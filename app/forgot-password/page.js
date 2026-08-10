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
    <main className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center px-4 overflow-hidden">

      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      <div className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 mt-10">

        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📩</div>
            <h2 className="text-2xl font-bold mb-2">Check your email</h2>
            <p className="text-gray-400 text-sm mb-6">
              If an account exists for <span className="text-white">{email}</span>, we&apos;ve sent a link to reset your password. The link expires after a short while.
            </p>
            <a
              href="/login"
              className="inline-block w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold py-3 rounded-full transition"
            >
              Back to log in
            </a>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-2 text-center">Reset your password</h2>
            <p className="text-gray-400 text-sm text-center mb-8">
              Enter your email and we&apos;ll send you a link to set a new one.
            </p>

            <form onSubmit={handleReset} className="flex flex-col gap-4">

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition"
                />
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 rounded-full hover:opacity-90 transition shadow-lg shadow-pink-500/20 mt-2 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

            </form>

            <p className="text-center text-gray-500 text-sm mt-6">
              Remembered it?{" "}
              <a href="/login" className="text-pink-400 hover:text-pink-300 transition">Log in</a>
            </p>
          </>
        )}

      </div>
    </main>
  )
}
