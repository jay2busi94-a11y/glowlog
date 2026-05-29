import { ImageResponse } from 'next/og'

// iOS home-screen icon (180×180). iOS mask is a rounded square, so we
// design with a centered glyph that doesn't get clipped.
export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #f59e0b 100%)',
          color: 'white',
          fontSize: 116,
          fontWeight: 800,
          letterSpacing: -6,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        G
      </div>
    ),
    { ...size }
  )
}
