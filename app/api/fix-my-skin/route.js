import Anthropic from '@anthropic-ai/sdk'
import { requireUser } from '../../../lib/api-auth'

// Swap this to 'claude-sonnet-4-6' or 'claude-haiku-4-5' to lower cost per request.
const MODEL = 'claude-opus-4-7'

// Conversation guardrails (also protects against runaway cost / abuse).
const MAX_MESSAGES = 24
const MAX_CHARS_PER_MESSAGE = 6000

// Frozen system prompt — identical on every request so it can be cached.
// All per-user data goes in the conversation messages, never here.
const SYSTEM_PROMPT = `You are the skincare advisor inside GlowLog, a friendly skincare-routine app.

The user has tapped a skin concern and wants personalized, encouraging advice, and may then ask follow-up questions in a back-and-forth chat.

How to respond:
- Speak directly to the user in a warm, upbeat, plain-English tone. No jargon dumps.
- For the FIRST reply (the initial advice), aim for 120–180 words, structured as:
  1. One or two sentences acknowledging their concern and what's likely going on.
  2. 3–4 concrete, actionable steps (ingredients to look for, when to apply, simple habits).
  3. One short encouraging closing line.
- For FOLLOW-UP questions, answer conversationally and more briefly (usually 40–110 words). Directly address what they asked.
- Tailor advice to the context you're given: their recent skin rating, their note, and which routine steps they completed today.
- Recommend ingredient TYPES and product CATEGORIES (e.g. "a salicylic acid cleanser", "a fragrance-free ceramide moisturizer"), not specific brands.
- Always emphasize daily SPF when the topic involves dark spots, anti-aging, or active ingredients.
- Stay on skincare. If the user drifts far off-topic, gently steer back.

Safety rules (important):
- You are not a doctor. For severe, painful, spreading, or persistent issues, gently suggest seeing a dermatologist.
- Never diagnose medical conditions or recommend prescription drugs.
- If a routine looks like it could cause irritation (e.g. stacking strong actives), say so kindly.

Output plain text only — no markdown headers, no asterisks, no bullet characters. Use short paragraphs and simple dashes if you list steps.`

function isValidMessage(m) {
  return (
    m &&
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string' &&
    m.content.trim().length > 0 &&
    m.content.length <= MAX_CHARS_PER_MESSAGE
  )
}

export async function POST(request) {
  // Costs money per call, so verify the session before doing anything.
  const { response: unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'AI advice is not configured yet (missing ANTHROPIC_API_KEY).' },
      { status: 500 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { messages } = body

  // Validate the conversation shape: non-empty, starts with the user, alternating roles.
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'No conversation provided.' }, { status: 400 })
  }
  if (messages.length > MAX_MESSAGES) {
    return Response.json(
      { error: 'This chat is getting long — start a new one by picking a concern again.' },
      { status: 400 }
    )
  }
  if (!messages.every(isValidMessage)) {
    return Response.json({ error: 'Invalid message in conversation.' }, { status: 400 })
  }
  if (messages[0].role !== 'user') {
    return Response.json({ error: 'Conversation must start with the user.' }, { status: 400 })
  }
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].role === messages[i - 1].role) {
      return Response.json({ error: 'Conversation roles must alternate.' }, { status: 400 })
    }
  }

  const anthropic = new Anthropic()

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      // Array form lets us mark the frozen prompt as cacheable. The volatile
      // per-user conversation lives in `messages`, so this prefix is identical every call.
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const reply = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()

    return Response.json({ reply })
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'AI key is invalid. Check ANTHROPIC_API_KEY.' }, { status: 500 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Too many requests right now — try again in a moment.' }, { status: 429 })
    }
    console.error('fix-my-skin error:', err)
    return Response.json({ error: 'Could not generate advice right now. Please try again.' }, { status: 500 })
  }
}
