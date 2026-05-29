'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from "../components/AppNavbar"
import { createClient } from '../../lib/supabase'
import { routinesFromRow, accentFor } from '../../lib/routine'
import { toLocalDateString } from '../../lib/dates'
import { productLabel } from '../../lib/catalog'
import { isPremium, FREE_AI_LIMIT, getAiCountToday, incrementAiCountToday } from '../../lib/profile'

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

function RoutineCard({ routine, accent, products, done, onToggle, onPickProduct, onCompleteAll, onClearAll }) {
  const productById = new Map(products.map(p => [p.id, p]))
  return (
    <div className={`bg-white/5 border ${accent.ring} rounded-2xl p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-semibold ${accent.head}`}>{routine.emoji || '🧴'} {routine.name}</h2>
        <span className="text-xs text-gray-500">{done.length}/{routine.steps.length} done</span>
      </div>

      {routine.steps.length === 0 ? (
        <p className="text-sm text-gray-500">No steps yet — add some on the Routine page.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {routine.steps.map((step, i) => {
              const isDone = done.includes(step.name)
              const linked = step.productId ? productById.get(step.productId) : null
              return (
                <li key={step.name + i} className="flex items-start gap-3 text-sm select-none">
                  <button
                    onClick={() => onToggle(routine.id, step.name)}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0 mt-0.5 transition ${isDone ? accent.dotDone : accent.dot} hover:scale-105`}
                    aria-label={isDone ? 'Mark not done' : 'Mark done'}
                  >
                    {isDone ? '✓' : i + 1}
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onToggle(routine.id, step.name)}
                      className={`text-left w-full ${isDone ? 'text-gray-500 line-through' : 'text-gray-200'} hover:text-white transition`}
                    >
                      {step.name}
                    </button>
                    <button
                      onClick={() => onPickProduct(routine.id, i)}
                      className={`mt-1 flex items-center gap-1.5 text-xs transition group ${
                        linked
                          ? `${isDone ? 'text-gray-600' : 'text-gray-400'} hover:text-white`
                          : 'text-gray-600 hover:text-gray-300'
                      }`}
                    >
                      {linked ? (
                        <>
                          <span className={`w-1.5 h-1.5 rounded-full ${accent.head.replace('text-', 'bg-')} opacity-60 group-hover:opacity-100 transition`} />
                          <span className="truncate">{productLabel(linked)}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition text-gray-500 text-[10px]">change</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-700">+</span>
                          <span>Add product</span>
                        </>
                      )}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex gap-4 mt-4 pt-3 border-t border-white/5 text-xs">
            <button onClick={() => onCompleteAll(routine.id, routine.steps.map(s => s.name))} className={`${accent.link} transition`}>
              Complete all
            </button>
            <button onClick={() => onClearAll(routine.id)} className="text-gray-500 hover:text-gray-300 transition">
              Clear all
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function StepProductPicker({ open, step, products, onPick, onClose }) {
  if (!open) return null
  const currentId = step?.productId || null
  const sameCategory = step?.suggestedCategory
    ? products.filter(p => p.category && step.suggestedCategory.toLowerCase().includes(p.category.toLowerCase()))
    : []
  const others = sameCategory.length
    ? products.filter(p => !sameCategory.includes(p))
    : products

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-[#0e0e0e] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl shadow-pink-500/10 overflow-hidden"
      >
        <div className="p-5 border-b border-white/10">
          <p className="text-xs uppercase tracking-wide text-gray-500">Pick a product for</p>
          <h3 className="text-lg font-semibold text-white mt-0.5">{step?.name}</h3>
        </div>

        <div className="overflow-y-auto p-3 flex-1">
          {products.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-300 mb-1">No products in your catalog yet</p>
              <p className="text-xs text-gray-500 mb-4">Add your cleansers, serums, and creams so you can link them to your routine.</p>
              <a
                href="/catalog"
                className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2 rounded-full text-xs hover:opacity-90 transition shadow-lg shadow-pink-500/20"
              >
                + Add your first product
              </a>
            </div>
          ) : (
            <>
              {sameCategory.length > 0 && (
                <p className="text-[10px] uppercase tracking-wide text-pink-300/70 px-2 py-2">Suggested</p>
              )}
              {sameCategory.map(p => (
                <ProductRow key={p.id} product={p} active={p.id === currentId} onPick={onPick} />
              ))}
              {sameCategory.length > 0 && others.length > 0 && (
                <p className="text-[10px] uppercase tracking-wide text-gray-500 px-2 py-2 mt-1">Other products</p>
              )}
              {others.map(p => (
                <ProductRow key={p.id} product={p} active={p.id === currentId} onPick={onPick} />
              ))}
            </>
          )}
        </div>

        <div className="border-t border-white/10 p-3 flex items-center justify-between gap-3">
          {currentId ? (
            <button
              onClick={() => onPick(null)}
              className="text-xs text-rose-300 hover:text-rose-200 transition px-3 py-2"
            >
              Remove product
            </button>
          ) : <span />}
          <div className="flex items-center gap-3">
            <a href="/catalog" className="text-xs text-gray-400 hover:text-white transition">
              Manage catalog →
            </a>
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-white transition px-3 py-2">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductRow({ product, active, onPick }) {
  return (
    <button
      onClick={() => onPick(product.id)}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
        active ? 'bg-pink-500/10 border border-pink-500/30' : 'hover:bg-white/5 border border-transparent'
      }`}
    >
      <div className="min-w-0 flex-1">
        {product.brand && <p className="text-[10px] uppercase tracking-wide text-pink-300/80">{product.brand}</p>}
        <p className={`text-sm truncate ${active ? 'text-white font-semibold' : 'text-gray-200'}`}>{product.name}</p>
      </div>
      {product.category && (
        <span className="flex-shrink-0 text-[10px] uppercase tracking-wide bg-purple-500/15 border border-purple-500/30 text-purple-200 px-2 py-1 rounded-full">
          {product.category}
        </span>
      )}
      {active && <span className="text-pink-300 text-sm flex-shrink-0">✓</span>}
    </button>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [routines, setRoutines] = useState([])
  const [products, setProducts] = useState([])
  const [profile, setProfile] = useState(null)
  const [completed, setCompleted] = useState({})   // { [routineId]: [completed step names] }
  const [picking, setPicking] = useState(null)     // { routineId, stepIdx } when the product picker is open
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
  const [aiCount, setAiCount] = useState(0)
  const [showAiUpgrade, setShowAiUpgrade] = useState(false)

  const today = toLocalDateString()
  const premium = isPremium(profile)
  const atLimit = !premium && aiCount >= FREE_AI_LIMIT

  useEffect(() => {
    setAiCount(getAiCountToday(today))
  }, [today])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      loadTodayLog(supabase, user.id)
      loadRoutines(supabase, user.id)
      loadProducts(supabase, user.id)
      loadProfile(supabase, user.id)
    })
  }, [])

  async function loadProfile(supabase, userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    // First-time users (no row OR onboarded=false) get the guided start.
    if (!data || data.onboarded === false) {
      router.push('/onboarding')
      return
    }
    setProfile(data)
  }

  async function loadRoutines(supabase, userId) {
    const { data } = await supabase
      .from('routines')
      .select('data, morning_steps, night_steps')
      .eq('user_id', userId)
      .maybeSingle()
    setRoutines(routinesFromRow(data))
  }

  async function loadProducts(supabase, userId) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
    setProducts(data || [])
  }

  async function loadTodayLog(supabase, userId) {
    const { data } = await supabase
      .from('skin_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    if (data) {
      // Prefer the new `completed` map; fall back to the legacy morning/night columns.
      const hasCompleted = data.completed && Object.keys(data.completed).length
      setCompleted(hasCompleted ? data.completed : {
        morning: data.morning_completed || [],
        night: data.night_completed || [],
      })
      setSkinRating(data.skin_rating)
      setNote(data.note || '')
      setTodayLogged(true)
    }
  }

  function toggleStep(routineId, step) {
    setCompleted(prev => {
      const list = prev[routineId] || []
      const next = list.includes(step) ? list.filter(s => s !== step) : [...list, step]
      return { ...prev, [routineId]: next }
    })
  }

  function completeAllSteps(routineId, steps) {
    setCompleted(prev => ({ ...prev, [routineId]: [...steps] }))
  }

  function clearAllSteps(routineId) {
    setCompleted(prev => ({ ...prev, [routineId]: [] }))
  }

  function openProductPicker(routineId, stepIdx) {
    setPicking({ routineId, stepIdx })
  }

  async function setStepProduct(productId) {
    if (!picking || !user) return
    const { routineId, stepIdx } = picking
    const nextRoutines = routines.map(r => {
      if (r.id !== routineId) return r
      return { ...r, steps: r.steps.map((s, i) => i === stepIdx ? { ...s, productId } : s) }
    })
    setRoutines(nextRoutines)
    setPicking(null)
    const supabase = createClient()
    await supabase.from('routines').upsert({
      user_id: user.id,
      data: nextRoutines,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  const pickingRoutine = picking ? routines.find(r => r.id === picking.routineId) : null
  const pickingStep = pickingRoutine?.steps[picking.stepIdx]

  async function handleSave() {
    if (!user || !skinRating) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('skin_logs').upsert({
      user_id: user.id,
      date: today,
      completed,
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
    const userNote = note.trim() ? note.trim() : 'none'
    const routineLines = routines.map(r => {
      const d = completed[r.id] || []
      return `- ${r.name}: ${d.length ? d.join(', ') : 'none yet'}`
    }).join('\n')
    const profileConcerns = profile?.concerns?.length
      ? `\nMy long-standing skin concerns (from profile): ${profile.concerns.join(', ')}`
      : ''
    return `My main skin concern right now: ${activeConcern}${profileConcerns}

Today's context:
- Skin rating: ${ratingText}
- My note: ${userNote}
Routine steps I completed today:
${routineLines || '- none'}

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
      setAiCount(incrementAiCountToday(today))
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
    if (atLimit) { setShowAiUpgrade(true); return }
    const messages = [{ role: 'user', content: buildContextMessage() }]
    setChat(messages)
    askAI(messages, [], '')
  }

  function sendChat(e) {
    e?.preventDefault()
    const text = chatInput.trim()
    if (!text || aiLoading) return
    if (atLimit) { setShowAiUpgrade(true); return }
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
          {routines.map((routine, idx) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              accent={accentFor(idx)}
              products={products}
              done={completed[routine.id] || []}
              onToggle={toggleStep}
              onPickProduct={openProductPicker}
              onCompleteAll={completeAllSteps}
              onClearAll={clearAllSteps}
            />
          ))}
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
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <h2 className="text-lg font-semibold">🔍 Fix My Skin</h2>
            {!premium && (
              <button
                onClick={() => atLimit && setShowAiUpgrade(true)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                  atLimit
                    ? 'bg-amber-500/10 border-amber-400/40 text-amber-200 hover:bg-amber-500/15'
                    : 'bg-white/5 border-white/10 text-gray-400 cursor-default'
                }`}
                title={atLimit ? 'Daily limit reached — tap to upgrade' : `${aiCount}/${FREE_AI_LIMIT} AI replies used today`}
              >
                {atLimit ? '✦ Daily limit hit — upgrade' : `AI ${aiCount}/${FREE_AI_LIMIT} today`}
              </button>
            )}
          </div>
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

      <StepProductPicker
        open={!!picking}
        step={pickingStep}
        products={products}
        onPick={setStepProduct}
        onClose={() => setPicking(null)}
      />

      {showAiUpgrade && <AiUpgradeNudge onClose={() => setShowAiUpgrade(false)} />}
    </main>
  )
}

function AiUpgradeNudge({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-[#0e0e0e] border border-pink-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl shadow-pink-500/20"
      >
        <span className="text-[10px] uppercase tracking-wider bg-gradient-to-r from-amber-400/30 to-pink-400/30 border border-amber-300/40 text-amber-200 px-2 py-0.5 rounded-full font-semibold">
          ✦ Premium
        </span>
        <h3 className="text-xl font-bold mt-3 mb-2 bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
          You've hit today's AI limit
        </h3>
        <p className="text-sm text-gray-400 mb-5">
          Free is capped at {FREE_AI_LIMIT} Fix My Skin replies per day. Premium uncaps it — and unlocks longer progress views too.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="/profile"
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2 rounded-full text-sm hover:opacity-90 transition shadow-lg shadow-pink-500/20"
          >
            Upgrade
          </a>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white transition">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
