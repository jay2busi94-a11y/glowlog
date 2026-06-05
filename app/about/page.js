import AppNavbar from '../components/AppNavbar'

export const metadata = {
  title: 'About GlowLog',
  description: "A skincare app for people who don't know where to begin.",
}

const PILLARS = [
  {
    emoji: '🌱',
    title: 'For people who don\'t know where to begin',
    body: 'Onboarding asks four quick questions and builds you a starter Morning + Night routine. No blank slate, no overwhelm.',
  },
  {
    emoji: '📚',
    title: 'For people who don\'t know the correct steps',
    body: 'Every step in your routine has a tappable info card explaining what it does, when to use it, and what NOT to layer with it. Routines stay in the order you\'d actually apply them.',
  },
  {
    emoji: '✨',
    title: 'For people looking for new products',
    body: 'Discover real brands, snap any bottle to scan its label, ask the AI to suggest products tailored to your concerns and budget, and check ingredient lists before you buy.',
  },
]

const FEATURES = [
  { emoji: '📓', label: 'Daily skin log with rating, notes, and progress photos' },
  { emoji: '🧴', label: 'Routine builder — Simple checklist or Advanced drag-and-drop' },
  { emoji: '🗂️', label: 'Product catalog with photo uploads and per-product AI tips' },
  { emoji: '📷', label: 'Scan a bottle to auto-fill product info' },
  { emoji: '📸', label: 'Scan a whole shelf at once for bulk add' },
  { emoji: '🔍', label: 'Check ingredients against your saved concerns' },
  { emoji: '🤖', label: 'Fix My Skin — ask any skincare question, get personalized advice' },
  { emoji: '📈', label: 'Progress tracking — rating chart, streak, photo timeline' },
  { emoji: '🔥', label: 'Routine completion streak — see how consistent you\'ve been' },
  { emoji: '👥', label: 'Follow other users, see their routines + product shelves' },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 app-page-pad-bottom overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pink-500/15 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-3xl mx-auto app-page-pad-top">

        <div className="mb-10 text-center">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
            GlowLog ✨
          </h1>
          <p className="text-gray-400 text-lg">A skincare app for people who don't know where to begin.</p>
        </div>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-5">Our mission</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PILLARS.map(p => (
              <div key={p.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-3xl mb-2">{p.emoji}</p>
                <p className="font-semibold text-pink-300 text-sm mb-2">{p.title}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-5">What you can do</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FEATURES.map(f => (
              <li key={f.label} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-xl flex-shrink-0">{f.emoji}</span>
                <span className="text-sm text-gray-300">{f.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3">Built carefully</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            We don't sell your data. There are no third-party trackers. AI advice is general,
            not medical — for anything painful, persistent, or worsening, please see a
            dermatologist. You can switch your profile to private any time on Settings, and
            you can delete your account permanently from inside the app.
          </p>
        </section>

        <section className="bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-amber-400/5 border border-pink-500/30 rounded-2xl p-6 text-center mb-10">
          <p className="text-sm text-gray-400 mb-3">New here?</p>
          <a
            href="/signup"
            className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg shadow-pink-500/20"
          >
            Create your account
          </a>
        </section>

        <div className="flex gap-5 text-sm text-gray-500">
          <a href="/privacy" className="hover:text-white transition">Privacy Policy</a>
          <a href="/terms" className="hover:text-white transition">Terms of Service</a>
          <a href="/dashboard" className="hover:text-white transition ml-auto">Back to dashboard</a>
        </div>

      </div>
    </main>
  )
}
