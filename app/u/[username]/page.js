'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AppNavbar from '../../components/AppNavbar'
import { createClient } from '../../../lib/supabase'
import { routinesFromRow } from '../../../lib/routine'
import { isPublicProfile } from '../../../lib/profile'
import { ikAvatar, ikProductCard } from '../../../lib/imagekit'

export default function PublicProfile() {
  const { username } = useParams()
  const router = useRouter()
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState(null)
  const [routines, setRoutines] = useState([])
  const [products, setProducts] = useState([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { load() }, [username])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setMe(user)

    // The route param is called "username" but we ALSO accept a user_id UUID
    // here so users without a username set (the column is nullable) can still
    // be viewed — /friends links to user_id when username is missing.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username)
    const query = supabase.from('profiles').select('*')
    const { data: profileData } = isUuid
      ? await query.eq('user_id', username).maybeSingle()
      : await query.eq('username', username).maybeSingle()

    if (!profileData) { setNotFound(true); setLoading(false); return }
    setProfile(profileData)

    const viewerIsOwner = user?.id === profileData.user_id
    const canSeeContent = viewerIsOwner || isPublicProfile(profileData)

    // Follower counts always run — they're independent of profile content
    // and we want them visible even on private profiles so people can
    // still see who someone is + decide to follow.
    const counts = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileData.user_id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileData.user_id),
    ])
    setFollowerCount(counts[0].count || 0)
    setFollowingCount(counts[1].count || 0)

    // Routines + products are gated. Skip the queries entirely when we
    // can't show them (RLS would return empty anyway, but no point).
    if (canSeeContent) {
      const [routinesRes, productsRes] = await Promise.all([
        supabase.from('routines').select('*').eq('user_id', profileData.user_id).maybeSingle(),
        supabase.from('products').select('id, brand, name, category, photo_url').eq('user_id', profileData.user_id).order('created_at', { ascending: false }).limit(12),
      ])
      setRoutines(routinesFromRow(routinesRes.data))
      setProducts(productsRes.data || [])
    } else {
      setRoutines([])
      setProducts([])
    }

    if (user && user.id !== profileData.user_id) {
      const { data: followData } = await supabase
        .from('follows').select('id')
        .eq('follower_id', user.id).eq('following_id', profileData.user_id)
        .maybeSingle()
      setIsFollowing(!!followData)
    }
    setLoading(false)
  }

  async function toggleFollow() {
    if (!me) { router.push('/login'); return }
    setFollowLoading(true)
    const supabase = createClient()
    if (isFollowing) {
      const { error } = await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', profile.user_id)
      if (!error) {
        setIsFollowing(false)
        setFollowerCount(c => c - 1)
      }
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: me.id, following_id: profile.user_id })
      // Treat unique-violation as success (already following). Any other
      // error → leave UI as-is rather than show a fake "Following".
      const dup = `${error?.message || ''}`.toLowerCase().includes('duplicate')
      if (!error || dup) {
        setIsFollowing(true)
        setFollowerCount(c => dup ? c : c + 1)
      }
    }
    setFollowLoading(false)
  }

  const isOwnProfile = me?.id === profile?.user_id
  // Render gate: owner sees everything; non-owners only see public-profile content.
  const canSeeContent = isOwnProfile || isPublicProfile(profile)

  if (loading) return (
    <main className="min-h-screen bg-paper text-ink px-4">
      <AppNavbar />
      <div className="flex items-center justify-center h-screen">
        <p className="text-ink-mute">Loading profile...</p>
      </div>
    </main>
  )

  if (notFound) return (
    <main className="min-h-screen bg-paper text-ink px-4">
      <AppNavbar />
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-4xl">😶</p>
        <p className="text-ink font-semibold text-lg">User not found</p>
        <p className="text-ink-mute text-sm">@{username} doesn't exist or hasn't set a username yet.</p>
        <a href="/friends" className="text-accent text-sm hover:underline transition mt-2">Browse friends →</a>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-paper text-ink px-4 pb-24 overflow-hidden">
      <AppNavbar />

      <div className="relative z-10 max-w-3xl mx-auto pt-32">

        {/* Profile header */}
        <div className="bg-card border border-rule rounded-card p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-accent/10 border border-rule flex items-center justify-center text-4xl overflow-hidden flex-shrink-0 shadow-lg">
                {profile.avatar_url ? (
                  <img src={ikAvatar(profile.avatar_url, 80)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile.avatar || '✨'}</span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile.display_name || (profile.username ? `@${profile.username}` : 'GlowLog User')}</h1>
                {profile.username && <p className="text-ink-mute text-sm">@{profile.username}</p>}
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-ink">
                    <span className="font-semibold text-ink">{followerCount}</span> followers
                  </span>
                  <span className="text-ink">
                    <span className="font-semibold text-ink">{followingCount}</span> following
                  </span>
                </div>
              </div>
            </div>

            {isOwnProfile ? (
              <a href="/profile" className="px-5 py-2 rounded-full text-sm font-semibold bg-card border border-rule text-ink hover:bg-paper transition">
                Edit profile
              </a>
            ) : (
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-card border border-rule text-ink hover:bg-warn/10 hover:border-warn hover:text-warn'
                    : 'bg-accent text-paper shadow-lg hover:opacity-90'
                }`}
              >
                {followLoading ? '...' : isFollowing ? 'Following' : '+ Follow'}
              </button>
            )}
          </div>

          {canSeeContent && profile.bio && (
            <p className="text-sm text-ink whitespace-pre-wrap mt-4 pt-4 border-t border-rule leading-relaxed">{profile.bio}</p>
          )}

          {canSeeContent && profile.concerns?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-rule">
              {profile.concerns.map(c => (
                <span key={c} className="text-xs px-3 py-1 rounded-full bg-accent/10 border border-accent text-accent">{c}</span>
              ))}
            </div>
          )}
        </div>

        {/* Private placeholder — replaces routines + products + bio + concerns for non-owners viewing a private profile */}
        {!canSeeContent && (
          <div className="bg-card border border-rule rounded-card p-10 text-center">
            <p className="text-4xl mb-3">🔒</p>
            <p className="text-ink font-semibold mb-2">This profile is private</p>
            <p className="text-ink-mute text-sm">Follow them and they may let you see their routines and product shelf later.</p>
          </div>
        )}

        {/* Routines — owner or public profile only */}
        {canSeeContent && (
          <>
            <h2 className="text-lg font-semibold mb-3">Skincare Routine</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {routines.map(routine => (
                <div key={routine.id} className="bg-card border border-rule rounded-card p-5">
                  <h3 className="text-sm font-semibold text-ink mb-3">{routine.emoji} {routine.name}</h3>
                  {routine.steps.length === 0 ? (
                    <p className="text-ink-mute text-xs">No steps added yet</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {routine.steps.map((step, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-ink">
                          <span className="w-5 h-5 rounded-full bg-card border border-rule flex items-center justify-center text-xs text-ink-mute flex-shrink-0">{i + 1}</span>
                          {step.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Products — owner or public profile only */}
        {canSeeContent && products.length > 0 && (
          <>
            <h2 className="text-lg font-semibold mb-3">Product Shelf</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map(p => (
                <div key={p.id} className="bg-card border border-rule rounded-xl p-3">
                  {p.photo_url && (
                    <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 bg-card">
                      <img src={ikProductCard(p.photo_url)} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <p className="text-xs text-ink-mute truncate">{p.brand}</p>
                  <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 border border-accent text-accent mt-1 inline-block">{p.category}</span>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  )
}
