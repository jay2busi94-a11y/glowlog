'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function AppNavbar() {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

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

      <button
        onClick={handleLogout}
        className="text-sm text-gray-400 hover:text-white transition px-4 py-2"
      >
        Log Out
      </button>
    </nav>
  )
}
