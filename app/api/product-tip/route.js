import Anthropic from '@anthropic-ai/sdk'
import { requireUser } from '../../../lib/api-auth'

const MODEL = 'claude-opus-4-7'

const SYSTEM_PROMPT = `You are GlowLog's per-product coach.

Given a single skincare product the user owns AND the user's profile (skin type, concerns, age range), write a SHORT, personalized usage tip — 2 to 3 sentences total. Plain English, warm tone, no jargon dumps.

Hit these in order:
1. WHEN to use it (AM / PM / both; how often per week if it's an active).
2. HOW to fit it into a routine (e.g. "after cleanser, before moisturizer"; "on damp skin"; "wait 5 min before SPF"). Be specific to THIS product if you recognize it.
3. WHAT to watch out for given the user's concerns (e.g. "since you flagged Redness, start 2× a week"; "don't pair with retinol the same night").

Hard rules:
- 2-3 sentences. Never longer.
- Reference the user's concerns by name at least once when relevant.
- If the product is a basic (cleanser, moisturizer, SPF), keep advice simple and skip the warnings step.
- Plain text only — no markdown, no asterisks, no headers.
- Don't restate the product name unless useful.
- You are NOT a doctor. Never diagnose or recommend prescriptions.`

function clamp(s, max) {
  if (typeof s !== 'string') return ''
  return s.trim().slice(0, max)
}

export async function POST(request) {
  // Costs money per call, so verify the session before doing anything.
  const { response: unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'AI tips are not configured.' }, { status: 500 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const product = body.product || {}
  const profile = body.profile || {}

  const brand = clamp(product.brand, 80)
  const name = clamp(product.name, 120)
  if (!name) {
    return Response.json({ error: 'Product name is required.' }, { status: 400 })
  }
  const category = clamp(product.category, 40) || 'Other'
  const notes = clamp(product.notes, 400)
  const skinType = clamp(profile.skinType, 40) || 'unsure'
  const ageRange = clamp(profile.ageRange, 20) || 'unknown'
  const rawConcerns = Array.isArray(profile.concerns) ? profile.concerns : []
  const concerns = rawConcerns.slice(0, 8).map(c => clamp(c, 40)).filter(Boolean)

  const userPrompt = `Product: ${brand ? `${brand} — ${name}` : name}
Category: ${category}
${notes ? `Notes / ingredients I saved: ${notes}\n` : ''}
My skin type: ${skinType}
My age range: ${ageRange}
My concerns: ${concerns.length ? concerns.join(', ') : 'none'}

Write my personalized tip.`

  const anthropic = new Anthropic()

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 350,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    })

    const tip = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()

    if (!tip) return Response.json({ error: 'AI returned no tip.' }, { status: 502 })
    return Response.json({ tip })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'AI key is invalid.' }, { status: 500 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Too many requests right now — try again in a moment.' }, { status: 429 })
    }
    console.error('product-tip error:', err)
    return Response.json({ error: 'Could not generate a tip right now.' }, { status: 500 })
  }
}
