// Streak helpers for the skincare routine. "Streak day" = a day where the
// user actually checked at least one step in a routine — NOT just any
// daily log entry. The legacy `computeStreak(dates)` on /progress used
// log-existence which set the bar way too low.

import { toLocalDateString } from './dates'

// Does this log have any actually-checked routine step?
// Handles both the new shape (`completed` jsonb map keyed by routine id →
// step name array) and the legacy shape (`morning_completed` /
// `night_completed` text arrays).
export function hasAnyRoutineStep(log) {
  if (!log) return false
  if (log.completed && typeof log.completed === 'object') {
    for (const arr of Object.values(log.completed)) {
      if (Array.isArray(arr) && arr.length > 0) return true
    }
  }
  if (Array.isArray(log.morning_completed) && log.morning_completed.length > 0) return true
  if (Array.isArray(log.night_completed) && log.night_completed.length > 0) return true
  return false
}

// Returns the unique sorted set of `YYYY-MM-DD` strings where the user
// actually did at least one step.
export function streakDates(logs) {
  const set = new Set()
  for (const l of (logs || [])) {
    if (hasAnyRoutineStep(l) && l.date) set.add(l.date)
  }
  return set
}

// Consecutive days ending today (or yesterday — so a not-yet-checked-off
// today doesn't snap the streak mid-day). Pure function of the date set.
export function computeRoutineStreak(logs) {
  const dates = streakDates(logs)
  let streak = 0
  const d = new Date()
  if (!dates.has(toLocalDateString(d))) d.setDate(d.getDate() - 1)
  while (dates.has(toLocalDateString(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// Longest streak ever — walks every date once via a Set, O(N).
export function computeBestRoutineStreak(logs) {
  const dates = streakDates(logs)
  let best = 0
  for (const dateStr of dates) {
    // Only start counting from a date whose previous day is NOT also
    // a streak day — that way each run gets counted exactly once.
    const prev = previousDayStr(dateStr)
    if (dates.has(prev)) continue
    let run = 1
    let cur = nextDayStr(dateStr)
    while (dates.has(cur)) {
      run++
      cur = nextDayStr(cur)
    }
    if (run > best) best = run
  }
  return best
}

// Encouraging copy for the current streak. Tiers chosen to land on natural
// habit-formation milestones — feel free to tweak.
export function streakMilestoneLabel(streak) {
  if (streak >= 100) return 'Glow legend ✨'
  if (streak >= 60) return 'Locked in'
  if (streak >= 30) return 'A month strong'
  if (streak >= 14) return 'Two weeks in'
  if (streak >= 7) return 'One week down'
  if (streak >= 3) return 'Building the habit'
  if (streak >= 1) return 'Keep it going'
  return null
}

// ── internal date math ──────────────────────────────────────────────
function previousDayStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return toLocalDateString(d)
}
function nextDayStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return toLocalDateString(d)
}
