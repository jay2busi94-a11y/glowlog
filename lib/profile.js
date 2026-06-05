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

// Returns the avatar photo URL when the user uploaded one, otherwise null.
// Callers should render <img> for the URL or fall back to avatarFor() emoji.
export function avatarPhotoFor(profile) {
  return profile?.avatar_url || null
}

// Whether the user has opted into the full routine builder. Beginners see
// the checklist-style SimpleRoutineEditor by default; toggling this flips
// /routine to the drag-and-drop AdvancedRoutineEditor.
export function isAdvancedMode(profile) {
  return !!profile?.advanced_mode
}

// Profile visibility. Default true so existing users stay visible.
// When false, /u/[username] hides routines/products/concerns/bio from
// other viewers — and the DB SELECT policy on routines/products refuses
// to return rows owned by private-profile users at all.
export function isPublicProfile(profile) {
  // Treat null/undefined as public (matches the DB column default).
  return profile?.public_profile !== false
}

// ── Username validation ────────────────────────────────────────────────
export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 30

// Reserved names — blocks system/impersonation handles and our own URL
// segments so someone can't grab @login or @admin. All lowercase since
// usernames are forced lowercase before save.
export const RESERVED_USERNAMES = new Set([
  // System / impersonation
  'admin', 'administrator', 'root', 'sysadmin', 'support', 'help', 'staff',
  'glowlog', 'official', 'system', 'mod', 'moderator',
  // Generic identity
  'me', 'you', 'anon', 'anonymous', 'null', 'undefined', 'guest',
  // App routes (so /u/<name> never collides with a real page later)
  'about', 'api', 'app', 'auth', 'catalog', 'dashboard', 'discover',
  'friends', 'login', 'logout', 'onboarding', 'profile', 'progress',
  'routine', 'settings', 'signup', 'signin', 'u', 'user', 'users',
  'home', 'index', 'public', 'private',
])

// Sanitize a candidate string the same way handleSave does, so the live
// availability check and the final save check the same thing.
export function sanitizeUsername(raw) {
  return (raw || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
}

// Pure local validation. Returns { ok, error } so the UI can render
// targeted messages without doing a DB round-trip.
export function validateUsername(username) {
  const u = sanitizeUsername(username)
  if (!u) return { ok: false, error: '' }   // empty is fine; we treat unset username as valid
  if (u.length < MIN_USERNAME_LENGTH) return { ok: false, error: `At least ${MIN_USERNAME_LENGTH} characters.` }
  if (u.length > MAX_USERNAME_LENGTH) return { ok: false, error: `Max ${MAX_USERNAME_LENGTH} characters.` }
  if (RESERVED_USERNAMES.has(u)) return { ok: false, error: `"@${u}" is reserved. Pick another.` }
  return { ok: true, error: '' }
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

// Shared cap across vision-powered features (scan-product, scan-shelf,
// check-ingredients). Vision calls are pricier, so we use one combined
// daily budget rather than three separate ones.
export const FREE_VISION_LIMIT = 5

function visionUsageKey(dateStr) {
  return `glowlog:vision_usage:${dateStr}`
}

export function getVisionCountToday(dateStr) {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(visionUsageKey(dateStr))
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(n) ? n : 0
}

export function incrementVisionCountToday(dateStr) {
  if (typeof window === 'undefined') return 0
  const next = getVisionCountToday(dateStr) + 1
  window.localStorage.setItem(visionUsageKey(dateStr), String(next))
  return next
}

// Suggest-products has its own daily counter — separate from chat advice
// because the response is bigger and more expensive per call.
export const FREE_SUGGEST_LIMIT = 3

function suggestUsageKey(dateStr) {
  return `glowlog:suggest_usage:${dateStr}`
}

export function getSuggestCountToday(dateStr) {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(suggestUsageKey(dateStr))
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(n) ? n : 0
}

export function incrementSuggestCountToday(dateStr) {
  if (typeof window === 'undefined') return 0
  const next = getSuggestCountToday(dateStr) + 1
  window.localStorage.setItem(suggestUsageKey(dateStr), String(next))
  return next
}
