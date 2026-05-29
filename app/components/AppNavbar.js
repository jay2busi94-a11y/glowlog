'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { displayNameFor, avatarFor, avatarPhotoFor, isPremium } from '../../lib/profile'

// Destinations show up in both the desktop top nav and the mobile bottom
// tab bar. Order matters — keep them aligned with how the app is used.
const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', emoji: '🏠' },
  { href: '/routine',   label: 'Routine',   emoji: '🧴' },
  { href: '/catalog',   label: 'Catalog',   emoji: '🗂️' },
  { href: '/discover',  label: 'Discover',  emoji: '✨' },
  { href: '/progress',  label: 'Progress',  emoji: '📈' },
]

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
        .select('display_name, avatar, avatar_url, tier')
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
  const avatarPhoto = avatarPhotoFor(profile)

  return (
    <>
      {/* TOP NAV — pads the iOS notch/Dynamic Island. Middle links are
          hidden on phone (they live in the bottom tab bar instead). */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 sm:px-8 bg-[#080808]/80 backdrop-blur-md border-b border-white/10"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
          paddingBottom: '1rem',
          paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 1rem)',
          paddingRight: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
        }}
      >
        <a href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent flex-shrink-0">
          GlowLog
        </a>

        {/* Desktop nav links — hidden on phone */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className={`transition ${pathname === link.href ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={`flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 border transition ${
              menuOpen
                ? 'bg-white/10 border-white/20'
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
            aria-label="Open profile menu"
          >
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-base overflow-hidden">
              {avatarPhoto ? (
                <img src={avatarPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{avatar}</span>
              )}
            </span>
            <span className="text-sm text-gray-200 max-w-[100px] truncate hidden sm:inline">{name}</span>
            <span className={`text-gray-500 text-xs transition ${menuOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl shadow-pink-500/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                  {avatarPhoto ? (
                    <img src={avatarPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{avatar}</span>
                  )}
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
              <a
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/5 transition"
              >
                Settings
              </a>
              {!isPremium(profile) && (
                <a
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-2.5 text-sm bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-400/5 hover:from-pink-500/20 hover:via-purple-500/20 hover:to-amber-400/10 transition border-y border-pink-500/15"
                >
                  <span className="bg-gradient-to-r from-pink-200 via-purple-200 to-amber-200 bg-clip-text text-transparent font-semibold">
                    ✦ Upgrade to Premium
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-amber-200/70">Free</span>
                </a>
              )}
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

      {/* BOTTOM TAB BAR — phone only. Lives above the iOS home indicator. */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080808]/85 backdrop-blur-md border-t border-white/10"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)',
          paddingTop: '0.5rem',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <div className="flex items-stretch justify-around">
          {NAV_LINKS.map(link => {
            const active = pathname === link.href
            return (
              <a
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition ${
                  active ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <span className={`text-lg leading-none ${active ? 'scale-110' : ''} transition-transform`}>{link.emoji}</span>
                <span className="text-[10px] font-medium">{link.label}</span>
              </a>
            )
          })}
        </div>
      </nav>
    </>
  )
}
