// Beginner-friendly explainers for each preset step in STEP_LIBRARY.
// Keys must match the step name exactly (case-sensitive). Steps the user
// types themselves won't have an entry and the info chip is hidden.
//
// Shape: { what, when, tips: [string, ...] }

export const STEP_INFO = {
  'Cleanser': {
    what: 'Washes off oil, sweat, sunscreen, and the day’s grime so the rest of your routine can actually reach your skin.',
    when: 'Morning and night. Keep it short — about 30 seconds with lukewarm water.',
    tips: [
      'If your face feels tight or squeaky after, the cleanser is too stripping.',
      'Pat dry — don’t rub.',
    ],
  },
  'Oil Cleanser': {
    what: 'An oil-based first cleanse that breaks down sunscreen, makeup, and the day’s sebum without stripping your skin.',
    when: 'Night, on dry skin. Massage in, then rinse or wipe off, then follow with a water-based cleanser.',
    tips: [
      'Part of a “double cleanse” — oil first, then a normal cleanser.',
      'Worth it if you wear sunscreen daily (you should).',
    ],
  },
  'Foaming Cleanser': {
    what: 'A water-based, lathering cleanser that cuts through oil and is great as the second step of a double cleanse.',
    when: 'Morning and/or night. If your skin gets dry, skip it in the morning and just splash with water.',
    tips: [
      'Oily / combination skin loves these.',
      'If you’re dry or sensitive, look for a gentler cream/gel cleanser instead.',
    ],
  },
  'Micellar Water': {
    what: 'Tiny micelles in water that grab makeup and oil. Used with a cotton pad, no rinsing needed.',
    when: 'Anytime you want a no-water quick clean — travel, the gym, lazy nights.',
    tips: [
      'Not a substitute for a proper cleanse if you wore SPF or makeup all day.',
    ],
  },
  'Toner': {
    what: 'A thin liquid that resets your skin’s pH after cleansing and preps it to absorb everything that comes next.',
    when: 'After cleansing, morning and/or night. Optional step.',
    tips: [
      'Skip the alcohol-heavy “astringent” ones — they irritate.',
      'Hydrating toners (with glycerin, hyaluronic acid) are great for dry skin.',
    ],
  },
  'Essence': {
    what: 'A lightweight hydrating layer between toner and serum. Big in Korean skincare for that glassy look.',
    when: 'After toner, before serum. Morning and night.',
    tips: [
      'Optional. Skip if your routine is already long.',
    ],
  },
  'Exfoliant (AHA/BHA)': {
    what: 'A chemical exfoliant that dissolves dead skin cells. AHAs (glycolic, lactic) brighten; BHA (salicylic) unclogs pores.',
    when: 'Night. Start 2–3x a week, not daily, and wear SPF the next day.',
    tips: [
      'BHA = oily/acne. AHA = dull/uneven tone.',
      'Don’t layer with retinol the same night — pick one.',
      'Never the same night as a strong scrub or a clay mask.',
    ],
  },
  'Vitamin C Serum': {
    what: 'An antioxidant that brightens dark spots, fades hyperpigmentation, and boosts SPF’s protection.',
    when: 'Morning, after cleansing/toner and before moisturizer + SPF.',
    tips: [
      'L-ascorbic acid is the strongest form but can sting — start with 10%.',
      'Store somewhere dark. If it turns brown, it’s oxidized — toss it.',
      'Layers fine with sunscreen; don’t pair with strong acids same step.',
    ],
  },
  'Niacinamide Serum': {
    what: 'A B3 derivative that calms redness, balances oil, and shrinks the look of pores. Plays well with everything.',
    when: 'Morning or night. Daily is fine.',
    tips: [
      'Great gateway active for sensitive or acne-prone skin.',
      '5% or less is plenty — higher can cause flushing.',
    ],
  },
  'Hyaluronic Acid': {
    what: 'A humectant that pulls water into the top layers of your skin. Plumps and softens almost immediately.',
    when: 'After cleansing, on damp skin, morning and night. Seal it in with moisturizer.',
    tips: [
      'On dry skin in dry air, it can pull water *out* of you — always damp + moisturizer on top.',
    ],
  },
  'Retinol Serum': {
    what: 'A vitamin A derivative that speeds cell turnover. The best-studied ingredient for anti-aging, acne, and texture.',
    when: 'Night only, after cleansing. Start 1–2x a week, scale up as your skin tolerates it.',
    tips: [
      'Expect 4–6 weeks of dryness/peeling before things settle.',
      'Always wear SPF the next morning — your new skin burns easily.',
      'Don’t layer with acids the same night.',
      'Skip during pregnancy.',
    ],
  },
  'Peptide Serum': {
    what: 'Short chains of amino acids that signal your skin to make more collagen. Gentle alternative or sidekick to retinol.',
    when: 'Morning or night. Daily.',
    tips: [
      'Plays nicely with almost everything — easy add for sensitive skin.',
    ],
  },
  'Spot Treatment': {
    what: 'A targeted dab of benzoyl peroxide, salicylic acid, or sulfur on individual spots, not your whole face.',
    when: 'Night, on the spot only, after serums and before moisturizer.',
    tips: [
      'Less is more — dot it, don’t paint.',
      'Don’t pile it on a fresh spot AND retinol AND BHA — pick one.',
    ],
  },
  'Eye Cream': {
    what: 'A moisturizer formulated for the thin skin around your eyes — usually fragrance-free and richer.',
    when: 'Morning and night, after serums, before moisturizer.',
    tips: [
      'Tap it on with your ring finger — no rubbing.',
      'Optional. A gentle moisturizer works too.',
    ],
  },
  'Moisturizer': {
    what: 'Locks in everything you just put on and reinforces your skin barrier.',
    when: 'Morning and night, last (or second-to-last under SPF).',
    tips: [
      'Oily? Go gel. Dry? Go cream. Combination? Lightweight lotion.',
      'Apply on slightly damp skin to trap more water.',
    ],
  },
  'Night Moisturizer': {
    what: 'A richer cream for nighttime when you’re not layering SPF on top. Often has ceramides or barrier repair ingredients.',
    when: 'Night, last step.',
    tips: [
      'If your day moisturizer feels enough, you don’t *need* a separate night one.',
    ],
  },
  'Face Oil': {
    what: 'Seals in moisture and adds slip. Squalane, jojoba, rosehip are good non-comedogenic picks.',
    when: 'Night, as the very last step (after moisturizer).',
    tips: [
      'Acne-prone? Skip coconut oil. Stick to squalane.',
      'Oily skin can still use a few drops — it won’t make you oilier.',
    ],
  },
  'Sunscreen (SPF)': {
    what: 'The single most important anti-aging step. Blocks UV that causes burns, dark spots, and collagen loss.',
    when: 'Every morning, no exceptions. Reapply every 2 hours if you’re outside.',
    tips: [
      'SPF 30+ daily. SPF 50 if you’re outside a lot.',
      'Two fingers’ worth for your whole face + neck.',
      'Yes, even on cloudy days. Yes, even indoors near windows.',
    ],
  },
  'Moisturizer + SPF': {
    what: 'A 2-in-1 daily moisturizer with built-in sunscreen. Convenient but usually lighter SPF than dedicated sunscreen.',
    when: 'Morning, last step.',
    tips: [
      'If you’re outside for hours, switch to a dedicated SPF.',
      'You still need to use enough — a thin layer = less than the labeled SPF.',
    ],
  },
  'Face Mask': {
    what: 'A high-concentration treatment left on for 5–20 minutes. Can be clay (oil), cream (hydrating), or peel (exfoliating).',
    when: 'Night, 1–2x a week. Skip the night you use other strong actives.',
    tips: [
      'Clay = oily areas only, not full face.',
      'Don’t pair a peel mask with retinol the same night.',
    ],
  },
  'Sheet Mask': {
    what: 'A serum-soaked sheet that drenches your face in hydration for 15–20 minutes.',
    when: 'Anytime your skin feels dry or tired. After cleansing, before moisturizer.',
    tips: [
      'Don’t let it dry on your face — it’ll wick moisture back out.',
      'Massage the leftover essence into your neck.',
    ],
  },
  'Lip Balm': {
    what: 'Seals moisture into your lips and protects against wind and cold. Pick one with petrolatum, lanolin, or shea.',
    when: 'Anytime. End your routine with it, plus reapply through the day.',
    tips: [
      'Add SPF lip balm if you’re outside — lips burn too.',
    ],
  },
}

export function getStepInfo(name) {
  return STEP_INFO[name] || null
}
