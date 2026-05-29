'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { PRODUCT_CATEGORIES } from '../../lib/catalog'
import { toLocalDateString } from '../../lib/dates'
import { isPremium, FREE_SUGGEST_LIMIT, getSuggestCountToday, incrementSuggestCountToday } from '../../lib/profile'

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

  const today = toLocalDateString()
  const premium = isPremium(profile)
  const suggestAtLimit = !premium && suggestCount >= FREE_SUGGEST_LIMIT

  useEffect(() => {
    setSuggestCount(getSuggestCountToday(today))
  }, [today])

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

        {editing !== null && (
          <ProductForm
            draft={draft}
            setDraft={setDraft}
            saving={saving}
            onSave={save}
            onCancel={cancel}
            isNew={editing === 'new'}
            user={user}
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

function ProductForm({ draft, setDraft, saving, onSave, onCancel, isNew, user }) {
  const set = (key) => (e) => setDraft({ ...draft, [key]: e.target.value })
  const setPhotoUrl = (url) => setDraft({ ...draft, photo_url: url })
  return (
    <div className="bg-white/5 border border-pink-500/20 rounded-2xl p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4 text-pink-300">{isNew ? 'Add product' : 'Edit product'}</h2>
      <PhotoPicker photoUrl={draft.photo_url} onChange={setPhotoUrl} userId={user?.id} />
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

function PhotoPicker({ photoUrl, onChange, userId }) {
  const [uploading, setUploading] = useState(false)
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
          <div className="flex flex-col gap-2 mt-1">
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
