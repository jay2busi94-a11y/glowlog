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
