// Categories a product can fall into. Used by the catalog form and by the
// routine editor to suggest products when linking one to a step.
export const PRODUCT_CATEGORIES = [
  'Cleanser',
  'Toner',
  'Essence',
  'Exfoliant',
  'Serum',
  'Eye Cream',
  'Moisturizer',
  'Face Oil',
  'Sunscreen',
  'Mask',
  'Spot Treatment',
  'Lip Balm',
  'Other',
]

// Display string for a product card or chip.
export function productLabel(p) {
  if (!p) return ''
  if (p.brand && p.name) return `${p.brand} — ${p.name}`
  return p.name || p.brand || 'Untitled product'
}
