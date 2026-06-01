'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { toLocalDateString } from '../../lib/dates'
import { isPremium } from '../../lib/profile'

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
  if (!set.has(toLocalDateString(d))) d.setDate(d.getDate() - 1)
  while (set.has(toLocalDateString(d))) {
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

const RANGES = [
  { key: 5, label: '5 days', premium: false },
  { key: 10, label: '10 days', premium: false },
  { key: 30, label: '1 month', premium: false },
  { key: 90, label: '3 months', premium: true },
  { key: 180, label: '6 months', premium: true },
  { key: 365, label: '1 year', premium: true },
]

// Build the last N calendar days ending today, each paired with its log (or null).
// Days without a log still get a slot so the chart shows a continuous window.
function buildChartDays(logs, days) {
  const byDate = new Map(logs.map(l => [l.date, l]))
  const out = []
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  for (let i = 0; i < days; i++) {
    const key = toLocalDateString(d)
    out.push({ date: key, log: byDate.get(key) || null })
    d.setDate(d.getDate() + 1)
  }
  return out
}

export default function Progress() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [profile, setProfile] = useState(null)
  const [range, setRange] = useState(30)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      const [logsRes, profileRes] = await Promise.all([
        supabase.from('skin_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }),
        supabase.from('profiles').select('tier').eq('user_id', user.id).maybeSingle(),
      ])
      setLogs(logsRes.data || [])
      setProfile(profileRes.data)
      setLoading(false)
    })
  }, [])

  const premium = isPremium(profile)
  function pickRange(r) {
    if (r.premium && !premium) {
      setShowUpgrade(true)
      return
    }
    setRange(r.key)
  }

  const rated = logs.filter(l => l.skin_rating)
  const avg = rated.length ? rated.reduce((s, l) => s + l.skin_rating, 0) / rated.length : 0
  const streak = computeStreak(logs.map(l => l.date))
  const chartDays = buildChartDays(logs, range)
  const recent = [...logs].reverse()
  // Photo timeline: newest first, only logs with a photo. Indexed so the
  // lightbox can prev/next without recomputing.
  const photoLogs = [...logs].filter(l => l.photo_url).reverse()

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 app-page-pad-bottom overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-4xl mx-auto app-page-pad-top">

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
              <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold">Skin rating</h2>
                  <p className="text-gray-400 text-sm">Last {range} {range === 1 ? 'day' : 'days'}</p>
                </div>
                <div className="flex flex-wrap gap-1 bg-white/5 border border-white/10 rounded-full p-1">
                  {RANGES.map(r => {
                    const locked = r.premium && !premium
                    const active = range === r.key
                    return (
                      <button
                        key={r.key}
                        onClick={() => pickRange(r)}
                        className={`text-xs px-3 py-1 rounded-full transition flex items-center gap-1 ${
                          active
                            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md shadow-pink-500/20'
                            : locked
                              ? 'text-amber-200/70 hover:text-amber-100'
                              : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {locked && <span className="text-[10px]">✦</span>}
                        {r.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-40 mt-4">
                {chartDays.map(d => {
                  const rating = d.log?.skin_rating
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col justify-end h-full"
                      title={`${formatDate(d.date)} — ${rating ? RATINGS[rating].label : 'no log'}`}
                    >
                      <div
                        className={`w-full rounded-t-md transition-all ${rating ? RATINGS[rating].color : 'bg-white/5'}`}
                        style={{ height: rating ? `${(rating / 5) * 100}%` : '4px' }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-3 text-xs text-gray-600">
                <span>{formatDate(chartDays[0].date)}</span>
                <span>{formatDate(chartDays[chartDays.length - 1].date)}</span>
              </div>
            </div>

            {/* Photo timeline */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold">Photo timeline</h2>
                  <p className="text-gray-400 text-sm">
                    {photoLogs.length === 0
                      ? 'Snap a daily photo on the dashboard to start a visual record.'
                      : `${photoLogs.length} ${photoLogs.length === 1 ? 'photo' : 'photos'} over ${logs.length} ${logs.length === 1 ? 'day' : 'days'}`}
                  </p>
                </div>
              </div>
              {photoLogs.length === 0 ? (
                <a
                  href="/dashboard"
                  className="inline-block text-sm text-pink-300 hover:text-pink-200 transition"
                >
                  Add a photo to today's log →
                </a>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {photoLogs.map((l, i) => {
                    const r = RATINGS[l.skin_rating]
                    return (
                      <button
                        key={l.id}
                        onClick={() => setLightboxIdx(i)}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-pink-500/40 transition"
                      >
                        <img src={l.photo_url} alt={`Skin on ${l.date}`} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 py-2 flex items-end justify-between gap-1">
                          <span className="text-[10px] text-white font-medium leading-tight">
                            {new Date(l.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          {r && <span className="text-sm leading-none">{r.emoji}</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* History list */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">History</h2>
              <ul className="flex flex-col divide-y divide-white/5">
                {recent.map(l => {
                  const done = l.completed && Object.keys(l.completed).length
                    ? Object.values(l.completed).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0)
                    : (l.morning_completed?.length || 0) + (l.night_completed?.length || 0)
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

      {showUpgrade && <UpgradeNudge onClose={() => setShowUpgrade(false)} />}

      {lightboxIdx !== null && photoLogs[lightboxIdx] && (
        <PhotoLightbox
          logs={photoLogs}
          index={lightboxIdx}
          onIndex={setLightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </main>
  )
}

function UpgradeNudge({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-[#0e0e0e] border border-pink-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl shadow-pink-500/20"
      >
        <span className="text-[10px] uppercase tracking-wider bg-gradient-to-r from-amber-400/30 to-pink-400/30 border border-amber-300/40 text-amber-200 px-2 py-0.5 rounded-full font-semibold">
          ✦ Premium
        </span>
        <h3 className="text-xl font-bold mt-3 mb-2 bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
          See longer trends with Premium
        </h3>
        <p className="text-sm text-gray-400 mb-5">3-month, 6-month, and yearly views are part of Premium. Free is capped at the last 30 days.</p>
        <div className="flex items-center gap-3">
          <a
            href="/profile"
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2 rounded-full text-sm hover:opacity-90 transition shadow-lg shadow-pink-500/20"
          >
            Upgrade
          </a>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white transition">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

function PhotoLightbox({ logs, index, onIndex, onClose }) {
  const log = logs[index]
  const r = RATINGS[log.skin_rating]
  const hasPrev = index > 0
  const hasNext = index < logs.length - 1

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onIndex(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onIndex(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, hasPrev, hasNext, onClose, onIndex])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl flex flex-col gap-3">
        <div className="relative bg-black rounded-2xl overflow-hidden border border-white/10">
          <img src={log.photo_url} alt={`Skin on ${log.date}`} className="w-full h-auto max-h-[70vh] object-contain bg-black" />

          {hasPrev && (
            <button
              onClick={() => onIndex(index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-white text-xl transition"
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => onIndex(index + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-white text-xl transition"
              aria-label="Next photo"
            >
              ›
            </button>
          )}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-white text-sm transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 px-2 text-white">
          <div>
            <p className="text-sm font-semibold">{formatDate(log.date)}</p>
            <p className="text-xs text-gray-400">{index + 1} of {logs.length}</p>
          </div>
          {r && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">{r.emoji}</span>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">Rating</p>
                <p className="text-sm text-white">{r.label}</p>
              </div>
            </div>
          )}
        </div>
        {log.note && (
          <p className="text-sm text-gray-300 bg-white/5 border border-white/10 rounded-xl p-3 mx-2">{log.note}</p>
        )}
      </div>
    </div>
  )
}
