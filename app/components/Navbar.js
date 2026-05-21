export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[#080808]/80 backdrop-blur-md border-b border-white/10">

      {/* Logo */}
      <div className="text-xl font-bold bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
        GlowLog
      </div>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
        <a href="#" className="hover:text-white transition">Features</a>
        <a href="#" className="hover:text-white transition">How It Works</a>
        <a href="#" className="hover:text-white transition">Pricing</a>
      </div>

      {/* Auth Buttons */}
      <div className="flex items-center gap-3">
        <a href="/login" className="text-sm text-gray-400 hover:text-white transition px-4 py-2">
          Log In
        </a>
        <a href="/signup" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold px-5 py-2 rounded-full hover:opacity-90 transition shadow-lg shadow-pink-500/20">
          Sign Up
        </a>
      </div>

    </nav>
  )
}
