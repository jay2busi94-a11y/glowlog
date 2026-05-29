'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppNavbar from '../components/AppNavbar'
import { createClient } from '../../lib/supabase'
import { BRANDS, brandsByConcerns } from '../../lib/brands'

export default function Discover() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [existingProducts, setExistingProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [openBrand, setOpenBrand] = useState(null)
  const [filterByConcerns, setFilterByConcerns] = useState(true)
  const [addedKeys, setAddedKeys] = useState({})  // `${brandId}:${productName}` → true once added

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      const [profileRes, productsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('products').select('brand, name').eq('user_id', user.id),
      ])
      setProfile(profileRes.data)
      setExistingProducts(productsRes.data || [])
      setLoading(false)
    })
  }, [])

  const userConcerns = profile?.concerns || []
  const brands = filterByConcerns && userConcerns.length
    ? brandsByConcerns(userConcerns)
    : BRANDS

  const existingSet = new Set(
    existingProducts.map(p => `${(p.brand || '').toLowerCase()}|${(p.name || '').toLowerCase()}`)
  )

  async function addProduct(brandId, product) {
    if (!user) return
    const supabase = createClient()
    const payload = {
      user_id: user.id,
      brand: product.brand,
      name: product.name,
      category: product.category || null,
      notes: null,
      updated_at: new Date().toISOString(),
    }
    const { data } = await supabase.from('products').insert(payload).select().single()
    if (data) {
      setExistingProducts(prev => [...prev, { brand: data.brand, name: data.name }])
      setAddedKeys(prev => ({ ...prev, [`${brandId}:${product.name}`]: true }))
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 pb-16 overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-5xl mx-auto pt-32">

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Discover Brands ✨</h1>
          <p className="text-gray-400">Browse the brands the skincare world keeps coming back to. Tap any to see their best-known products.</p>
        </div>

        {/* Filter row */}
        {userConcerns.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              onClick={() => setFilterByConcerns(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-2 ${
                filterByConcerns
                  ? 'bg-pink-500/10 border-pink-500/40 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
              }`}
            >
              <span>{filterByConcerns ? '✓' : '○'}</span>
              <span>Sort for my concerns</span>
            </button>
            <div className="flex flex-wrap gap-1 text-[11px] text-gray-500">
              {userConcerns.map(c => (
                <span key={c} className="px-2 py-0.5 rounded-full border border-white/10">{c}</span>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading brands...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map(b => {
              const matched = filterByConcerns && b.bestFor.some(c => userConcerns.includes(c))
              const isOpen = openBrand === b.id
              return (
                <article
                  key={b.id}
                  className={`group bg-white/5 border rounded-2xl overflow-hidden transition ${
                    matched ? 'border-pink-500/30' : 'border-white/10'
                  } ${isOpen ? 'sm:col-span-2 lg:col-span-3' : ''}`}
                >
                  {/* Brand tile header */}
                  <button
                    onClick={() => setOpenBrand(isOpen ? null : b.id)}
                    className={`w-full text-left p-5 flex items-start gap-4 bg-gradient-to-br ${b.gradient} hover:brightness-110 transition`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
                      {b.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-lg font-bold text-white">{b.name}</h2>
                        {matched && (
                          <span className="text-[10px] uppercase tracking-wider bg-pink-500/20 border border-pink-500/40 text-pink-200 px-2 py-0.5 rounded-full font-semibold">
                            for you
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300/90 leading-snug">{b.tagline}</p>
                    </div>
                    <span className={`text-gray-300 text-sm flex-shrink-0 transition ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>

                  {/* Body */}
                  <div className="p-5">
                    <p className="text-[10px] uppercase tracking-wide text-pink-300/80 mb-2">Known for</p>
                    <ul className="flex flex-wrap gap-1.5 mb-4">
                      {b.knownFor.map(k => (
                        <li key={k} className="text-[11px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded-full">
                          {k}
                        </li>
                      ))}
                    </ul>

                    {isOpen && (
                      <>
                        <p className="text-[10px] uppercase tracking-wide text-pink-300/80 mb-2">Popular products</p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                          {b.popularProducts.map(p => {
                            const inCatalog = existingSet.has(`${p.brand.toLowerCase()}|${p.name.toLowerCase()}`)
                            const justAdded = addedKeys[`${b.id}:${p.name}`]
                            return (
                              <li key={p.name} className="bg-white/[0.04] border border-white/10 rounded-xl p-3 flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white break-words">{p.name}</p>
                                  {p.category && <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-0.5">{p.category}</p>}
                                </div>
                                {inCatalog || justAdded ? (
                                  <span className="text-[10px] text-emerald-300 flex-shrink-0 mt-0.5">{justAdded ? '✓ Added' : '✓ In catalog'}</span>
                                ) : (
                                  <button
                                    onClick={() => addProduct(b.id, p)}
                                    className="text-[10px] text-pink-300 hover:text-pink-200 transition flex-shrink-0 mt-0.5 whitespace-nowrap"
                                  >
                                    + Add
                                  </button>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </>
                    )}

                    {!isOpen && (
                      <button
                        onClick={() => setOpenBrand(b.id)}
                        className="text-xs text-pink-300/90 hover:text-pink-200 transition"
                      >
                        See popular products →
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}

      </div>
    </main>
  )
}
