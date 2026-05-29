import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-4-7'
const ALLOWED_URL_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/storage/v1/object/public/product-photos/`

const SYSTEM_PROMPT = `You are GlowLog's ingredient analyzer.

You'll be shown a photograph of a skincare product's ingredient list (the back-of-bottle INCI list) and given the user's stated skin concerns. Read the ingredient list and assess each meaningful ingredient against the user's concerns.

Categorize each ingredient as:
- 'good' — helps with one or more of the user's concerns (e.g., niacinamide for oiliness/acne, hyaluronic acid for dryness, ceramides for redness/barrier).
- 'warning' — likely to worsen one of the user's concerns OR is a common irritant for sensitive skin (fragrance/parfum, denatured alcohol, essential oils, harsh sulfates for sensitive skin, comedogenic oils for acne-prone, etc.).
- 'neutral' — present in the formula but not particularly helpful or harmful for the user's concerns. SKIP these unless they're a notable inclusion. Limit neutral entries to a max of 3.

For each ingredient include a 'reason' — a single sentence in plain English saying WHY you tagged it that way, referencing the user's concern when relevant.

Hard rules:
- ONLY include ingredients you can actually read in the photo. Never invent ingredients.
- Aim for 8-15 ingredient entries total (not the whole list — focus on the meaningful ones).
- Include 1-3 sentence overall summary: is this product a good match for the user given their concerns?
- 'verdict' = 'great_match' | 'okay' | 'risky' — your overall recommendation.

Output FORMAT (critical — entire response must be valid JSON):
{
  "ingredients": [
    { "name": "string", "status": "good" | "warning" | "neutral", "reason": "string" }
  ],
  "summary": "string",
  "verdict": "great_match" | "okay" | "risky"
}

If you can't read the ingredient list at all, return {"ingredients": [], "summary": "Couldn't read the ingredient list clearly. Try a closer, sharper photo of the back-of-bottle list.", "verdict": "okay"}.

No prose, no markdown fences.`

function clamp(s, max) {
  if (typeof s !== 'string') return ''
  return s.trim().slice(0, max)
}

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'AI ingredient checker is not configured.' }, { status: 500 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const photoUrl = clamp(body.photoUrl, 600)
  if (!photoUrl || !photoUrl.startsWith(ALLOWED_URL_PREFIX)) {
    return Response.json({ error: 'Photo URL must be an uploaded product photo.' }, { status: 400 })
  }
  const rawConcerns = Array.isArray(body.concerns) ? body.concerns : []
  const concerns = rawConcerns.slice(0, 8).map(c => clamp(c, 40)).filter(Boolean)

  const userText = `My skin concerns: ${concerns.length ? concerns.join(', ') : 'general care, no specific concerns'}

Analyze this ingredient list against my concerns. Return JSON.`

  const anthropic = new Anthropic()

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1600,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: photoUrl } },
          { type: 'text', text: userText },
        ],
      }],
    })

    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

    let parsed
    try { parsed = JSON.parse(jsonStr) } catch {
      return Response.json({ error: 'AI returned an unexpected format. Try a clearer photo.' }, { status: 502 })
    }
    if (!parsed || !Array.isArray(parsed.ingredients)) {
      return Response.json({ error: 'AI returned no ingredients.' }, { status: 502 })
    }

    const ingredients = parsed.ingredients
      .map(i => ({
        name: clamp(i?.name, 80),
        status: ['good', 'warning', 'neutral'].includes(i?.status) ? i.status : 'neutral',
        reason: clamp(i?.reason, 240),
      }))
      .filter(i => i.name)
      .slice(0, 20)

    const summary = clamp(parsed.summary, 600)
    const verdict = ['great_match', 'okay', 'risky'].includes(parsed.verdict) ? parsed.verdict : 'okay'

    return Response.json({ ingredients, summary, verdict })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'AI key is invalid.' }, { status: 500 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Too many requests right now — try again in a moment.' }, { status: 429 })
    }
    console.error('check-ingredients error:', err)
    return Response.json({ error: 'Could not analyze ingredients right now.' }, { status: 500 })
  }
}
