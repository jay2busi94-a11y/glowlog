'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from "../components/Navbar"
import { createClient } from '../../lib/supabase'

export default function SignUp() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmationPending, setConfirmationPending] = useState(false)
  const [resendStatus, setResendStatus] = useState('')

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      // Email confirmation is off — user is already signed in.
      router.push('/dashboard')
    } else {
      // Email confirmation is on — nothing to log in to yet.
      setConfirmationPending(true)
      setLoading(false)
    }
  }

  async function handleResend() {
    setResendStatus('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResendStatus(error ? 'error' : 'sent')
  }

  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center px-4 overflow-hidden">

      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      {confirmationPending ? (
        <div className="relative z-10 w-full max-w-md bg-card border border-rule rounded-card p-8 mt-10 text-center">
          <div className="text-4xl mb-4">📩</div>
          <h2 className="text-2xl font-bold mb-2">Check your email</h2>
          <p className="text-ink-mute text-sm mb-6">
            We sent a confirmation link to <span className="text-ink">{email}</span>. Click it to activate your account, then come back and log in.
          </p>

          <button
            onClick={handleResend}
            disabled={resendStatus === 'sending'}
            className="w-full bg-card hover:border-ink-mute border border-rule text-ink text-sm font-semibold py-3 rounded-full transition disabled:opacity-50"
          >
            {resendStatus === 'sending' ? 'Sending...' : "Didn't get it? Resend email"}
          </button>
          {resendStatus === 'sent' && (
            <p className="text-ok text-xs mt-3">Sent! Check your inbox (and spam folder).</p>
          )}
          {resendStatus === 'error' && (
            <p className="text-warn text-xs mt-3">Couldn&apos;t resend right now — try again in a moment.</p>
          )}

          <p className="text-center text-ink-mute text-sm mt-6">
            Already confirmed?{" "}
            <a href="/login" className="text-accent hover:text-accent transition">Log in</a>
          </p>
        </div>
      ) : (
      <div className="relative z-10 w-full max-w-md bg-card border border-rule rounded-card p-8 mt-10">
        <h2 className="text-3xl font-bold mb-2 text-center">Create your account</h2>
        <p className="text-ink-mute text-sm text-center mb-8">Start building your perfect skincare routine</p>

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">

          <div>
            <label className="text-sm text-ink-mute mb-1 block">Full Name</label>
            <input
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-card border border-rule rounded-xl px-4 py-3 text-ink placeholder-ink-mute focus:outline-none focus:border-accent transition"
            />
          </div>

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

          <div>
            <label className="text-sm text-ink-mute mb-1 block">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-[10px] text-ink-mute text-center mt-1">
            By signing up you agree to our <a href="/terms" className="text-accent hover:text-accent transition">Terms</a> and <a href="/privacy" className="text-accent hover:text-accent transition">Privacy Policy</a>.
          </p>

        </form>

        <p className="text-center text-ink-mute text-sm mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-accent hover:text-accent transition">Log in</a>
        </p>

        <div className="flex justify-center gap-5 mt-6 text-xs text-ink-mute">
          <a href="/privacy" className="hover:text-ink transition">Privacy</a>
          <a href="/terms" className="hover:text-ink transition">Terms</a>
          <a href="/about" className="hover:text-ink transition">About</a>
        </div>

      </div>
      )}
    </main>
  )
}
