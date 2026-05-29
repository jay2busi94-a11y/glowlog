// A routine is { id, name, emoji, steps: [Step] }.
// A Step is { name: string, productId?: string|null }. Older rows may have
// step as a plain string — `normalizeStep` upgrades them on read.
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

// Coerce a step (legacy string or new object) into the canonical object shape.
export function normalizeStep(step) {
  if (typeof step === 'string') return { name: step, productId: null }
  if (step && typeof step === 'object' && typeof step.name === 'string') {
    return { name: step.name, productId: step.productId || null }
  }
  return { name: String(step ?? ''), productId: null }
}

function normalizeRoutine(r) {
  return { ...r, steps: (r.steps || []).map(normalizeStep) }
}

// Fresh copies each call so callers can mutate state safely.
export function getDefaultRoutines() {
  return [
    { id: 'morning', name: 'Morning Routine', emoji: '☀️', steps: [{ name: 'Cleanser', productId: null }, { name: 'Vitamin C Serum', productId: null }, { name: 'Moisturizer + SPF', productId: null }] },
    { id: 'night', name: 'Night Routine', emoji: '🌙', steps: [{ name: 'Oil Cleanser', productId: null }, { name: 'Foaming Cleanser', productId: null }, { name: 'Retinol Serum', productId: null }, { name: 'Night Moisturizer', productId: null }] },
  ]
}

// Turn a `routines` table row into a routine list, with fallbacks:
// new `data` column → legacy morning_steps/night_steps → defaults.
// Every step is normalized to { name, productId }.
export function routinesFromRow(row) {
  if (row && Array.isArray(row.data) && row.data.length) return row.data.map(normalizeRoutine)
  if (row && ((row.morning_steps && row.morning_steps.length) || (row.night_steps && row.night_steps.length))) {
    return [
      { id: 'morning', name: 'Morning Routine', emoji: '☀️', steps: (row.morning_steps || []).map(normalizeStep) },
      { id: 'night', name: 'Night Routine', emoji: '🌙', steps: (row.night_steps || []).map(normalizeStep) },
    ]
  }
  return getDefaultRoutines()
}

// `skin_logs.completed` historically stored arrays of step *names*. We keep
// that shape (no migration), so check-offs are keyed by step name. This
// helper reads done-state for a step regardless of legacy vs new shape.
export function stepKey(step) {
  return normalizeStep(step).name
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
