'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from "../components/AppNavbar"
import { createClient } from '../../lib/supabase'

const MORNING_STEPS = ['Cleanser', 'Vitamin C Serum', 'Moisturizer + SPF']
const NIGHT_STEPS = ['Oil Cleanser', 'Foaming Cleanser', 'Retinol Serum', 'Night Moisturizer']

const SKIN_RATINGS = [
  { value: 1, emoji: '😣', label: 'Bad' },
  { value: 2, emoji: '😐', label: 'Meh' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '✨', label: 'Glowing' },
]

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [morningDone, setMorningDone] = useState([])
  const [nightDone, setNightDone] = useState([])
  const [skinRating, setSkinRating] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [todayLogged, setTodayLogged] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      loadTodayLog(supabase, user.id)
    })
  }, [])

  async function loadTodayLog(supabase, userId) {
    const { data } = await supabase
      .from('skin_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (data) {
      setMorningDone(data.morning_completed || [])
      setNightDone(data.night_completed || [])
      setSkinRating(data.skin_rating)
      setNote(data.note || '')
      setTodayLogged(true)
    }
  }

  function toggleStep(step, list, setList) {
    setList(list.includes(step) ? list.filter(s => s !== step) : [...list, step])
  }

  async function handleSave() {
    if (!user || !skinRating) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('skin_logs').upsert({
      user_id: user.id,
      date: today,
      morning_completed: morningDone,
      night_completed: nightDone,
      skin_rating: skinRating,
      note,
    }, { onConflict: 'user_id,date' })

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTodayLogged(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 pb-16 overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-4xl mx-auto pt-32">

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">{greeting}, {userName} 👋</h1>
          <p className="text-gray-400">Here's your skincare routine for today.</p>
        </div>

        {/* Routine Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Morning Routine */}
          <div className="bg-white/5 border border-pink-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-pink-300">☀️ Morning Routine</h2>
              <span className="text-xs text-gray-500">{morningDone.length}/{MORNING_STEPS.length} done</span>
            </div>
            <ul className="flex flex-col gap-3">
              {MORNING_STEPS.map((step, i) => {
                const done = morningDone.includes(step)
                return (
                  <li
                    key={step}
                    onClick={() => toggleStep(step, morningDone, setMorningDone)}
                    className={`flex items-center gap-3 text-sm cursor-pointer select-none transition ${done ? 'text-gray-500' : 'text-gray-300'}`}
                  >
                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0 transition ${done ? 'bg-pink-500/40 border-pink-400 text-pink-200' : 'bg-pink-500/20 border-pink-500/30 text-pink-400'}`}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span className={done ? 'line-through' : ''}>{step}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Night Routine */}
          <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-purple-300">🌙 Night Routine</h2>
              <span className="text-xs text-gray-500">{nightDone.length}/{NIGHT_STEPS.length} done</span>
            </div>
            <ul className="flex flex-col gap-3">
              {NIGHT_STEPS.map((step, i) => {
                const done = nightDone.includes(step)
                return (
                  <li
                    key={step}
                    onClick={() => toggleStep(step, nightDone, setNightDone)}
                    className={`flex items-center gap-3 text-sm cursor-pointer select-none transition ${done ? 'text-gray-500' : 'text-gray-300'}`}
                  >
                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0 transition ${done ? 'bg-purple-500/40 border-purple-400 text-purple-200' : 'bg-purple-500/20 border-purple-500/30 text-purple-400'}`}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span className={done ? 'line-through' : ''}>{step}</span>
                  </li>
                )
              })}
            </ul>
          </div>

        </div>

        {/* Today's Log */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1">📓 Log Today's Skin</h2>
          <p className="text-gray-400 text-sm mb-5">How does your skin feel today?</p>

          <div className="flex gap-3 mb-5 flex-wrap">
            {SKIN_RATINGS.map(r => (
              <button
                key={r.value}
                onClick={() => setSkinRating(skinRating === r.value ? null : r.value)}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition ${skinRating === r.value ? 'border-pink-500/60 bg-pink-500/10 text-pink-300' : 'border-white/10 text-gray-400 hover:border-white/20'}`}
              >
                <span className="text-2xl">{r.emoji}</span>
                <span className="text-xs">{r.label}</span>
              </button>
            ))}
          </div>

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Any notes? (new product, reaction, etc.)"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/30 transition resize-none mb-4"
          />

          <button
            onClick={handleSave}
            disabled={saving || !skinRating}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-pink-500/20"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : todayLogged ? 'Update Log' : "Save Today's Log"}
          </button>
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
