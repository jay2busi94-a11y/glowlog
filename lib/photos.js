// Signed URLs for skin photos.
//
// Skin photos are face photos plus a skin condition — the most sensitive
// thing GlowLog stores. They used to live in a public bucket, which meant
// anyone holding the URL could open one without signing in. Unguessable
// isn't the same as access-controlled: URLs leak through browser history,
// referrer headers, screenshots and support tickets.
//
// Now the bucket is private and reads go through short-lived signed URLs,
// which are access-checked against the storage RLS policy (owner's folder
// only) and expire.
//
// Existing rows store a full public URL from before the change, so
// everything here accepts either a stored URL or a bare storage path.

const BUCKET = 'skin-photos'
const TTL_SECONDS = 60 * 60 // an hour: long enough for a session, short enough to be worthless if it leaks

/**
 * Pull the storage path out of whatever is stored on the row.
 * Handles both `https://…/object/public/skin-photos/<uid>/<file>` and a
 * bare `<uid>/<file>`.
 */
export function skinPhotoPath(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null
  const marker = `/${BUCKET}/`
  const at = urlOrPath.indexOf(marker)
  if (at === -1) return urlOrPath.replace(/^\/+/, '') || null
  return urlOrPath.slice(at + marker.length).split('?')[0] || null
}

/**
 * Sign one photo. Returns null rather than throwing so a single missing or
 * deleted object can't blank out a whole timeline.
 */
export async function signSkinPhoto(supabase, urlOrPath) {
  const path = skinPhotoPath(urlOrPath)
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS)
  if (error) return null
  return data?.signedUrl || null
}

/**
 * Sign many at once — the progress timeline can hold hundreds, and one
 * request beats one per photo.
 *
 * @returns {Promise<Map<string, string>>} original stored value -> signed URL
 */
export async function signSkinPhotos(supabase, urlOrPaths) {
  const out = new Map()
  const wanted = (urlOrPaths || []).filter(Boolean)
  if (wanted.length === 0) return out

  // Keep the mapping back to whatever was stored on the row, since callers
  // look the result up by that.
  const byPath = new Map()
  for (const original of wanted) {
    const path = skinPhotoPath(original)
    if (path) byPath.set(path, original)
  }
  if (byPath.size === 0) return out

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls([...byPath.keys()], TTL_SECONDS)
  if (error || !data) return out

  for (const row of data) {
    if (!row?.signedUrl || row.error) continue
    const original = byPath.get(row.path)
    if (original) out.set(original, row.signedUrl)
  }
  return out
}
