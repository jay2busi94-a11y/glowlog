// Curated list of well-known skincare brands for the Discover page.
// Visual tile-style (no image hosting) so we don't break or run into
// brand-asset issues. Add real photos later if we want to upgrade.
//
// `tint` is a static Tailwind class so it survives purging — never
// build the class name dynamically.
// `bestFor` should use the same vocabulary as PROFILE_CONCERNS so we can
// match brands to a user's profile.

export const BRANDS = [
  {
    id: 'cerave',
    name: 'CeraVe',
    emoji: '🛡️',
    tint: 'bg-sky-500/10',
    tagline: 'Drugstore staple developed with dermatologists',
    knownFor: ['Ceramide-rich moisturizers', 'Gentle cleansers', 'Affordable basics'],
    popularProducts: [
      { brand: 'CeraVe', name: 'Hydrating Facial Cleanser', category: 'Cleanser' },
      { brand: 'CeraVe', name: 'Foaming Facial Cleanser', category: 'Cleanser' },
      { brand: 'CeraVe', name: 'Moisturizing Cream', category: 'Moisturizer' },
      { brand: 'CeraVe', name: 'PM Facial Moisturizing Lotion', category: 'Moisturizer' },
      { brand: 'CeraVe', name: 'Resurfacing Retinol Serum', category: 'Serum' },
    ],
    bestFor: ['Dryness', 'Redness'],
  },
  {
    id: 'la-roche-posay',
    name: 'La Roche-Posay',
    emoji: '🇫🇷',
    tint: 'bg-cyan-500/10',
    tagline: 'French pharmacy, thermal water, sensitive-skin science',
    knownFor: ['Sunscreens (Anthelios)', 'Soothing cleansers', 'Acne treatments (Effaclar)'],
    popularProducts: [
      { brand: 'La Roche-Posay', name: 'Anthelios Melt-In Sunscreen SPF 60', category: 'Sunscreen' },
      { brand: 'La Roche-Posay', name: 'Toleriane Hydrating Gentle Cleanser', category: 'Cleanser' },
      { brand: 'La Roche-Posay', name: 'Effaclar Duo Acne Treatment', category: 'Spot Treatment' },
      { brand: 'La Roche-Posay', name: 'Cicaplast Baume B5', category: 'Moisturizer' },
    ],
    bestFor: ['Redness', 'Acne', 'Dryness'],
  },
  {
    id: 'the-ordinary',
    name: 'The Ordinary',
    emoji: '🧪',
    tint: 'bg-zinc-500/10',
    tagline: 'Single-active serums at lab prices',
    knownFor: ['Niacinamide 10% + Zinc', 'Hyaluronic Acid 2% + B5', 'Retinols at all strengths'],
    popularProducts: [
      { brand: 'The Ordinary', name: 'Niacinamide 10% + Zinc 1%', category: 'Serum' },
      { brand: 'The Ordinary', name: 'Hyaluronic Acid 2% + B5', category: 'Serum' },
      { brand: 'The Ordinary', name: 'Granactive Retinoid 2% Emulsion', category: 'Serum' },
      { brand: 'The Ordinary', name: 'AHA 30% + BHA 2% Peeling Solution', category: 'Exfoliant' },
      { brand: 'The Ordinary', name: 'Squalane Cleanser', category: 'Cleanser' },
    ],
    bestFor: ['Acne', 'Oiliness', 'Dark Spots', 'Anti-Aging'],
  },
  {
    id: 'paulas-choice',
    name: "Paula's Choice",
    emoji: '🔬',
    tint: 'bg-emerald-500/10',
    tagline: 'The BHA people. Research-led, no fragrance',
    knownFor: ['2% BHA Liquid Exfoliant', 'Vitamin C boosters', 'Clinical-grade actives'],
    popularProducts: [
      { brand: "Paula's Choice", name: 'Skin Perfecting 2% BHA Liquid Exfoliant', category: 'Exfoliant' },
      { brand: "Paula's Choice", name: 'C15 Super Booster', category: 'Serum' },
      { brand: "Paula's Choice", name: 'Resist Anti-Aging Eye Cream', category: 'Eye Cream' },
      { brand: "Paula's Choice", name: '10% Azelaic Acid Booster', category: 'Spot Treatment' },
    ],
    bestFor: ['Acne', 'Oiliness', 'Dark Spots', 'Anti-Aging'],
  },
  {
    id: 'cosrx',
    name: 'COSRX',
    emoji: '🐌',
    tint: 'bg-lime-500/10',
    tagline: 'K-beauty pioneer — snail mucin & calming actives',
    knownFor: ['Advanced Snail 96 Mucin Essence', 'Acne patches', 'Centella'],
    popularProducts: [
      { brand: 'COSRX', name: 'Advanced Snail 96 Mucin Power Essence', category: 'Essence' },
      { brand: 'COSRX', name: 'BHA Blackhead Power Liquid', category: 'Exfoliant' },
      { brand: 'COSRX', name: 'Acne Pimple Master Patch', category: 'Spot Treatment' },
      { brand: 'COSRX', name: 'Low pH Good Morning Gel Cleanser', category: 'Cleanser' },
    ],
    bestFor: ['Acne', 'Redness', 'Dryness'],
  },
  {
    id: 'beauty-of-joseon',
    name: 'Beauty of Joseon',
    emoji: '🌾',
    tint: 'bg-amber-500/10',
    tagline: 'Traditional Korean ingredients, modern formulas',
    knownFor: ['Rice essences', 'Relief Sun SPF', 'Glow lotion (propolis + niacinamide)'],
    popularProducts: [
      { brand: 'Beauty of Joseon', name: 'Glow Serum: Propolis + Niacinamide', category: 'Serum' },
      { brand: 'Beauty of Joseon', name: 'Relief Sun: Rice + Probiotics SPF50', category: 'Sunscreen' },
      { brand: 'Beauty of Joseon', name: 'Radiance Cleansing Balm', category: 'Cleanser' },
      { brand: 'Beauty of Joseon', name: 'Glow Replenishing Rice Milk', category: 'Toner' },
    ],
    bestFor: ['Dark Spots', 'Dryness', 'Redness'],
  },
  {
    id: 'tatcha',
    name: 'Tatcha',
    emoji: '🌸',
    tint: 'bg-pink-500/10',
    tagline: 'Japanese ritual luxury — rice & camellia',
    knownFor: ['The Water Cream', 'Dewy Skin Cream', 'Rice Polish exfoliators'],
    popularProducts: [
      { brand: 'Tatcha', name: 'The Water Cream', category: 'Moisturizer' },
      { brand: 'Tatcha', name: 'The Dewy Skin Cream', category: 'Moisturizer' },
      { brand: 'Tatcha', name: 'The Rice Polish: Classic', category: 'Exfoliant' },
      { brand: 'Tatcha', name: 'The Silk Peony Eye Cream', category: 'Eye Cream' },
    ],
    bestFor: ['Dryness', 'Anti-Aging'],
  },
  {
    id: 'skinceuticals',
    name: 'SkinCeuticals',
    emoji: '⚗️',
    tint: 'bg-purple-500/10',
    tagline: 'Clinical brand — the original CE Ferulic',
    knownFor: ['C E Ferulic', 'Phloretin CF', 'Retinols & SPF'],
    popularProducts: [
      { brand: 'SkinCeuticals', name: 'C E Ferulic', category: 'Serum' },
      { brand: 'SkinCeuticals', name: 'Phloretin CF', category: 'Serum' },
      { brand: 'SkinCeuticals', name: 'Retinol 0.5', category: 'Serum' },
      { brand: 'SkinCeuticals', name: 'Physical Fusion UV Defense SPF 50', category: 'Sunscreen' },
    ],
    bestFor: ['Dark Spots', 'Anti-Aging'],
  },
  {
    id: 'vanicream',
    name: 'Vanicream',
    emoji: '🤍',
    tint: 'bg-slate-500/10',
    tagline: 'Minimal-ingredient lineup for the most reactive skin',
    knownFor: ['No fragrance, no dye, no parabens', 'Dermatology-recommended', 'Eczema-friendly'],
    popularProducts: [
      { brand: 'Vanicream', name: 'Gentle Facial Cleanser', category: 'Cleanser' },
      { brand: 'Vanicream', name: 'Moisturizing Cream', category: 'Moisturizer' },
      { brand: 'Vanicream', name: 'Daily Facial Moisturizer SPF 30', category: 'Moisturizer' },
    ],
    bestFor: ['Redness', 'Dryness'],
  },
  {
    id: 'bioderma',
    name: 'Bioderma',
    emoji: '💧',
    tint: 'bg-blue-500/10',
    tagline: 'Invented micellar water — French dermatology',
    knownFor: ['Sensibio H2O micellar', 'Atoderm body care', 'Sébium for oily skin'],
    popularProducts: [
      { brand: 'Bioderma', name: 'Sensibio H2O Micellar Water', category: 'Cleanser' },
      { brand: 'Bioderma', name: 'Sebium Gel Moussant', category: 'Cleanser' },
      { brand: 'Bioderma', name: 'Hydrabio Serum', category: 'Serum' },
    ],
    bestFor: ['Redness', 'Oiliness'],
  },
  {
    id: 'stridex',
    name: 'Stridex',
    emoji: '🟣',
    tint: 'bg-fuchsia-500/10',
    tagline: 'BHA pads on a drugstore budget',
    knownFor: ['Maximum strength salicylic pads', 'No-fuss acne fight'],
    popularProducts: [
      { brand: 'Stridex', name: 'Maximum Strength Pads (Red)', category: 'Exfoliant' },
    ],
    bestFor: ['Acne', 'Oiliness'],
  },
  {
    id: 'differin',
    name: 'Differin',
    emoji: '🧫',
    tint: 'bg-orange-500/10',
    tagline: 'The only OTC retinoid in the US (adapalene 0.1%)',
    knownFor: ['Adapalene gel', 'Acne-clearing system'],
    popularProducts: [
      { brand: 'Differin', name: 'Adapalene Gel 0.1%', category: 'Serum' },
    ],
    bestFor: ['Acne', 'Dark Spots'],
  },
  {
    id: 'aveeno',
    name: 'Aveeno',
    emoji: '🌾',
    tint: 'bg-yellow-500/10',
    tagline: 'Oat-based gentle skincare',
    knownFor: ['Calm + Restore line', 'Daily Moisturizing Lotion'],
    popularProducts: [
      { brand: 'Aveeno', name: 'Calm + Restore Oat Gel Moisturizer', category: 'Moisturizer' },
      { brand: 'Aveeno', name: 'Calm + Restore Triple Oat Serum', category: 'Serum' },
      { brand: 'Aveeno', name: 'Positively Radiant Moisturizer SPF 30', category: 'Moisturizer' },
    ],
    bestFor: ['Redness', 'Dryness'],
  },
  {
    id: 'neutrogena',
    name: 'Neutrogena',
    emoji: '☀️',
    tint: 'bg-amber-500/10',
    tagline: 'Wide-range drugstore — sunscreens, cleansers, acne',
    knownFor: ['Hydro Boost line', 'Ultra Sheer sunscreens', 'Stubborn Acne range'],
    popularProducts: [
      { brand: 'Neutrogena', name: 'Hydro Boost Water Gel', category: 'Moisturizer' },
      { brand: 'Neutrogena', name: 'Ultra Sheer Dry-Touch SPF 55', category: 'Sunscreen' },
      { brand: 'Neutrogena', name: 'Hydro Boost Hyaluronic Acid Serum', category: 'Serum' },
    ],
    bestFor: ['Acne', 'Dryness'],
  },
  {
    id: 'drunk-elephant',
    name: 'Drunk Elephant',
    emoji: '🐘',
    tint: 'bg-rose-500/10',
    tagline: 'Cult clean-beauty — no "suspicious 6"',
    knownFor: ['Protini polypeptide cream', 'C-Firma vitamin C', 'TLC sukari babyfacial'],
    popularProducts: [
      { brand: 'Drunk Elephant', name: 'Protini Polypeptide Cream', category: 'Moisturizer' },
      { brand: 'Drunk Elephant', name: 'C-Firma Fresh Day Serum', category: 'Serum' },
      { brand: 'Drunk Elephant', name: 'T.L.C. Sukari Babyfacial', category: 'Mask' },
    ],
    bestFor: ['Dark Spots', 'Anti-Aging'],
  },
  {
    id: 'glow-recipe',
    name: 'Glow Recipe',
    emoji: '🍉',
    tint: 'bg-pink-500/10',
    tagline: 'Fruit-forward K-beauty inspired serums',
    knownFor: ['Watermelon Glow PHA Toner', 'Plum Plump HA Serum', 'Avocado Melt sleeping mask'],
    popularProducts: [
      { brand: 'Glow Recipe', name: 'Watermelon Glow PHA + BHA Toner', category: 'Toner' },
      { brand: 'Glow Recipe', name: 'Plum Plump Hyaluronic Acid Serum', category: 'Serum' },
      { brand: 'Glow Recipe', name: 'Avocado Melt Retinol Sleeping Mask', category: 'Mask' },
    ],
    bestFor: ['Dryness', 'Anti-Aging'],
  },
]

export function brandsByConcerns(concerns = []) {
  if (!concerns.length) return BRANDS
  const matching = []
  const other = []
  for (const b of BRANDS) {
    if (b.bestFor.some(c => concerns.includes(c))) matching.push(b)
    else other.push(b)
  }
  return [...matching, ...other]
}

export function getBrand(id) {
  return BRANDS.find(b => b.id === id) || null
}
