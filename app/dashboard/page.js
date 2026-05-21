import Navbar from "../components/Navbar"

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 pb-16 overflow-hidden">

      {/* Background glow */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      <div className="relative z-10 max-w-4xl mx-auto pt-32">

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Good morning, Jane 👋</h1>
          <p className="text-gray-400">Here's your skincare routine for today.</p>
        </div>

        {/* Routine Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

          {/* Morning Routine */}
          <div className="bg-white/5 border border-pink-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-pink-300">☀️ Morning Routine</h2>
              <span className="text-xs text-gray-500">3 steps</span>
            </div>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <span className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-xs text-pink-400">1</span>
                Cleanser
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <span className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-xs text-pink-400">2</span>
                Vitamin C Serum
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <span className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-xs text-pink-400">3</span>
                Moisturizer + SPF
              </li>
            </ul>
            <button className="mt-5 w-full border border-pink-500/30 text-pink-400 text-sm py-2 rounded-full hover:bg-pink-500/10 transition">
              + Add Step
            </button>
          </div>

          {/* Night Routine */}
          <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-purple-300">🌙 Night Routine</h2>
              <span className="text-xs text-gray-500">4 steps</span>
            </div>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs text-purple-400">1</span>
                Oil Cleanser
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs text-purple-400">2</span>
                Foaming Cleanser
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs text-purple-400">3</span>
                Retinol Serum
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs text-purple-400">4</span>
                Night Moisturizer
              </li>
            </ul>
            <button className="mt-5 w-full border border-purple-500/30 text-purple-400 text-sm py-2 rounded-full hover:bg-purple-500/10 transition">
              + Add Step
            </button>
          </div>

        </div>

        {/* Fix My Skin */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-2">🔍 Fix My Skin</h2>
          <p className="text-gray-400 text-sm mb-4">What's your main skin concern right now?</p>
          <div className="flex flex-wrap gap-3">
            {["Acne", "Dryness", "Dark Spots", "Oiliness", "Redness", "Anti-Aging"].map((concern) => (
              <button
                key={concern}
                className="border border-white/10 text-gray-300 text-sm px-4 py-2 rounded-full hover:border-pink-500/40 hover:text-pink-300 hover:bg-pink-500/10 transition"
              >
                {concern}
              </button>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
