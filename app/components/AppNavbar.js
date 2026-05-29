'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { displayNameFor, avatarFor } from '../../lib/profile'

export default function AppNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser(user)
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) setProfile(data)
    })
  }, [])

  // Close the dropdown when clicking outside.
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const name = displayNameFor(profile, user)
  const avatar = avatarFor(profile)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[#080808]/80 backdrop-blur-md border-b border-white/10">
      <a href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
        GlowLog
      </a>

      <div className="flex items-center gap-6 text-sm">
        <a
          href="/dashboard"
          className={`transition ${pathname === '/dashboard' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Dashboard
        </a>
        <a
          href="/routine"
          className={`transition ${pathname === '/routine' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Routine
        </a>
        <a
          href="/catalog"
          className={`transition ${pathname === '/catalog' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Catalog
        </a>
        <a
          href="/progress"
          className={`transition ${pathname === '/progress' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Progress
        </a>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className={`flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 border transition ${
            menuOpen
              ? 'bg-white/10 border-white/20'
              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
          }`}
          aria-label="Open profile menu"
        >
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-base">
            {avatar}
          </span>
          <span className="text-sm text-gray-200 max-w-[120px] truncate hidden sm:inline">{name}</span>
          <span className={`text-gray-500 text-xs transition ${menuOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl shadow-pink-500/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                {avatar}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <a
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 transition"
            >
              Edit profile
            </a>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2.5 text-sm text-rose-300 hover:bg-white/5 transition"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
