'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { AVATAR_EMOJIS, DEFAULT_AVATAR, PROFILE_CONCERNS, displayNameFor } from '../../lib/profile'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR)
  const [concerns, setConcerns] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        setProfile(data)
        setDisplayName(data.display_name || '')
        setAvatar(data.avatar || DEFAULT_AVATAR)
        setConcerns(data.concerns || [])
      }
      setLoading(false)
    })
  }, [])

  function toggleConcern(c) {
    setConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      display_name: displayName.trim() || null,
      avatar,
      concerns,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      setProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 pb-16 overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-3xl mx-auto pt-32">

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Your Profile ✨</h1>
          <p className="text-gray-400">Make GlowLog yours. Your concerns help the AI tailor advice to you.</p>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading your profile...</p>
        ) : (
          <>
            {/* Identity card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-4xl shadow-lg shadow-pink-500/10">
                {avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-pink-300/80">Signed in as</p>
                <p className="text-lg font-semibold truncate">{displayNameFor({ display_name: displayName }, user)}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            {/* Display name */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <label className="block">
                <span className="text-sm font-semibold text-pink-300">Display name</span>
                <p className="text-xs text-gray-500 mb-3">What you're called in the app. Leave blank to use your email handle.</p>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Jay"
                  maxLength={40}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/30 transition"
                />
              </label>
            </div>

            {/* Avatar */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <p className="text-sm font-semibold text-pink-300">Avatar</p>
              <p className="text-xs text-gray-500 mb-4">Pick an emoji.</p>
              <div className="grid grid-cols-8 sm:grid-cols-11 gap-2">
                {AVATAR_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setAvatar(e)}
                    className={`aspect-square rounded-xl text-2xl flex items-center justify-center border transition ${
                      avatar === e
                        ? 'bg-pink-500/15 border-pink-500/50 shadow-md shadow-pink-500/20 scale-105'
                        : 'bg-white/5 border-white/10 hover:border-white/30 hover:scale-105'
                    }`}
                    aria-label={`Pick ${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Concerns */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <p className="text-sm font-semibold text-pink-300">Top skin concerns</p>
              <p className="text-xs text-gray-500 mb-4">Pick anything that applies. The Fix My Skin AI uses these to give you better advice.</p>
              <div className="flex flex-wrap gap-2">
                {PROFILE_CONCERNS.map(c => {
                  const active = concerns.includes(c)
                  return (
                    <button
                      key={c}
                      onClick={() => toggleConcern(c)}
                      className={`text-xs px-4 py-2 rounded-full border transition ${
                        active
                          ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/40 text-white'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                      }`}
                    >
                      {active ? '✓ ' : ''}{c}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-pink-500/20"
              >
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Profile'}
              </button>
              <a href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
                Back to dashboard
              </a>
            </div>
          </>
        )}

      </div>
    </main>
  )
}
