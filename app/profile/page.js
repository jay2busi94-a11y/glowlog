'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { AVATAR_EMOJIS, DEFAULT_AVATAR, PROFILE_CONCERNS, displayNameFor, isPremium, PREMIUM_PERKS, UNLOCK_CODE } from '../../lib/profile'

// Upload a profile photo to the user's folder in the avatars bucket and
// return the public URL. Throws on failure.
async function uploadAvatarPhoto(file, userId) {
  const supabase = createClient()
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: false, cacheControl: '31536000', contentType: file.type || 'image/jpeg' })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  return publicUrl
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarMode, setAvatarMode] = useState('emoji')   // 'emoji' | 'photo'
  const [bio, setBio] = useState('')
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
        setUsername(data.username || '')
        setDisplayName(data.display_name || '')
        setBio(data.bio || '')
        setAvatar(data.avatar || DEFAULT_AVATAR)
        setAvatarUrl(data.avatar_url || '')
        setAvatarMode(data.avatar_url ? 'photo' : 'emoji')
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
      username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || null,
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      avatar,
      avatar_url: avatarMode === 'photo' && avatarUrl ? avatarUrl : null,
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
    <main className="min-h-screen bg-[#080808] text-white px-4 app-page-pad-bottom overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-3xl mx-auto app-page-pad-top">

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
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-4xl shadow-lg shadow-pink-500/10 overflow-hidden">
                {avatarMode === 'photo' && avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{avatar}</span>
                )}
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

            {/* Username */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <label className="block">
                <span className="text-sm font-semibold text-pink-300">Username</span>
                <p className="text-xs text-gray-500 mb-3">Your public handle — used in your profile URL. Letters, numbers, and underscores only.</p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">@</span>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. jayflare"
                    maxLength={30}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/30 transition"
                  />
                </div>
                {username && (
                  <p className="text-xs text-gray-600 mt-2">Your profile: glowlog-neon.vercel.app/u/{username}</p>
                )}
              </label>
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

            {/* Bio */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <label className="block">
                <span className="text-sm font-semibold text-pink-300">Bio</span>
                <p className="text-xs text-gray-500 mb-3">A short line about you. Shows on your public profile.</p>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Skin type, current goals, the basics..."
                  rows={3}
                  maxLength={280}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/30 transition resize-none"
                />
                <p className="text-[10px] text-gray-600 text-right mt-1">{bio.length}/280</p>
              </label>
            </div>

            {/* Avatar */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-pink-300">Avatar</p>
                  <p className="text-xs text-gray-500">Upload your own photo or pick an emoji.</p>
                </div>
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-full p-1">
                  <button
                    onClick={() => setAvatarMode('photo')}
                    className={`text-xs px-3 py-1 rounded-full transition ${
                      avatarMode === 'photo'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    📷 Photo
                  </button>
                  <button
                    onClick={() => setAvatarMode('emoji')}
                    className={`text-xs px-3 py-1 rounded-full transition ${
                      avatarMode === 'emoji'
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    ✨ Emoji
                  </button>
                </div>
              </div>

              {avatarMode === 'photo' ? (
                <AvatarPhotoPicker
                  photoUrl={avatarUrl}
                  onChange={setAvatarUrl}
                  userId={user?.id}
                />
              ) : (
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
              )}
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

function AvatarPhotoPicker({ photoUrl, onChange, userId }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !userId) return
    if (!file.type.startsWith('image/')) {
      setError('Please pick an image file.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('That image is over 4 MB — try a smaller one.')
      return
    }
    setError('')
    setUploading(true)
    try {
      const url = await uploadAvatarPhoto(file, userId)
      onChange(url)
    } catch (err) {
      console.error(err)
      setError('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {photoUrl ? (
        <div className="flex items-start gap-4">
          <div className="w-28 h-28 rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
            <img src={photoUrl} alt="Your avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col gap-2 mt-1 min-w-0">
            <label className="cursor-pointer text-xs text-pink-300 hover:text-pink-200 transition">
              {uploading ? 'Uploading...' : 'Replace photo'}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            <label className="cursor-pointer text-xs text-pink-300 hover:text-pink-200 transition">
              {uploading ? '...' : '📷 Take new photo'}
              <input type="file" accept="image/*" capture="user" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs text-gray-500 hover:text-rose-300 transition text-left"
              disabled={uploading}
            >
              Remove photo
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <label className={`cursor-pointer flex-1 min-w-[140px] flex items-center justify-center gap-2 border border-dashed rounded-2xl py-6 text-sm transition ${
            uploading ? 'border-white/10 text-gray-500' : 'border-white/20 text-gray-400 hover:border-pink-500/40 hover:text-white'
          }`}>
            <span className="text-lg">🖼️</span>
            <span>{uploading ? 'Uploading...' : 'Choose photo'}</span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
          <label className={`cursor-pointer flex-1 min-w-[140px] flex items-center justify-center gap-2 border border-dashed rounded-2xl py-6 text-sm transition ${
            uploading ? 'border-white/10 text-gray-500' : 'border-white/20 text-gray-400 hover:border-pink-500/40 hover:text-white'
          }`}>
            <span className="text-lg">📷</span>
            <span>{uploading ? 'Uploading...' : 'Take selfie'}</span>
            <input type="file" accept="image/*" capture="user" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}
      {error && <p className="text-xs text-rose-300 mt-3">{error}</p>}
    </div>
  )
}
