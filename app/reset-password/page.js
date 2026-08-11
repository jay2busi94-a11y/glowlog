'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from "../components/Navbar"
import { createClient } from '../../lib/supabase'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)

  // Supabase turns the emailed link into a recovery session on load. Until
  // that session exists there's nothing to update, so gate the form on it.
  useEffect(() => {
    const supabase = createClient()

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleUpdate(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Those passwords don’t match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setLoading(false)
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center px-4 overflow-hidden">

      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      <div className="relative z-10 w-full max-w-md bg-card border border-rule rounded-card p-8 mt-10">

        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✨</div>
            <h2 className="text-2xl font-bold mb-2">Password updated</h2>
            <p className="text-ink-mute text-sm">Taking you to your dashboard...</p>
          </div>
        ) : !ready ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Checking your link</h2>
            <p className="text-ink-mute text-sm mb-6">
              If this doesn&apos;t clear in a moment, the reset link may have expired.
            </p>
            <a
              href="/forgot-password"
              className="inline-block w-full bg-card hover:border-ink-mute border border-rule text-ink text-sm font-semibold py-3 rounded-full transition"
            >
              Request a new link
            </a>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-2 text-center">Set a new password</h2>
            <p className="text-ink-mute text-sm text-center mb-8">Pick something you&apos;ll remember this time.</p>

            <form onSubmit={handleUpdate} className="flex flex-col gap-4">

              <div>
                <label className="text-sm text-ink-mute mb-1 block">New password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-card border border-rule rounded-xl px-4 py-3 text-ink placeholder-ink-mute focus:outline-none focus:border-accent transition"
                />
              </div>

              <div>
                <label className="text-sm text-ink-mute mb-1 block">Confirm new password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
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
                {loading ? 'Saving...' : 'Update password'}
              </button>

            </form>
          </>
        )}

      </div>
    </main>
  )
}
