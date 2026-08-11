'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { AVATAR_EMOJIS, DEFAULT_AVATAR, PROFILE_CONCERNS, displayNameFor, isPremium, PREMIUM_PERKS, UNLOCK_CODE, validateUsername, sanitizeUsername, MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH } from '../../lib/profile'
import { ikAvatar } from '../../lib/imagekit'

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
  const [saveError, setSaveError] = useState('')
  // Username availability: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved' | 'too_short'
  const [usernameStatus, setUsernameStatus] = useState('idle')
  const [usernameMessage, setUsernameMessage] = useState('')

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

  // Debounced username availability check. Skips if the value equals
  // what's already saved on the user's own profile row (so editing other
  // fields doesn't flag your own name as "taken").
  useEffect(() => {
    if (!user || loading) return
    const candidate = sanitizeUsername(username)
    // Empty username is fine — treat as cleared / valid.
    if (!candidate) {
      setUsernameStatus('idle')
      setUsernameMessage('')
      return
    }
    // If it matches what's saved on your row, no need to query.
    if (profile?.username && candidate === profile.username) {
      setUsernameStatus('available')
      setUsernameMessage('')
      return
    }
    // Local validation first (cheaper than a DB round-trip).
    const local = validateUsername(candidate)
    if (!local.ok) {
      setUsernameStatus(candidate.length < MIN_USERNAME_LENGTH ? 'too_short' : 'reserved')
      setUsernameMessage(local.error)
      return
    }
    // Live availability check, debounced 400ms.
    setUsernameStatus('checking')
    setUsernameMessage('')
    const t = setTimeout(async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', candidate)
        .neq('user_id', user.id)
        .maybeSingle()
      if (error) {
        setUsernameStatus('idle')
        setUsernameMessage('')
        return
      }
      if (data) {
        setUsernameStatus('taken')
        setUsernameMessage(`@${candidate} is taken.`)
      } else {
        setUsernameStatus('available')
        setUsernameMessage('Available')
      }
    }, 400)
    return () => clearTimeout(t)
  }, [username, user, loading, profile?.username])

  function toggleConcern(c) {
    setConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function handleSave() {
    if (!user) return
    setSaveError('')
    const cleanUsername = sanitizeUsername(username)
    // Block save when the live check has flagged the value as bad. The
    // button is also disabled in this state, but this is the belt-and-
    // suspenders so it can't be bypassed by clicking before the
    // disabled prop catches up.
    if (cleanUsername) {
      const v = validateUsername(cleanUsername)
      if (!v.ok) { setSaveError(v.error); return }
      if (usernameStatus === 'taken') {
        setSaveError(`The username @${cleanUsername} is already taken. Try another.`)
        return
      }
    }
    setSaving(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      username: cleanUsername || null,
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
      return
    }
    // Surface the failure instead of silently no-op'ing. The most common
    // case is the username UNIQUE constraint — translate it to plain
    // English so the user knows why nothing saved.
    const msg = `${error?.message || ''}`.toLowerCase()
    if (msg.includes('duplicate') && msg.includes('username')) {
      setSaveError(`The username @${payload.username} is already taken. Try another.`)
    } else if (msg.includes('duplicate')) {
      setSaveError('Something on your profile is already in use by someone else. Try changing your username.')
    } else {
      setSaveError(error?.message || 'Could not save. Try again.')
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink px-4 app-page-pad-bottom overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-3xl mx-auto app-page-pad-top">

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Your Profile ✨</h1>
          <p className="text-ink-mute">Make GlowLog yours. Your concerns help the AI tailor advice to you.</p>
        </div>

        {loading ? (
          <p className="text-ink-mute">Loading your profile...</p>
        ) : (
          <>
            {/* Identity card */}
            <div className="bg-card border border-rule rounded-card p-6 mb-6 flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-accent/10 border border-rule flex items-center justify-center text-4xl shadow-lg overflow-hidden">
                {avatarMode === 'photo' && avatarUrl ? (
                  <img src={ikAvatar(avatarUrl, 80)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{avatar}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs uppercase tracking-wide text-ink-mute">Signed in as</p>
                  {isPremium(profile) && (
                    <span className="text-[10px] uppercase tracking-wider bg-accent/10 border border-rule text-ink px-2 py-0.5 rounded-full font-semibold">
                      ✦ Premium
                    </span>
                  )}
                </div>
                <p className="text-lg font-semibold truncate">{displayNameFor({ display_name: displayName }, user)}</p>
                <p className="text-xs text-ink-mute truncate">{user.email}</p>
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
            <div className="bg-card border border-rule rounded-card p-6 mb-6">
              <label className="block">
                <span className="text-sm font-semibold text-accent">Username</span>
                <p className="text-xs text-ink-mute mb-3">Your public handle — used in your profile URL. Letters, numbers, and underscores only. {MIN_USERNAME_LENGTH}–{MAX_USERNAME_LENGTH} characters.</p>
                <div className={`flex items-center gap-2 bg-card border rounded-xl px-4 py-2.5 transition ${
                  usernameStatus === 'taken' || usernameStatus === 'reserved' || usernameStatus === 'too_short'
                    ? 'border-warn focus-within:border-warn'
                    : usernameStatus === 'available' && username
                      ? 'border-ok focus-within:border-ok'
                      : 'border-rule focus-within:border-accent'
                }`}>
                  <span className="text-ink-mute text-sm">@</span>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. jayflare"
                    maxLength={MAX_USERNAME_LENGTH}
                    className="flex-1 bg-transparent text-ink placeholder-ink-mute text-sm focus:outline-none"
                  />
                  {/* Live status indicator */}
                  {username && (
                    <span className="text-xs flex-shrink-0">
                      {usernameStatus === 'checking' && <span className="text-ink-mute">…</span>}
                      {usernameStatus === 'available' && <span className="text-ok">✓</span>}
                      {(usernameStatus === 'taken' || usernameStatus === 'reserved' || usernameStatus === 'too_short') && (
                        <span className="text-warn">✗</span>
                      )}
                    </span>
                  )}
                </div>
                {usernameMessage && (
                  <p className={`text-xs mt-2 ${
                    usernameStatus === 'available' ? 'text-ok' : 'text-warn'
                  }`}>
                    {usernameMessage}
                  </p>
                )}
                {username && usernameStatus !== 'taken' && usernameStatus !== 'reserved' && usernameStatus !== 'too_short' && (
                  <p className="text-xs text-ink-mute mt-2">Your profile: glowlog-neon.vercel.app/u/{username}</p>
                )}
              </label>
            </div>

            {/* Display name */}
            <div className="bg-card border border-rule rounded-card p-6 mb-6">
              <label className="block">
                <span className="text-sm font-semibold text-accent">Display name</span>
                <p className="text-xs text-ink-mute mb-3">What you're called in the app. Leave blank to use your email handle.</p>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Jay"
                  maxLength={40}
                  className="w-full bg-card border border-rule rounded-xl px-4 py-2.5 text-ink placeholder-ink-mute text-sm focus:outline-none focus:border-accent transition"
                />
              </label>
            </div>

            {/* Bio */}
            <div className="bg-card border border-rule rounded-card p-6 mb-6">
              <label className="block">
                <span className="text-sm font-semibold text-accent">Bio</span>
                <p className="text-xs text-ink-mute mb-3">A short line about you. Shows on your public profile.</p>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Skin type, current goals, the basics..."
                  rows={3}
                  maxLength={280}
                  className="w-full bg-card border border-rule rounded-xl px-4 py-2.5 text-ink placeholder-ink-mute text-sm focus:outline-none focus:border-accent transition resize-none"
                />
                <p className="text-[10px] text-ink-mute text-right mt-1">{bio.length}/280</p>
              </label>
            </div>

            {/* Avatar */}
            <div className="bg-card border border-rule rounded-card p-6 mb-6">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-accent">Avatar</p>
                  <p className="text-xs text-ink-mute">Upload your own photo or pick an emoji.</p>
                </div>
                <div className="flex gap-1 bg-card border border-rule rounded-full p-1">
                  <button
                    onClick={() => setAvatarMode('photo')}
                    className={`text-xs px-3 py-1 rounded-full transition ${
                      avatarMode === 'photo'
                        ? 'bg-accent text-paper shadow-md '
                        : 'text-ink-mute hover:text-ink'
                    }`}
                  >
                    📷 Photo
                  </button>
                  <button
                    onClick={() => setAvatarMode('emoji')}
                    className={`text-xs px-3 py-1 rounded-full transition ${
                      avatarMode === 'emoji'
                        ? 'bg-accent text-paper shadow-md '
                        : 'text-ink-mute hover:text-ink'
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
                          ? 'bg-accent/10 border-accent shadow-md  scale-105'
                          : 'bg-card border-rule hover:border-rule hover:scale-105'
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
            <div className="bg-card border border-rule rounded-card p-6 mb-6">
              <p className="text-sm font-semibold text-accent">Top skin concerns</p>
              <p className="text-xs text-ink-mute mb-4">Pick anything that applies. The Fix My Skin AI uses these to give you better advice.</p>
              <div className="flex flex-wrap gap-2">
                {PROFILE_CONCERNS.map(c => {
                  const active = concerns.includes(c)
                  return (
                    <button
                      key={c}
                      onClick={() => toggleConcern(c)}
                      className={`text-xs px-4 py-2 rounded-full border transition ${
                        active
                          ? 'bg-accent/10 border-accent text-ink'
                          : 'bg-card border-rule text-ink-mute hover:text-ink hover:border-rule'
                      }`}
                    >
                      {active ? '✓ ' : ''}{c}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Save */}
            <div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving || usernameStatus === 'taken' || usernameStatus === 'too_short' || usernameStatus === 'reserved' || usernameStatus === 'checking'}
                  className="bg-accent text-paper font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg"
                >
                  {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Profile'}
                </button>
                <a href="/dashboard" className="text-sm text-ink-mute hover:text-ink transition">
                  Back to dashboard
                </a>
              </div>
              {saveError && (
                <p className="text-xs text-warn mt-3 bg-warn/10 border border-warn rounded-xl p-3">
                  {saveError}
                </p>
              )}
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
    <div className="relative bg-accent/10 border border-rule rounded-card p-5 mb-6 overflow-hidden">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-card rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✦</span>
          <div>
            <p className="text-sm font-semibold text-ink">
              Premium active
            </p>
            <p className="text-xs text-ink-mute">Unlimited AI, full progress history, early access.</p>
          </div>
        </div>
        <button
          onClick={downgrade}
          disabled={downgrading}
          className="text-xs text-ink-mute hover:text-warn transition disabled:opacity-50"
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
    <div className="relative bg-accent/10 border border-accent rounded-card p-6 mb-6 overflow-hidden">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider bg-accent/10 border border-rule text-ink px-2 py-0.5 rounded-full font-semibold">
            ✦ Premium
          </span>
          <span className="text-xs text-ink-mute">Free plan</span>
        </div>
        <h2 className="text-2xl font-bold mb-1 text-ink">
          Upgrade GlowLog
        </h2>
        <p className="text-sm text-ink-mute mb-5">Unlock the deeper tools and the AI without limits.</p>

        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {PREMIUM_PERKS.map(perk => (
            <li key={perk.title} className="bg-card border border-rule rounded-xl p-3">
              <p className="text-lg mb-1">{perk.emoji}</p>
              <p className="text-sm font-semibold text-ink">{perk.title}</p>
              <p className="text-xs text-ink-mute mt-0.5">{perk.body}</p>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            disabled
            className="bg-accent text-paper font-semibold px-5 py-2.5 rounded-full text-sm shadow-lg opacity-90 cursor-not-allowed"
            title="Payments coming soon"
          >
            ✦ Upgrade — coming soon
          </button>
          <p className="text-xs text-ink-mute">Stripe checkout is on the way. Have a code? Use it below.</p>
        </div>

        <form onSubmit={tryRedeem} className="flex flex-wrap items-center gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Enter unlock code"
            className="flex-1 min-w-[180px] bg-card border border-rule rounded-full px-4 py-2 text-ink placeholder-ink-mute text-sm focus:outline-none focus:border-accent transition tracking-wider"
          />
          <button
            type="submit"
            disabled={redeeming || !code.trim()}
            className="border border-rule text-ink text-sm px-5 py-2 rounded-full hover:bg-card transition disabled:opacity-40"
          >
            {redeeming ? 'Redeeming...' : 'Apply code'}
          </button>
        </form>
        {error && <p className="text-xs text-warn mt-2">{error}</p>}
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
          <div className="w-28 h-28 rounded-card overflow-hidden border border-rule bg-card flex-shrink-0">
            <img src={photoUrl} alt="Your avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col gap-2 mt-1 min-w-0">
            <label className="cursor-pointer text-xs text-accent hover:text-accent transition">
              {uploading ? 'Uploading...' : 'Replace photo'}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            <label className="cursor-pointer text-xs text-accent hover:text-accent transition">
              {uploading ? '...' : '📷 Take new photo'}
              <input type="file" accept="image/*" capture="user" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs text-ink-mute hover:text-warn transition text-left"
              disabled={uploading}
            >
              Remove photo
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <label className={`cursor-pointer flex-1 min-w-[140px] flex items-center justify-center gap-2 border border-dashed rounded-card py-6 text-sm transition ${
            uploading ? 'border-rule text-ink-mute' : 'border-rule text-ink-mute hover:border-accent hover:text-ink'
          }`}>
            <span className="text-lg">🖼️</span>
            <span>{uploading ? 'Uploading...' : 'Choose photo'}</span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
          <label className={`cursor-pointer flex-1 min-w-[140px] flex items-center justify-center gap-2 border border-dashed rounded-card py-6 text-sm transition ${
            uploading ? 'border-rule text-ink-mute' : 'border-rule text-ink-mute hover:border-accent hover:text-ink'
          }`}>
            <span className="text-lg">📷</span>
            <span>{uploading ? 'Uploading...' : 'Take selfie'}</span>
            <input type="file" accept="image/*" capture="user" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}
      {error && <p className="text-xs text-warn mt-3">{error}</p>}
    </div>
  )
}
