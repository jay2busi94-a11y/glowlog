// Emoji grid the user can pick from for their avatar. Kept small and curated
// so the picker stays tidy — no full emoji-mart dependency needed.
export const AVATAR_EMOJIS = [
  '✨', '🌸', '🌺', '🌷', '🌹', '🌻', '🌼', '🌙',
  '☀️', '🌈', '💫', '💖', '🦋', '🐰', '🦄', '🌶️',
  '🍑', '🍓', '🫧', '🪞', '🧖', '💆',
]

export const DEFAULT_AVATAR = '✨'

// Concerns the user can flag as long-standing. Matches the dashboard's
// CONCERNS list so the AI sees the same vocabulary.
export const PROFILE_CONCERNS = [
  'Acne', 'Dryness', 'Dark Spots', 'Oiliness', 'Redness', 'Anti-Aging',
]

// Falls back to the part of the email before '@' when display_name is empty.
export function displayNameFor(profile, user) {
  if (profile?.display_name?.trim()) return profile.display_name.trim()
  if (user?.email) return user.email.split('@')[0]
  return 'You'
}

export function avatarFor(profile) {
  return profile?.avatar || DEFAULT_AVATAR
}

// ── Premium / Upgrade ────────────────────────────────────────────────────

// Secret unlock code that flips a profile from 'free' to 'premium' without
// going through a payment flow. Used for self-dogfooding until Stripe is
// wired up. Change/rotate freely.
export const UNLOCK_CODE = 'GLOWLUX'

// Free-tier soft cap on Fix My Skin AI messages per local-calendar day.
// Enforced client-side via localStorage — a self-imposed budget for the
// account owner, not a hard security boundary.
export const FREE_AI_LIMIT = 5

export function isPremium(profile) {
  return profile?.tier === 'premium'
}

// Premium perks rendered in the upgrade card. Update freely; the card
// just maps over this list.
export const PREMIUM_PERKS = [
  { emoji: '🤖', title: 'Unlimited Fix My Skin', body: `No daily cap on AI advice (free is ${FREE_AI_LIMIT}/day).` },
  { emoji: '📈', title: 'Monthly & yearly progress', body: 'See longer trends in your progress chart, not just the last 30 days.' },
  { emoji: '✨', title: 'Early access to new features', body: 'New ideas land in Premium first.' },
]

// AI usage tracking lives in localStorage so we don't write to the DB on
// every send. Key is per local date so it auto-rolls at midnight.
function aiUsageKey(dateStr) {
  return `glowlog:ai_usage:${dateStr}`
}

export function getAiCountToday(dateStr) {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(aiUsageKey(dateStr))
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(n) ? n : 0
}

export function incrementAiCountToday(dateStr) {
  if (typeof window === 'undefined') return 0
  const next = getAiCountToday(dateStr) + 1
  window.localStorage.setItem(aiUsageKey(dateStr), String(next))
  return next
}
