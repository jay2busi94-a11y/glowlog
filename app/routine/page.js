'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { routinesFromRow, accentFor, newRoutineId, STEP_LIBRARY, normalizeStep } from '../../lib/routine'
import { productLabel } from '../../lib/catalog'
import { getStepInfo } from '../../lib/step_info'
import { isAdvancedMode } from '../../lib/profile'

// Curated step lists per routine for Simple mode. Order matches how you'd
// actually apply them in real life — top to bottom. Anything outside these
// lists (custom steps) is preserved but not editable in Simple mode.
const SIMPLE_MORNING_STEPS = [
  'Oil Cleanser', 'Cleanser', 'Foaming Cleanser',
  'Toner', 'Essence',
  'Vitamin C Serum', 'Niacinamide Serum', 'Hyaluronic Acid', 'Peptide Serum',
  'Eye Cream',
  'Moisturizer', 'Moisturizer + SPF', 'Sunscreen (SPF)',
  'Lip Balm',
]
const SIMPLE_NIGHT_STEPS = [
  'Oil Cleanser', 'Cleanser', 'Foaming Cleanser', 'Micellar Water',
  'Toner', 'Essence',
  'Exfoliant (AHA/BHA)',
  'Vitamin C Serum', 'Niacinamide Serum', 'Hyaluronic Acid', 'Retinol Serum', 'Peptide Serum',
  'Spot Treatment',
  'Eye Cream',
  'Night Moisturizer', 'Moisturizer', 'Face Oil',
  'Face Mask', 'Sheet Mask',
  'Lip Balm',
]

function RoutineEditor({ routine, accent, products, onChange, onDelete }) {
  const [input, setInput] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const [openInfo, setOpenInfo] = useState(null)

  const steps = routine.steps
  const setSteps = (next) => onChange({ ...routine, steps: next })

  function addStep(value) {
    const v = value.trim()
    if (!v || steps.some(s => s.name === v)) return
    setSteps([...steps, { name: v, productId: null }])
  }
  function addCustom(e) {
    e.preventDefault()
    addStep(input)
    setInput('')
  }
  function updateStep(i, patch) {
    setSteps(steps.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }
  function remove(i) {
    setSteps(steps.filter((_, idx) => idx !== i))
  }
  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= steps.length) return
    const next = [...steps]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSteps(next)
  }
  function reorder(from, to) {
    if (from == null || from === to) return
    const next = [...steps]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setSteps(next)
  }
  function endDrag() {
    setDragIndex(null)
    setOverIndex(null)
  }

  const stepNames = new Set(steps.map(s => s.name))
  const available = STEP_LIBRARY.filter(s => !stepNames.has(s))

  return (
    <div className={`bg-card border ${accent.ring} rounded-card p-6`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <input
          value={routine.name}
          onChange={e => onChange({ ...routine, name: e.target.value })}
          placeholder="Routine name"
          className={`flex-1 min-w-0 bg-transparent text-lg font-semibold ${accent.head} border-b border-transparent focus:border-rule focus:outline-none transition`}
        />
        <button onClick={onDelete} className="flex-shrink-0 text-xs text-ink-mute hover:text-warn transition">
          Delete
        </button>
      </div>

      <ul className="flex flex-col gap-2 mb-4">
        {steps.length === 0 && (
          <li className="text-sm text-ink-mute py-2">No steps yet — pick from the suggestions or add your own.</li>
        )}
        {steps.map((step, i) => {
          const linked = products.find(p => p.id === step.productId)
          const info = getStepInfo(step.name)
          const infoOpen = openInfo === i
          return (
            <li
              key={step.name + i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnter={() => setOverIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { reorder(dragIndex, i); endDrag() }}
              onDragEnd={endDrag}
              className={`bg-card border rounded-xl p-2 cursor-grab active:cursor-grabbing transition ${
                dragIndex === i ? 'opacity-40' : overIndex === i ? 'border-accent' : 'border-rule'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-ink-mute select-none px-1 text-lg leading-none" aria-hidden>⠿</span>
                <span className="flex-1 text-sm text-ink break-words">{step.name}</span>
                {info && (
                  <button
                    onClick={() => setOpenInfo(infoOpen ? null : i)}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border text-[10px] font-semibold transition mr-1 ${
                      infoOpen
                        ? 'bg-card border-rule text-ink'
                        : 'border-rule text-ink-mute hover:text-ink hover:border-rule'
                    }`}
                    aria-label={`What is ${step.name}?`}
                    title={`What is ${step.name}?`}
                  >
                    i
                  </button>
                )}
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-ink-mute hover:text-ink disabled:opacity-20 transition px-2 text-xs" aria-label="Move up">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="text-ink-mute hover:text-ink disabled:opacity-20 transition px-2 text-xs" aria-label="Move down">▼</button>
                <button onClick={() => remove(i)} className="text-ink-mute hover:text-warn transition px-2" aria-label="Remove step">✕</button>
              </div>
              <div className="flex items-center gap-2 mt-2 ml-6">
                <span className="text-[10px] uppercase tracking-wide text-ink-mute flex-shrink-0">Product</span>
                <select
                  value={step.productId || ''}
                  onChange={e => updateStep(i, { productId: e.target.value || null })}
                  className="flex-1 min-w-0 bg-card border border-rule rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:border-rule transition"
                >
                  <option value="" className="bg-paper">— none —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="bg-paper">{productLabel(p)}</option>
                  ))}
                </select>
                {linked && (
                  <span className="text-[10px] text-ink-mute flex-shrink-0 hidden sm:inline">{linked.category || ''}</span>
                )}
              </div>
              {infoOpen && info && (
                <div className="ml-6 mt-2 bg-card border border-rule rounded-lg p-3 text-xs">
                  <p className="text-ink mb-2 leading-relaxed">{info.what}</p>
                  <p className="text-ink-mute text-[10px] uppercase tracking-wide mb-1">When</p>
                  <p className="text-ink-mute mb-2 leading-relaxed">{info.when}</p>
                  {info.tips?.length > 0 && (
                    <>
                      <p className="text-ink-mute text-[10px] uppercase tracking-wide mb-1">Tips</p>
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
              )}
            </li>
          )
        })}
      </ul>

      {products.length === 0 && (
        <p className="text-xs text-ink-mute mb-3">
          Add products on the <a href="/catalog" className={`${accent.link} transition`}>Catalog</a> page to link them to steps.
        </p>
      )}

      {available.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-ink-mute mb-2">Tap to add:</p>
          <div className="flex flex-wrap gap-2">
            {available.map(s => (
              <button
                key={s}
                onClick={() => addStep(s)}
                className="border border-rule text-ink text-xs px-3 py-1.5 rounded-full hover:border-rule hover:text-ink transition"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={addCustom} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add your own step"
          className={`flex-1 bg-card border border-rule rounded-full px-4 py-2 text-ink placeholder-ink-mute text-sm focus:outline-none ${accent.focus} transition`}
        />
        <button type="submit" className="border border-rule text-ink text-sm px-4 py-2 rounded-full hover:bg-card transition">
          Add
        </button>
      </form>
    </div>
  )
}

export default function RoutineBuilder() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [routines, setRoutines] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingMode, setSavingMode] = useState(false)

  const advanced = isAdvancedMode(profile)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      const [routinesRes, productsRes, profileRes] = await Promise.all([
        supabase.from('routines').select('data, morning_steps, night_steps').eq('user_id', user.id).maybeSingle(),
        supabase.from('products').select('*').eq('user_id', user.id).order('brand', { ascending: true }),
        supabase.from('profiles').select('advanced_mode').eq('user_id', user.id).maybeSingle(),
      ])
      setRoutines(routinesFromRow(routinesRes.data))
      setProducts(productsRes.data || [])
      setProfile(profileRes.data)
      setLoading(false)
    })
  }, [])

  async function toggleMode() {
    if (!user || savingMode) return
    setSavingMode(true)
    const next = !advanced
    setProfile(prev => ({ ...(prev || {}), advanced_mode: next }))
    const supabase = createClient()
    await supabase.from('profiles').upsert(
      { user_id: user.id, advanced_mode: next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setSavingMode(false)
  }

  function updateRoutine(index, updated) {
    setRoutines(routines.map((r, i) => (i === index ? updated : r)))
  }
  function deleteRoutine(index) {
    setRoutines(routines.filter((_, i) => i !== index))
  }
  function addRoutine() {
    setRoutines([...routines, { id: newRoutineId(), name: 'New Routine', emoji: '🧴', steps: [] }])
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('routines').upsert({
      user_id: user.id,
      data: routines,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink px-4 app-page-pad-bottom overflow-hidden">
      <AppNavbar />

      <div className="relative z-10 max-w-4xl mx-auto app-page-pad-top">

        <div className="flex items-end justify-between gap-4 mb-10 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold mb-2">Build Your Routines 🧴</h1>
            <p className="text-ink-mute">
              {advanced
                ? 'Full editor — unlimited routines, drag-to-reorder, custom steps. Link a product to any step.'
                : 'Pick what you do in the morning and at night. We keep the order right.'}
            </p>
          </div>
          {!loading && (
            <div className="flex gap-1 bg-card border border-rule rounded-full p-1" title="Change in Settings too">
              <button
                onClick={() => advanced && toggleMode()}
                disabled={savingMode}
                className={`text-xs px-3 py-1 rounded-full transition ${
                  !advanced
                    ? 'bg-accent text-paper shadow-md'
                    : 'text-ink-mute hover:text-ink'
                }`}
              >
                🌱 Simple
              </button>
              <button
                onClick={() => !advanced && toggleMode()}
                disabled={savingMode}
                className={`text-xs px-3 py-1 rounded-full transition ${
                  advanced
                    ? 'bg-accent text-paper shadow-md'
                    : 'text-ink-mute hover:text-ink'
                }`}
              >
                🧪 Advanced
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-ink-mute">Loading your routines...</p>
        ) : !advanced ? (
          <SimpleRoutineEditor
            routines={routines}
            products={products}
            onChange={setRoutines}
            onSave={handleSave}
            saving={saving}
            saved={saved}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 mb-6">
              {routines.map((routine, idx) => (
                <RoutineEditor
                  key={routine.id}
                  routine={routine}
                  accent={accentFor(idx)}
                  products={products}
                  onChange={(updated) => updateRoutine(idx, updated)}
                  onDelete={() => deleteRoutine(idx)}
                />
              ))}
            </div>

            <button
              onClick={addRoutine}
              className="w-full border border-dashed border-rule text-ink-mute hover:text-ink hover:border-rule rounded-card py-4 text-sm transition mb-8"
            >
              + Add a routine
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-accent text-paper font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg"
              >
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Routines'}
              </button>
              <a href="/dashboard" className="text-sm text-ink-mute hover:text-ink transition">
                Back to dashboard
              </a>
            </div>
          </>
        )}

      </div>
    </main>
  )
}

// Pulls the morning/night routine (or creates them) and presents a guided
// checklist. Steps not in the curated list ("custom" steps the user made
// in Advanced mode) are preserved on save but hidden from the UI.
function SimpleRoutineEditor({ routines, products, onChange, onSave, saving, saved }) {
  const morning = routines.find(r => r.id === 'morning')
    || { id: 'morning', name: 'Morning Routine', emoji: '☀️', steps: [] }
  const night = routines.find(r => r.id === 'night')
    || { id: 'night', name: 'Night Routine', emoji: '🌙', steps: [] }

  function patchRoutine(updated) {
    const has = routines.some(r => r.id === updated.id)
    const next = has
      ? routines.map(r => r.id === updated.id ? updated : r)
      : [...routines, updated]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-6">
      <SimpleRoutinePane
        routine={morning}
        curated={SIMPLE_MORNING_STEPS}
        products={products}
        accentClass="border-accent"
        headClass="text-accent"
        onChange={patchRoutine}
      />
      <SimpleRoutinePane
        routine={night}
        curated={SIMPLE_NIGHT_STEPS}
        products={products}
        accentClass="border-accent"
        headClass="text-accent"
        onChange={patchRoutine}
      />

      <div className="flex items-center gap-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-accent text-paper font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg"
        >
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Routines'}
        </button>
        <a href="/dashboard" className="text-sm text-ink-mute hover:text-ink transition">
          Back to dashboard
        </a>
      </div>
    </div>
  )
}

function SimpleRoutinePane({ routine, curated, products, accentClass, headClass, onChange }) {
  // Index existing steps so we can preserve productIds when re-toggling and
  // remember unmanaged (custom) steps to keep them on save.
  const normalizedSteps = routine.steps.map(s => (typeof s === 'string' ? { name: s, productId: null } : s))
  const stepByName = new Map(normalizedSteps.map(s => [s.name, s]))
  const checkedSet = new Set(normalizedSteps.map(s => s.name).filter(n => curated.includes(n)))
  const unmanaged = normalizedSteps.filter(s => !curated.includes(s.name))

  function commit({ nextChecked, nextProductByName }) {
    const curatedSteps = curated
      .filter(name => nextChecked.has(name))
      .map(name => {
        const existing = stepByName.get(name)
        return {
          name,
          productId: nextProductByName?.[name] !== undefined
            ? nextProductByName[name]
            : (existing?.productId ?? null),
        }
      })
    onChange({ ...routine, steps: [...curatedSteps, ...unmanaged] })
  }

  function toggleStep(name) {
    const next = new Set(checkedSet)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    commit({ nextChecked: next })
  }

  function setStepProduct(name, productId) {
    const next = new Set(checkedSet)
    next.add(name)  // selecting a product implies the step is checked
    commit({ nextChecked: next, nextProductByName: { [name]: productId || null } })
  }

  return (
    <div className={`bg-card border ${accentClass} rounded-card p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-semibold ${headClass}`}>{routine.emoji} {routine.name}</h2>
        <span className="text-xs text-ink-mute">{checkedSet.size} {checkedSet.size === 1 ? 'step' : 'steps'}</span>
      </div>

      <ul className="flex flex-col gap-2">
        {curated.map(name => {
          const checked = checkedSet.has(name)
          const existing = stepByName.get(name)
          const productId = existing?.productId || ''
          return (
            <li key={name} className={`rounded-xl border transition ${
              checked ? 'bg-card border-rule' : 'bg-transparent border-rule'
            }`}>
              <button
                onClick={() => toggleStep(name)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition ${
                  checked ? 'bg-accent/10 border-accent text-accent' : 'border-rule '
                }`}>
                  ✓
                </span>
                <span className={`text-sm flex-1 ${checked ? 'text-ink' : 'text-ink-mute'}`}>{name}</span>
              </button>
              {checked && (
                <div className="px-3 pb-3 pl-11">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-ink-mute flex-shrink-0">Product</span>
                    <select
                      value={productId}
                      onChange={e => setStepProduct(name, e.target.value)}
                      className="flex-1 min-w-0 bg-card border border-rule rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:border-rule transition"
                    >
                      <option value="" className="bg-paper">— none —</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} className="bg-paper">{productLabel(p)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {unmanaged.length > 0 && (
        <p className="text-xs text-ink-mute mt-4">
          You have {unmanaged.length} custom {unmanaged.length === 1 ? 'step' : 'steps'} ({unmanaged.map(s => s.name).join(', ')}) — kept on save, switch to Advanced to edit them.
        </p>
      )}
    </div>
  )
}
