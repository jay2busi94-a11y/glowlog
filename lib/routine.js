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

// Heuristic: does a step name belong to a given product category?
// Used so "Add to routine" can fill an existing matching empty step
// instead of always appending a duplicate.
function stepMatchesCategory(stepName, category) {
  if (!stepName || !category) return false
  const s = stepName.toLowerCase()
  const c = category.toLowerCase()
  if (s.includes(c)) return true
  // Handle common synonyms that don't share a substring.
  if (c === 'sunscreen' && (s.includes('spf') || s.includes('sunscreen'))) return true
  if (c === 'serum' && (s.includes('serum') || s.includes('vitamin c') || s.includes('niacinamide') || s.includes('hyaluronic') || s.includes('retinol') || s.includes('peptide'))) return true
  if (c === 'exfoliant' && (s.includes('aha') || s.includes('bha') || s.includes('exfoli'))) return true
  if (c === 'mask' && s.includes('mask')) return true
  return false
}

// Mutates the routine: link the product to a matching empty step if one
// exists; otherwise append a new step using the product's category as the
// label. Returns a new routine object (does not mutate the input).
export function addProductToRoutine(routine, product) {
  const steps = routine.steps.map(normalizeStep)
  // Already linked? Don't double-add.
  if (steps.some(s => s.productId === product.id)) return routine

  const targetIdx = steps.findIndex(
    s => !s.productId && stepMatchesCategory(s.name, product.category)
  )
  if (targetIdx >= 0) {
    steps[targetIdx] = { ...steps[targetIdx], productId: product.id }
  } else {
    steps.push({ name: product.category || product.name || 'Step', productId: product.id })
  }
  return { ...routine, steps }
}

// Remove a product from every step in the routine (clears productId).
export function removeProductFromRoutine(routine, productId) {
  return {
    ...routine,
    steps: routine.steps.map(s => {
      const n = normalizeStep(s)
      return n.productId === productId ? { ...n, productId: null } : n
    }),
  }
}

// For "where is this product used?" — returns array of {routineId, routineName, stepName}.
export function findProductInRoutines(routines, productId) {
  const out = []
  for (const r of routines) {
    for (const rawStep of r.steps || []) {
      const s = normalizeStep(rawStep)
      if (s.productId === productId) out.push({ routineId: r.id, routineName: r.name, stepName: s.name })
    }
  }
  return out
}

// Map a product category to a STEP_INFO key for the "What this step does"
// section in the product modal. Returns null if no good match.
export function stepInfoKeyForCategory(category) {
  switch (category) {
    case 'Cleanser': return 'Cleanser'
    case 'Toner': return 'Toner'
    case 'Essence': return 'Essence'
    case 'Exfoliant': return 'Exfoliant (AHA/BHA)'
    case 'Serum': return null    // ambiguous — could be any of several
    case 'Eye Cream': return 'Eye Cream'
    case 'Moisturizer': return 'Moisturizer'
    case 'Face Oil': return 'Face Oil'
    case 'Sunscreen': return 'Sunscreen (SPF)'
    case 'Mask': return 'Face Mask'
    case 'Spot Treatment': return 'Spot Treatment'
    case 'Lip Balm': return 'Lip Balm'
    default: return null
  }
}

// Build a beginner-friendly starter routine pair (morning + night) tailored
// to the user's onboarding answers. The goal is to give someone who picked
// "Acne + Oiliness" a starter that already includes salicylic acid and
// niacinamide, instead of dumping a generic 3-step template on them.
//
// skinType: 'oily' | 'dry' | 'combination' | 'sensitive' | 'normal' | 'unsure'
// concerns: subset of ['Acne','Dryness','Dark Spots','Oiliness','Redness','Anti-Aging']
// ageRange: 'under_18' | '18_24' | '25_34' | '35_44' | '45_plus' | undefined
export function generateStarterRoutines(skinType, concerns = [], ageRange) {
  const has = (c) => concerns.includes(c)
  const isSensitive = skinType === 'sensitive' || has('Redness')
  const isOilyish = skinType === 'oily' || skinType === 'combination' || has('Oiliness') || has('Acne')
  const isDryish = skinType === 'dry' || has('Dryness')
  const wantsActives = ['25_34','35_44','45_plus'].includes(ageRange) || has('Anti-Aging') || has('Dark Spots')

  // ── Morning ─────────────────────────────────────────────────────────
  const morning = []
  morning.push(isOilyish && !isSensitive ? 'Foaming Cleanser' : 'Cleanser')
  if (has('Dryness') || isDryish) morning.push('Hyaluronic Acid')
  if (has('Dark Spots') || has('Anti-Aging') || wantsActives) morning.push('Vitamin C Serum')
  if (has('Oiliness') || has('Acne')) morning.push('Niacinamide Serum')
  morning.push(isOilyish ? 'Moisturizer + SPF' : 'Moisturizer')
  if (!morning.includes('Moisturizer + SPF')) morning.push('Sunscreen (SPF)')

  // ── Night ───────────────────────────────────────────────────────────
  const night = []
  if (isOilyish && !isSensitive) {
    night.push('Oil Cleanser')
    night.push('Foaming Cleanser')
  } else {
    night.push('Cleanser')
  }
  if (has('Acne') || (has('Oiliness') && !isSensitive)) night.push('Exfoliant (AHA/BHA)')
  if (has('Dryness')) night.push('Hyaluronic Acid')
  if (wantsActives && !isSensitive) night.push('Retinol Serum')
  if (has('Redness') || isSensitive) night.push('Peptide Serum')
  night.push(isDryish ? 'Night Moisturizer' : 'Moisturizer')
  if (isDryish && !isSensitive) night.push('Face Oil')

  return [
    { id: 'morning', name: 'Morning Routine', emoji: '☀️', steps: morning.map(name => ({ name, productId: null })) },
    { id: 'night', name: 'Night Routine', emoji: '🌙', steps: night.map(name => ({ name, productId: null })) },
  ]
}

export function newRoutineId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `r_${Date.now()}`
}

// Routines used to cycle through four hues (pink / purple / rose / sky) to
// tell them apart. Under the design system colour carries one meaning —
// "you can act on this" — so a decorative rotation would compete with it.
// Routines are distinguished by their name instead.
//
// The one place accent still belongs here is the step dot: it IS the
// checkbox, so it's genuinely actionable. Full static class strings so they
// survive purging.
const ACCENT = {
  ring: 'border-rule',
  head: 'text-ink',
  dot: 'bg-accent/15 border-accent text-accent',
  dotDone: 'bg-accent border-accent text-paper',
  link: 'text-accent hover:brightness-110',
  focus: 'focus:border-accent',
}

// Index is kept in the signature so callers don't change; every routine now
// resolves to the same accent.
export function accentFor(index) {
  return ACCENT
}
