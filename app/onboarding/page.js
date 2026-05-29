'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { PROFILE_CONCERNS } from '../../lib/profile'
import { generateStarterRoutines } from '../../lib/routine'

const SKIN_TYPES = [
  { key: 'oily', emoji: '💧', label: 'Oily', body: 'Shiny by midday, larger pores' },
  { key: 'dry', emoji: '🌵', label: 'Dry', body: 'Tight, flaky, rough patches' },
  { key: 'combination', emoji: '🌗', label: 'Combination', body: 'Oily T-zone, dry cheeks' },
  { key: 'sensitive', emoji: '🌸', label: 'Sensitive', body: 'Reacts easily, gets red' },
  { key: 'normal', emoji: '✨', label: 'Normal', body: 'Balanced, not much trouble' },
  { key: 'unsure', emoji: '🤔', label: 'Not sure', body: 'We’ll keep it gentle' },
]

const AGE_RANGES = [
  { key: 'under_18', label: 'Under 18' },
  { key: '18_24', label: '18 – 24' },
  { key: '25_34', label: '25 – 34' },
  { key: '35_44', label: '35 – 44' },
  { key: '45_plus', label: '45+' },
]

const EXPERIENCE = [
  { key: 'beginner', emoji: '🌱', label: 'Just starting out', body: 'New to skincare' },
  { key: 'some', emoji: '🌿', label: 'I have a basic routine', body: 'Cleanser + moisturizer' },
  { key: 'enthusiast', emoji: '🌺', label: 'Skincare enthusiast', body: 'I know my actives' },
]

const STEPS = [
  { key: 'skinType', title: 'What’s your skin like?', subtitle: 'No wrong answer — pick what feels closest.' },
  { key: 'concerns', title: 'What are you trying to fix?', subtitle: 'Tap any that apply. Pick a few, or none.' },
  { key: 'ageRange', title: 'How old are you?', subtitle: 'Helps us pick which actives to suggest.' },
  { key: 'experience', title: 'Where are you starting from?', subtitle: 'So we know whether to go simple or layered.' },
]

export default function Onboarding() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [skinType, setSkinType] = useState(null)
  const [concerns, setConcerns] = useState([])
  const [ageRange, setAgeRange] = useState(null)
  const [experience, setExperience] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
    })
  }, [])

  const step = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1
  const canAdvance = (
    (step.key === 'skinType' && !!skinType) ||
    (step.key === 'concerns') || // 0 picks is fine
    (step.key === 'ageRange' && !!ageRange) ||
    (step.key === 'experience' && !!experience)
  )

  function toggleConcern(c) {
    setConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function finish() {
    if (!user) return
    setSaving(true)
    setError('')
    const supabase = createClient()
    const routines = generateStarterRoutines(skinType, concerns, ageRange)
    const profilePayload = {
      user_id: user.id,
      skin_type: skinType,
      age_range: ageRange,
      concerns,
      onboarded: true,
      updated_at: new Date().toISOString(),
    }
    const routinesPayload = {
      user_id: user.id,
      data: routines,
      updated_at: new Date().toISOString(),
    }
    const [profRes, routRes] = await Promise.all([
      supabase.from('profiles').upsert(profilePayload, { onConflict: 'user_id' }),
      supabase.from('routines').upsert(routinesPayload, { onConflict: 'user_id' }),
    ])
    setSaving(false)
    if (profRes.error || routRes.error) {
      setError('Something went wrong saving your answers. Try again.')
      return
    }
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 py-12 overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pink-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto">

        {/* Brand + progress */}
        <div className="flex items-center justify-between mb-10">
          <span className="text-xl font-bold bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
            GlowLog
          </span>
          <span className="text-xs text-gray-500">Step {stepIdx + 1} of {STEPS.length}</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full mb-10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
            style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{step.title}</h1>
          <p className="text-gray-400">{step.subtitle}</p>
        </div>

        {/* Step body */}
        {step.key === 'skinType' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
            {SKIN_TYPES.map(t => {
              const active = skinType === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setSkinType(t.key)}
                  className={`flex items-center gap-3 text-left p-4 rounded-2xl border transition ${
                    active
                      ? 'bg-pink-500/10 border-pink-500/50 shadow-md shadow-pink-500/10'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <span className="text-3xl flex-shrink-0">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className={`font-semibold ${active ? 'text-white' : 'text-gray-200'}`}>{t.label}</p>
                    <p className="text-xs text-gray-400">{t.body}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {step.key === 'concerns' && (
          <div className="flex flex-wrap gap-2 mb-10">
            {PROFILE_CONCERNS.map(c => {
              const active = concerns.includes(c)
              return (
                <button
                  key={c}
                  onClick={() => toggleConcern(c)}
                  className={`text-sm px-4 py-2.5 rounded-full border transition ${
                    active
                      ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/40 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  {active ? '✓ ' : ''}{c}
                </button>
              )
            })}
          </div>
        )}

        {step.key === 'ageRange' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
            {AGE_RANGES.map(r => {
              const active = ageRange === r.key
              return (
                <button
                  key={r.key}
                  onClick={() => setAgeRange(r.key)}
                  className={`p-4 rounded-2xl border transition text-sm font-semibold ${
                    active
                      ? 'bg-pink-500/10 border-pink-500/50 text-white shadow-md shadow-pink-500/10'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
                  }`}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
        )}

        {step.key === 'experience' && (
          <div className="grid grid-cols-1 gap-3 mb-10">
            {EXPERIENCE.map(e => {
              const active = experience === e.key
              return (
                <button
                  key={e.key}
                  onClick={() => setExperience(e.key)}
                  className={`flex items-center gap-4 text-left p-4 rounded-2xl border transition ${
                    active
                      ? 'bg-pink-500/10 border-pink-500/50 shadow-md shadow-pink-500/10'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
                >
                  <span className="text-3xl flex-shrink-0">{e.emoji}</span>
                  <div className="min-w-0">
                    <p className={`font-semibold ${active ? 'text-white' : 'text-gray-200'}`}>{e.label}</p>
                    <p className="text-xs text-gray-400">{e.body}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setStepIdx(i => Math.max(0, i - 1))}
            disabled={stepIdx === 0 || saving}
            className="text-sm text-gray-400 hover:text-white transition disabled:opacity-30"
          >
            ← Back
          </button>
          {isLast ? (
            <button
              onClick={finish}
              disabled={!canAdvance || saving}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-pink-500/20"
            >
              {saving ? 'Building your routine...' : '✨ Build my starter routine'}
            </button>
          ) : (
            <button
              onClick={() => setStepIdx(i => Math.min(STEPS.length - 1, i + 1))}
              disabled={!canAdvance}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-pink-500/20"
            >
              Next →
            </button>
          )}
        </div>
        {error && <p className="text-xs text-rose-300 mt-3 text-right">{error}</p>}

        <p className="text-xs text-gray-600 text-center mt-10">
          We use these answers to seed your routine — you can change everything later on the Routine page.
        </p>

      </div>
    </main>
  )
}
