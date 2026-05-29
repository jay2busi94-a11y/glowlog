'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { routinesFromRow, accentFor, newRoutineId, STEP_LIBRARY } from '../../lib/routine'

function RoutineEditor({ routine, accent, onChange, onDelete }) {
  const [input, setInput] = useState('')
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)

  const steps = routine.steps
  const setSteps = (next) => onChange({ ...routine, steps: next })

  function addStep(value) {
    const v = value.trim()
    if (!v || steps.includes(v)) return
    setSteps([...steps, v])
  }
  function addCustom(e) {
    e.preventDefault()
    addStep(input)
    setInput('')
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

  const available = STEP_LIBRARY.filter(s => !steps.includes(s))

  return (
    <div className={`bg-white/5 border ${accent.ring} rounded-2xl p-6`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <input
          value={routine.name}
          onChange={e => onChange({ ...routine, name: e.target.value })}
          placeholder="Routine name"
          className={`flex-1 min-w-0 bg-transparent text-lg font-semibold ${accent.head} border-b border-transparent focus:border-white/20 focus:outline-none transition`}
        />
        <button onClick={onDelete} className="flex-shrink-0 text-xs text-gray-500 hover:text-rose-400 transition">
          Delete
        </button>
      </div>

      <ul className="flex flex-col gap-2 mb-4">
        {steps.length === 0 && (
          <li className="text-sm text-gray-500 py-2">No steps yet — pick from the suggestions or add your own.</li>
        )}
        {steps.map((step, i) => (
          <li
            key={step + i}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragEnter={() => setOverIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { reorder(dragIndex, i); endDrag() }}
            onDragEnd={endDrag}
            className={`flex items-center gap-1 bg-white/5 border rounded-xl pl-2 pr-2 py-2 cursor-grab active:cursor-grabbing transition ${
              dragIndex === i ? 'opacity-40' : overIndex === i ? 'border-white/40' : 'border-white/10'
            }`}
          >
            <span className="text-gray-600 select-none px-1 text-lg leading-none" aria-hidden>⠿</span>
            <span className="flex-1 text-sm text-gray-200 break-words">{step}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-500 hover:text-white disabled:opacity-20 transition px-2 text-xs" aria-label="Move up">▲</button>
            <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="text-gray-500 hover:text-white disabled:opacity-20 transition px-2 text-xs" aria-label="Move down">▼</button>
            <button onClick={() => remove(i)} className="text-gray-500 hover:text-rose-400 transition px-2" aria-label="Remove step">✕</button>
          </li>
        ))}
      </ul>

      {available.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Tap to add:</p>
          <div className="flex flex-wrap gap-2">
            {available.map(s => (
              <button
                key={s}
                onClick={() => addStep(s)}
                className="border border-white/10 text-gray-300 text-xs px-3 py-1.5 rounded-full hover:border-white/30 hover:text-white transition"
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
          className={`flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white placeholder-gray-600 text-sm focus:outline-none ${accent.focus} transition`}
        />
        <button type="submit" className="border border-white/15 text-gray-200 text-sm px-4 py-2 rounded-full hover:bg-white/10 transition">
          Add
        </button>
      </form>
    </div>
  )
}

export default function RoutineBuilder() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [routines, setRoutines] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      const { data } = await supabase
        .from('routines')
        .select('data, morning_steps, night_steps')
        .eq('user_id', user.id)
        .maybeSingle()
      setRoutines(routinesFromRow(data))
      setLoading(false)
    })
  }, [])

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
    <main className="min-h-screen bg-[#080808] text-white px-4 pb-16 overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-4xl mx-auto pt-32">

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Build Your Routines 🧴</h1>
          <p className="text-gray-400">Create your own routines, rename them, and add steps. These show up on your dashboard.</p>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading your routines...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 mb-6">
              {routines.map((routine, idx) => (
                <RoutineEditor
                  key={routine.id}
                  routine={routine}
                  accent={accentFor(idx)}
                  onChange={(updated) => updateRoutine(idx, updated)}
                  onDelete={() => deleteRoutine(idx)}
                />
              ))}
            </div>

            <button
              onClick={addRoutine}
              className="w-full border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 rounded-2xl py-4 text-sm transition mb-8"
            >
              + Add a routine
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-pink-500/20"
              >
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Routines'}
              </button>
              <a href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">
                Back to dashboard
              </a>
            </div>
          </>
        )}

      </div>
    </main>
  )
}
