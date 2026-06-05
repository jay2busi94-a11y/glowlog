'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [publicProfile, setPublicProfile] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      const { data } = await supabase
        .from('profiles')
        .select('advanced_mode, public_profile')
        .eq('user_id', user.id)
        .maybeSingle()
      setProfile(data)
      setAdvancedMode(!!data?.advanced_mode)
      // Default true so users who never set it stay public (matches DB default).
      setPublicProfile(data?.public_profile !== false)
      setLoading(false)
    })
  }, [])

  async function setMode(next) {
    if (!user || saving) return
    setSaving(true)
    setAdvancedMode(next)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .upsert(
        { user_id: user.id, advanced_mode: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    setSaving(false)
  }

  async function setVisibility(nextPublic) {
    if (!user || saving) return
    setSaving(true)
    setPublicProfile(nextPublic)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .upsert(
        { user_id: user.id, public_profile: nextPublic, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    setSaving(false)
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 app-page-pad-bottom overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-3xl mx-auto app-page-pad-top">

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Settings ⚙️</h1>
          <p className="text-gray-400">Tune how GlowLog works for you.</p>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            {/* Routine builder mode */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <p className="text-sm font-semibold text-pink-300 mb-1">Routine builder mode</p>
              <p className="text-xs text-gray-500 mb-5">Pick how much control you want when editing your routines.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setMode(false)}
                  className={`text-left p-5 rounded-2xl border transition ${
                    !advancedMode
                      ? 'bg-pink-500/10 border-pink-500/50 shadow-md shadow-pink-500/10'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🌱</span>
                    <p className={`font-semibold ${!advancedMode ? 'text-white' : 'text-gray-200'}`}>Simple</p>
                    {!advancedMode && <span className="text-[10px] uppercase tracking-wider text-pink-300/80 font-bold">· Active</span>}
                  </div>
                  <p className="text-xs text-gray-400">Pick your morning and night steps from a guided checklist. We keep two routines and the order matches how you'd apply them. Good for getting going.</p>
                </button>
                <button
                  onClick={() => setMode(true)}
                  className={`text-left p-5 rounded-2xl border transition ${
                    advancedMode
                      ? 'bg-pink-500/10 border-pink-500/50 shadow-md shadow-pink-500/10'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🧪</span>
                    <p className={`font-semibold ${advancedMode ? 'text-white' : 'text-gray-200'}`}>Advanced</p>
                    {advancedMode && <span className="text-[10px] uppercase tracking-wider text-pink-300/80 font-bold">· Active</span>}
                  </div>
                  <p className="text-xs text-gray-400">Full editor — unlimited routines, drag-to-reorder, rename steps, add custom ones. Best if you've been doing skincare a while.</p>
                </button>
              </div>

              <p className="text-xs text-gray-600 mt-4">
                You can switch any time, including from inside the Routine tab. Your saved routines are kept either way.
              </p>
            </div>

            {/* Profile visibility */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <p className="text-sm font-semibold text-pink-300 mb-1">Profile visibility</p>
              <p className="text-xs text-gray-500 mb-5">Who can see your routines and product shelf.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setVisibility(true)}
                  className={`text-left p-5 rounded-2xl border transition ${
                    publicProfile
                      ? 'bg-pink-500/10 border-pink-500/50 shadow-md shadow-pink-500/10'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🌐</span>
                    <p className={`font-semibold ${publicProfile ? 'text-white' : 'text-gray-200'}`}>Public</p>
                    {publicProfile && <span className="text-[10px] uppercase tracking-wider text-pink-300/80 font-bold">· Active</span>}
                  </div>
                  <p className="text-xs text-gray-400">Anyone signed in can find your profile, see your routines and product shelf, and follow you. Default.</p>
                </button>
                <button
                  onClick={() => setVisibility(false)}
                  className={`text-left p-5 rounded-2xl border transition ${
                    !publicProfile
                      ? 'bg-pink-500/10 border-pink-500/50 shadow-md shadow-pink-500/10'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔒</span>
                    <p className={`font-semibold ${!publicProfile ? 'text-white' : 'text-gray-200'}`}>Private</p>
                    {!publicProfile && <span className="text-[10px] uppercase tracking-wider text-pink-300/80 font-bold">· Active</span>}
                  </div>
                  <p className="text-xs text-gray-400">Your name, avatar, and follower counts stay visible so people can still find + follow you. Routines, products, bio, and concerns are hidden.</p>
                </button>
              </div>

              <p className="text-xs text-gray-600 mt-4">
                Changing this takes effect immediately for anyone viewing your profile. Your existing followers are not removed.
              </p>
            </div>

            {saving && <p className="text-[10px] text-gray-500 mb-4">Saving...</p>}

            <DangerZone />

            <a href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
              ← Back to dashboard
            </a>

            <div className="mt-12 pt-6 border-t border-white/5 flex gap-5 text-xs text-gray-600">
              <a href="/privacy" className="hover:text-white transition">Privacy</a>
              <a href="/terms" className="hover:text-white transition">Terms</a>
              <a href="/about" className="hover:text-white transition">About</a>
            </div>
          </>
        )}

      </div>
    </main>
  )
}

function DangerZone() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE in the box to confirm.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/delete-account', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not delete your account. Try again.')
        setBusy(false)
        return
      }
      // Sign out locally (server-side admin delete already revoked the session)
      // and route to landing. Best-effort — don't block on it.
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {}
      router.push('/')
    } catch (err) {
      setError(err.message || 'Could not delete your account.')
      setBusy(false)
    }
  }

  return (
    <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 mb-6">
      <p className="text-sm font-semibold text-rose-300 mb-1">Danger zone</p>
      <p className="text-xs text-gray-500 mb-4">Permanently delete your account, your routines, your product catalog, your skin logs, your photos, and your follows. This cannot be undone.</p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm bg-rose-500/10 border border-rose-500/30 text-rose-200 px-5 py-2.5 rounded-full hover:bg-rose-500/15 hover:border-rose-500/50 transition"
        >
          Delete account
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-rose-200">
            This is permanent. Type <span className="font-mono bg-rose-500/10 px-2 py-0.5 rounded">DELETE</span> below to confirm.
          </p>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="bg-white/5 border border-rose-500/30 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-rose-500/60 transition tracking-wider"
            autoFocus
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleDelete}
              disabled={busy || confirmText.trim().toUpperCase() !== 'DELETE'}
              className="text-sm bg-rose-500/80 border border-rose-500/50 text-white font-semibold px-5 py-2.5 rounded-full hover:bg-rose-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Deleting...' : 'Yes, delete my account'}
            </button>
            <button
              onClick={() => { setOpen(false); setConfirmText(''); setError('') }}
              disabled={busy}
              className="text-sm text-gray-400 hover:text-white transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-rose-300 bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">{error}</p>}
        </div>
      )}
    </div>
  )
}
