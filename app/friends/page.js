'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { ikAvatar } from '../../lib/imagekit'

export default function FriendsPage() {
  const router = useRouter()
  const [tab, setTab] = useState('following')
  const [following, setFollowing] = useState([])
  const [followers, setFollowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState(null)
  const [myProfile, setMyProfile] = useState(null)

  // Search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [followBusy, setFollowBusy] = useState({})  // user_id → true while in-flight
  const [followError, setFollowError] = useState('')
  const searchInputRef = useRef(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setMe(user)

      // Two-step load. PostgREST embedded `profiles(...)` queries DON'T work
      // here because follows.{follower,following}_id foreign-keys to
      // auth.users, NOT to public.profiles — so the embed returns null for
      // every row, which made it look like Follow wasn't saving (the
      // Following list always loaded empty even when DB had the row).
      // Step 1: get the raw IDs + own profile.
      const [followingRes, followersRes, profileRes] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase.from('follows').select('follower_id').eq('following_id', user.id),
        supabase.from('profiles').select('username').eq('user_id', user.id).maybeSingle(),
      ])

      const followingIds = (followingRes.data || []).map(r => r.following_id)
      const followerIds = (followersRes.data || []).map(r => r.follower_id)
      const allIds = [...new Set([...followingIds, ...followerIds])]

      // Step 2: fetch profiles for everyone we follow / who follows us.
      let profilesById = new Map()
      if (allIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar, avatar_url')
          .in('user_id', allIds)
        for (const p of (profs || [])) profilesById.set(p.user_id, p)
      }

      setFollowing(followingIds.map(id => profilesById.get(id)).filter(Boolean))
      setFollowers(followerIds.map(id => profilesById.get(id)).filter(Boolean))
      setMyProfile(profileRes.data)
      setLoading(false)
    })
  }, [])

  // Debounced people search. Excludes the current user so self-follow can't
  // even be attempted from the UI (DB CHECK blocks it too).
  useEffect(() => {
    if (!me) return
    const q = query.trim()
    let cancelled = false
    const handle = setTimeout(async () => {
      setSearching(true)
      const supabase = createClient()
      let req = supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar, avatar_url, concerns')
        .neq('user_id', me.id)
        .limit(20)
      if (q) {
        req = req.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      } else {
        req = req.order('updated_at', { ascending: false })
      }
      const { data } = await req
      if (cancelled) return
      setSearchResults(data || [])
      setSearching(false)
    }, q ? 250 : 0)
    return () => { cancelled = true; clearTimeout(handle) }
  }, [query, me?.id])

  async function unfollow(userId) {
    const supabase = createClient()
    await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', userId)
    setFollowing(prev => prev.filter(p => p.user_id !== userId))
  }

  async function followUser(userId) {
    if (!me || userId === me.id) {
      setFollowError("You can't follow yourself.")
      return
    }
    if (followBusy[userId]) return
    setFollowBusy(prev => ({ ...prev, [userId]: true }))
    setFollowError('')
    const supabase = createClient()
    const { error } = await supabase.from('follows').insert({ follower_id: me.id, following_id: userId })
    if (error) {
      // Surface the failure rather than silently no-op'ing — the old code
      // updated state even when the insert was rejected, which made follow
      // attempts look like they worked when they hadn't.
      const dup = `${error.message}`.toLowerCase().includes('duplicate')
      if (!dup) setFollowError(error.message || 'Follow failed.')
    } else {
      // Find the profile we just followed (from search results or followers)
      // and add it to the Following list optimistically.
      const found = searchResults.find(p => p.user_id === userId)
        || followers.find(p => p.user_id === userId)
      if (found) setFollowing(prev => prev.some(p => p.user_id === userId) ? prev : [...prev, found])
    }
    setFollowBusy(prev => { const next = { ...prev }; delete next[userId]; return next })
  }

  function focusSearch() {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
      searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const list = tab === 'following' ? following : followers
  const followingIds = new Set(following.map(p => p.user_id))

  return (
    <main className="min-h-screen bg-paper text-ink px-4 app-page-pad-bottom overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-2xl mx-auto app-page-pad-top">

        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">Friends 👥</h1>
          <p className="text-ink-mute">Find people, follow them, and see who you're connected to.</p>
        </div>

        {/* People search */}
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute">🔎</span>
          <input
            ref={searchInputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search people by name or @username"
            className="w-full bg-card border border-rule rounded-card pl-10 pr-4 py-3 text-ink placeholder-ink-mute text-sm focus:outline-none focus:border-accent transition"
          />
        </div>

        {/* Search results (only when there's a query, or browsing) */}
        {(query || searchResults.length > 0) && (
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-wider text-ink-mute mb-2">
              {query ? `Results for "${query}"` : 'Suggested people'}
            </p>
            {searching ? (
              <p className="text-ink-mute text-sm">Searching...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-ink-mute text-sm">No one matches that. {!query && 'When other users sign up, they\'ll show up here.'}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {searchResults.map(p => {
                  const isAlreadyFollowing = followingIds.has(p.user_id)
                  const isBusy = !!followBusy[p.user_id]
                  return (
                    <li key={p.user_id} className="bg-card border border-rule rounded-card p-3 flex items-center gap-3">
                      <a
                        href={`/u/${p.username || p.user_id}`}
                        className="flex items-center gap-3 min-w-0 flex-1 group"
                      >
                        <span className="w-11 h-11 rounded-full bg-accent/10 border border-rule flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                          {p.avatar_url ? (
                            <img src={ikAvatar(p.avatar_url, 56)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{p.avatar || '✨'}</span>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink truncate group-hover:text-accent transition">
                            {p.display_name || (p.username ? `@${p.username}` : 'GlowLog User')}
                          </p>
                          {p.username && <p className="text-[11px] text-ink-mute truncate">@{p.username}</p>}
                          {p.concerns?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.concerns.slice(0, 3).map(c => (
                                <span key={c} className="text-[10px] text-ink-mute bg-card border border-rule px-1.5 py-0.5 rounded-full">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </a>
                      {isAlreadyFollowing ? (
                        <button
                          onClick={() => unfollow(p.user_id)}
                          className="text-xs px-3 py-1.5 rounded-full border border-rule text-ink hover:border-warn hover:text-warn transition flex-shrink-0"
                        >
                          Following
                        </button>
                      ) : (
                        <button
                          onClick={() => followUser(p.user_id)}
                          disabled={isBusy}
                          className="text-xs px-3 py-1.5 rounded-full bg-accent text-paper font-semibold hover:opacity-90 transition disabled:opacity-50 flex-shrink-0"
                        >
                          {isBusy ? '...' : '+ Follow'}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {followError && <p className="text-xs text-warn mt-3">{followError}</p>}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-rule rounded-full p-1 mb-6 w-fit">
          <button
            onClick={() => setTab('following')}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition ${
              tab === 'following'
                ? 'bg-accent text-paper shadow-md '
                : 'text-ink-mute hover:text-ink'
            }`}
          >
            Following {!loading && `(${following.length})`}
          </button>
          <button
            onClick={() => setTab('followers')}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition ${
              tab === 'followers'
                ? 'bg-accent text-paper shadow-md '
                : 'text-ink-mute hover:text-ink'
            }`}
          >
            Followers {!loading && `(${followers.length})`}
          </button>
        </div>

        {loading ? (
          <p className="text-ink-mute">Loading...</p>
        ) : list.length === 0 ? (
          <div className="bg-card border border-rule rounded-card p-10 text-center">
            <p className="text-ink mb-2 font-semibold">
              {tab === 'following' ? "You're not following anyone yet" : "No followers yet"}
            </p>
            <p className="text-ink-mute text-sm mb-6">
              {tab === 'following' ? 'Search above to find people to follow.' : 'Share your profile link so others can find you.'}
            </p>
            <button
              onClick={focusSearch}
              className="inline-block bg-accent text-paper font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg"
            >
              🔎 Find people
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map(p => (
              <li key={p.user_id} className="bg-card border border-rule rounded-card p-4 flex items-center justify-between gap-4">
                <a
                  href={`/u/${p.username || p.user_id}`}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <div className="w-12 h-12 rounded-full bg-accent/10 border border-rule flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                    {p.avatar_url ? (
                      <img src={ikAvatar(p.avatar_url, 56)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{p.avatar || '✨'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{p.display_name || (p.username ? `@${p.username}` : 'GlowLog User')}</p>
                    {p.username && <p className="text-xs text-ink-mute">@{p.username}</p>}
                  </div>
                </a>

                {tab === 'following' ? (
                  <button
                    onClick={() => unfollow(p.user_id)}
                    className="text-xs px-4 py-1.5 rounded-full border border-rule text-ink-mute hover:border-warn hover:text-warn transition flex-shrink-0"
                  >
                    Unfollow
                  </button>
                ) : (
                  !followingIds.has(p.user_id) && (
                    <button
                      onClick={() => followUser(p.user_id)}
                      disabled={!!followBusy[p.user_id]}
                      className="text-xs px-4 py-1.5 rounded-full bg-accent text-paper font-semibold hover:opacity-90 transition disabled:opacity-50 flex-shrink-0"
                    >
                      {followBusy[p.user_id] ? '...' : 'Follow back'}
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 text-center">
          <p className="text-ink-mute text-sm">Share your profile:</p>
          {myProfile?.username ? (
            <p className="text-accent text-sm mt-1 break-all">glowlog-neon.vercel.app/u/{myProfile.username}</p>
          ) : (
            <a href="/profile" className="text-xs text-ink-mute hover:text-ink transition mt-1 inline-block">
              Set your username in profile settings →
            </a>
          )}
        </div>

      </div>
    </main>
  )
}
