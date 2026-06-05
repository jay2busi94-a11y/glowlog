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

            <a href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
              ← Back to dashboard
            </a>
          </>
        )}

      </div>
    </main>
  )
}
