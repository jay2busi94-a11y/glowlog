'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { PRODUCT_CATEGORIES, productLabel } from '../../lib/catalog'
import { toLocalDateString } from '../../lib/dates'
import { isPremium, FREE_SUGGEST_LIMIT, getSuggestCountToday, incrementSuggestCountToday, FREE_VISION_LIMIT, getVisionCountToday, incrementVisionCountToday } from '../../lib/profile'
import { routinesFromRow, addProductToRoutine, removeProductFromRoutine, findProductInRoutines, stepInfoKeyForCategory, newRoutineId } from '../../lib/routine'
import { getStepInfo } from '../../lib/step_info'
import { ikProductCard, ikProductDetail } from '../../lib/imagekit'

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
  const [batchOpen, setBatchOpen] = useState(false)
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [visionCount, setVisionCount] = useState(0)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [routines, setRoutines] = useState([])
  const [openProductId, setOpenProductId] = useState(null)
  const [showUnusedOnly, setShowUnusedOnly] = useState(false)

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
      const [productsRes, profileRes, routinesRes] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('routines').select('data, morning_steps, night_steps').eq('user_id', user.id).maybeSingle(),
      ])
      setProducts(productsRes.data || [])
      setProfile(profileRes.data)
      setRoutines(routinesFromRow(routinesRes.data))
      setLoading(false)
    })
  }, [])

  // ── Routine-linking ─────────────────────────────────────────────────
  async function saveRoutines(nextRoutines) {
    if (!user) return
    setRoutines(nextRoutines)
    const supabase = createClient()
    await supabase.from('routines').upsert(
      { user_id: user.id, data: nextRoutines, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  }

  async function linkProductToRoutine(routineId, product) {
    let target = routines.find(r => r.id === routineId)
    let next
    if (!target) {
      // Create a routine on the fly if the user doesn't have a morning/night yet.
      const defaults = routineId === 'morning'
        ? { id: 'morning', name: 'Morning Routine', emoji: '☀️', steps: [] }
        : routineId === 'night'
          ? { id: 'night', name: 'Night Routine', emoji: '🌙', steps: [] }
          : { id: newRoutineId(), name: 'My Routine', emoji: '🧴', steps: [] }
      target = addProductToRoutine(defaults, product)
      next = [...routines, target]
    } else {
      const updated = addProductToRoutine(target, product)
      next = routines.map(r => r.id === routineId ? updated : r)
    }
    await saveRoutines(next)
  }

  async function unlinkProductFromAllRoutines(product) {
    const next = routines.map(r => removeProductFromRoutine(r, product.id))
    await saveRoutines(next)
  }

  // ── Used/unused stats ───────────────────────────────────────────────
  const linkedProductIds = new Set()
  for (const r of routines) {
    for (const s of (r.steps || [])) {
      if (s?.productId) linkedProductIds.add(s.productId)
    }
  }
  const inUseCount = products.filter(p => linkedProductIds.has(p.id)).length
  const unusedCount = products.length - inUseCount

  // Low-level insert used by every "add to catalog" surface (suggestions,
  // shelf scan, batch scan, brand discover). Accepts a full record so each
  // caller can pass exactly what they have.
  async function insertProductRecord({ brand, name, category, notes, photo_url }) {
    if (!user || !name) return null
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      brand: brand || null,
      name,
      category: category || null,
      notes: notes || null,
      photo_url: photo_url || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('products').insert(payload).select().single()
    if (!error && data) {
      setProducts(prev => [data, ...prev])
      return data
    }
    return null
  }

  // Used by SuggestPanel + Discover + ShelfScanPanel — they pass `why` as
  // notes. Keeps their call sites unchanged.
  function addSuggestionToCatalog(suggestion) {
    return insertProductRecord({
      brand: suggestion.brand,
      name: suggestion.name,
      category: suggestion.category,
      notes: suggestion.why,
    })
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

  let visible = filter === 'All' ? products : products.filter(p => p.category === filter)
  if (showUnusedOnly) visible = visible.filter(p => !linkedProductIds.has(p.id))
  const categoriesInUse = ['All', ...PRODUCT_CATEGORIES.filter(c => products.some(p => p.category === c))]

  const openProduct = openProductId ? products.find(p => p.id === openProductId) : null
  const openProductUsage = openProduct ? findProductInRoutines(routines, openProduct.id) : []

  async function updateProductFields(id, patch) {
    const supabase = createClient()
    const { data } = await supabase.from('products').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (data) setProducts(prev => prev.map(p => p.id === id ? data : p))
    return data
  }

  return (
    <main className="min-h-screen bg-paper text-ink px-4 app-page-pad-bottom overflow-hidden">
      <AppNavbar />

      <div className="relative z-10 max-w-4xl mx-auto app-page-pad-top">

        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold mb-2">Your Catalog 🧴</h1>
            <p className="text-ink-mute">Track every product you own. Link them to routine steps to remember what works.</p>
          </div>
          {editing === null && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setBatchOpen(v => !v)}
                className={`border text-sm px-4 py-2.5 rounded-full transition flex items-center gap-2 ${
                  batchOpen
                    ? 'bg-card border-rule text-ink'
                    : 'border-accent text-accent hover:bg-accent/10'
                }`}
              >
                <span>📦</span>
                <span>Batch scan</span>
              </button>
              <button
                onClick={() => setShelfOpen(v => !v)}
                className={`border text-sm px-4 py-2.5 rounded-full transition flex items-center gap-2 ${
                  shelfOpen
                    ? 'bg-card border-rule text-ink'
                    : 'border-accent text-accent hover:bg-accent/10'
                }`}
              >
                <span>📸</span>
                <span>Scan my shelf</span>
              </button>
              <button
                onClick={() => setIngredientsOpen(v => !v)}
                className={`border text-sm px-4 py-2.5 rounded-full transition flex items-center gap-2 ${
                  ingredientsOpen
                    ? 'bg-card border-rule text-ink'
                    : 'border-accent text-accent hover:bg-accent/10'
                }`}
              >
                <span>🔍</span>
                <span>Check ingredients</span>
              </button>
              <button
                onClick={() => setSuggestOpen(v => !v)}
                className={`border text-sm px-4 py-2.5 rounded-full transition flex items-center gap-2 ${
                  suggestOpen
                    ? 'bg-card border-rule text-ink'
                    : 'border-accent text-accent hover:bg-accent/10'
                }`}
              >
                <span>✨</span>
                <span>Suggest for me</span>
              </button>
              <button
                onClick={startNew}
                className="bg-accent text-paper font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg"
              >
                + Add product
              </button>
            </div>
          )}
        </div>

        {/* Overview stats — your inventory at a glance */}
        {editing === null && !loading && products.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button
              onClick={() => setShowUnusedOnly(false)}
              className={`text-left bg-card border rounded-card p-4 transition ${
                !showUnusedOnly ? 'border-accent' : 'border-rule hover:border-ink-mute'
              }`}
            >
              <p className="text-2xl font-bold text-ink">{products.length}</p>
              <p className="text-xs text-ink-mute">Owned</p>
            </button>
            <div className="bg-card border border-rule rounded-card p-4">
              <p className="text-2xl font-bold text-ink">{inUseCount}</p>
              <p className="text-xs text-ink-mute">In active use</p>
            </div>
            <button
              onClick={() => setShowUnusedOnly(true)}
              disabled={unusedCount === 0}
              className={`text-left bg-card border rounded-card p-4 transition disabled:opacity-50 ${
                showUnusedOnly ? 'border-rule' : 'border-rule hover:border-ink-mute'
              }`}
            >
              <p className="text-2xl font-bold text-ink">{unusedCount}</p>
              <p className="text-xs text-ink-mute flex items-center gap-1">
                Unused
                {showUnusedOnly && <span className="text-ink">· filtering</span>}
              </p>
            </button>
          </div>
        )}

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

        {editing === null && batchOpen && (
          <BatchScanPanel
            user={user}
            premium={premium}
            visionCount={visionCount}
            atLimit={visionAtLimit}
            onClose={() => setBatchOpen(false)}
            onInsertProduct={insertProductRecord}
            onAfterScan={bumpVisionCount}
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

        {openProduct && (
          <ProductDetailModal
            product={openProduct}
            profile={profile}
            premium={premium}
            suggestCount={suggestCount}
            suggestAtLimit={suggestAtLimit}
            usage={openProductUsage}
            onClose={() => setOpenProductId(null)}
            onLinkToRoutine={linkProductToRoutine}
            onUnlink={unlinkProductFromAllRoutines}
            onUpdateProduct={updateProductFields}
            onAfterTip={bumpSuggestCount}
            onAtLimit={() => setShowUpgrade(true)}
          />
        )}

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
          <p className="text-ink-mute">Loading your catalog...</p>
        ) : products.length === 0 && editing === null ? (
          <div className="bg-card border border-rule rounded-card p-10 text-center">
            <p className="text-ink mb-2">No products yet ✨</p>
            <p className="text-ink-mute text-sm mb-6">Add the cleansers, serums, and creams you actually use, and you'll be able to link them to your routine.</p>
            <button
              onClick={startNew}
              className="inline-block bg-accent text-paper font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg"
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
                        ? 'bg-card border-rule text-ink'
                        : 'border-rule text-ink-mute hover:text-ink hover:border-ink-mute'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visible.map(p => {
                const inUse = linkedProductIds.has(p.id)
                return (
                  <li key={p.id} className="bg-card border border-rule rounded-card overflow-hidden flex flex-col">
                    <ProductPhoto product={p} />
                    <div className="p-5 flex flex-col gap-2 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {p.brand && <p className="text-xs uppercase tracking-wide text-ink-mute">{p.brand}</p>}
                          <p className="text-base font-semibold text-ink break-words">{p.name}</p>
                        </div>
                        {p.category && (
                          <span className="flex-shrink-0 text-[10px] uppercase tracking-wide bg-accent/10 border border-accent text-ink-mute px-2 py-1 rounded-full">
                            {p.category}
                          </span>
                        )}
                      </div>
                      {!inUse && (
                        <p className="text-[10px] uppercase tracking-wider text-ink">Not in any routine yet</p>
                      )}
                      {p.notes && <p className="text-sm text-ink-mute break-words whitespace-pre-wrap line-clamp-2">{p.notes}</p>}
                      <button
                        onClick={() => setOpenProductId(p.id)}
                        className="self-start mt-1 text-xs bg-card border border-rule text-ink hover:border-accent hover:text-accent px-3 py-1.5 rounded-full transition"
                      >
                        How to use →
                      </button>
                      <div className="flex gap-3 mt-auto pt-3 border-t border-rule text-xs">
                        <button onClick={() => startEdit(p)} className="text-accent hover:underline transition">
                          Edit
                        </button>
                        <button onClick={() => remove(p.id)} className="text-ink-mute hover:text-warn transition">
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {visible.length === 0 && (
              <p className="text-sm text-ink-mute text-center mt-6">No products in {filter}.</p>
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
    <div className="bg-card border border-accent rounded-card p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4 text-ink">{isNew ? 'Add product' : 'Edit product'}</h2>
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
          <span className="text-xs text-ink-mute">Brand</span>
          <input
            value={draft.brand}
            onChange={set('brand')}
            placeholder="CeraVe, The Ordinary..."
            className="bg-card border border-rule rounded-xl px-4 py-2 text-ink placeholder-ink-mute text-sm focus:outline-none focus:border-accent transition"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-mute">Product name <span className="text-warn">*</span></span>
          <input
            value={draft.name}
            onChange={set('name')}
            placeholder="Hydrating Cleanser"
            required
            className="bg-card border border-rule rounded-xl px-4 py-2 text-ink placeholder-ink-mute text-sm focus:outline-none focus:border-accent transition"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-ink-mute">Category / usage</span>
          <select
            value={draft.category}
            onChange={set('category')}
            className="bg-card border border-rule rounded-xl px-4 py-2 text-ink text-sm focus:outline-none focus:border-accent transition"
          >
            <option value="" className="bg-paper">— pick one —</option>
            {PRODUCT_CATEGORIES.map(c => (
              <option key={c} value={c} className="bg-paper">{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-ink-mute">Notes</span>
          <textarea
            value={draft.notes}
            onChange={set('notes')}
            placeholder="How it feels, what it's for, ingredients to remember..."
            rows={3}
            className="bg-card border border-rule rounded-xl px-4 py-2 text-ink placeholder-ink-mute text-sm focus:outline-none focus:border-accent transition resize-none"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving || !draft.name.trim()}
          className="bg-accent text-paper font-semibold px-6 py-2 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg"
        >
          {saving ? 'Saving...' : isNew ? 'Add product' : 'Save changes'}
        </button>
        <button onClick={onCancel} className="text-sm text-ink-mute hover:text-ink transition">
          Cancel
        </button>
      </div>
    </div>
  )
}

function BatchScanPanel({ user, premium, visionCount, atLimit, onClose, onInsertProduct, onAfterScan, onAtLimit }) {
  const [items, setItems] = useState([])  // { id, photoUrl, status, brand, name, category, notes, confidence, error }
  const [busy, setBusy] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    if (atLimit) { onAtLimit?.(); return }
    if (!file.type.startsWith('image/')) {
      setError('Please pick an image file.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('That image is over 8 MB — try a smaller one.')
      return
    }
    setError('')
    setBusy(true)
    const tempId = crypto.randomUUID()
    let photoUrl
    try {
      photoUrl = await uploadProductPhoto(file, user.id)
    } catch (err) {
      setError('Upload failed. Try again.')
      setBusy(false)
      return
    }
    // Add placeholder while the scan resolves so the user sees progress.
    setItems(prev => [...prev, {
      id: tempId, photoUrl, status: 'scanning',
      brand: '', name: '', category: '', notes: '', confidence: 'low',
    }])
    try {
      const res = await fetch('/api/scan-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')
      onAfterScan?.()
      setItems(prev => prev.map(it => it.id === tempId
        ? { ...it, status: 'ready', brand: data.product.brand, name: data.product.name, category: data.product.category, notes: data.product.notes, confidence: data.product.confidence }
        : it))
    } catch (err) {
      setItems(prev => prev.map(it => it.id === tempId
        ? { ...it, status: 'failed', error: err.message || 'Scan failed' }
        : it))
    } finally {
      setBusy(false)
    }
  }

  function updateItem(id, patch) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }
  function removeItem(id) {
    setItems(prev => prev.filter(it => it.id !== id))
  }

  async function commitAll() {
    const ready = items.filter(it => (it.status === 'ready' || it.status === 'edited') && it.name.trim())
    if (!ready.length) return
    setCommitting(true)
    let count = 0
    for (const it of ready) {
      const created = await onInsertProduct({
        brand: it.brand,
        name: it.name,
        category: it.category,
        notes: it.notes,
        photo_url: it.photoUrl,
      })
      if (created) count++
    }
    setSavedCount(count)
    setCommitting(false)
    // Mark saved items so the user can keep adding without duplicating.
    setItems(prev => prev.map(it =>
      ready.find(r => r.id === it.id) ? { ...it, status: 'saved' } : it
    ))
  }

  const readyCount = items.filter(it => (it.status === 'ready' || it.status === 'edited') && it.name.trim()).length

  return (
    <div className="relative bg-accent/10 border border-accent rounded-card p-6 mb-8 overflow-hidden">
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-ink">
              📦 Batch scan
            </h2>
            <p className="text-sm text-ink-mute mt-1">
              Snap one product after another. We scan each as you go — review and save them all at the end.
            </p>
          </div>
          <button onClick={onClose} className="text-xs text-ink-mute hover:text-ink transition">Close</button>
        </div>

        {/* Primary action — keeps the camera button big and obvious */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={`cursor-pointer flex items-center justify-center gap-2 border rounded-card py-5 text-sm font-semibold transition ${
            busy || atLimit ? 'border-rule text-ink-mute' : 'border-accent bg-accent/10 text-accent hover:bg-accent/20'
          }`}>
            <span className="text-2xl">📷</span>
            <span>{busy ? 'Scanning...' : atLimit ? '✦ Limit hit' : 'Snap next product'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" disabled={busy || atLimit} />
          </label>
          <label className={`cursor-pointer flex items-center justify-center gap-2 border border-dashed rounded-card py-5 text-sm transition ${
            busy || atLimit ? 'border-rule text-ink-mute' : 'border-rule text-ink-mute hover:border-accent hover:text-ink'
          }`}>
            <span className="text-2xl">🖼️</span>
            <span>{busy ? '...' : 'Or pick from library'}</span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={busy || atLimit} />
          </label>
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap text-xs">
          {!premium && (
            <p className="text-ink-mute">{Math.max(0, FREE_VISION_LIMIT - visionCount)} / {FREE_VISION_LIMIT} AI scans left today</p>
          )}
          {items.length > 0 && (
            <p className="text-ink-mute">
              {items.length} {items.length === 1 ? 'item' : 'items'} scanned · {readyCount} ready to save
            </p>
          )}
        </div>

        {error && <p className="text-xs text-warn mt-3">{error}</p>}

        {/* Scanned items list */}
        {items.length > 0 && (
          <ul className="flex flex-col gap-3 mt-6">
            {items.map(it => (
              <BatchScanRow
                key={it.id}
                item={it}
                onChange={(patch) => updateItem(it.id, { ...patch, status: it.status === 'saved' ? 'saved' : 'edited' })}
                onRemove={() => removeItem(it.id)}
              />
            ))}
          </ul>
        )}

        {/* Save / saved feedback */}
        {readyCount > 0 && (
          <button
            onClick={commitAll}
            disabled={committing}
            className="mt-6 bg-accent text-paper font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg"
          >
            {committing ? 'Saving...' : `+ Save ${readyCount} to my catalog`}
          </button>
        )}
        {savedCount > 0 && (
          <p className="text-sm text-ok mt-3">
            ✓ Added {savedCount} {savedCount === 1 ? 'product' : 'products'}. Keep snapping or close the panel.
          </p>
        )}
      </div>
    </div>
  )
}

function BatchScanRow({ item, onChange, onRemove }) {
  const isSaving = item.status === 'scanning'
  const isFailed = item.status === 'failed'
  const isSaved = item.status === 'saved'

  return (
    <li className={`bg-card border rounded-card p-3 flex gap-3 ${
      isFailed ? 'border-warn' : isSaved ? 'border-ok' : 'border-rule'
    }`}>
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-card border border-rule">
        <img src={item.photoUrl} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        {isSaving ? (
          <p className="text-xs text-ink-mute mt-6">✨ Reading label...</p>
        ) : isFailed ? (
          <div>
            <p className="text-xs text-warn">Scan failed: {item.error}</p>
            <button onClick={onRemove} className="text-xs text-ink-mute hover:text-warn transition mt-2">Remove</button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input
                value={item.brand}
                onChange={e => onChange({ brand: e.target.value })}
                placeholder="Brand"
                disabled={isSaved}
                className="flex-1 min-w-0 bg-card border border-rule rounded-lg px-2 py-1 text-xs text-ink placeholder-ink-mute focus:outline-none focus:border-accent disabled:opacity-60"
              />
              <select
                value={item.category}
                onChange={e => onChange({ category: e.target.value })}
                disabled={isSaved}
                className="w-28 bg-card border border-rule rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:border-accent disabled:opacity-60"
              >
                <option value="" className="bg-paper">—</option>
                {PRODUCT_CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-paper">{c}</option>
                ))}
              </select>
            </div>
            <input
              value={item.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder="Product name"
              disabled={isSaved}
              className="bg-card border border-rule rounded-lg px-2 py-1 text-xs text-ink placeholder-ink-mute focus:outline-none focus:border-accent disabled:opacity-60"
            />
            <textarea
              value={item.notes}
              onChange={e => onChange({ notes: e.target.value })}
              placeholder="Notes / ingredients"
              rows={1}
              disabled={isSaved}
              className="bg-card border border-rule rounded-lg px-2 py-1 text-xs text-ink placeholder-ink-mute focus:outline-none focus:border-accent resize-none disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="text-[10px] text-ink-mute">
                {isSaved ? '✓ Saved' : item.confidence === 'high' ? 'High confidence' : item.confidence === 'medium' ? 'Edit before saving' : 'Low confidence — check fields'}
              </span>
              {!isSaved && (
                <button onClick={onRemove} className="text-[10px] text-ink-mute hover:text-warn transition">Remove</button>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
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
    <div className="relative bg-accent/10 border border-accent rounded-card p-6 mb-8 overflow-hidden">
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-ink">
              📸 Scan my shelf
            </h2>
            <p className="text-sm text-ink-mute mt-1">Take a wide photo of your products and we'll add them all at once.</p>
          </div>
          <button onClick={onClose} className="text-xs text-ink-mute hover:text-ink transition">Close</button>
        </div>

        <div className="mt-5">
          <PhotoPicker photoUrl={photoUrl} onChange={setPhotoUrl} userId={user?.id} />
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {atLimit ? (
            <a href="/profile" className="bg-accent text-paper font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg">
              ✦ Daily limit hit — Upgrade
            </a>
          ) : (
            <button
              onClick={scan}
              disabled={scanning || !photoUrl}
              className="bg-accent text-paper font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg"
            >
              {scanning ? 'Reading shelf...' : results.length ? '↻ Scan again' : '✨ Identify products'}
            </button>
          )}
          {!premium && (
            <p className="text-xs text-ink-mute">{Math.max(0, FREE_VISION_LIMIT - visionCount)} / {FREE_VISION_LIMIT} AI scans left today</p>
          )}
        </div>

        {error && <p className="text-xs text-warn mt-3">{error}</p>}

        {results.length > 0 && (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              {results.map((p, i) => {
                const key = `${p.brand.toLowerCase()}|${p.name.toLowerCase()}`
                const inCatalog = existingSet.has(key)
                return (
                  <li key={i} className={`bg-card border rounded-card p-4 transition ${selected[i] ? 'border-accent' : 'border-rule'}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!selected[i]}
                        onChange={e => setSelected(s => ({ ...s, [i]: e.target.checked }))}
                        disabled={inCatalog}
                        className="mt-1 accent-accent"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wide text-ink-mute">{p.brand}</p>
                        <p className="text-sm font-semibold text-ink break-words">{p.name}</p>
                        <p className="text-[10px] text-ink-mute mt-1">{p.category}</p>
                        {inCatalog && <p className="text-[10px] text-ok mt-1">Already in your catalog</p>}
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>

            {done > 0 ? (
              <p className="text-sm text-ok mt-5">✓ Added {done} {done === 1 ? 'product' : 'products'} to your catalog.</p>
            ) : (
              <button
                onClick={addSelected}
                disabled={adding || selectedCount === 0}
                className="mt-5 bg-accent text-paper font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg"
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
    great_match: { label: 'Great match', color: 'bg-ok/10 border-ok text-ok' },
    okay: { label: 'Worth considering', color: 'bg-card border-rule text-ink' },
    risky: { label: 'Be careful', color: 'bg-warn/10 border-warn text-warn' },
  }
  const verdict = analysis && verdictMeta[analysis.verdict]

  return (
    <div className="relative bg-accent/10 border border-rule rounded-card p-6 mb-8 overflow-hidden">
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-ink">
              🔍 Check ingredients
            </h2>
            <p className="text-sm text-ink-mute mt-1">Photograph the back-of-bottle ingredient list. We'll flag what's good or risky for your saved concerns.</p>
          </div>
          <button onClick={onClose} className="text-xs text-ink-mute hover:text-ink transition">Close</button>
        </div>

        {!profile?.concerns?.length && (
          <p className="text-xs text-ink bg-card border border-rule rounded-lg p-3 mt-3">
            You haven't set any concerns on your profile yet — the analysis will be generic. Set concerns on the <a href="/profile" className="underline">profile page</a> for tailored flags.
          </p>
        )}

        <div className="mt-5">
          <PhotoPicker photoUrl={photoUrl} onChange={setPhotoUrl} userId={user?.id} />
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {atLimit ? (
            <a href="/profile" className="bg-accent text-paper font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg">
              ✦ Daily limit hit — Upgrade
            </a>
          ) : (
            <button
              onClick={check}
              disabled={scanning || !photoUrl}
              className="bg-accent text-paper font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg"
            >
              {scanning ? 'Reading label...' : analysis ? '↻ Check again' : '🔍 Analyze ingredients'}
            </button>
          )}
          {!premium && (
            <p className="text-xs text-ink-mute">{Math.max(0, FREE_VISION_LIMIT - visionCount)} / {FREE_VISION_LIMIT} AI scans left today</p>
          )}
        </div>

        {error && <p className="text-xs text-warn mt-3">{error}</p>}

        {analysis && (
          <div className="mt-6 flex flex-col gap-4">
            {verdict && (
              <div className={`${verdict.color} border rounded-card p-4`}>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-1">{verdict.label}</p>
                <p className="text-sm text-ink leading-relaxed">{analysis.summary}</p>
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
            {/* The disclaimer belongs next to the advice, not in section 2 of
                the terms. This is the most advice-shaped output in the app. */}
            <p className="text-xs text-ink-mute mt-1">
              General guidance, not medical advice. If a product stings, burns, or causes a reaction, stop
              using it and speak to a pharmacist or dermatologist.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function IngredientGroup({ title, color, items }) {
  const styles = {
    emerald: 'border-ok bg-ok/10',
    rose: 'border-warn bg-warn/10',
    slate: 'border-rule bg-card',
  }[color]
  // Solid, not a wash — these are small status dots against a tinted panel.
  // The blanket colour migration mapped every bg-<colour> to a 10% tint,
  // which is right for a panel background and invisible on a 6px dot.
  const dot = {
    emerald: 'bg-ok',
    rose: 'bg-warn',
    slate: 'bg-ink-mute',
  }[color]
  return (
    <div className={`border rounded-card p-4 ${styles}`}>
      <p className="text-xs uppercase tracking-wide text-ink-mute mb-3">{title}</p>
      <ul className="flex flex-col gap-2">
        {items.map((i, idx) => (
          <li key={idx} className="flex gap-3">
            <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0 mt-1.5`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{i.name}</p>
              {i.reason && <p className="text-xs text-ink-mute leading-relaxed mt-0.5">{i.reason}</p>}
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
      <div onClick={(e) => e.stopPropagation()} className="relative bg-card border border-accent rounded-card w-full max-w-sm p-6 shadow-2xl">
        <span className="text-[10px] uppercase tracking-wider bg-accent/10 border border-rule text-ink px-2 py-0.5 rounded-full font-semibold">
          ✦ Premium
        </span>
        <h3 className="text-xl font-bold mt-3 mb-2 text-ink">
          You've hit today's AI scan limit
        </h3>
        <p className="text-sm text-ink-mute mb-5">
          Free is capped at {FREE_VISION_LIMIT} AI photo scans per day (across label, shelf, and ingredient scans). Premium uncaps them all.
        </p>
        <div className="flex items-center gap-3">
          <a href="/profile" className="bg-accent text-paper font-semibold px-5 py-2 rounded-full text-sm hover:opacity-90 transition shadow-lg">
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

function ProductPhoto({ product }) {
  if (product.photo_url) {
    return (
      <div className="aspect-[4/3] w-full bg-card border-b border-rule overflow-hidden">
        <img
          src={ikProductCard(product.photo_url)}
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
    <div className="aspect-[4/3] w-full bg-accent/10 border-b border-rule flex items-center justify-center">
      <span className="text-5xl font-bold text-ink">
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
      <p className="text-xs text-ink-mute mb-2">Photo</p>
      {photoUrl ? (
        <div className="flex items-start gap-4">
          <img
            src={photoUrl}
            alt="Product"
            className="w-28 h-28 rounded-card object-cover border border-rule bg-card"
          />
          <div className="flex flex-col gap-2 mt-1 min-w-0">
            {scanEnabled && (
              <button
                type="button"
                onClick={scan}
                disabled={scanning || uploading}
                className="self-start bg-accent text-paper text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition disabled:opacity-40 shadow-md"
              >
                {scanning ? 'Reading label...' : atLimit ? '✦ Daily limit — Upgrade' : '✨ Scan label with AI'}
              </button>
            )}
            <label className="cursor-pointer text-xs text-accent hover:underline transition">
              {uploading ? 'Uploading...' : 'Replace photo'}
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            <label className="cursor-pointer text-xs text-accent hover:underline transition">
              {uploading ? '...' : '📷 Take new photo'}
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs text-ink-mute hover:text-warn transition text-left"
              disabled={uploading}
            >
              Remove photo
            </button>
            {scanEnabled && !premium && (
              <p className="text-[10px] text-ink-mute">{Math.max(0, FREE_VISION_LIMIT - visionCount)} / {FREE_VISION_LIMIT} AI scans left today</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <label className={`cursor-pointer flex-1 min-w-[140px] flex items-center justify-center gap-2 border border-dashed rounded-card py-6 text-sm transition ${
            uploading ? 'border-rule text-ink-mute' : 'border-rule text-ink-mute hover:border-accent hover:text-ink'
          }`}>
            <span className="text-lg">🖼️</span>
            <span>{uploading ? 'Uploading...' : 'Choose photo'}</span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
          <label className={`cursor-pointer flex-1 min-w-[140px] flex items-center justify-center gap-2 border border-dashed rounded-card py-6 text-sm transition ${
            uploading ? 'border-rule text-ink-mute' : 'border-rule text-ink-mute hover:border-accent hover:text-ink'
          }`}>
            <span className="text-lg">📷</span>
            <span>{uploading ? 'Uploading...' : 'Take photo'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}
      {error && <p className="text-xs text-warn mt-2">{error}</p>}
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
    <div className="relative bg-accent/10 border border-accent rounded-card p-6 mb-8 overflow-hidden">
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-ink">
              ✨ Pick products for me
            </h2>
            <p className="text-sm text-ink-mute mt-1">
              We'll match real products to your skin type, age, and concerns from your profile.
            </p>
          </div>
          <button onClick={onClose} className="text-xs text-ink-mute hover:text-ink transition">Close</button>
        </div>

        {!profile?.skin_type && !profile?.concerns?.length && (
          <p className="text-xs text-ink bg-card border border-rule rounded-lg p-3 mt-3">
            Heads up — your profile doesn't have a skin type or concerns yet, so suggestions will be generic. Set them on the <a href="/profile" className="underline">profile page</a> for better results.
          </p>
        )}

        {/* Budget pills */}
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-ink-mute mb-2">Budget</p>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map(b => (
              <button
                key={b.key}
                onClick={() => setBudget(b.key)}
                className={`text-left px-4 py-2 rounded-card border transition ${
                  budget === b.key
                    ? 'bg-accent/10 border-accent text-ink'
                    : 'bg-card border-rule text-ink-mute hover:text-ink hover:border-ink-mute'
                }`}
              >
                <p className="text-sm font-semibold">{b.label}</p>
                <p className="text-[10px] text-ink-mute">{b.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-3 mt-5 flex-wrap">
          {atLimit ? (
            <a
              href="/profile"
              className="bg-accent text-paper font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition shadow-lg"
            >
              ✦ Daily limit hit — Upgrade
            </a>
          ) : (
            <button
              onClick={fetchSuggestions}
              disabled={loading}
              className="bg-accent text-paper font-semibold px-5 py-2.5 rounded-full text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg"
            >
              {loading ? 'Thinking...' : suggestions.length ? '↻ Try again' : '✨ Suggest 4 products'}
            </button>
          )}
          {!premium && (
            <p className="text-xs text-ink-mute">
              {Math.max(0, FREE_SUGGEST_LIMIT - suggestCount)} / {FREE_SUGGEST_LIMIT} suggestions left today
            </p>
          )}
        </div>

        {error && <p className="text-xs text-warn mt-3">{error}</p>}

        {suggestions.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {suggestions.map((s, i) => {
              const alreadyOwn = existingNames.has(`${(s.brand || '').toLowerCase()}|${(s.name || '').toLowerCase()}`)
              const added = !!addedIds[i]
              return (
                <li key={i} className="bg-card border border-rule rounded-card p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {s.brand && <p className="text-[10px] uppercase tracking-wide text-ink-mute">{s.brand}</p>}
                      <p className="text-sm font-semibold text-ink break-words">{s.name}</p>
                    </div>
                    {s.category && (
                      <span className="flex-shrink-0 text-[10px] uppercase tracking-wide bg-accent/10 border border-accent text-ink-mute px-2 py-1 rounded-full">
                        {s.category}
                      </span>
                    )}
                  </div>
                  {s.why && <p className="text-xs text-ink-mute leading-relaxed">{s.why}</p>}
                  <div className="mt-1 pt-3 border-t border-rule">
                    {added ? (
                      <span className="text-xs text-ok">✓ Added to your catalog</span>
                    ) : alreadyOwn ? (
                      <span className="text-xs text-ink-mute">Already in your catalog</span>
                    ) : (
                      <button
                        onClick={() => add(i, s)}
                        className="text-xs text-accent hover:underline transition"
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

function ProductDetailModal({
  product, profile, premium, suggestCount, suggestAtLimit, usage,
  onClose, onLinkToRoutine, onUnlink, onUpdateProduct, onAfterTip, onAtLimit,
}) {
  const [tipLoading, setTipLoading] = useState(false)
  const [tipError, setTipError] = useState('')
  const tip = product.usage_tip || ''

  const stepInfoKey = stepInfoKeyForCategory(product.category)
  const stepInfo = stepInfoKey ? getStepInfo(stepInfoKey) : null

  const inMorning = usage.some(u => u.routineId === 'morning')
  const inNight = usage.some(u => u.routineId === 'night')

  async function generateTip() {
    if (suggestAtLimit) { onAtLimit?.(); return }
    setTipError('')
    setTipLoading(true)
    try {
      const res = await fetch('/api/product-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            brand: product.brand,
            name: product.name,
            category: product.category,
            notes: product.notes,
          },
          profile: {
            skinType: profile?.skin_type,
            ageRange: profile?.age_range,
            concerns: profile?.concerns || [],
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Tip failed')
      await onUpdateProduct(product.id, { usage_tip: data.tip, usage_tip_generated_at: new Date().toISOString() })
      onAfterTip?.()
    } catch (err) {
      setTipError(err.message || 'Tip failed')
    } finally {
      setTipLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-card border border-rule rounded-card w-full max-w-lg my-auto overflow-hidden shadow-2xl"
      >
        {/* Header w/ photo */}
        <div className="relative">
          {product.photo_url ? (
            <div className="aspect-[16/9] w-full overflow-hidden">
              <img src={ikProductDetail(product.photo_url)} alt={product.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="aspect-[16/9] w-full bg-accent/10 flex items-center justify-center">
              <span className="text-6xl font-bold text-ink">
                {((product.brand?.[0] || '') + (product.name?.[0] || '')).toUpperCase() || '✨'}
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur text-ink text-sm hover:bg-black/60 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          <div>
            {product.brand && <p className="text-xs uppercase tracking-wide text-ink-mute">{product.brand}</p>}
            <h2 className="text-xl font-bold text-ink mt-0.5">{product.name}</h2>
            {product.category && (
              <span className="inline-block mt-2 text-[10px] uppercase tracking-wide bg-accent/10 border border-accent text-ink-mute px-2 py-1 rounded-full">
                {product.category}
              </span>
            )}
          </div>

          {/* Where it's used */}
          <section>
            <p className="text-[10px] uppercase tracking-wide text-ink-mute mb-2">Where you use it</p>
            {usage.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {usage.map((u, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 bg-card border border-rule rounded-xl px-3 py-2 text-sm">
                    <span className="text-ink">{u.routineName} <span className="text-ink-mute">·</span> <span className="text-ink-mute">{u.stepName}</span></span>
                  </li>
                ))}
                <li>
                  <button onClick={() => onUnlink(product)} className="text-xs text-ink-mute hover:text-warn transition">
                    Remove from all routines
                  </button>
                </li>
              </ul>
            ) : (
              <p className="text-sm text-ink bg-card border border-rule rounded-xl px-3 py-2">
                Not in any routine yet.
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => onLinkToRoutine('morning', product)}
                disabled={inMorning}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  inMorning
                    ? 'border-rule text-ink-mute cursor-default'
                    : 'border-accent text-accent hover:bg-accent/10'
                }`}
              >
                {inMorning ? '✓ In Morning' : '+ Add to Morning'}
              </button>
              <button
                onClick={() => onLinkToRoutine('night', product)}
                disabled={inNight}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  inNight
                    ? 'border-rule text-ink-mute cursor-default'
                    : 'border-accent text-accent hover:bg-accent/10'
                }`}
              >
                {inNight ? '✓ In Night' : '+ Add to Night'}
              </button>
            </div>
          </section>

          {/* AI personalized tip */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wide text-ink-mute">For you</p>
              {tip && !premium && (
                <span className="text-[10px] text-ink-mute">cached — no extra cost</span>
              )}
            </div>
            {tip ? (
              <div className="bg-accent/10 border border-accent rounded-xl p-4">
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{tip}</p>
                <p className="mt-2 text-[11px] text-ink-mute">Written by Claude — general guidance, not medical advice.</p>
                <button
                  onClick={generateTip}
                  disabled={tipLoading}
                  className="mt-3 text-[11px] text-ink-mute hover:text-accent transition disabled:opacity-50"
                >
                  {tipLoading ? 'Refreshing...' : '↻ Regenerate'}
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={generateTip}
                  disabled={tipLoading}
                  className="bg-accent text-paper text-sm font-semibold px-4 py-2 rounded-full hover:opacity-90 transition disabled:opacity-40 shadow-md"
                >
                  {tipLoading ? 'Thinking...' : suggestAtLimit ? '✦ Daily limit — Upgrade' : '✨ Get a personalized tip'}
                </button>
                <p className="text-[10px] text-ink-mute mt-2">
                  Claude writes 2-3 sentences tailored to your concerns and skin type.
                </p>
                {!premium && (
                  <p className="text-[10px] text-ink-mute mt-1">{Math.max(0, FREE_SUGGEST_LIMIT - suggestCount)} / {FREE_SUGGEST_LIMIT} AI tips left today</p>
                )}
              </div>
            )}
            {tipError && <p className="text-xs text-warn mt-2">{tipError}</p>}
          </section>

          {/* What the category does */}
          {stepInfo && (
            <section>
              <p className="text-[10px] uppercase tracking-wide text-ink-mute mb-2">What a {product.category.toLowerCase()} does</p>
              <div className="bg-card border border-rule rounded-xl p-4 text-sm">
                <p className="text-ink mb-2 leading-relaxed">{stepInfo.what}</p>
                <p className="text-ink-mute text-[10px] uppercase tracking-wide mb-1">When</p>
                <p className="text-ink-mute leading-relaxed mb-2">{stepInfo.when}</p>
                {stepInfo.tips?.length > 0 && (
                  <>
                    <p className="text-ink-mute text-[10px] uppercase tracking-wide mb-1">Tips</p>
                    <ul className="flex flex-col gap-1">
                      {stepInfo.tips.map((t, j) => (
                        <li key={j} className="text-ink-mute flex gap-1.5 leading-relaxed text-xs">
                          <span className="text-accent flex-shrink-0">•</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Notes */}
          {product.notes && (
            <section>
              <p className="text-[10px] uppercase tracking-wide text-ink-mute mb-2">Your notes</p>
              <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{product.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
