'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AppNavbar from '../../components/AppNavbar'
import { createClient } from '../../../lib/supabase'
import { routinesFromRow } from '../../../lib/routine'

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

    const [routinesRes, productsRes, followersRes, followingRes] = await Promise.all([
      supabase.from('routines').select('*').eq('user_id', profileData.user_id).maybeSingle(),
      supabase.from('products').select('id, brand, name, category, photo_url').eq('user_id', profileData.user_id).order('created_at', { ascending: false }).limit(12),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileData.user_id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileData.user_id),
    ])

    setRoutines(routinesFromRow(routinesRes.data))
    setProducts(productsRes.data || [])
    setFollowerCount(followersRes.count || 0)
    setFollowingCount(followingRes.count || 0)

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
      await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', profile.user_id)
      setIsFollowing(false)
      setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: me.id, following_id: profile.user_id })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
    }
    setFollowLoading(false)
  }

  const isOwnProfile = me?.id === profile?.user_id

  if (loading) return (
    <main className="min-h-screen bg-[#080808] text-white px-4">
      <AppNavbar />
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    </main>
  )

  if (notFound) return (
    <main className="min-h-screen bg-[#080808] text-white px-4">
      <AppNavbar />
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-4xl">😶</p>
        <p className="text-gray-200 font-semibold text-lg">User not found</p>
        <p className="text-gray-500 text-sm">@{username} doesn't exist or hasn't set a username yet.</p>
        <a href="/friends" className="text-pink-400 text-sm hover:text-pink-300 transition mt-2">Browse friends →</a>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 pb-24 overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-3xl mx-auto pt-32">

        {/* Profile header */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-4xl overflow-hidden flex-shrink-0 shadow-lg shadow-pink-500/10">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile.avatar || '✨'}</span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile.display_name || (profile.username ? `@${profile.username}` : 'GlowLog User')}</h1>
                {profile.username && <p className="text-gray-500 text-sm">@{profile.username}</p>}
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-gray-300">
                    <span className="font-semibold text-white">{followerCount}</span> followers
                  </span>
                  <span className="text-gray-300">
                    <span className="font-semibold text-white">{followingCount}</span> following
                  </span>
                </div>
              </div>
            </div>

            {isOwnProfile ? (
              <a href="/profile" className="px-5 py-2 rounded-full text-sm font-semibold bg-white/10 border border-white/20 text-gray-200 hover:bg-white/15 transition">
                Edit profile
              </a>
            ) : (
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-white/10 border border-white/20 text-gray-200 hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-300'
                    : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/20 hover:opacity-90'
                }`}
              >
                {followLoading ? '...' : isFollowing ? 'Following' : '+ Follow'}
              </button>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm text-gray-300 whitespace-pre-wrap mt-4 pt-4 border-t border-white/10 leading-relaxed">{profile.bio}</p>
          )}

          {profile.concerns?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
              {profile.concerns.map(c => (
                <span key={c} className="text-xs px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300">{c}</span>
              ))}
            </div>
          )}
        </div>

        {/* Routines */}
        <h2 className="text-lg font-semibold mb-3">Skincare Routine</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {routines.map(routine => (
            <div key={routine.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-pink-300 mb-3">{routine.emoji} {routine.name}</h3>
              {routine.steps.length === 0 ? (
                <p className="text-gray-600 text-xs">No steps added yet</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {routine.steps.map((step, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">{i + 1}</span>
                      {step.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Products */}
        {products.length > 0 && (
          <>
            <h2 className="text-lg font-semibold mb-3">Product Shelf</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map(p => (
                <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  {p.photo_url && (
                    <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 bg-white/5">
                      <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 truncate">{p.brand}</p>
                  <p className="text-sm font-medium text-gray-200 truncate">{p.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 mt-1 inline-block">{p.category}</span>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  )
}
