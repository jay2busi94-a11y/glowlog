// PWA manifest. Next.js serves this at /manifest.webmanifest and links it
// from the document head automatically. The icon URLs resolve to the
// programmatic icons defined in app/icon.js + app/apple-icon.js.
export default function manifest() {
  return {
    name: 'GlowLog',
    short_name: 'GlowLog',
    description: 'Your skincare routine, products, and progress — in one app.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#080808',
    theme_color: '#080808',
    categories: ['lifestyle', 'health'],
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  }
}
