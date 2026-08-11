'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from "../components/Navbar"
import { createClient } from '../../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Pre-fill the email if Remember me was checked on a previous visit.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('glowlog:remember_email')
    if (saved) setEmail(saved)
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Save (or clear) the email handle for next visit. Supabase already
    // persists the auth session itself by default — this checkbox is the
    // visible signal that the session sticks, plus the email-prefill UX.
    if (typeof window !== 'undefined') {
      if (rememberMe) window.localStorage.setItem('glowlog:remember_email', email)
      else window.localStorage.removeItem('glowlog:remember_email')
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center px-4 overflow-hidden">

      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      <div className="relative z-10 w-full max-w-md bg-card border border-rule rounded-card p-8 mt-10">
        <h2 className="text-3xl font-bold mb-2 text-center">Welcome back</h2>
        <p className="text-ink-mute text-sm text-center mb-8">Log in to your GlowLog account</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">

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

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="accent-accent w-4 h-4"
              />
              <span className="text-sm text-ink">Remember me</span>
            </label>
            <a href="/forgot-password" className="text-sm text-accent hover:text-accent transition">Forgot password?</a>
          </div>

          {error && <p className="text-warn text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-paper font-semibold py-3 rounded-full hover:opacity-90 transition shadow-lg disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

        </form>

        <p className="text-center text-ink-mute text-sm mt-6">
          Don't have an account?{" "}
          <a href="/signup" className="text-accent hover:text-accent transition">Sign up</a>
        </p>

        <div className="flex justify-center gap-5 mt-6 text-xs text-ink-mute">
          <a href="/privacy" className="hover:text-ink transition">Privacy</a>
          <a href="/terms" className="hover:text-ink transition">Terms</a>
          <a href="/about" className="hover:text-ink transition">About</a>
        </div>

      </div>
    </main>
  )
}
