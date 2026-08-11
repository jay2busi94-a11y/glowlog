'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { displayNameFor, avatarFor, avatarPhotoFor, isPremium } from '../../lib/profile'
import { ikAvatar } from '../../lib/imagekit'

// Icons are inline SVG, not emoji. Emoji render differently on every
// platform, can't take currentColor, and can't be sized reliably — they
// were the main reason the old bottom bar looked different on iOS.
const ICONS = {
  dashboard: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.6V20h13V9.6" /></>,
  routine: <path d="M12 3s6 6.4 6 10.4a6 6 0 0 1-12 0C6 9.4 12 3 12 3Z" />,
  catalog: <><rect x="3" y="4" width="18" height="6.5" rx="1.5" /><rect x="3" y="13.5" width="18" height="6.5" rx="1.5" /></>,
  friends: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.6a3.2 3.2 0 0 1 0 6" /><path d="M17.2 14.8A5.5 5.5 0 0 1 20.5 20" /></>,
  progress: <><path d="M4 4v16h16" /><path d="M7.5 15.5 11 11l3 2.5 4.5-6" /></>,
}

function Icon({ name, className = 'w-[22px] h-[22px]' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

// Destinations show up in both the desktop top nav and the mobile bottom
// tab bar. Order matters — keep them aligned with how the app is used.
const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/routine',   label: 'Routine',   icon: 'routine' },
  { href: '/catalog',   label: 'Catalog',   icon: 'catalog' },
  { href: '/friends',   label: 'Friends',   icon: 'friends' },
  { href: '/progress',  label: 'Progress',  icon: 'progress' },
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

  // Escape closes it too — a click-outside handler alone leaves keyboard
  // users stuck in the menu.
  useEffect(() => {
    if (!menuOpen) return
    function onKey(e) { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
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
          hidden on phone (they live in the bottom tab bar instead).
          Solid background rather than blur: backdrop-filter repaints the
          area behind it on every scroll frame. */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 bg-paper border-b border-rule"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
          paddingBottom: '0.75rem',
          paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 1rem)',
          paddingRight: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
        }}
      >
        <a
          href="/dashboard"
          className="text-lg font-extrabold tracking-[-0.035em] text-ink flex-shrink-0 inline-flex items-center min-h-[44px]"
        >
          GlowLog
        </a>

        {/* Desktop nav links — hidden on phone */}
        <div className="hidden md:flex items-center gap-1 text-sm">
          {NAV_LINKS.map(link => {
            const active = pathname === link.href
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`px-3 rounded-full font-semibold transition-colors inline-flex items-center min-h-[44px] ${
                  active ? 'text-accent bg-accent/10' : 'text-ink-mute hover:text-ink'
                }`}
              >
                {link.label}
              </a>
            )
          })}
        </div>

        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={`flex items-center gap-2 rounded-full pl-1.5 pr-3 min-h-[44px] ring-1 transition cursor-pointer ${
              menuOpen ? 'bg-card ring-ink-mute' : 'bg-card ring-rule hover:ring-ink-mute'
            }`}
            aria-label="Open profile menu"
            aria-expanded={menuOpen}
          >
            <span className="w-8 h-8 rounded-full bg-paper ring-1 ring-rule flex items-center justify-center text-base overflow-hidden">
              {avatarPhoto ? (
                <img src={ikAvatar(avatarPhoto, 32)} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{avatar}</span>
              )}
            </span>
            <span className="text-sm font-semibold text-ink max-w-[100px] truncate hidden sm:inline">{name}</span>
            <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 text-ink-mute transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-card rounded-card ring-1 ring-rule shadow-[var(--lift-2)] overflow-hidden">
              <div className="px-4 py-3 border-b border-rule flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-paper ring-1 ring-rule flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                  {avatarPhoto ? (
                    <img src={ikAvatar(avatarPhoto, 40)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{avatar}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{name}</p>
                  <p className="text-xs text-ink-mute truncate">{user?.email}</p>
                </div>
              </div>
              <a
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center px-4 min-h-[44px] text-sm font-medium text-ink hover:bg-paper transition"
              >
                Edit profile
              </a>
              <a
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center px-4 min-h-[44px] text-sm font-medium text-ink hover:bg-paper transition"
              >
                Settings
              </a>
              {!isPremium(profile) && (
                <a
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 min-h-[44px] text-sm border-y border-rule hover:bg-paper transition"
                >
                  <span className="font-semibold text-ink">Upgrade to Premium</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute">Soon</span>
                </a>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center w-full text-left px-4 min-h-[44px] text-sm font-medium text-warn hover:bg-paper transition cursor-pointer"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* BOTTOM TAB BAR — phone only. Lives above the iOS home indicator. */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper border-t border-rule"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.375rem)',
          paddingTop: '0.375rem',
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
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] py-1 transition-colors ${
                  active ? 'text-accent' : 'text-ink-mute hover:text-ink'
                }`}
              >
                <Icon name={link.icon} />
                <span className="text-[10px] font-semibold tracking-[-0.01em]">{link.label}</span>
              </a>
            )
          })}
        </div>
      </nav>
    </>
  )
}
