import Navbar from "./components/Navbar"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center px-4 overflow-hidden">
      <Navbar />

      {/* Background glow blobs */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-pink-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[200px] left-[10%] w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[200px] right-[10%] w-[300px] h-[300px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <div className="text-center max-w-2xl relative z-10">
        <div className="inline-block bg-pink-500/10 border border-pink-500/30 text-pink-400 text-sm px-4 py-1 rounded-full mb-6">
          ✨ Your skin deserves a routine
        </div>
        <h1 className="text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
          GlowLog
        </h1>
        <p className="text-gray-400 text-xl mb-10 leading-relaxed">
          Build your perfect skincare routine, track your progress, and get personalized recommendations to fix your skin concerns.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-8 py-3 rounded-full hover:opacity-90 transition shadow-lg shadow-pink-500/30">
            Get Started — It's Free
          </button>
          <button className="border border-white/20 text-white font-semibold px-8 py-3 rounded-full hover:bg-white/10 transition">
            See How It Works
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mt-24 px-4 relative z-10">
        <div className="bg-white/5 border border-pink-500/20 rounded-2xl p-6 hover:bg-pink-500/10 hover:border-pink-500/40 transition group">
          <div className="text-3xl mb-3">🧴</div>
          <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-pink-300 transition">Custom Routines</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Build morning and night routines tailored to your skin type and goals.
          </p>
        </div>
        <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-6 hover:bg-purple-500/10 hover:border-purple-500/40 transition group">
          <div className="text-3xl mb-3">🔍</div>
          <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-purple-300 transition">Fix My Skin</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Tell us your concern — acne, dryness, dark spots — and get a personalized fix.
          </p>
        </div>
        <div className="bg-white/5 border border-rose-500/20 rounded-2xl p-6 hover:bg-rose-500/10 hover:border-rose-500/40 transition group">
          <div className="text-3xl mb-3">📈</div>
          <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-rose-300 transition">Track Progress</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Log your products, rate what works, and watch your skin transform over time.
          </p>
        </div>
      </div>

    </main>
  )
}
