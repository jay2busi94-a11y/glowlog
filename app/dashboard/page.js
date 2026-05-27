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

const CONCERNS = ['Acne', 'Dryness', 'Dark Spots', 'Oiliness', 'Redness', 'Anti-Aging']

const CONCERN_FIXES = {
  'Acne': {
    blurb: 'Unclog pores and calm breakouts without stripping your skin.',
    lookFor: ['Salicylic acid (BHA) cleanser', 'Benzoyl peroxide spot treatment', 'Niacinamide serum', 'Oil-free / non-comedogenic moisturizer'],
    avoid: ['Heavy facial oils', 'Harsh scrubbing & physical scrubs', 'Picking at spots'],
  },
  'Dryness': {
    blurb: 'Add water to the skin, then seal it in so it stays there.',
    lookFor: ['Hyaluronic acid serum (on damp skin)', 'Glycerin', 'Ceramide moisturizer', 'Squalane or facial oil at night'],
    avoid: ['Foaming / stripping cleansers', 'Hot water washes', 'High-strength acids every day'],
  },
  'Dark Spots': {
    blurb: 'Fade existing marks and protect against new ones forming.',
    lookFor: ['Vitamin C serum (morning)', 'Niacinamide', 'Alpha arbutin or azelaic acid', 'Daily SPF 30+ (non-negotiable)'],
    avoid: ['Skipping sunscreen', 'Picking (causes more marks)', 'Too many actives at once'],
  },
  'Oiliness': {
    blurb: 'Balance oil production — don’t strip it, or skin overproduces more.',
    lookFor: ['Niacinamide serum', 'Salicylic acid (BHA)', 'Lightweight gel moisturizer', 'Clay mask 1–2x / week'],
    avoid: ['Skipping moisturizer', 'Over-washing', 'Heavy creams & oils'],
  },
  'Redness': {
    blurb: 'Soothe and strengthen the skin barrier; cut the irritation.',
    lookFor: ['Centella asiatica (cica)', 'Azelaic acid', 'Ceramide / barrier moisturizer', 'Gentle fragrance-free cleanser'],
    avoid: ['Fragrance & essential oils', 'Strong acids / high-% retinol', 'Hot water & rough towels'],
  },
  'Anti-Aging': {
    blurb: 'Boost collagen and protect — sunscreen does the heavy lifting.',
    lookFor: ['Retinol / retinoid (start low, at night)', 'Vitamin C (morning)', 'Peptide serum', 'Daily SPF 30+'],
    avoid: ['Skipping sunscreen', 'Starting retinol too strong, too fast', 'Stacking retinol + strong acids same night'],
  },
}

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
  const [activeConcern, setActiveConcern] = useState(null)
  const [chat, setChat] = useState([])        // full message thread sent to the API (index 0 = context)
  const [chatInput, setChatInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

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

  function selectConcern(concern) {
    const next = activeConcern === concern ? null : concern
    setActiveConcern(next)
    setChat([])
    setChatInput('')
    setAiError('')
  }

  function buildContextMessage() {
    const ratingLabel = SKIN_RATINGS.find(r => r.value === skinRating)?.label
    const ratingText = ratingLabel ? `${skinRating}/5 (${ratingLabel})` : 'not logged today'
    const morning = morningDone.length ? morningDone.join(', ') : 'none yet'
    const night = nightDone.length ? nightDone.join(', ') : 'none yet'
    const userNote = note.trim() ? note.trim() : 'none'
    return `My main skin concern right now: ${activeConcern}

Today's context:
- Skin rating: ${ratingText}
- My note: ${userNote}
- Morning routine steps I completed: ${morning}
- Night routine steps I completed: ${night}

Give me personalized advice for this concern.`
  }

  // Sends the full thread to the API and appends Claude's reply. On failure,
  // rolls the thread back to its previous state so it stays valid + retryable.
  async function askAI(messages, prevChat, restoreInput) {
    setAiLoading(true)
    setAiError('')
    try {
      const res = await fetch('/api/fix-my-skin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setChat([...messages, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setAiError(err.message)
      setChat(prevChat)
      if (restoreInput) setChatInput(restoreInput)
    } finally {
      setAiLoading(false)
    }
  }

  function startAdvice() {
    if (!activeConcern || aiLoading) return
    const messages = [{ role: 'user', content: buildContextMessage() }]
    setChat(messages)
    askAI(messages, [], '')
  }

  function sendChat(e) {
    e?.preventDefault()
    const text = chatInput.trim()
    if (!text || aiLoading) return
    const prev = chat
    const messages = [...chat, { role: 'user', content: text }]
    setChat(messages)
    setChatInput('')
    askAI(messages, prev, text)
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
            {CONCERNS.map((concern) => {
              const active = activeConcern === concern
              return (
                <button
                  key={concern}
                  onClick={() => selectConcern(concern)}
                  className={`border text-sm px-4 py-2 rounded-full transition ${active ? 'border-pink-500/60 bg-pink-500/10 text-pink-300' : 'border-white/10 text-gray-300 hover:border-pink-500/40 hover:text-pink-300 hover:bg-pink-500/10'}`}
                >
                  {concern}
                </button>
              )
            })}
          </div>

          {activeConcern && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="text-base font-semibold text-pink-300 mb-1">{activeConcern}</h3>
              <p className="text-gray-400 text-sm mb-4">{CONCERN_FIXES[activeConcern].blurb}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold text-green-300 uppercase tracking-wide mb-2">✓ Look for</p>
                  <ul className="flex flex-col gap-1.5">
                    {CONCERN_FIXES[activeConcern].lookFor.map((item) => (
                      <li key={item} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-green-400 flex-shrink-0">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-rose-300 uppercase tracking-wide mb-2">✕ Avoid</p>
                  <ul className="flex flex-col gap-1.5">
                    {CONCERN_FIXES[activeConcern].avoid.map((item) => (
                      <li key={item} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-rose-400 flex-shrink-0">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {chat.length === 0 ? (
                <button
                  onClick={startAdvice}
                  disabled={aiLoading}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-pink-500/20"
                >
                  {aiLoading ? '✨ Thinking...' : '✨ Get personalized advice'}
                </button>
              ) : (
                <div className="bg-white/5 border border-purple-500/20 rounded-xl p-4">
                  {/* Conversation — skip index 0 (the hidden context message) */}
                  <div className="flex flex-col gap-3">
                    {chat.slice(1).map((m, i) => (
                      <div
                        key={i}
                        className={
                          m.role === 'user'
                            ? 'self-end max-w-[85%] bg-pink-500/20 border border-pink-500/30 rounded-2xl rounded-br-sm px-3.5 py-2'
                            : 'self-start max-w-[90%] bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-3.5 py-2.5'
                        }
                      >
                        <p className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="self-start bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                        <p className="text-sm text-gray-400">✨ Thinking...</p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={sendChat} className="mt-4 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask a follow-up..."
                      disabled={aiLoading}
                      className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/30 transition disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !chatInput.trim()}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40"
                    >
                      Send
                    </button>
                  </form>

                  <p className="mt-3 text-xs text-gray-500">✨ Personalized by Claude — general guidance, not medical advice.</p>
                </div>
              )}

              {aiError && (
                <p className="mt-4 text-sm text-rose-400">{aiError}</p>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
