// Returns YYYY-MM-DD in the user's LOCAL timezone (not UTC).
// Date.toISOString() returns UTC, which is off by a day for users in negative
// UTC offsets late at night (e.g. 11pm PST = next day in UTC), making a log
// saved on Tuesday evening get stored under Wednesday. This builds the string
// by hand from the local Date parts to avoid that.
export function toLocalDateString(date = new Date()) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
