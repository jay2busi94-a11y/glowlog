'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from "../components/AppNavbar"
import { createClient } from '../../lib/supabase'
import { routinesFromRow, accentFor } from '../../lib/routine'
import { toLocalDateString } from '../../lib/dates'
import { productLabel } from '../../lib/catalog'
import { isPremium, FREE_AI_LIMIT, getAiCountToday, incrementAiCountToday } from '../../lib/profile'
import { getStepInfo } from '../../lib/step_info'
import { computeRoutineStreak, streakMilestoneLabel, hasAnyRoutineStep } from '../../lib/streaks'
// Skin photos are deliberately NOT routed through ImageKit — see lib/imagekit.js
import { ikProductThumb } from '../../lib/imagekit'
import { signSkinPhoto } from '../../lib/photos'

// Upload a skin progress photo to the user's folder and return its storage
// PATH, not a URL. The bucket is private, so a stored URL would either
// expire or — worse, as it used to — be permanently readable by anyone who
// got hold of it. Display URLs are signed at read time instead.
async function uploadSkinPhoto(file, userId) {
  const supabase = createClient()
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('skin-photos')
    .upload(path, file, { upsert: false, cacheControl: '31536000', contentType: file.type || 'image/jpeg' })
  if (error) throw error
  return path
}

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

function StepInfoPanel({ info }) {
  return (
    <div className="mt-2.5 bg-card border border-rule rounded-xl p-3 text-xs">
      <p className="text-ink mb-2 leading-relaxed">{info.what}</p>
      <p className="text-ink-mute text-[11px] uppercase tracking-wide mb-1">When</p>
      <p className="text-ink-mute mb-2.5 leading-relaxed">{info.when}</p>
      {info.tips?.length > 0 && (
        <>
          <p className="text-ink-mute text-[11px] uppercase tracking-wide mb-1">Tips</p>
          <ul className="flex flex-col gap-1">
            {info.tips.map((t, j) => (
              <li key={j} className="text-ink-mute flex gap-1.5 leading-relaxed">
                <span className="text-accent flex-shrink-0">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function RoutineCard({ routine, accent, products, done, onToggle, onPickProduct, onCompleteAll, onClearAll }) {
  const productById = new Map(products.map(p => [p.id, p]))
  const [openInfo, setOpenInfo] = useState(null) // index of expanded step's info, or null
  return (
    <div className={`bg-card border ${accent.ring} rounded-card p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-semibold ${accent.head}`}>{routine.emoji || '🧴'} {routine.name}</h2>
        <span className="text-xs text-ink-mute">{done.length}/{routine.steps.length} done</span>
      </div>

      {routine.steps.length === 0 ? (
        <p className="text-sm text-ink-mute">No steps yet — add some on the Routine page.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {routine.steps.map((step, i) => {
              const isDone = done.includes(step.name)
              const linked = step.productId ? productById.get(step.productId) : null
              const info = getStepInfo(step.name)
              const infoOpen = openInfo === i
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggle(routine.id, step.name)}
                        className={`text-left flex-1 min-w-0 ${isDone ? 'text-ink-mute line-through' : 'text-ink'} hover:text-ink transition truncate`}
                      >
                        {step.name}
                      </button>
                      {info && (
                        <button
                          onClick={() => setOpenInfo(infoOpen ? null : i)}
                          className={`flex-shrink-0 w-5 h-5 rounded-full border text-[10px] font-semibold transition ${
                            infoOpen
                              ? 'bg-card border-rule text-ink'
                              : 'border-rule text-ink-mute hover:text-ink hover:border-rule'
                          }`}
                          aria-label={`Info about ${step.name}`}
                          title={`What is ${step.name}?`}
                        >
                          i
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => onPickProduct(routine.id, i)}
                      className={`mt-1 flex items-center gap-1.5 text-xs transition group ${
                        linked
                          ? `${isDone ? 'text-ink-mute opacity-60' : 'text-ink-mute'} hover:text-ink`
                          : 'text-ink-mute hover:text-ink'
                      }`}
                    >
                      {linked ? (
                        <>
                          <span className={`w-1.5 h-1.5 rounded-full ${accent.head.replace('text-', 'bg-')} opacity-60 group-hover:opacity-100 transition`} />
                          <span className="truncate">{productLabel(linked)}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition text-ink-mute text-[10px]">change</span>
                        </>
                      ) : (
                        <>
                          <span className="text-ink-mute">+</span>
                          <span>Add product</span>
                        </>
                      )}
                    </button>
                    {infoOpen && info && <StepInfoPanel info={info} />}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex gap-4 mt-4 pt-3 border-t border-rule text-xs">
            <button onClick={() => onCompleteAll(routine.id, routine.steps.map(s => s.name))} className={`${accent.link} transition`}>
              Complete all
            </button>
            <button onClick={() => onClearAll(routine.id)} className="text-ink-mute hover:text-ink transition">
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
        className="relative bg-card border border-rule rounded-card w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-rule">
          <p className="text-xs uppercase tracking-wide text-ink-mute">Pick a product for</p>
          <h3 className="text-lg font-semibold text-ink mt-0.5">{step?.name}</h3>
        </div>

        <div className="overflow-y-auto p-3 flex-1">
          {products.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-ink mb-1">No products in your catalog yet</p>
              <p className="text-xs text-ink-mute mb-4">Add your cleansers, serums, and creams so you can link them to your routine.</p>
              <a
                href="/catalog"
                className="inline-block bg-accent text-paper font-semibold px-5 py-2 rounded-full text-xs hover:opacity-90 transition shadow-lg"
              >
                + Add your first product
              </a>
            </div>
          ) : (
            <>
              {sameCategory.length > 0 && (
                <p className="text-[10px] uppercase tracking-wide text-ink-mute px-2 py-2">Suggested</p>
              )}
              {sameCategory.map(p => (
                <ProductRow key={p.id} product={p} active={p.id === currentId} onPick={onPick} />
              ))}
              {sameCategory.length > 0 && others.length > 0 && (
                <p className="text-[10px] uppercase tracking-wide text-ink-mute px-2 py-2 mt-1">Other products</p>
              )}
              {others.map(p => (
                <ProductRow key={p.id} product={p} active={p.id === currentId} onPick={onPick} />
              ))}
            </>
          )}
        </div>

        <div className="border-t border-rule p-3 flex items-center justify-between gap-3">
          {currentId ? (
            <button
              onClick={() => onPick(null)}
              className="text-xs text-warn hover:text-warn transition px-3 py-2"
            >
              Remove product
            </button>
          ) : <span />}
          <div className="flex items-center gap-3">
            <a href="/catalog" className="text-xs text-ink-mute hover:text-ink transition">
              Manage catalog →
            </a>
            <button onClick={onClose} className="text-xs text-ink-mute hover:text-ink transition px-3 py-2">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductRow({ product, active, onPick }) {
  const initials = ((product.brand?.[0] || '') + (product.name?.[0] || '')).toUpperCase() || '✨'
  return (
    <button
      onClick={() => onPick(product.id)}
      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
        active ? 'bg-accent/10 border border-accent' : 'hover:bg-card border border-transparent'
      }`}
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-rule">
        {product.photo_url ? (
          <img src={ikProductThumb(product.photo_url)} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-accent/10 flex items-center justify-center">
            <span className="text-xs font-bold text-ink">
              {initials}
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {product.brand && <p className="text-[10px] uppercase tracking-wide text-ink-mute">{product.brand}</p>}
        <p className={`text-sm truncate ${active ? 'text-ink font-semibold' : 'text-ink'}`}>{product.name}</p>
      </div>
      {product.category && (
        <span className="flex-shrink-0 text-[10px] uppercase tracking-wide bg-accent/10 border border-accent text-ink-mute px-2 py-1 rounded-full">
          {product.category}
        </span>
      )}
      {active && <span className="text-accent text-sm flex-shrink-0">✓</span>}
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
  // What gets saved on the row (a storage path, or a legacy public URL on
  // older rows) is kept separate from what the <img> renders. Conflating
  // them would write an expiring signed URL back into the database.
  const [skinPhotoUrl, setSkinPhotoUrl] = useState('')
  const [skinPhotoPreview, setSkinPhotoPreview] = useState('')
  const [recentLogs, setRecentLogs] = useState([])  // last ~60 days for streak math
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [todayLogged, setTodayLogged] = useState(false)
  const [activeConcern, setActiveConcern] = useState(null)
  const [customAsk, setCustomAsk] = useState('')
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
    // Pull the last ~60 days so streak math has enough history. 60 covers
    // even "two month streak" badges without paying a big query cost.
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - 60)
    const since = toLocalDateString(sinceDate)
    const { data: recent } = await supabase
      .from('skin_logs')
      .select('date, completed, morning_completed, night_completed')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: true })
    setRecentLogs(recent || [])

    const todayRow = (recent || []).find(l => l.date === today)
    if (todayRow) {
      // Need the full row for today (note, rating, photo) — re-query.
      const { data } = await supabase
        .from('skin_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle()
      if (data) {
        const hasCompleted = data.completed && Object.keys(data.completed).length
        setCompleted(hasCompleted ? data.completed : {
          morning: data.morning_completed || [],
          night: data.night_completed || [],
        })
        setSkinRating(data.skin_rating)
        setNote(data.note || '')
        setSkinPhotoUrl(data.photo_url || '')
        if (data.photo_url) {
          signSkinPhoto(createClient(), data.photo_url).then(url => setSkinPhotoPreview(url || ''))
        }
        setTodayLogged(true)
      }
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
      photo_url: skinPhotoUrl || null,
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

  function buildContextMessage({ question } = {}) {
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
    const skinType = profile?.skin_type ? `\nMy skin type: ${profile.skin_type}` : ''
    const opener = question
      ? `My question: ${question}${profileConcerns}${skinType}`
      : `My main skin concern right now: ${activeConcern}${profileConcerns}${skinType}`
    const closer = question
      ? 'Answer my question. Keep it grounded in the context above.'
      : 'Give me personalized advice for this concern.'
    return `${opener}

Today's context:
- Skin rating: ${ratingText}
- My note: ${userNote}
Routine steps I completed today:
${routineLines || '- none'}

${closer}`
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

  function askCustom(e) {
    e?.preventDefault()
    const q = customAsk.trim()
    if (!q || aiLoading) return
    if (atLimit) { setShowAiUpgrade(true); return }
    // Reset any concern-flow state so the chat panel renders cleanly.
    setActiveConcern(null)
    setAiError('')
    const messages = [{ role: 'user', content: buildContextMessage({ question: q }) }]
    setChat(messages)
    setCustomAsk('')
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

  // Live streak — counts today only if user has checked at least one step.
  // Merges in-memory `completed` state for today with persisted history so
  // the badge updates the moment they tick a step (no save required).
  const todayHasStep = Object.values(completed).some(arr => Array.isArray(arr) && arr.length > 0)
  const logsForStreak = todayHasStep
    ? [...recentLogs.filter(l => l.date !== today), { date: today, completed }]
    : recentLogs.filter(l => l.date !== today)
  const currentStreak = computeRoutineStreak(logsForStreak)
  const streakLabel = streakMilestoneLabel(currentStreak)

  return (
    <main className="min-h-screen bg-paper text-ink px-4 app-page-pad-bottom overflow-hidden">
      <AppNavbar />

      <div className="relative z-10 max-w-4xl mx-auto app-page-pad-top">

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">{greeting}, {userName} 👋</h1>
          <p className="text-ink-mute">Here's your skincare routine for today.</p>
          {currentStreak > 0 && (
            <div className={`mt-4 inline-flex items-center gap-3 rounded-card px-4 py-2.5 border ${
              currentStreak >= 7
                ? 'bg-accent/10 border-accent'
                : 'bg-card border-rule'
            }`}>
              <span className="text-2xl">🔥</span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  {currentStreak} {currentStreak === 1 ? 'day' : 'days'} in a row
                </p>
                {streakLabel && (
                  <p className={`text-[10px] uppercase tracking-wider ${
                    currentStreak >= 7 ? 'text-ink' : 'text-ink-mute'
                  }`}>{streakLabel}</p>
                )}
              </div>
            </div>
          )}
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
        <div className="bg-card border border-rule rounded-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1">📓 Log Today's Skin</h2>
          <p className="text-ink-mute text-sm mb-5">How does your skin feel today?</p>

          <div className="flex gap-3 mb-5 flex-wrap">
            {SKIN_RATINGS.map(r => (
              <button
                key={r.value}
                onClick={() => setSkinRating(skinRating === r.value ? null : r.value)}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition ${skinRating === r.value ? 'border-accent bg-accent/10 text-accent' : 'border-rule text-ink-mute hover:border-rule'}`}
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
            className="w-full bg-card border border-rule rounded-xl px-4 py-3 text-ink placeholder-ink-mute text-sm focus:outline-none focus:border-accent transition resize-none mb-4"
          />

          {/* The picker shows the signed URL but reports back the storage
              path, which is what gets saved. */}
          <SkinPhotoPicker
            photoUrl={skinPhotoPreview}
            onChange={(path) => {
              setSkinPhotoUrl(path || '')
              if (!path) return setSkinPhotoPreview('')
              signSkinPhoto(createClient(), path).then(url => setSkinPhotoPreview(url || ''))
            }}
            userId={user?.id}
          />

          <button
            onClick={handleSave}
            disabled={saving || !skinRating}
            className="bg-accent text-paper font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : todayLogged ? 'Update Log' : "Save Today's Log"}
          </button>
        </div>

        {/* Fix My Skin */}
        <div className="bg-card border border-rule rounded-card p-6">
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <h2 className="text-lg font-semibold">🔍 Fix My Skin</h2>
            {!premium && (
              <button
                onClick={() => atLimit && setShowAiUpgrade(true)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                  atLimit
                    ? 'bg-card border-rule text-ink hover:bg-card'
                    : 'bg-card border-rule text-ink-mute cursor-default'
                }`}
                title={atLimit ? 'Daily limit reached — tap to upgrade' : `${aiCount}/${FREE_AI_LIMIT} AI replies used today`}
              >
                {atLimit ? '✦ Daily limit hit — upgrade' : `AI ${aiCount}/${FREE_AI_LIMIT} today`}
              </button>
            )}
          </div>
          <p className="text-ink-mute text-sm mb-4">What's your main skin concern right now?</p>
          <div className="flex flex-wrap gap-3">
            {CONCERNS.map((concern) => {
              const active = activeConcern === concern
              return (
                <button
                  key={concern}
                  onClick={() => selectConcern(concern)}
                  className={`border text-sm px-4 py-2 rounded-full transition ${active ? 'border-accent bg-accent/10 text-accent' : 'border-rule text-ink hover:border-accent hover:text-accent hover:bg-accent/10'}`}
                >
                  {concern}
                </button>
              )
            })}
          </div>

          {/* Custom question — alternative to picking a concern */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="h-px flex-1 bg-card" />
              <span className="text-[10px] uppercase tracking-wider text-ink-mute">Or ask anything</span>
              <span className="h-px flex-1 bg-card" />
            </div>
            <form onSubmit={askCustom} className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                value={customAsk}
                onChange={e => setCustomAsk(e.target.value)}
                placeholder="e.g. Can I layer retinol with vitamin C?"
                maxLength={400}
                disabled={aiLoading}
                className="flex-1 min-w-0 bg-card border border-rule rounded-full px-4 py-2 text-ink placeholder-ink-mute text-sm focus:outline-none focus:border-accent transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!customAsk.trim() || aiLoading}
                className="bg-accent text-paper font-semibold px-5 py-2 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-md whitespace-nowrap"
              >
                {aiLoading ? '✨ Thinking...' : '✨ Ask AI'}
              </button>
            </form>
            <p className="text-[10px] text-ink-mute mt-2">
              Uses your profile + today's log for context, just like the concern flow.
            </p>
          </div>

          {activeConcern && (
            <div className="mt-6 border-t border-rule pt-6">
              <h3 className="text-base font-semibold text-ink mb-1">{activeConcern}</h3>
              <p className="text-ink-mute text-sm mb-4">{CONCERN_FIXES[activeConcern].blurb}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold text-ok uppercase tracking-wide mb-2">✓ Look for</p>
                  <ul className="flex flex-col gap-1.5">
                    {CONCERN_FIXES[activeConcern].lookFor.map((item) => (
                      <li key={item} className="text-sm text-ink flex gap-2">
                        <span className="text-ok flex-shrink-0">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-warn uppercase tracking-wide mb-2">✕ Avoid</p>
                  <ul className="flex flex-col gap-1.5">
                    {CONCERN_FIXES[activeConcern].avoid.map((item) => (
                      <li key={item} className="text-sm text-ink flex gap-2">
                        <span className="text-warn flex-shrink-0">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {chat.length === 0 && (
                <button
                  onClick={startAdvice}
                  disabled={aiLoading}
                  className="bg-accent text-paper font-semibold px-5 py-2 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg"
                >
                  {aiLoading ? '✨ Thinking...' : '✨ Get personalized advice'}
                </button>
              )}
            </div>
          )}

          {/* Chat panel — shows for both the concern flow and custom questions */}
          {chat.length > 0 && (
            <div className="mt-6 border-t border-rule pt-6">
              {!activeConcern && (
                <h3 className="text-base font-semibold text-ink mb-3">Your question</h3>
              )}
              <div className="bg-card border border-accent rounded-xl p-4">
                {/* Conversation — skip index 0 (the hidden context message) */}
                <div className="flex flex-col gap-3">
                  {chat.slice(1).map((m, i) => (
                    <div
                      key={i}
                      className={
                        m.role === 'user'
                          ? 'self-end max-w-[85%] bg-accent/10 border border-accent rounded-card rounded-br-sm px-3.5 py-2'
                          : 'self-start max-w-[90%] bg-card border border-rule rounded-card rounded-bl-sm px-3.5 py-2.5'
                      }
                    >
                      <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </div>
                  ))}
                  {/* Show the user's original custom question (index 0 was sent as context — extract a clean version). */}
                  {chat.length === 1 && !activeConcern && aiLoading && (
                    <div className="self-end max-w-[85%] bg-accent/10 border border-accent rounded-card rounded-br-sm px-3.5 py-2">
                      <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed opacity-80">
                        {(chat[0]?.content || '').split('\n')[0].replace(/^My question:\s*/, '')}
                      </p>
                    </div>
                  )}
                  {aiLoading && (
                    <div className="self-start bg-card border border-rule rounded-card rounded-bl-sm px-3.5 py-2.5">
                      <p className="text-sm text-ink-mute">✨ Thinking...</p>
                    </div>
                  )}
                </div>

                <form onSubmit={sendChat} className="mt-4 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Ask a follow-up..."
                    disabled={aiLoading}
                    className="flex-1 bg-card border border-rule rounded-full px-4 py-2 text-ink placeholder-ink-mute text-sm focus:outline-none focus:border-accent transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading || !chatInput.trim()}
                    className="bg-accent text-paper font-semibold px-5 py-2 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>

                <p className="mt-3 text-xs text-ink-mute">✨ Personalized by Claude — general guidance, not medical advice.</p>
              </div>
            </div>
          )}

          {aiError && (
            <p className="mt-4 text-sm text-warn">{aiError}</p>
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
        className="relative bg-card border border-accent rounded-card w-full max-w-sm p-6 shadow-2xl"
      >
        <span className="text-[10px] uppercase tracking-wider bg-accent/10 border border-rule text-ink px-2 py-0.5 rounded-full font-semibold">
          ✦ Premium
        </span>
        <h3 className="text-xl font-bold mt-3 mb-2 text-ink">
          You've hit today's AI limit
        </h3>
        <p className="text-sm text-ink-mute mb-5">
          Free is capped at {FREE_AI_LIMIT} Fix My Skin replies per day. Premium uncaps it — and unlocks longer progress views too.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="/profile"
            className="bg-accent text-paper font-semibold px-5 py-2 rounded-full text-sm hover:opacity-90 transition shadow-lg"
          >
            Upgrade
          </a>
          <button onClick={onClose} className="text-sm text-ink-mute hover:text-ink transition">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

function SkinPhotoPicker({ photoUrl, onChange, userId }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !userId) return
    if (!file.type.startsWith('image/')) {
      setError('Please pick an image file.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('That image is over 8 MB — try a smaller one.')
      return
    }
    setError('')
    setUploading(true)
    try {
      const url = await uploadSkinPhoto(file, userId)
      onChange(url)
    } catch (err) {
      console.error(err)
      setError('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mb-4">
      <p className="text-xs text-ink-mute mb-2">Today's photo <span className="text-ink-mute">(optional)</span></p>
      {photoUrl ? (
        <div className="flex items-start gap-4">
          <div className="w-28 h-28 rounded-card overflow-hidden border border-rule bg-card flex-shrink-0">
            <img src={photoUrl} alt="Today's skin photo" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col gap-2 mt-1 min-w-0">
            <label className="cursor-pointer text-xs text-accent hover:text-accent transition">
              {uploading ? 'Uploading...' : 'Replace photo'}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            <label className="cursor-pointer text-xs text-accent hover:text-accent transition">
              {uploading ? '...' : '📷 Take new selfie'}
              <input type="file" accept="image/*" capture="user" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs text-ink-mute hover:text-warn transition text-left"
              disabled={uploading}
            >
              Remove photo
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <label className={`cursor-pointer flex-1 min-w-[140px] flex items-center justify-center gap-2 border border-dashed rounded-card py-5 text-sm transition ${
            uploading ? 'border-rule text-ink-mute' : 'border-rule text-ink-mute hover:border-accent hover:text-ink'
          }`}>
            <span className="text-lg">🖼️</span>
            <span>{uploading ? 'Uploading...' : 'Choose photo'}</span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
          <label className={`cursor-pointer flex-1 min-w-[140px] flex items-center justify-center gap-2 border border-dashed rounded-card py-5 text-sm transition ${
            uploading ? 'border-rule text-ink-mute' : 'border-rule text-ink-mute hover:border-accent hover:text-ink'
          }`}>
            <span className="text-lg">📷</span>
            <span>{uploading ? 'Uploading...' : 'Take selfie'}</span>
            <input type="file" accept="image/*" capture="user" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}
      {error && <p className="text-xs text-warn mt-2">{error}</p>}
    </div>
  )
}
