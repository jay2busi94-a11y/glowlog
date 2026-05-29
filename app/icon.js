import { ImageResponse } from 'next/og'

// 512×512 manifest / app icon. Gradient background + stylized 'G' that reads
// well at every size. ImageResponse JSX only supports a subset of CSS —
// inline styles only, no Tailwind classes.
export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
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
          fontSize: 320,
          fontWeight: 800,
          letterSpacing: -16,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}
      >
        G
      </div>
    ),
    { ...size }
  )
}
