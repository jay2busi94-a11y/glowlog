'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'

export default function FriendsPage() {
  const router = useRouter()
  const [tab, setTab] = useState('following')
  const [following, setFollowing] = useState([])
  const [followers, setFollowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState(null)

  // Search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setMe(user)

      const [followingRes, followersRes] = await Promise.all([
        supabase.from('follows')
          .select('following_id, profiles(user_id, username, display_name, avatar, avatar_url)')
          .eq('follower_id', user.id),
        supabase.from('follows')
          .select('follower_id, profiles(user_id, username, display_name, avatar, avatar_url)')
          .eq('following_id', user.id),
      ])

      setFollowing((followingRes.data || []).map(r => r.profiles).filter(Boolean))
      setFollowers((followersRes.data || []).map(r => r.profiles).filter(Boolean))
      setLoading(false)
    })
  }, [])

  // Debounced search
  useEffect(() => {
    if (tab !== 'search') return
    clearTimeout(searchTimer.current)
    if (!query.trim()) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar, avatar_url, concerns')
        .or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`)
        .not('username', 'is', null)
        .limit(20)
      setSearchResults((data || []).filter(p => p.user_id !== me?.id))
      setSearching(false)
    }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [query, tab, me])

  async function unfollow(userId) {
    const supabase = createClient()
    await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', userId)
    setFollowing(prev => prev.filter(p => p.user_id !== userId))
  }

  async function followBack(userId) {
    const supabase = createClient()
    await supabase.from('follows').insert({ follower_id: me.id, following_id: userId })
    const p = followers.find(f => f.user_id === userId)
    if (p) setFollowing(prev => [...prev, p])
  }

  async function followUser(user) {
    const supabase = createClient()
    await supabase.from('follows').insert({ follower_id: me.id, following_id: user.user_id })
    setFollowing(prev => [...prev, user])
  }

  async function unfollowUser(userId) {
    const supabase = createClient()
    await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', userId)
    setFollowing(prev => prev.filter(p => p.user_id !== userId))
  }

  const list = tab === 'following' ? following : followers
  const followingIds = new Set(following.map(p => p.user_id))

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 pb-24 overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-2xl mx-auto pt-32">

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Friends 👥</h1>
          <p className="text-gray-400">See who you follow and who follows you.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-full p-1 mb-6 w-fit">
          <button
            onClick={() => setTab('following')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${tab === 'following' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20' : 'text-gray-400 hover:text-white'}`}
          >
            Following {!loading && `(${following.length})`}
          </button>
          <button
            onClick={() => setTab('followers')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${tab === 'followers' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20' : 'text-gray-400 hover:text-white'}`}
          >
            Followers {!loading && `(${followers.length})`}
          </button>
          <button
            onClick={() => setTab('search')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${tab === 'search' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20' : 'text-gray-400 hover:text-white'}`}
          >
            Find People
          </button>
        </div>

        {/* Search tab */}
        {tab === 'search' && (
          <div>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by username or name..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/30 transition mb-4"
            />
            {searching && <p className="text-gray-500 text-sm">Searching...</p>}
            {!searching && query.trim() && searchResults.length === 0 && (
              <p className="text-gray-500 text-sm">No users found for "{query}"</p>
            )}
            {!query.trim() && (
              <p className="text-gray-600 text-sm">Type a name or @username to find people.</p>
            )}
            {searchResults.length > 0 && (
              <ul className="flex flex-col gap-3">
                {searchResults.map(p => {
                  const isFollowing = followingIds.has(p.user_id)
                  return (
                    <li key={p.user_id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <a href={p.username ? `/u/${p.username}` : '#'} className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                          {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{p.avatar || '✨'}</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{p.display_name || `@${p.username}`}</p>
                          <p className="text-xs text-gray-500">@{p.username}</p>
                          {p.concerns?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.concerns.slice(0, 3).map(c => (
                                <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </a>
                      <button
                        onClick={() => isFollowing ? unfollowUser(p.user_id) : followUser(p)}
                        className={`text-xs px-4 py-1.5 rounded-full font-semibold transition flex-shrink-0 ${
                          isFollowing
                            ? 'border border-white/15 text-gray-400 hover:border-rose-500/40 hover:text-rose-300'
                            : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 shadow-lg shadow-pink-500/20'
                        }`}
                      >
                        {isFollowing ? 'Following' : '+ Follow'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {/* Following / Followers tabs */}
        {tab !== 'search' && (
          loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : list.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
              <p className="text-gray-300 mb-2 font-semibold">
                {tab === 'following' ? "You're not following anyone yet" : "No followers yet"}
              </p>
              <p className="text-gray-500 text-sm mb-6">
                {tab === 'following' ? 'Search for people to follow.' : 'Share your profile link so others can find you.'}
              </p>
              <button
                onClick={() => setTab('search')}
                className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg shadow-pink-500/20"
              >
                Find People
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map(p => (
                <li key={p.user_id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <a href={p.username ? `/u/${p.username}` : '#'} className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{p.avatar || '✨'}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{p.display_name || (p.username ? `@${p.username}` : 'GlowLog User')}</p>
                      {p.username && <p className="text-xs text-gray-500">@{p.username}</p>}
                    </div>
                  </a>
                  {tab === 'following' ? (
                    <button
                      onClick={() => unfollow(p.user_id)}
                      className="text-xs px-4 py-1.5 rounded-full border border-white/15 text-gray-400 hover:border-rose-500/40 hover:text-rose-300 transition flex-shrink-0"
                    >
                      Unfollow
                    </button>
                  ) : (
                    !followingIds.has(p.user_id) && (
                      <button
                        onClick={() => followBack(p.user_id)}
                        className="text-xs px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold hover:opacity-90 transition flex-shrink-0"
                      >
                        Follow back
                      </button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )
        )}

        <div className="mt-8 text-center">
          <a href="/profile" className="text-xs text-gray-500 hover:text-gray-300 transition">
            Set your username so others can find you →
          </a>
        </div>

      </div>
    </main>
  )
}
