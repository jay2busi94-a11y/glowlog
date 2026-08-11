// Marketing / auth navbar. Shared by the landing page, login, signup,
// forgot-password and reset-password — restyling it here upgrades all five.
//
// Design system rules in play (see CLAUDE.md):
//  - no gradients, on text or buttons
//  - accent means "you can act on this", so only the primary CTA gets it
//  - every tap target is at least 44px tall

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-5 sm:px-8 py-2 bg-paper border-b border-rule">
      <a
        href="/"
        className="text-ink font-extrabold text-lg tracking-[-0.035em] inline-flex items-center min-h-[44px] px-1"
      >
        GlowLog
      </a>

      <div className="hidden md:flex items-center gap-6 text-sm text-ink-mute">
        <a href="/#order" className="hover:text-ink transition-colors inline-flex items-center min-h-[44px]">
          How it works
        </a>
        <a href="/about" className="hover:text-ink transition-colors inline-flex items-center min-h-[44px]">
          About
        </a>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="/login"
          className="text-sm font-semibold text-ink-mute hover:text-ink transition-colors inline-flex items-center min-h-[44px] px-3 whitespace-nowrap"
        >
          Sign in
        </a>
        <a
          href="/signup"
          className="bg-accent text-paper text-sm font-bold px-5 rounded-full inline-flex items-center min-h-[44px] hover:brightness-110 transition whitespace-nowrap"
        >
          Get started
        </a>
      </div>
    </nav>
  )
}
