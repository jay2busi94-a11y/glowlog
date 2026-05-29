'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { AVATAR_EMOJIS, DEFAULT_AVATAR, PROFILE_CONCERNS, displayNameFor, isPremium, PREMIUM_PERKS, UNLOCK_CODE } from '../../lib/profile'

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
                <div className="flex items-center gap-2">
                  <p className="text-xs uppercase tracking-wide text-pink-300/80">Signed in as</p>
                  {isPremium(profile) && (
                    <span className="text-[10px] uppercase tracking-wider bg-gradient-to-r from-amber-400/30 to-pink-400/30 border border-amber-300/40 text-amber-200 px-2 py-0.5 rounded-full font-semibold">
                      ✦ Premium
                    </span>
                  )}
                </div>
                <p className="text-lg font-semibold truncate">{displayNameFor({ display_name: displayName }, user)}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>

            {/* Upgrade card (free tier only) */}
            {!isPremium(profile) ? (
              <UpgradeCard
                profile={profile}
                onUpgraded={(updatedProfile) => setProfile(updatedProfile)}
              />
            ) : (
              <PremiumStatusCard
                profile={profile}
                onDowngraded={(updatedProfile) => setProfile(updatedProfile)}
              />
            )}

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

function PremiumStatusCard({ profile, onDowngraded }) {
  const [downgrading, setDowngrading] = useState(false)

  async function downgrade() {
    if (!confirm('Downgrade to Free? Your AI cap and progress range limits will come back. (Testing only — you can re-enter the unlock code anytime.)')) return
    setDowngrading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .update({ tier: 'free', updated_at: new Date().toISOString() })
      .eq('user_id', profile.user_id)
      .select()
      .single()
    setDowngrading(false)
    if (data) onDowngraded(data)
  }

  return (
    <div className="relative bg-gradient-to-br from-amber-400/10 via-pink-500/10 to-purple-500/10 border border-amber-300/30 rounded-2xl p-5 mb-6 overflow-hidden">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✦</span>
          <div>
            <p className="text-sm font-semibold bg-gradient-to-r from-amber-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
              Premium active
            </p>
            <p className="text-xs text-gray-400">Unlimited AI, full progress history, early access.</p>
          </div>
        </div>
        <button
          onClick={downgrade}
          disabled={downgrading}
          className="text-xs text-gray-500 hover:text-rose-300 transition disabled:opacity-50"
        >
          {downgrading ? 'Downgrading...' : 'Downgrade to Free (testing)'}
        </button>
      </div>
    </div>
  )
}

function UpgradeCard({ profile, onUpgraded }) {
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [error, setError] = useState('')

  async function tryRedeem(e) {
    e.preventDefault()
    setError('')
    if (!code.trim()) return
    if (code.trim().toUpperCase() !== UNLOCK_CODE) {
      setError("That code didn't work. Double-check it and try again.")
      return
    }
    setRedeeming(true)
    const supabase = createClient()
    const { data, error: dbError } = await supabase
      .from('profiles')
      .update({ tier: 'premium', updated_at: new Date().toISOString() })
      .eq('user_id', profile.user_id)
      .select()
      .single()
    setRedeeming(false)
    if (dbError) {
      setError('Something went wrong — try again in a sec.')
      return
    }
    onUpgraded(data)
  }

  return (
    <div className="relative bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-amber-400/5 border border-pink-500/30 rounded-2xl p-6 mb-6 overflow-hidden">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider bg-gradient-to-r from-amber-400/30 to-pink-400/30 border border-amber-300/40 text-amber-200 px-2 py-0.5 rounded-full font-semibold">
            ✦ Premium
          </span>
          <span className="text-xs text-gray-400">Free plan</span>
        </div>
        <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
          Upgrade GlowLog
        </h2>
        <p className="text-sm text-gray-400 mb-5">Unlock the deeper tools and the AI without limits.</p>

        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {PREMIUM_PERKS.map(perk => (
            <li key={perk.title} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-lg mb-1">{perk.emoji}</p>
              <p className="text-sm font-semibold text-white">{perk.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{perk.body}</p>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            disabled
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm shadow-lg shadow-pink-500/20 opacity-90 cursor-not-allowed"
            title="Payments coming soon"
          >
            ✦ Upgrade — coming soon
          </button>
          <p className="text-xs text-gray-500">Stripe checkout is on the way. Have a code? Use it below.</p>
        </div>

        <form onSubmit={tryRedeem} className="flex flex-wrap items-center gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Enter unlock code"
            className="flex-1 min-w-[180px] bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/30 transition tracking-wider"
          />
          <button
            type="submit"
            disabled={redeeming || !code.trim()}
            className="border border-white/15 text-gray-200 text-sm px-5 py-2 rounded-full hover:bg-white/10 transition disabled:opacity-40"
          >
            {redeeming ? 'Redeeming...' : 'Apply code'}
          </button>
        </form>
        {error && <p className="text-xs text-rose-300 mt-2">{error}</p>}
      </div>
    </div>
  )
}
