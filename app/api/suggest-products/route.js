import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-4-7'
const MAX_CONCERNS = 8
const MAX_CHARS = 200

// Frozen system prompt — identical every call so the prefix is cacheable.
const SYSTEM_PROMPT = `You are GlowLog's skincare product recommender.

Given a user's skin type, concerns, age range, and budget preference, suggest 4 real, widely-available skincare products that, together, address their needs without overcomplicating their routine.

Hard rules:
- Recommend REAL products that exist and are well-known (CeraVe, La Roche-Posay, The Ordinary, Paula's Choice, Cosrx, Beauty of Joseon, Tatcha, Skinceuticals, Vanicream, Bioderma, Stridex, etc.). Never make up product names.
- Cover different routine slots — don't suggest four cleansers. Aim for variety across cleanser / treatment / moisturizer / SPF as appropriate to their concerns.
- Match budget: "drugstore" = under $25 each (CeraVe, The Ordinary, Vanicream, etc.). "mid" = $25-60. "splurge" = $60+.
- For sensitive skin or "Not sure" type, default to gentle, fragrance-free options. Never recommend strong actives (high % retinol, low-pH glycolic) to sensitive or to under-18.
- For under-18 or "Just starting out": no retinoids at all, no strong acids — gentle gel cleanser, lightweight moisturizer, SPF, niacinamide max.
- Always include a daily SPF unless the user's only concern is something incompatible.

Output FORMAT (critical — your entire response must be valid JSON, nothing else):
{
  "products": [
    { "brand": "string", "name": "string", "category": "Cleanser | Toner | Essence | Exfoliant | Serum | Eye Cream | Moisturizer | Face Oil | Sunscreen | Mask | Spot Treatment | Lip Balm | Other", "why": "1-2 sentences explaining why this fits the user's concerns + skin type. Plain English, no jargon." }
  ]
}

No prose, no markdown fences, no commentary outside the JSON.`

const VALID_CATEGORIES = new Set([
  'Cleanser', 'Toner', 'Essence', 'Exfoliant', 'Serum', 'Eye Cream',
  'Moisturizer', 'Face Oil', 'Sunscreen', 'Mask', 'Spot Treatment', 'Lip Balm', 'Other',
])

function clean(str, max = MAX_CHARS) {
  if (typeof str !== 'string') return ''
  return str.trim().slice(0, max)
}

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'AI suggestions are not configured yet (missing ANTHROPIC_API_KEY).' },
      { status: 500 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const skinType = clean(body.skinType, 40) || 'unsure'
  const ageRange = clean(body.ageRange, 20) || 'unknown'
  const budget = ['drugstore', 'mid', 'splurge'].includes(body.budget) ? body.budget : 'drugstore'
  const rawConcerns = Array.isArray(body.concerns) ? body.concerns : []
  const concerns = rawConcerns.slice(0, MAX_CONCERNS).map(c => clean(c, 40)).filter(Boolean)

  const userPrompt = `Skin type: ${skinType}
Age range: ${ageRange}
Budget: ${budget}
Concerns: ${concerns.length ? concerns.join(', ') : 'general care, no specific concerns'}

Suggest 4 products. Respond with JSON only.`

  const anthropic = new Anthropic()

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    // Strip markdown fences if Claude wrapped them despite the instruction.
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

    let parsed
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return Response.json({ error: 'AI returned an unexpected format. Try again.' }, { status: 502 })
    }
    if (!parsed || !Array.isArray(parsed.products)) {
      return Response.json({ error: 'AI returned no products.' }, { status: 502 })
    }

    // Sanitize and validate each product before sending to the client.
    const products = parsed.products
      .map((p) => ({
        brand: clean(p?.brand, 80),
        name: clean(p?.name, 120),
        category: VALID_CATEGORIES.has(p?.category) ? p.category : 'Other',
        why: clean(p?.why, 400),
      }))
      .filter((p) => p.name && p.brand)
      .slice(0, 6)

    if (products.length === 0) {
      return Response.json({ error: 'AI returned no usable products.' }, { status: 502 })
    }

    return Response.json({ products })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'AI key is invalid. Check ANTHROPIC_API_KEY.' }, { status: 500 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Too many requests right now — try again in a moment.' }, { status: 429 })
    }
    console.error('suggest-products error:', err)
    return Response.json({ error: 'Could not generate suggestions right now. Please try again.' }, { status: 500 })
  }
}
