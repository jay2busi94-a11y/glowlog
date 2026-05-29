'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { PRODUCT_CATEGORIES } from '../../lib/catalog'
import { toLocalDateString } from '../../lib/dates'
import { isPremium, FREE_SUGGEST_LIMIT, getSuggestCountToday, incrementSuggestCountToday, FREE_VISION_LIMIT, getVisionCountToday, incrementVisionCountToday } from '../../lib/profile'

const BLANK = { brand: '', name: '', category: '', notes: '', photo_url: '' }

// Upload a file to the product-photos bucket under {userId}/{uuid}.{ext}
// and return the public URL. Throws on failure.
async function uploadProductPhoto(file, userId) {
  const supabase = createClient()
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('product-photos')
    .upload(path, file, { upsert: false, cacheControl: '31536000', contentType: file.type || 'image/jpeg' })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('product-photos').getPublicUrl(path)
  return publicUrl
}

export default function Catalog() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)   // null = not editing, 'new' = add form, <id> = editing existing
  const [draft, setDraft] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('All')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestCount, setSuggestCount] = useState(0)
  const [shelfOpen, setShelfOpen] = useState(false)
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [visionCount, setVisionCount] = useState(0)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const today = toLocalDateString()
  const premium = isPremium(profile)
  const suggestAtLimit = !premium && suggestCount >= FREE_SUGGEST_LIMIT
  const visionAtLimit = !premium && visionCount >= FREE_VISION_LIMIT

  useEffect(() => {
    setSuggestCount(getSuggestCountToday(today))
    setVisionCount(getVisionCountToday(today))
  }, [today])

  function bumpVisionCount() {
    setVisionCount(incrementVisionCountToday(today))
  }
  function openUpgradeIfAtLimit() {
    if (visionAtLimit) { setShowUpgrade(true); return true }
    return false
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      const [productsRes, profileRes] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      ])
      setProducts(productsRes.data || [])
      setProfile(profileRes.data)
      setLoading(false)
    })
  }, [])

  async function addSuggestionToCatalog(suggestion) {
    if (!user) return null
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      brand: suggestion.brand || null,
      name: suggestion.name,
      category: suggestion.category || null,
      notes: suggestion.why || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('products').insert(payload).select().single()
    if (!error && data) {
      setProducts(prev => [data, ...prev])
      return data
    }
    return null
  }

  function bumpSuggestCount() {
    setSuggestCount(incrementSuggestCountToday(today))
  }

  function startNew() {
    setEditing('new')
    setDraft(BLANK)
  }
  function startEdit(p) {
    setEditing(p.id)
    setDraft({
      brand: p.brand || '',
      name: p.name || '',
      category: p.category || '',
      notes: p.notes || '',
      photo_url: p.photo_url || '',
    })
  }
  function cancel() {
    setEditing(null)
    setDraft(BLANK)
  }

  async function save() {
    if (!user || !draft.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      brand: draft.brand.trim() || null,
      name: draft.name.trim(),
      category: draft.category || null,
      notes: draft.notes.trim() || null,
      photo_url: draft.photo_url || null,
      updated_at: new Date().toISOString(),
    }
    if (editing === 'new') {
      const { data, error } = await supabase.from('products').insert(payload).select().single()
      if (!error && data) setProducts([data, ...products])
    } else {
      const { data, error } = await supabase.from('products').update(payload).eq('id', editing).select().single()
      if (!error && data) setProducts(products.map(p => p.id === editing ? data : p))
    }
    setSaving(false)
    cancel()
  }

  async function remove(id) {
    if (!confirm('Delete this product?')) return
    const supabase = createClient()
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts(products.filter(p => p.id !== id))
  }

  const visible = filter === 'All' ? products : products.filter(p => p.category === filter)
  const categoriesInUse = ['All', ...PRODUCT_CATEGORIES.filter(c => products.some(p => p.category === c))]

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 pb-16 overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-4xl mx-auto pt-32">

        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold mb-2">Your Catalog 🧴</h1>
            <p className="text-gray-400">Track every product you own. Link them to routine steps to remember what works.</p>
          </div>
          {editing === null && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShelfOpen(v => !v)}
                className={`border text-sm px-4 py-2.5 rounded-full transition flex items-center gap-2 ${
                  shelfOpen
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-purple-500/30 text-purple-200 hover:bg-purple-500/10 hover:border-purple-500/50'
                }`}
              >
                <span>📸</span>
                <span>Scan my shelf</span>
              </button>
              <button
                onClick={() => setIngredientsOpen(v => !v)}
                className={`border text-sm px-4 py-2.5 rounded-full transition flex items-center gap-2 ${
                  ingredientsOpen
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10 hover:border-amber-400/50'
                }`}
              >
                <span>🔍</span>
                <span>Check ingredients</span>
              </button>
              <button
                onClick={() => setSuggestOpen(v => !v)}
                className={`border text-sm px-4 py-2.5 rounded-full transition flex items-center gap-2 ${
                  suggestOpen
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-pink-500/30 text-pink-200 hover:bg-pink-500/10 hover:border-pink-500/50'
                }`}
              >
                <span>✨</span>
                <span>Suggest for me</span>
              </button>
              <button
                onClick={startNew}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg shadow-pink-500/20"
              >
                + Add product
              </button>
            </div>
          )}
        </div>

        {editing === null && suggestOpen && (
          <SuggestPanel
            profile={profile}
            premium={premium}
            suggestCount={suggestCount}
            atLimit={suggestAtLimit}
            existingProducts={products}
            onClose={() => setSuggestOpen(false)}
            onAddToCatalog={addSuggestionToCatalog}
            onAfterFetch={bumpSuggestCount}
          />
        )}

        {editing === null && shelfOpen && (
          <ShelfScanPanel
            user={user}
            premium={premium}
            visionCount={visionCount}
            atLimit={visionAtLimit}
            existingProducts={products}
            onClose={() => setShelfOpen(false)}
            onAddToCatalog={addSuggestionToCatalog}
            onAfterFetch={bumpVisionCount}
            onAtLimit={() => setShowUpgrade(true)}
          />
        )}

        {editing === null && ingredientsOpen && (
          <IngredientCheckPanel
            user={user}
            profile={profile}
            premium={premium}
            visionCount={visionCount}
            atLimit={visionAtLimit}
            onClose={() => setIngredientsOpen(false)}
            onAfterFetch={bumpVisionCount}
            onAtLimit={() => setShowUpgrade(true)}
          />
        )}

        {showUpgrade && <VisionUpgradeNudge onClose={() => setShowUpgrade(false)} />}

        {editing !== null && (
          <ProductForm
            draft={draft}
            setDraft={setDraft}
            saving={saving}
            onSave={save}
            onCancel={cancel}
            isNew={editing === 'new'}
            user={user}
            premium={premium}
            visionCount={visionCount}
            visionAtLimit={visionAtLimit}
            onAfterScan={bumpVisionCount}
            onAtLimit={() => setShowUpgrade(true)}
          />
        )}

        {loading ? (
          <p className="text-gray-500">Loading your catalog...</p>
        ) : products.length === 0 && editing === null ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
            <p className="text-gray-300 mb-2">No products yet ✨</p>
            <p className="text-gray-500 text-sm mb-6">Add the cleansers, serums, and creams you actually use, and you'll be able to link them to your routine.</p>
            <button
              onClick={startNew}
              className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg shadow-pink-500/20"
            >
              + Add your first product
            </button>
          </div>
        ) : (
          <>
            {categoriesInUse.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {categoriesInUse.map(c => (
                  <button
                    key={c}
                    onClick={() => setFilter(c)}
                    className={`text-xs px-3 py-1.5 rounded-full transition border ${
                      filter === c
                        ? 'bg-white/15 border-white/30 text-white'
                        : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visible.map(p => (
                <li key={p.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                  <ProductPhoto product={p} />
                  <div className="p-5 flex flex-col gap-2 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {p.brand && <p className="text-xs uppercase tracking-wide text-pink-300/80">{p.brand}</p>}
                        <p className="text-base font-semibold text-white break-words">{p.name}</p>
                      </div>
                      {p.category && (
                        <span className="flex-shrink-0 text-[10px] uppercase tracking-wide bg-purple-500/15 border border-purple-500/30 text-purple-200 px-2 py-1 rounded-full">
                          {p.category}
                        </span>
                      )}
                    </div>
                    {p.notes && <p className="text-sm text-gray-400 break-words whitespace-pre-wrap">{p.notes}</p>}
                    <div className="flex gap-3 mt-auto pt-3 border-t border-white/5 text-xs">
                      <button onClick={() => startEdit(p)} className="text-pink-300 hover:text-pink-200 transition">
                        Edit
                      </button>
                      <button onClick={() => remove(p.id)} className="text-gray-500 hover:text-rose-400 transition">
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {visible.length === 0 && (
              <p className="text-sm text-gray-500 text-center mt-6">No products in {filter}.</p>
            )}
          </>
        )}

      </div>
    </main>
  )
}

function ProductForm({ draft, setDraft, saving, onSave, onCancel, isNew, user, visionAtLimit, premium, visionCount, onAfterScan, onAtLimit }) {
  const set = (key) => (e) => setDraft({ ...draft, [key]: e.target.value })
  const setPhotoUrl = (url) => setDraft({ ...draft, photo_url: url })

  function applyScan(p) {
    const hasTyped = draft.brand || draft.name || draft.notes
    if (hasTyped && !confirm('Replace what you typed with what the AI read from the label?')) return
    setDraft({
      ...draft,
      brand: p.brand || draft.brand,
      name: p.name || draft.name,
      category: p.category || draft.category,
      notes: p.notes || draft.notes,
    })
    onAfterScan?.()
  }

  return (
    <div className="bg-white/5 border border-pink-500/20 rounded-2xl p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4 text-pink-300">{isNew ? 'Add product' : 'Edit product'}</h2>
      <PhotoPicker
        photoUrl={draft.photo_url}
        onChange={setPhotoUrl}
        userId={user?.id}
        scanEnabled={isNew}
        onScan={applyScan}
        atLimit={visionAtLimit}
        premium={premium}
        visionCount={visionCount}
        onAtLimit={onAtLimit}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Brand</span>
          <input
            value={draft.brand}
            onChange={set('brand')}
            placeholder="CeraVe, The Ordinary..."
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/30 transition"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400">Product name <span className="text-rose-400">*</span></span>
          <input
            value={draft.name}
            onChange={set('name')}
            placeholder="Hydrating Cleanser"
            required
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/30 transition"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-gray-400">Category / usage</span>
          <select
            value={draft.category}
            onChange={set('category')}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-pink-500/30 transition"
          >
            <option value="" className="bg-[#080808]">— pick one —</option>
            {PRODUCT_CATEGORIES.map(c => (
              <option key={c} value={c} className="bg-[#080808]">{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-gray-400">Notes</span>
          <textarea
            value={draft.notes}
            onChange={set('notes')}
            placeholder="How it feels, what it's for, ingredients to remember..."
            rows={3}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-pink-500/30 transition resize-none"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving || !draft.name.trim()}
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-6 py-2 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-pink-500/20"
        >
          {saving ? 'Saving...' : isNew ? 'Add product' : 'Save changes'}
        </button>
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-white transition">
          Cancel
        </button>
      </div>
    </div>
  )
}

function ShelfScanPanel({ user, premium, visionCount, atLimit, existingProducts, onClose, onAddToCatalog, onAfterFetch, onAtLimit }) {
  const [photoUrl, setPhotoUrl] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState({})  // index → boolean
  const [scanning, setScanning] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(0)

  const existingSet = new Set(
    existingProducts.map(p => `${(p.brand || '').toLowerCase()}|${(p.name || '').toLowerCase()}`)
  )

  async function scan() {
    if (atLimit) { onAtLimit?.(); return }
    if (!photoUrl) return
    setScanning(true)
    setError('')
    setResults([])
    setSelected({})
    setDone(0)
    try {
      const res = await fetch('/api/scan-shelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      const products = data.products || []
      setResults(products)
      const initial = {}
      products.forEach((p, i) => {
        const key = `${p.brand.toLowerCase()}|${p.name.toLowerCase()}`
        initial[i] = !existingSet.has(key)
      })
      setSelected(initial)
      onAfterFetch?.()
    } catch (err) {
      setError(err.message || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  async function addSelected() {
    setAdding(true)
    let added = 0
    for (let i = 0; i < results.length; i++) {
      if (!selected[i]) continue
      const created = await onAddToCatalog({ ...results[i], why: null })
      if (created) added++
    }
    setDone(added)
    setAdding(false)
  }

  const selectedCount = Object.values(selected).filter(Boolean).length

  return (
    <div className="relative bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-fuchsia-500/5 border border-purple-500/30 rounded-2xl p-6 mb-8 overflow-hidden">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              📸 Scan my shelf
            </h2>
            <p className="text-sm text-gray-400 mt-1">Take a wide photo of your products and we'll add them all at once.</p>
          </div>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-white transition">Close</button>
        </div>

        <div className="mt-5">
          <PhotoPicker photoUrl={photoUrl} onChange={setPhotoUrl} userId={user?.id} />
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {atLimit ? (
            <a href="/profile" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg shadow-pink-500/20">
              ✦ Daily limit hit — Upgrade
            </a>
          ) : (
            <button
              onClick={scan}
              disabled={scanning || !photoUrl}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-pink-500/20"
            >
              {scanning ? 'Reading shelf...' : results.length ? '↻ Scan again' : '✨ Identify products'}
            </button>
          )}
          {!premium && (
            <p className="text-xs text-gray-500">{Math.max(0, FREE_VISION_LIMIT - visionCount)} / {FREE_VISION_LIMIT} AI scans left today</p>
          )}
        </div>

        {error && <p className="text-xs text-rose-300 mt-3">{error}</p>}

        {results.length > 0 && (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              {results.map((p, i) => {
                const key = `${p.brand.toLowerCase()}|${p.name.toLowerCase()}`
                const inCatalog = existingSet.has(key)
                return (
                  <li key={i} className={`bg-white/5 border rounded-2xl p-4 transition ${selected[i] ? 'border-pink-500/40' : 'border-white/10'}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!selected[i]}
                        onChange={e => setSelected(s => ({ ...s, [i]: e.target.checked }))}
                        disabled={inCatalog}
                        className="mt-1 accent-pink-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wide text-pink-300/80">{p.brand}</p>
                        <p className="text-sm font-semibold text-white break-words">{p.name}</p>
                        <p className="text-[10px] text-gray-500 mt-1">{p.category}</p>
                        {inCatalog && <p className="text-[10px] text-emerald-300 mt-1">Already in your catalog</p>}
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>

            {done > 0 ? (
              <p className="text-sm text-emerald-300 mt-5">✓ Added {done} {done === 1 ? 'product' : 'products'} to your catalog.</p>
            ) : (
              <button
                onClick={addSelected}
                disabled={adding || selectedCount === 0}
                className="mt-5 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-pink-500/20"
              >
                {adding ? 'Adding...' : `+ Add ${selectedCount} to my catalog`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function IngredientCheckPanel({ user, profile, premium, visionCount, atLimit, onClose, onAfterFetch, onAtLimit }) {
  const [photoUrl, setPhotoUrl] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  async function check() {
    if (atLimit) { onAtLimit?.(); return }
    if (!photoUrl) return
    setScanning(true)
    setError('')
    setAnalysis(null)
    try {
      const res = await fetch('/api/check-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, concerns: profile?.concerns || [] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Check failed')
      setAnalysis(data)
      onAfterFetch?.()
    } catch (err) {
      setError(err.message || 'Check failed')
    } finally {
      setScanning(false)
    }
  }

  const goods = analysis?.ingredients.filter(i => i.status === 'good') || []
  const warnings = analysis?.ingredients.filter(i => i.status === 'warning') || []
  const neutrals = analysis?.ingredients.filter(i => i.status === 'neutral') || []
  const verdictMeta = {
    great_match: { label: 'Great match', color: 'from-emerald-400/30 to-emerald-500/20 border-emerald-400/40 text-emerald-200' },
    okay: { label: 'Worth considering', color: 'from-amber-400/30 to-amber-500/20 border-amber-400/40 text-amber-200' },
    risky: { label: 'Be careful', color: 'from-rose-400/30 to-rose-500/20 border-rose-400/40 text-rose-200' },
  }
  const verdict = analysis && verdictMeta[analysis.verdict]

  return (
    <div className="relative bg-gradient-to-br from-amber-400/10 via-pink-500/10 to-purple-500/5 border border-amber-400/30 rounded-2xl p-6 mb-8 overflow-hidden">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-white via-amber-200 to-pink-200 bg-clip-text text-transparent">
              🔍 Check ingredients
            </h2>
            <p className="text-sm text-gray-400 mt-1">Photograph the back-of-bottle ingredient list. We'll flag what's good or risky for your saved concerns.</p>
          </div>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-white transition">Close</button>
        </div>

        {!profile?.concerns?.length && (
          <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-300/30 rounded-lg p-3 mt-3">
            You haven't set any concerns on your profile yet — the analysis will be generic. Set concerns on the <a href="/profile" className="underline">profile page</a> for tailored flags.
          </p>
        )}

        <div className="mt-5">
          <PhotoPicker photoUrl={photoUrl} onChange={setPhotoUrl} userId={user?.id} />
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {atLimit ? (
            <a href="/profile" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg shadow-pink-500/20">
              ✦ Daily limit hit — Upgrade
            </a>
          ) : (
            <button
              onClick={check}
              disabled={scanning || !photoUrl}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-pink-500/20"
            >
              {scanning ? 'Reading label...' : analysis ? '↻ Check again' : '🔍 Analyze ingredients'}
            </button>
          )}
          {!premium && (
            <p className="text-xs text-gray-500">{Math.max(0, FREE_VISION_LIMIT - visionCount)} / {FREE_VISION_LIMIT} AI scans left today</p>
          )}
        </div>

        {error && <p className="text-xs text-rose-300 mt-3">{error}</p>}

        {analysis && (
          <div className="mt-6 flex flex-col gap-4">
            {verdict && (
              <div className={`bg-gradient-to-br ${verdict.color} border rounded-2xl p-4`}>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-1">{verdict.label}</p>
                <p className="text-sm text-white leading-relaxed">{analysis.summary}</p>
              </div>
            )}

            {goods.length > 0 && (
              <IngredientGroup title="Looks good for you" color="emerald" items={goods} />
            )}
            {warnings.length > 0 && (
              <IngredientGroup title="Watch out for" color="rose" items={warnings} />
            )}
            {neutrals.length > 0 && (
              <IngredientGroup title="Other ingredients of note" color="slate" items={neutrals} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function IngredientGroup({ title, color, items }) {
  const styles = {
    emerald: 'border-emerald-400/30 bg-emerald-500/5',
    rose: 'border-rose-400/30 bg-rose-500/5',
    slate: 'border-white/10 bg-white/5',
  }[color]
  const dot = {
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
    slate: 'bg-gray-400',
  }[color]
  return (
    <div className={`border rounded-2xl p-4 ${styles}`}>
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">{title}</p>
      <ul className="flex flex-col gap-2">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-3">
            <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0 mt-1.5`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{i.name}</p>
              {i.reason && <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{i.reason}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function VisionUpgradeNudge({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative bg-[#0e0e0e] border border-pink-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl shadow-pink-500/20">
        <span className="text-[10px] uppercase tracking-wider bg-gradient-to-r from-amber-400/30 to-pink-400/30 border border-amber-300/40 text-amber-200 px-2 py-0.5 rounded-full font-semibold">
          ✦ Premium
        </span>
        <h3 className="text-xl font-bold mt-3 mb-2 bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
          You've hit today's AI scan limit
        </h3>
        <p className="text-sm text-gray-400 mb-5">
          Free is capped at {FREE_VISION_LIMIT} AI photo scans per day (across label, shelf, and ingredient scans). Premium uncaps them all.
        </p>
        <div className="flex items-center gap-3">
          <a href="/profile" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2 rounded-full text-sm hover:opacity-90 transition shadow-lg shadow-pink-500/20">
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

function ProductPhoto({ product }) {
  if (product.photo_url) {
    return (
      <div className="aspect-[4/3] w-full bg-white/5 border-b border-white/10 overflow-hidden">
        <img
          src={product.photo_url}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
    )
  }
  // Initials fallback when no photo — uses brand+product first letters.
  const initials = (
    (product.brand?.[0] || '') + (product.name?.[0] || '')
  ).toUpperCase() || '✨'
  return (
    <div className="aspect-[4/3] w-full bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-amber-400/5 border-b border-white/10 flex items-center justify-center">
      <span className="text-5xl font-bold bg-gradient-to-r from-pink-200 via-purple-200 to-amber-200 bg-clip-text text-transparent">
        {initials}
      </span>
    </div>
  )
}

function PhotoPicker({ photoUrl, onChange, userId, scanEnabled, onScan, atLimit, premium, visionCount, onAtLimit }) {
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''   // allow re-picking the same file later
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
      const url = await uploadProductPhoto(file, userId)
      onChange(url)
    } catch (err) {
      console.error(err)
      setError('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  async function scan() {
    if (atLimit) { onAtLimit?.(); return }
    if (!photoUrl) return
    setError('')
    setScanning(true)
    try {
      const res = await fetch('/api/scan-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      onScan?.(data.product)
    } catch (err) {
      setError(err.message || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="mb-5">
      <p className="text-xs text-gray-400 mb-2">Photo</p>
      {photoUrl ? (
        <div className="flex items-start gap-4">
          <img
            src={photoUrl}
            alt="Product"
            className="w-28 h-28 rounded-2xl object-cover border border-white/10 bg-white/5"
          />
          <div className="flex flex-col gap-2 mt-1 min-w-0">
            {scanEnabled && (
              <button
                type="button"
                onClick={scan}
                disabled={scanning || uploading}
                className="self-start bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition disabled:opacity-40 shadow-md shadow-pink-500/20"
              >
                {scanning ? 'Reading label...' : atLimit ? '✦ Daily limit — Upgrade' : '✨ Scan label with AI'}
              </button>
            )}
            <label className="cursor-pointer text-xs text-pink-300 hover:text-pink-200 transition">
              {uploading ? 'Uploading...' : 'Replace photo'}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            <label className="cursor-pointer text-xs text-pink-300 hover:text-pink-200 transition">
              {uploading ? '...' : '📷 Take new photo'}
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs text-gray-500 hover:text-rose-300 transition text-left"
              disabled={uploading}
            >
              Remove photo
            </button>
            {scanEnabled && !premium && (
              <p className="text-[10px] text-gray-500">{Math.max(0, FREE_VISION_LIMIT - visionCount)} / {FREE_VISION_LIMIT} AI scans left today</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <label className={`cursor-pointer flex-1 min-w-[140px] flex items-center justify-center gap-2 border border-dashed rounded-2xl py-6 text-sm transition ${
            uploading ? 'border-white/10 text-gray-500' : 'border-white/20 text-gray-400 hover:border-pink-500/40 hover:text-white'
          }`}>
            <span className="text-lg">🖼️</span>
            <span>{uploading ? 'Uploading...' : 'Choose photo'}</span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
          <label className={`cursor-pointer flex-1 min-w-[140px] flex items-center justify-center gap-2 border border-dashed rounded-2xl py-6 text-sm transition ${
            uploading ? 'border-white/10 text-gray-500' : 'border-white/20 text-gray-400 hover:border-pink-500/40 hover:text-white'
          }`}>
            <span className="text-lg">📷</span>
            <span>{uploading ? 'Uploading...' : 'Take photo'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}
      {error && <p className="text-xs text-rose-300 mt-2">{error}</p>}
    </div>
  )
}

const BUDGETS = [
  { key: 'drugstore', label: 'Drugstore', hint: 'Under $25 per product' },
  { key: 'mid', label: 'Mid-range', hint: '$25 – $60' },
  { key: 'splurge', label: 'Splurge', hint: '$60+' },
]

function SuggestPanel({ profile, premium, suggestCount, atLimit, existingProducts, onClose, onAddToCatalog, onAfterFetch }) {
  const [budget, setBudget] = useState('drugstore')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addedIds, setAddedIds] = useState({})  // suggestion index → product id once added

  const existingNames = new Set(
    existingProducts.map(p => `${(p.brand || '').toLowerCase()}|${(p.name || '').toLowerCase()}`)
  )

  async function fetchSuggestions() {
    if (atLimit) return
    setLoading(true)
    setError('')
    setSuggestions([])
    setAddedIds({})
    try {
      const res = await fetch('/api/suggest-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skinType: profile?.skin_type || 'unsure',
          ageRange: profile?.age_range,
          concerns: profile?.concerns || [],
          budget,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSuggestions(data.products || [])
      onAfterFetch?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function add(idx, suggestion) {
    const created = await onAddToCatalog(suggestion)
    if (created) setAddedIds(prev => ({ ...prev, [idx]: created.id }))
  }

  return (
    <div className="relative bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-amber-400/5 border border-pink-500/30 rounded-2xl p-6 mb-8 overflow-hidden">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
              ✨ Pick products for me
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              We'll match real products to your skin type, age, and concerns from your profile.
            </p>
          </div>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-white transition">Close</button>
        </div>

        {!profile?.skin_type && !profile?.concerns?.length && (
          <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-300/30 rounded-lg p-3 mt-3">
            Heads up — your profile doesn't have a skin type or concerns yet, so suggestions will be generic. Set them on the <a href="/profile" className="underline">profile page</a> for better results.
          </p>
        )}

        {/* Budget pills */}
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-pink-300/70 mb-2">Budget</p>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map(b => (
              <button
                key={b.key}
                onClick={() => setBudget(b.key)}
                className={`text-left px-4 py-2 rounded-2xl border transition ${
                  budget === b.key
                    ? 'bg-pink-500/15 border-pink-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                }`}
              >
                <p className="text-sm font-semibold">{b.label}</p>
                <p className="text-[10px] text-gray-500">{b.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          {atLimit ? (
            <a
              href="/profile"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg shadow-pink-500/20"
            >
              ✦ Daily limit hit — Upgrade
            </a>
          ) : (
            <button
              onClick={fetchSuggestions}
              disabled={loading}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-pink-500/20"
            >
              {loading ? 'Thinking...' : suggestions.length ? '↻ Try again' : '✨ Suggest 4 products'}
            </button>
          )}
          {!premium && (
            <p className="text-xs text-gray-500">
              {Math.max(0, FREE_SUGGEST_LIMIT - suggestCount)} / {FREE_SUGGEST_LIMIT} suggestions left today
            </p>
          )}
        </div>

        {error && <p className="text-xs text-rose-300 mt-3">{error}</p>}

        {suggestions.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {suggestions.map((s, i) => {
              const alreadyOwn = existingNames.has(`${(s.brand || '').toLowerCase()}|${(s.name || '').toLowerCase()}`)
              const added = !!addedIds[i]
              return (
                <li key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {s.brand && <p className="text-[10px] uppercase tracking-wide text-pink-300/80">{s.brand}</p>}
                      <p className="text-sm font-semibold text-white break-words">{s.name}</p>
                    </div>
                    {s.category && (
                      <span className="flex-shrink-0 text-[10px] uppercase tracking-wide bg-purple-500/15 border border-purple-500/30 text-purple-200 px-2 py-1 rounded-full">
                        {s.category}
                      </span>
                    )}
                  </div>
                  {s.why && <p className="text-xs text-gray-400 leading-relaxed">{s.why}</p>}
                  <div className="mt-1 pt-3 border-t border-white/5">
                    {added ? (
                      <span className="text-xs text-emerald-300">✓ Added to your catalog</span>
                    ) : alreadyOwn ? (
                      <span className="text-xs text-gray-500">Already in your catalog</span>
                    ) : (
                      <button
                        onClick={() => add(i, s)}
                        className="text-xs text-pink-300 hover:text-pink-200 transition"
                      >
                        + Add to my catalog
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
