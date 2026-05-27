'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'

const RATINGS = {
  1: { emoji: '😣', label: 'Bad', color: 'bg-rose-500' },
  2: { emoji: '😐', label: 'Meh', color: 'bg-orange-500' },
  3: { emoji: '🙂', label: 'Okay', color: 'bg-amber-400' },
  4: { emoji: '😊', label: 'Good', color: 'bg-pink-500' },
  5: { emoji: '✨', label: 'Glowing', color: 'bg-purple-500' },
}

// Count consecutive days logged ending today (or yesterday, so an un-logged
// today doesn't break the streak mid-day). Dates are 'YYYY-MM-DD' strings.
function computeStreak(dates) {
  const set = new Set(dates)
  let streak = 0
  const d = new Date()
  if (!set.has(d.toISOString().split('T')[0])) d.setDate(d.getDate() - 1)
  while (set.has(d.toISOString().split('T')[0])) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function formatDate(dateStr) {
  // Append time so the YYYY-MM-DD string is parsed in local time, not UTC.
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function Progress() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('skin_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
      setLogs(data || [])
      setLoading(false)
    })
  }, [])

  const rated = logs.filter(l => l.skin_rating)
  const avg = rated.length ? rated.reduce((s, l) => s + l.skin_rating, 0) / rated.length : 0
  const streak = computeStreak(logs.map(l => l.date))
  const chartLogs = logs.slice(-30)
  const recent = [...logs].reverse()

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 pb-16 overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-4xl mx-auto pt-32">

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Your Progress 📈</h1>
          <p className="text-gray-400">See how your skin has been trending over time.</p>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading your history...</p>
        ) : logs.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
            <p className="text-gray-300 mb-2">No logs yet ✨</p>
            <p className="text-gray-500 text-sm mb-6">Log how your skin feels on the dashboard, and your history will show up here.</p>
            <a
              href="/dashboard"
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg shadow-pink-500/20"
            >
              Go to Dashboard
            </a>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-pink-300">{logs.length}</p>
                <p className="text-xs text-gray-500 mt-1">Days logged</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-purple-300">{avg ? avg.toFixed(1) : '—'}</p>
                <p className="text-xs text-gray-500 mt-1">Avg rating</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-rose-300">{streak}🔥</p>
                <p className="text-xs text-gray-500 mt-1">Day streak</p>
              </div>
            </div>

            {/* Rating chart */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-1">Skin rating</h2>
              <p className="text-gray-400 text-sm mb-5">Last {chartLogs.length} logged {chartLogs.length === 1 ? 'day' : 'days'}</p>
              <div className="flex items-end gap-1.5 h-40">
                {chartLogs.map(l => (
                  <div
                    key={l.id}
                    className="flex-1 flex flex-col justify-end h-full"
                    title={`${formatDate(l.date)} — ${l.skin_rating ? RATINGS[l.skin_rating].label : 'no rating'}`}
                  >
                    <div
                      className={`w-full rounded-t-md transition-all ${l.skin_rating ? RATINGS[l.skin_rating].color : 'bg-white/10'}`}
                      style={{ height: `${((l.skin_rating || 0) / 5) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 text-xs text-gray-600">
                <span>{formatDate(chartLogs[0].date)}</span>
                <span>{formatDate(chartLogs[chartLogs.length - 1].date)}</span>
              </div>
            </div>

            {/* History list */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">History</h2>
              <ul className="flex flex-col divide-y divide-white/5">
                {recent.map(l => {
                  const done = (l.morning_completed?.length || 0) + (l.night_completed?.length || 0)
                  const r = RATINGS[l.skin_rating]
                  return (
                    <li key={l.id} className="flex items-start gap-4 py-3">
                      <span className="text-2xl flex-shrink-0 w-8 text-center">{r ? r.emoji : '–'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-200">{formatDate(l.date)}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">{done} step{done === 1 ? '' : 's'} done</span>
                        </div>
                        {l.note && <p className="text-sm text-gray-400 mt-0.5 break-words">{l.note}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}

      </div>
    </main>
  )
}
