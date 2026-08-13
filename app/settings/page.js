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
  // Theme lives in localStorage, not the profile: it has to apply on the
  // landing and login pages too, where there's no profile to read.
  const [theme, setTheme] = useState('system')

  useEffect(() => {
    try { setTheme(localStorage.getItem('glowlog-theme') || 'system') } catch {}
  }, [])

  function chooseTheme(next) {
    setTheme(next)
    try { localStorage.setItem('glowlog-theme', next) } catch {}
    if (next === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', next)
  }

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
    <main className="min-h-screen bg-paper text-ink px-4 app-page-pad-bottom overflow-hidden">
      <AppNavbar />

      <div className="relative z-10 max-w-3xl mx-auto app-page-pad-top">

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Settings ⚙️</h1>
          <p className="text-ink-mute">Tune how GlowLog works for you.</p>
        </div>

        {loading ? (
          <p className="text-ink-mute">Loading...</p>
        ) : (
          <>
            {/* Appearance */}
            <div className="bg-card border border-rule rounded-card p-6 mb-6">
              <p className="text-sm font-semibold text-ink mb-1">Appearance</p>
              <p className="text-xs text-ink-mute mb-5">Changes apply straight away and are remembered on this device.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'system',   name: 'Match device', note: 'Follows your light or dark setting', swatch: ['#F4F6FA', '#12161C'] },
                  { id: 'clinic',   name: 'Clinic',       note: 'Cool paper, ultramarine',            swatch: ['#F4F6FA', '#4256D9'] },
                  { id: 'darkroom', name: 'Darkroom',     note: 'Slate black, periwinkle',            swatch: ['#12161C', '#8E9EFF'] },
                  { id: 'sachet',   name: 'Sachet',       note: 'Warm putty, petrol teal',            swatch: ['#F3F1ED', '#16656B'] },
                ].map(opt => {
                  const active = theme === opt.id
                  return (
                    <button
                      key={opt.id}
                      onClick={() => chooseTheme(opt.id)}
                      aria-pressed={active}
                      className={`text-left p-4 rounded-card border transition cursor-pointer ${
                        active ? 'bg-accent/10 border-accent' : 'bg-card border-rule hover:border-ink-mute'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 mb-2" aria-hidden="true">
                        {opt.swatch.map(c => (
                          <span key={c} className="w-4 h-4 rounded-full border border-rule" style={{ background: c }} />
                        ))}
                      </span>
                      <p className={`text-sm font-semibold ${active ? 'text-ink' : 'text-ink-mute'}`}>{opt.name}</p>
                      <p className="text-xs text-ink-mute mt-0.5 leading-snug">{opt.note}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Routine builder mode */}
            <div className="bg-card border border-rule rounded-card p-6 mb-6">
              <p className="text-sm font-semibold text-accent mb-1">Routine builder mode</p>
              <p className="text-xs text-ink-mute mb-5">Pick how much control you want when editing your routines.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setMode(false)}
                  className={`text-left p-5 rounded-card border transition ${
                    !advancedMode
                      ? 'bg-accent/10 border-accent shadow-md'
                      : 'bg-card border-rule hover:border-ink-mute'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🌱</span>
                    <p className={`font-semibold ${!advancedMode ? 'text-ink' : 'text-ink-mute'}`}>Simple</p>
                    {!advancedMode && <span className="text-[10px] uppercase tracking-wider text-ink-mute font-bold">· Active</span>}
                  </div>
                  <p className="text-xs text-ink-mute">Pick your morning and night steps from a guided checklist. We keep two routines and the order matches how you'd apply them. Good for getting going.</p>
                </button>
                <button
                  onClick={() => setMode(true)}
                  className={`text-left p-5 rounded-card border transition ${
                    advancedMode
                      ? 'bg-accent/10 border-accent shadow-md'
                      : 'bg-card border-rule hover:border-ink-mute'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🧪</span>
                    <p className={`font-semibold ${advancedMode ? 'text-ink' : 'text-ink-mute'}`}>Advanced</p>
                    {advancedMode && <span className="text-[10px] uppercase tracking-wider text-ink-mute font-bold">· Active</span>}
                  </div>
                  <p className="text-xs text-ink-mute">Full editor — unlimited routines, drag-to-reorder, rename steps, add custom ones. Best if you've been doing skincare a while.</p>
                </button>
              </div>

              <p className="text-xs text-ink-mute mt-4">
                You can switch any time, including from inside the Routine tab. Your saved routines are kept either way.
              </p>
            </div>

            {/* Profile visibility */}
            <div className="bg-card border border-rule rounded-card p-6 mb-6">
              <p className="text-sm font-semibold text-accent mb-1">Profile visibility</p>
              <p className="text-xs text-ink-mute mb-5">Who can see your routines and product shelf.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setVisibility(true)}
                  className={`text-left p-5 rounded-card border transition ${
                    publicProfile
                      ? 'bg-accent/10 border-accent shadow-md'
                      : 'bg-card border-rule hover:border-ink-mute'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🌐</span>
                    <p className={`font-semibold ${publicProfile ? 'text-ink' : 'text-ink-mute'}`}>Public</p>
                    {publicProfile && <span className="text-[10px] uppercase tracking-wider text-ink-mute font-bold">· Active</span>}
                  </div>
                  <p className="text-xs text-ink-mute">Anyone signed in can find your profile, see your routines and product shelf, and follow you. Default.</p>
                </button>
                <button
                  onClick={() => setVisibility(false)}
                  className={`text-left p-5 rounded-card border transition ${
                    !publicProfile
                      ? 'bg-accent/10 border-accent shadow-md'
                      : 'bg-card border-rule hover:border-ink-mute'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔒</span>
                    <p className={`font-semibold ${!publicProfile ? 'text-ink' : 'text-ink-mute'}`}>Private</p>
                    {!publicProfile && <span className="text-[10px] uppercase tracking-wider text-ink-mute font-bold">· Active</span>}
                  </div>
                  <p className="text-xs text-ink-mute">Your name, avatar, and follower counts stay visible so people can still find + follow you. Routines, products, bio, and concerns are hidden.</p>
                </button>
              </div>

              <p className="text-xs text-ink-mute mt-4">
                Changing this takes effect immediately for anyone viewing your profile. Your existing followers are not removed.
              </p>
            </div>

            {saving && <p className="text-[10px] text-ink-mute mb-4">Saving...</p>}

            <DangerZone />

            <a href="/dashboard" className="text-sm text-ink-mute hover:text-ink transition">
              ← Back to dashboard
            </a>

            <div className="mt-12 pt-6 border-t border-rule flex gap-5 text-xs text-ink-mute">
              <a href="/privacy" className="hover:text-ink transition">Privacy</a>
              <a href="/terms" className="hover:text-ink transition">Terms</a>
              <a href="/about" className="hover:text-ink transition">About</a>
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
    <div className="bg-warn/10 border border-warn rounded-card p-6 mb-6">
      <p className="text-sm font-semibold text-warn mb-1">Danger zone</p>
      <p className="text-xs text-ink-mute mb-4">Permanently delete your account, your routines, your product catalog, your skin logs, your photos, and your follows. This cannot be undone.</p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm bg-warn/10 border border-warn text-warn px-5 py-2.5 rounded-full hover:bg-warn/10 hover:border-warn transition"
        >
          Delete account
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-warn">
            This is permanent. Type <span className="font-mono bg-warn/10 px-2 py-0.5 rounded">DELETE</span> below to confirm.
          </p>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="bg-card border border-warn rounded-xl px-4 py-2.5 text-ink placeholder-ink-mute text-sm focus:outline-none focus:border-warn transition tracking-wider"
            autoFocus
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleDelete}
              disabled={busy || confirmText.trim().toUpperCase() !== 'DELETE'}
              className="text-sm bg-warn/10 border border-warn text-ink font-semibold px-5 py-2.5 rounded-full hover:bg-warn/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Deleting...' : 'Yes, delete my account'}
            </button>
            <button
              onClick={() => { setOpen(false); setConfirmText(''); setError('') }}
              disabled={busy}
              className="text-sm text-ink-mute hover:text-ink transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-warn bg-warn/10 border border-warn rounded-xl p-3">{error}</p>}
        </div>
      )}
    </div>
  )
}
