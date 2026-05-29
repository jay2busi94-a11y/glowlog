// A routine is { id, name, emoji, steps: [string] }.
// The full list lives in the `routines.data` jsonb column (one row per user).

// Preset steps the user can tap to add. They don't have to use all of them.
export const STEP_LIBRARY = [
  'Cleanser', 'Oil Cleanser', 'Foaming Cleanser', 'Micellar Water',
  'Toner', 'Essence', 'Exfoliant (AHA/BHA)',
  'Vitamin C Serum', 'Niacinamide Serum', 'Hyaluronic Acid',
  'Retinol Serum', 'Peptide Serum', 'Spot Treatment',
  'Eye Cream', 'Moisturizer', 'Night Moisturizer', 'Face Oil',
  'Sunscreen (SPF)', 'Moisturizer + SPF', 'Face Mask', 'Sheet Mask', 'Lip Balm',
]

// Fresh copies each call so callers can mutate state safely.
export function getDefaultRoutines() {
  return [
    { id: 'morning', name: 'Morning Routine', emoji: '☀️', steps: ['Cleanser', 'Vitamin C Serum', 'Moisturizer + SPF'] },
    { id: 'night', name: 'Night Routine', emoji: '🌙', steps: ['Oil Cleanser', 'Foaming Cleanser', 'Retinol Serum', 'Night Moisturizer'] },
  ]
}

// Turn a `routines` table row into a routine list, with fallbacks:
// new `data` column → legacy morning_steps/night_steps → defaults.
export function routinesFromRow(row) {
  if (row && Array.isArray(row.data) && row.data.length) return row.data
  if (row && ((row.morning_steps && row.morning_steps.length) || (row.night_steps && row.night_steps.length))) {
    return [
      { id: 'morning', name: 'Morning Routine', emoji: '☀️', steps: row.morning_steps || [] },
      { id: 'night', name: 'Night Routine', emoji: '🌙', steps: row.night_steps || [] },
    ]
  }
  return getDefaultRoutines()
}

export function newRoutineId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `r_${Date.now()}`
}

// Cycling accent palette. Full static Tailwind class strings so they survive purging.
const ACCENTS = [
  { ring: 'border-pink-500/20', head: 'text-pink-300', dot: 'bg-pink-500/20 border-pink-500/30 text-pink-400', dotDone: 'bg-pink-500/40 border-pink-400 text-pink-200', link: 'text-pink-300 hover:text-pink-200', focus: 'focus:border-pink-500/30' },
  { ring: 'border-purple-500/20', head: 'text-purple-300', dot: 'bg-purple-500/20 border-purple-500/30 text-purple-400', dotDone: 'bg-purple-500/40 border-purple-400 text-purple-200', link: 'text-purple-300 hover:text-purple-200', focus: 'focus:border-purple-500/30' },
  { ring: 'border-rose-500/20', head: 'text-rose-300', dot: 'bg-rose-500/20 border-rose-500/30 text-rose-400', dotDone: 'bg-rose-500/40 border-rose-400 text-rose-200', link: 'text-rose-300 hover:text-rose-200', focus: 'focus:border-rose-500/30' },
  { ring: 'border-sky-500/20', head: 'text-sky-300', dot: 'bg-sky-500/20 border-sky-500/30 text-sky-400', dotDone: 'bg-sky-500/40 border-sky-400 text-sky-200', link: 'text-sky-300 hover:text-sky-200', focus: 'focus:border-sky-500/30' },
]

export function accentFor(index) {
  return ACCENTS[index % ACCENTS.length]
}
