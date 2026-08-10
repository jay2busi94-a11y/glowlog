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
    <main className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center px-4 overflow-hidden">

      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      <div className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 mt-10">

        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✨</div>
            <h2 className="text-2xl font-bold mb-2">Password updated</h2>
            <p className="text-gray-400 text-sm">Taking you to your dashboard...</p>
          </div>
        ) : !ready ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Checking your link</h2>
            <p className="text-gray-400 text-sm mb-6">
              If this doesn&apos;t clear in a moment, the reset link may have expired.
            </p>
            <a
              href="/forgot-password"
              className="inline-block w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold py-3 rounded-full transition"
            >
              Request a new link
            </a>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-2 text-center">Set a new password</h2>
            <p className="text-gray-400 text-sm text-center mb-8">Pick something you&apos;ll remember this time.</p>

            <form onSubmit={handleUpdate} className="flex flex-col gap-4">

              <div>
                <label className="text-sm text-gray-400 mb-1 block">New password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/50 transition"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Confirm new password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
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
                {loading ? 'Saving...' : 'Update password'}
              </button>

            </form>
          </>
        )}

      </div>
    </main>
  )
}
