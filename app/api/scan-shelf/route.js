import Anthropic from '@anthropic-ai/sdk'
import { requireUser } from '../../../lib/api-auth'

const MODEL = 'claude-opus-4-7'
const ALLOWED_URL_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/storage/v1/object/public/product-photos/`

const VALID_CATEGORIES = new Set([
  'Cleanser', 'Toner', 'Essence', 'Exfoliant', 'Serum', 'Eye Cream',
  'Moisturizer', 'Face Oil', 'Sunscreen', 'Mask', 'Spot Treatment', 'Lip Balm', 'Other',
])

const SYSTEM_PROMPT = `You are GlowLog's shelf-scanning assistant.

Look at the image — it should show one or more skincare products on a shelf, counter, or in a bag. Identify every distinct product you can READ clearly enough to be confident about.

For each product, extract:
- brand (the brand name on the bottle)
- name (the product name)
- category (one of: Cleanser, Toner, Essence, Exfoliant, Serum, Eye Cream, Moisturizer, Face Oil, Sunscreen, Mask, Spot Treatment, Lip Balm, Other)

Hard rules:
- ONLY include products where you can clearly read both the brand and the product name. Skip bottles where you can only guess.
- Skip non-skincare items (makeup, hair care, body wash) unless they're clearly a face product.
- Maximum 10 products in your response.
- Never invent products — if you're not sure, leave them out.

Output FORMAT (critical — your entire response must be valid JSON, nothing else):
{
  "products": [
    { "brand": "string", "name": "string", "category": "string" }
  ]
}

If you can't identify ANY products with confidence, return { "products": [] }.

No prose, no markdown fences.`

function clamp(s, max) {
  if (typeof s !== 'string') return ''
  return s.trim().slice(0, max)
}

export async function POST(request) {
  // Costs money per call, so verify the session before doing anything.
  const { response: unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'AI scanning is not configured (missing ANTHROPIC_API_KEY).' }, { status: 500 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const photoUrl = clamp(body.photoUrl, 600)
  if (!photoUrl || !photoUrl.startsWith(ALLOWED_URL_PREFIX)) {
    return Response.json({ error: 'Photo URL must be an uploaded product photo.' }, { status: 400 })
  }

  const anthropic = new Anthropic()

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1400,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: photoUrl } },
          { type: 'text', text: 'Identify the products on this shelf. Return JSON.' },
        ],
      }],
    })

    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

    let parsed
    try { parsed = JSON.parse(jsonStr) } catch {
      return Response.json({ error: 'AI returned an unexpected format. Try a clearer photo.' }, { status: 502 })
    }
    if (!parsed || !Array.isArray(parsed.products)) {
      return Response.json({ error: 'AI returned no products.' }, { status: 502 })
    }

    const products = parsed.products
      .map(p => ({
        brand: clamp(p?.brand, 80),
        name: clamp(p?.name, 120),
        category: VALID_CATEGORIES.has(p?.category) ? p.category : 'Other',
      }))
      .filter(p => p.brand && p.name)
      .slice(0, 10)

    return Response.json({ products })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'AI key is invalid.' }, { status: 500 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Too many requests right now — try again in a moment.' }, { status: 429 })
    }
    console.error('scan-shelf error:', err)
    return Response.json({ error: 'Could not scan the shelf right now.' }, { status: 500 })
  }
}
