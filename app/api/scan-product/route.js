import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-4-7'

// Only allow image URLs from our own Supabase storage bucket so the
// endpoint can't be used as an arbitrary URL fetcher.
const ALLOWED_URL_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/storage/v1/object/public/product-photos/`

const VALID_CATEGORIES = new Set([
  'Cleanser', 'Toner', 'Essence', 'Exfoliant', 'Serum', 'Eye Cream',
  'Moisturizer', 'Face Oil', 'Sunscreen', 'Mask', 'Spot Treatment', 'Lip Balm', 'Other',
])

const SYSTEM_PROMPT = `You are GlowLog's product-label reader.

Look at the image and identify the skincare product. Extract:
- brand (text)
- name (text — the product name, NOT including the brand)
- category (one of: Cleanser, Toner, Essence, Exfoliant, Serum, Eye Cream, Moisturizer, Face Oil, Sunscreen, Mask, Spot Treatment, Lip Balm, Other)
- notes (short — 1-2 sentences. Key active ingredients you can see on the label, plus claims like 'fragrance-free', 'oil-free', SPF level, etc. If you can read the ingredient list, mention the 3-5 most relevant actives. Otherwise just summarize claims.)
- confidence ('high', 'medium', or 'low')

Hard rules:
- If you cannot clearly identify a real product (blurry / not skincare / no readable text), set confidence to 'low' and use empty strings for fields you can't read.
- NEVER invent a brand or product name you don't actually see in the image.
- For category, pick the closest category from the list. If unclear, use 'Other'.

Output FORMAT (critical — your entire response must be valid JSON, nothing else):
{
  "brand": "string",
  "name": "string",
  "category": "string",
  "notes": "string",
  "confidence": "high" | "medium" | "low"
}

No prose, no markdown fences, no commentary outside the JSON.`

function clamp(s, max) {
  if (typeof s !== 'string') return ''
  return s.trim().slice(0, max)
}

export async function POST(request) {
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
      max_tokens: 600,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: photoUrl } },
          { type: 'text', text: 'Read this product label and return JSON.' },
        ],
      }],
    })

    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

    let parsed
    try { parsed = JSON.parse(jsonStr) } catch {
      return Response.json({ error: 'AI returned an unexpected format. Try a clearer photo.' }, { status: 502 })
    }

    const product = {
      brand: clamp(parsed.brand, 80),
      name: clamp(parsed.name, 120),
      category: VALID_CATEGORIES.has(parsed.category) ? parsed.category : '',
      notes: clamp(parsed.notes, 400),
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
    }

    if (!product.brand && !product.name) {
      return Response.json({ error: "Couldn't read the label. Try a clearer, well-lit photo of the front of the bottle." }, { status: 422 })
    }

    return Response.json({ product })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'AI key is invalid.' }, { status: 500 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Too many requests right now — try again in a moment.' }, { status: 429 })
    }
    console.error('scan-product error:', err)
    return Response.json({ error: 'Could not scan the product right now.' }, { status: 500 })
  }
}
