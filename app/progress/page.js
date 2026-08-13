'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { toLocalDateString } from '../../lib/dates'
import { computeRoutineStreak, computeBestRoutineStreak } from '../../lib/streaks'

// A five-step diverging scale: bad reads as warning, good reads as clear,
// neutral sits in the middle. Every step is visually distinct — the colour
// migration had collapsed these into three near-invisible tints, two of
// which matched each other and a third that matched an unlogged day.
// Bar height also encodes the rating, so colour is reinforcement here, not
// the only channel carrying the value.
const RATINGS = {
  1: { emoji: '😣', label: 'Bad', color: 'bg-warn' },
  2: { emoji: '😐', label: 'Meh', color: 'bg-warn/55' },
  3: { emoji: '🙂', label: 'Okay', color: 'bg-ink-mute' },
  4: { emoji: '😊', label: 'Good', color: 'bg-ok/55' },
  5: { emoji: '✨', label: 'Glowing', color: 'bg-ok' },
}

function formatDate(dateStr) {
  // Append time so the YYYY-MM-DD string is parsed in local time, not UTC.
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// Deliberately not gated. These are the user's own logs — putting their
// history behind a paywall means someone who stopped logging for a month
// opens Progress to an empty chart and no way to reach their own data.
// Premium still gates the AI features, which have a real per-call cost.
const RANGES = [
  { key: 5, label: '5 days' },
  { key: 10, label: '10 days' },
  { key: 30, label: '1 month' },
  { key: 90, label: '3 months' },
  { key: 180, label: '6 months' },
  { key: 365, label: '1 year' },
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


  const rated = logs.filter(l => l.skin_rating)
  const avg = rated.length ? rated.reduce((s, l) => s + l.skin_rating, 0) / rated.length : 0
  // Routine streak: consecutive days you actually checked at least one
  // step (not just days where a log row exists).
  const streak = computeRoutineStreak(logs)
  const bestStreak = computeBestRoutineStreak(logs)
  const chartDays = buildChartDays(logs, range)

  // An empty grid doesn't say whether you have no logs at all or just none
  // lately. Work out which, and if there is older data, offer the smallest
  // range that actually reaches it.
  const ratedInWindow = chartDays.filter(d => d.log?.skin_rating).length
  const latestRated = rated.length
    ? rated.reduce((a, b) => (a.date > b.date ? a : b))
    : null
  const daysSinceLatest = latestRated
    ? Math.floor((new Date(`${toLocalDateString()}T00:00:00`) - new Date(`${latestRated.date}T00:00:00`)) / 86400000)
    : null
  const suggestedRange = daysSinceLatest === null
    ? null
    : RANGES.find(r => r.key > daysSinceLatest) || null
  const recent = [...logs].reverse()
  // Photo timeline: newest first, only logs with a photo. Indexed so the
  // lightbox can prev/next without recomputing.
  const photoLogs = [...logs].filter(l => l.photo_url).reverse()

  return (
    <main className="min-h-screen bg-paper text-ink px-4 app-page-pad-bottom overflow-hidden">
      <AppNavbar />

      <div className="relative z-10 max-w-4xl mx-auto app-page-pad-top">

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Your Progress 📈</h1>
          <p className="text-ink-mute">See how your skin has been trending over time.</p>
        </div>

        {loading ? (
          <p className="text-ink-mute">Loading your history...</p>
        ) : logs.length === 0 ? (
          <div className="bg-card border border-rule rounded-card p-10 text-center">
            <p className="text-ink mb-2">No logs yet ✨</p>
            <p className="text-ink-mute text-sm mb-6">Log how your skin feels on the dashboard, and your history will show up here.</p>
            <a
              href="/dashboard"
              className="inline-block bg-accent text-paper font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg"
            >
              Go to Dashboard
            </a>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-card border border-rule rounded-card p-5 text-center">
                <p className="text-3xl font-bold text-ink">{logs.length}</p>
                <p className="text-xs text-ink-mute mt-1">Days logged</p>
              </div>
              <div className="bg-card border border-rule rounded-card p-5 text-center">
                <p className="text-3xl font-bold text-ink">{avg ? avg.toFixed(1) : '—'}</p>
                <p className="text-xs text-ink-mute mt-1">Avg rating</p>
              </div>
              <div className={`rounded-card p-5 text-center border ${
                streak >= 7
                  ? 'bg-accent/10 border-rule shadow-md'
                  : 'bg-card border-rule'
              }`}>
                <p className="text-3xl font-bold text-ink">{streak}🔥</p>
                <p className="text-xs text-ink-mute mt-1">Current streak</p>
              </div>
              <div className="bg-card border border-rule rounded-card p-5 text-center">
                <p className="text-3xl font-bold text-ink">{bestStreak}</p>
                <p className="text-xs text-ink-mute mt-1">Best streak</p>
              </div>
            </div>

            {/* Rating chart */}
            <div className="bg-card border border-rule rounded-card p-6 mb-6">
              <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold">Skin rating</h2>
                  <p className="text-ink-mute text-sm">Last {range} {range === 1 ? 'day' : 'days'}</p>
                </div>
                <div className="flex flex-wrap gap-1 bg-card border border-rule rounded-full p-1">
                  {RANGES.map(r => {
                    const active = range === r.key
                    return (
                      <button
                        key={r.key}
                        onClick={() => setRange(r.key)}
                        aria-pressed={active}
                        className={`text-xs px-3 py-1 rounded-full transition cursor-pointer ${
                          active ? 'bg-accent text-paper' : 'text-ink-mute hover:text-ink'
                        }`}
                      >
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
                        className={`w-full rounded-t-md transition-all ${rating ? RATINGS[rating].color : 'bg-rule'}`}
                        style={{ height: rating ? `${(rating / 5) * 100}%` : '4px' }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-3 text-xs text-ink-mute">
                <span>{formatDate(chartDays[0].date)}</span>
                <span>{formatDate(chartDays[chartDays.length - 1].date)}</span>
              </div>

              {ratedInWindow === 0 && (
                <div className="mt-4 pt-4 border-t border-rule">
                  {latestRated ? (
                    <p className="text-sm text-ink-mute">
                      No ratings in the last {range} days. Your most recent was{' '}
                      <span className="text-ink font-semibold">{formatDate(latestRated.date)}</span>
                      {suggestedRange && (
                        <>
                          {' — '}
                          <button
                            onClick={() => setRange(suggestedRange.key)}
                            className="text-accent font-semibold hover:brightness-110 cursor-pointer underline underline-offset-2"
                          >
                            show {suggestedRange.label}
                          </button>
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-ink-mute">
                      No skin ratings yet. Rate how your skin feels on the{' '}
                      <a href="/dashboard" className="text-accent font-semibold hover:brightness-110 underline underline-offset-2">dashboard</a>
                      {' '}and it&apos;ll chart here.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Photo timeline */}
            <div className="bg-card border border-rule rounded-card p-6 mb-6">
              <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold">Photo timeline</h2>
                  <p className="text-ink-mute text-sm">
                    {photoLogs.length === 0
                      ? 'Snap a daily photo on the dashboard to start a visual record.'
                      : `${photoLogs.length} ${photoLogs.length === 1 ? 'photo' : 'photos'} over ${logs.length} ${logs.length === 1 ? 'day' : 'days'}`}
                  </p>
                </div>
              </div>
              {photoLogs.length === 0 ? (
                <a
                  href="/dashboard"
                  className="inline-block text-sm text-accent hover:text-accent transition"
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
                        className="group relative aspect-square rounded-xl overflow-hidden border border-rule hover:border-accent transition"
                      >
                        <img src={l.photo_url} alt={`Skin on ${l.date}`} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 py-2 flex items-end justify-between gap-1">
                          <span className="text-[10px] text-ink font-medium leading-tight">
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
            <div className="bg-card border border-rule rounded-card p-6">
              <h2 className="text-lg font-semibold mb-4">History</h2>
              <ul className="flex flex-col divide-y divide-rule">
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
                          <span className="text-sm font-medium text-ink">{formatDate(l.date)}</span>
                          <span className="text-xs text-ink-mute flex-shrink-0">{done} step{done === 1 ? '' : 's'} done</span>
                        </div>
                        {l.note && <p className="text-sm text-ink-mute mt-0.5 break-words">{l.note}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}

      </div>


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
        <div className="relative bg-black rounded-card overflow-hidden border border-rule">
          <img src={log.photo_url} alt={`Skin on ${log.date}`} className="w-full h-auto max-h-[70vh] object-contain bg-black" />

          {hasPrev && (
            <button
              onClick={() => onIndex(index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-ink text-xl transition"
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => onIndex(index + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-ink text-xl transition"
              aria-label="Next photo"
            >
              ›
            </button>
          )}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-ink text-sm transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 px-2 text-ink">
          <div>
            <p className="text-sm font-semibold">{formatDate(log.date)}</p>
            <p className="text-xs text-ink-mute">{index + 1} of {logs.length}</p>
          </div>
          {r && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">{r.emoji}</span>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-ink-mute">Rating</p>
                <p className="text-sm text-ink">{r.label}</p>
              </div>
            </div>
          )}
        </div>
        {log.note && (
          <p className="text-sm text-ink bg-card border border-rule rounded-xl p-3 mx-2">{log.note}</p>
        )}
      </div>
    </div>
  )
}
