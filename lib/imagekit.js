// ImageKit delivery layer.
//
// Our photos live in Supabase Storage and STAY there — ImageKit is pointed at
// Supabase as a "web folder" origin, so it fetches and optimizes on the fly.
// Nothing is migrated and the upload helpers in catalog/profile/dashboard are
// untouched. We only change how URLs are *read*.
//
// Flip NEXT_PUBLIC_IMAGEKIT_ENABLED to turn this on or off. While it's off
// every helper hands back the original Supabase URL, so the app behaves
// exactly as it did before. That's the kill switch: if ImageKit misbehaves in
// production, unset the flag and redeploy rather than reverting code.

const URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const PUBLIC_PREFIX = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/` : ''

const ENABLED =
  process.env.NEXT_PUBLIC_IMAGEKIT_ENABLED === '1' && Boolean(URL_ENDPOINT) && Boolean(PUBLIC_PREFIX)

// Buckets we're willing to route through ImageKit.
//
// `skin-photos` is deliberately absent. Those are users' face photos, and our
// Privacy Policy names Supabase as the storage processor — sending them to a
// second vendor would make that statement untrue. Adding skin photos here is a
// legal decision, not a technical one: update /privacy first.
const PROXIED_BUCKETS = ['product-photos', 'avatars']

// Sensible defaults applied to every transform:
//   f-auto  serve WebP/AVIF when the browser supports it
//   q-80    quality 80 — visually lossless for photos, roughly half the bytes
const BASE_TRANSFORM = 'f-auto,q-80'

/**
 * Rewrite a Supabase public storage URL to an ImageKit URL.
 *
 * Returns the input untouched when ImageKit is off, when the URL isn't a
 * Supabase public object, or when it belongs to a bucket we don't proxy — so
 * it's always safe to wrap a src in this.
 *
 * @param {string} url  a Supabase public object URL
 * @param {string} [transform]  extra ImageKit params, e.g. 'w-400,h-300,fo-auto'
 * @returns {string}
 */
export function ikUrl(url, transform) {
  if (!ENABLED || !url || typeof url !== 'string') return url
  if (!url.startsWith(PUBLIC_PREFIX)) return url

  const path = url.slice(PUBLIC_PREFIX.length)
  const bucket = path.split('/')[0]
  if (!PROXIED_BUCKETS.includes(bucket)) return url

  // Drop any query string — Supabase doesn't need it and ImageKit would treat
  // it as part of the path.
  const cleanPath = path.split('?')[0]
  const tr = transform ? `${BASE_TRANSFORM},${transform}` : BASE_TRANSFORM

  return `${URL_ENDPOINT.replace(/\/$/, '')}/tr:${tr}/${cleanPath}`
}

// Named presets, so sizes live in one place instead of being sprinkled through
// the pages. Widths are ~2x the CSS size to stay sharp on retina screens.
//
// fo-auto lets ImageKit pick the crop focus (it finds the subject) rather than
// blindly centre-cropping, which matters for product bottles shot off-centre.

/** 4:3 card header on /catalog and the public shelf. */
export const ikProductCard = (url) => ikUrl(url, 'w-600,h-450,c-maintain_ratio,fo-auto')

/** Small square thumbnails — routine step rows, pickers. */
export const ikProductThumb = (url) => ikUrl(url, 'w-160,h-160,c-maintain_ratio,fo-auto')

/** Large product view in the detail modal. */
export const ikProductDetail = (url) => ikUrl(url, 'w-900,c-at_max')

/** Round avatars. Size varies a lot, so callers pass a px size. */
export const ikAvatar = (url, size = 96) =>
  ikUrl(url, `w-${size * 2},h-${size * 2},c-maintain_ratio,fo-face,r-max`)

/** True when the ImageKit path is live — handy for debugging. */
export const isImagekitEnabled = () => ENABLED
