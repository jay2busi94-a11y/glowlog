"use client"

import { useState } from "react"
import Navbar from "./components/Navbar"
import "./landing.css"

// Ingredient pairs for the interactive clash checker. Same logic
// /api/check-ingredients runs across a real shelf — this is the shop
// window for it. General guidance only; the UI says so.
const PAIRS = {
  "aha|retinol":         ["clash", "Not the same night",   "Together they irritate without working better. Alternate: retinol one night, the acid the next."],
  "bp|retinol":          ["clash", "Not at the same time", "Benzoyl peroxide can deactivate retinol. Use them on different nights."],
  "aha|bp":              ["clash", "Too much at once",     "Both strip and resurface. Most skin barriers can't take them on the same night."],
  "retinol|vitc":        ["split", "Better split",         "Vitamin C in the morning, retinol at night. Both work fine — just not stacked."],
  "bp|vitc":             ["split", "Better split",         "Benzoyl peroxide can oxidise vitamin C. Morning C, evening BP."],
  "aha|vitc":            ["split", "Go carefully",         "Both are acidic and can sting together. Alternate days until you know how your skin takes it."],
  "niacinamide|retinol": ["ok",    "Fine together",        "Niacinamide takes the edge off retinol dryness. A common and sensible pairing."],
  "niacinamide|vitc":    ["ok",    "Fine together",        "The old warning about this pair has been debunked. Use both."],
  "aha|niacinamide":     ["ok",    "Fine together",        "No conflict. Watch for stinging and pull back if your skin complains."],
  "bp|niacinamide":      ["ok",    "Fine together",        "Niacinamide helps with the dryness benzoyl peroxide causes."],
}

const ACTIVES = [
  { k: "retinol",     label: "Retinol" },
  { k: "niacinamide", label: "Niacinamide" },
  { k: "vitc",        label: "Vitamin C" },
  { k: "aha",         label: "Glycolic acid" },
  { k: "bp",          label: "Benzoyl peroxide" },
]

const STEPS = [
  { n: "01", name: "Gel cleanser",              meta: "NON-FOAMING",   fx: "-14vw", fy: "118px",  fr: "-5deg" },
  { n: "02", name: "Niacinamide 10% + Zinc 1%", meta: "WATER-LIGHT",   fx: "16vw",  fy: "-64px",  fr: "6deg"  },
  { n: "03", name: "Retinol 0.2% in squalane",  meta: "OIL-BASED",     fx: "-18vw", fy: "52px",   fr: "4deg"  },
  { n: "04", name: "Ceramide moisturiser",      meta: "CREAM",         fx: "13vw",  fy: "-112px", fr: "-7deg" },
  { n: "05", name: "SPF 50+ fluid",             meta: "MORNINGS ONLY", fx: "-11vw", fy: "-38px",  fr: "8deg"  },
]

const INCI = [
  { t: "Aqua" },
  { t: "Niacinamide 10%", active: true },
  { t: "Pentylene Glycol" },
  { t: "Zinc PCA 1%", active: true },
  { t: "Tamarindus Indica Seed Gum" },
  { t: "Xanthan Gum" },
  { t: "Phenoxyethanol" },
]

const TAPE = [
  "AQUA / WATER", "GLYCERIN", "NIACINAMIDE", "PENTYLENE GLYCOL", "DIMETHICONE",
  "CETEARYL ALCOHOL", "RETINOL", "SQUALANE", "TOCOPHEROL", "SODIUM HYALURONATE",
  "ZINC PCA", "XANTHAN GUM", "CITRIC ACID", "PHENOXYETHANOL", "PARFUM / FRAGRANCE",
]
const TAPE_HITS = new Set(["NIACINAMIDE", "RETINOL", "ZINC PCA"])

const TAGS = { clash: "Conflict", split: "Separate them", ok: "Clear" }

export default function Home() {
  const [chosen, setChosen] = useState([])

  function toggle(k) {
    setChosen((prev) => {
      if (prev.includes(k)) return prev.filter((x) => x !== k)
      const next = [...prev, k]
      return next.length > 2 ? next.slice(1) : next
    })
  }

  const hit = chosen.length === 2 ? PAIRS[[...chosen].sort().join("|")] : null
  const state = hit ? (hit[0] === "ok" ? "ok" : "clash") : "idle"
  const verdictColor =
    state === "ok" ? "text-ok" : state === "clash" ? "text-warn" : "text-ink-mute"
  const verdictRing =
    state === "ok" ? "ring-ok/60" : state === "clash" ? "ring-warn/60" : "ring-rule"

  return (
    <main className="lp bg-paper text-ink min-h-screen">
      <a className="lp-skip" href="#order">Skip to content</a>
      <div className="lp-progress" aria-hidden="true" />
      <Navbar />

      {/* ============ HERO ============ */}
      <header className="pt-32 pb-16 sm:pt-40 sm:pb-24">
        <div className="lp-shell grid lg:grid-cols-[1.15fr_.85fr] gap-10 lg:gap-16 items-center">
          <div className="flex flex-col gap-6 items-start">
            <span className="lp-in lp-in-1 font-mono text-[11px] uppercase tracking-[0.13em] text-ink-mute">
              Skincare, in the right order
            </span>

            <h1 className="text-[clamp(40px,7.4vw,72px)] font-extrabold leading-[1.02] tracking-[-0.038em]">
              <span className="lp-line"><span>Skincare is a</span></span>
              <span className="lp-line"><span>sequence, not a</span></span>
              <span className="lp-line"><span>shopping list.</span></span>
            </h1>

            <p className="lp-in lp-in-2 text-[clamp(17px,2vw,20px)] leading-[1.6] text-ink-mute max-w-[46ch]">
              GlowLog reads the back of your bottles, puts them in the order that works,
              and tells you when two of them shouldn&apos;t meet.
            </p>

            <div className="lp-in lp-in-3 flex flex-wrap gap-3 items-center">
              <a href="/signup" className="lp-lift bg-accent text-paper font-bold px-7 py-4 rounded-full inline-flex items-center min-h-[44px]">
                Build my routine
              </a>
              <a href="#order" className="lp-lift bg-card text-ink font-bold px-7 py-4 rounded-full inline-flex items-center min-h-[44px] ring-1 ring-rule">
                See how it works
              </a>
            </div>

            <p className="lp-in lp-in-3 font-mono text-xs text-ink-mute">
              Free · works with what you already own
            </p>
          </div>

          {/* the hero object: the back of a bottle */}
          <div className="lp-label bg-card rounded-[22px] p-6 shadow-[var(--lift-2)] flex flex-col gap-4">
            <div className="flex justify-between items-baseline gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-ink-mute">Ingredients</span>
              <span className="font-mono text-xs text-ink-mute tabular-nums">30 ml</span>
            </div>

            <ol className="lp-inci flex flex-col gap-2 m-0 p-0">
              {INCI.map((row) => (
                <li key={row.t} className={`flex gap-2.5 items-baseline list-none font-mono text-[12.5px] leading-[1.5] text-ink-mute ${row.active ? "is-active" : ""}`}>
                  <span className={`w-1 h-1 rounded-full shrink-0 ${row.active ? "bg-accent" : "bg-rule"}`} />
                  {row.active ? (
                    <b className="font-medium text-ink bg-accent/15 rounded-sm px-1.5 py-0.5">{row.t}</b>
                  ) : (
                    row.t
                  )}
                </li>
              ))}
            </ol>

            <p className="lp-finding text-[13.5px] leading-[1.65] text-ink-mute">
              Two actives found. Goes on after cleansing, before moisturiser.
            </p>

            <div className="lp-scan" aria-hidden="true" />
          </div>
        </div>
      </header>

      {/* ============ THE SORT ============ */}
      <section id="order" className="lp-scene lp-sort-scene">
        <div className="lp-sticky">
          <div className="lp-shell">
            <div className="flex flex-col gap-4 max-w-[46ch] mb-7">
              <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-ink-mute">The order</span>
              <h2 className="text-[clamp(30px,4.6vw,46px)] font-extrabold leading-[1.08] tracking-[-0.032em]">
                Five products. One of these works.
              </h2>
              <div className="lp-caption text-[14.5px] leading-[1.65] text-ink-mute">
                <span className="lp-cap-before">
                  The order you bought them in — thickest first, actives buried, sunscreen lost at the bottom.
                </span>
                <span className="lp-cap-after">
                  Thinnest to thickest, actives where they can absorb, sunscreen last. Same five bottles.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 max-w-[640px]">
              {STEPS.map((s) => (
                <article
                  key={s.n}
                  className="lp-card grid grid-cols-[34px_1fr_auto] gap-4 items-center bg-card rounded-card px-4 py-4 shadow-[var(--lift-1)]"
                  style={{ "--fx": s.fx, "--fy": s.fy, "--fr": s.fr }}
                >
                  <span className="lp-idx font-mono text-xs font-medium text-accent tabular-nums">{s.n}</span>
                  <span className="font-bold text-[15.5px] tracking-[-0.014em]">{s.name}</span>
                  <span className="hidden sm:block font-mono text-xs text-ink-mute">{s.meta}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ THE CLASH ============ */}
      <section className="py-20 sm:py-28">
        <div className="lp-shell">
          <div className="lp-reveal flex flex-col gap-4 max-w-[46ch] mb-9">
            <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-ink-mute">The clash</span>
            <h2 className="text-[clamp(30px,4.6vw,46px)] font-extrabold leading-[1.08] tracking-[-0.032em]">
              Some actives shouldn&apos;t meet.
            </h2>
            <p className="text-[14.5px] leading-[1.65] text-ink-mute">
              Pick any two. This is the same check GlowLog runs across your whole shelf, every night.
            </p>
          </div>

          <div className="lp-reveal grid md:grid-cols-2 gap-8 lg:gap-14 items-start">
            <div className="flex flex-col gap-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-ink-mute">Tap two actives</span>
              <div className="flex flex-wrap gap-2.5">
                {ACTIVES.map((a) => {
                  const on = chosen.includes(a.k)
                  return (
                    <button
                      key={a.k}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(a.k)}
                      className={`text-[14.5px] font-semibold rounded-full px-4 min-h-[44px] transition ring-1 cursor-pointer ${
                        on ? "text-accent bg-accent/10 ring-accent" : "text-ink-mute bg-card ring-rule hover:text-ink"
                      }`}
                    >
                      {a.label}
                    </button>
                  )
                })}
              </div>
              <p className="font-mono text-xs text-ink-mute">General guidance, not medical advice.</p>
            </div>

            <div
              role="status"
              aria-live="polite"
              className={`rounded-card p-6 bg-card ring-1 ${verdictRing} min-h-[172px] flex flex-col justify-center gap-2.5`}
            >
              <span className={`font-mono text-[11px] uppercase tracking-[0.13em] ${verdictColor}`}>
                {hit ? TAGS[hit[0]] : "Waiting"}
              </span>
              <span className="font-bold text-xl tracking-[-0.02em] leading-[1.25]">
                {hit ? hit[1] : "Pick two actives"}
              </span>
              <span className={`text-[15px] ${hit ? "text-ink" : "text-ink-mute"}`}>
                {hit
                  ? hit[2]
                  : "GlowLog checks every pair on your shelf and moves the ones that clash to different nights."}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ THE SCAN ============ */}
      <section className="lp-scene lp-scan-scene">
        <div className="lp-sticky">
          <div className="lp-shell grid md:grid-cols-[minmax(0,340px)_1fr] gap-8 lg:gap-16 items-center">
            <div className="lp-viewport">
              <div className="lp-tape flex flex-col gap-2.5">
                {TAPE.map((t) => (
                  <span
                    key={t}
                    className={`font-mono text-[12.5px] leading-[1.45] ${
                      TAPE_HITS.has(t) ? "text-accent font-medium" : "text-ink-mute"
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="lp-scanline" />
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 max-w-[46ch]">
                <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-ink-mute">The setup</span>
                <h2 className="text-[clamp(30px,4.6vw,46px)] font-extrabold leading-[1.08] tracking-[-0.032em]">
                  Point at the label. That&apos;s it.
                </h2>
                <p className="text-[14.5px] leading-[1.65] text-ink-mute">
                  No typing out ingredient lists. GlowLog reads the back of the bottle, pulls out
                  what&apos;s actually doing the work, and files it on your shelf.
                </p>
              </div>
              <div className="flex flex-wrap md:flex-col gap-3 items-start">
                {[
                  ["Niacinamide", "BRIGHTENING · 10%"],
                  ["Retinol", "RENEWAL · PM ONLY"],
                  ["Zinc PCA", "OIL CONTROL · 1%"],
                ].map(([name, meta]) => (
                  <span key={name} className="lp-found-chip inline-flex items-baseline gap-3 bg-card rounded-full px-5 py-2.5 shadow-[var(--lift-1)]">
                    <b className="font-bold text-[15.5px] tracking-[-0.012em]">{name}</b>
                    <span className="font-mono text-xs text-ink-mute">{meta}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PILLARS ============ */}
      <section className="py-20 sm:py-28">
        <div className="lp-shell">
          <div className="lp-reveal flex flex-col gap-4 max-w-[46ch] mb-9">
            <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-ink-mute">Where you&apos;re starting from</span>
            <h2 className="text-[clamp(30px,4.6vw,46px)] font-extrabold leading-[1.08] tracking-[-0.032em]">Three ways in.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              ["Starting out", "You own nothing yet", "Answer six questions about your skin. Get a short routine you can actually follow tonight, built from products that don't cost a fortune."],
              ["Already stocked", "You own too much", "Add what's in the cabinet. GlowLog sorts it into morning and night, flags what clashes, and tells you what you can stop buying."],
              ["Looking further", "You want what's next", "Say what you're trying to fix and what you'll spend. Suggestions come back with the reason attached, not just a name."],
            ].map(([eyebrow, title, body]) => (
              <article key={title} className="lp-reveal lp-lift bg-card rounded-card p-7 flex flex-col gap-3 shadow-[var(--lift-1)]">
                <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-ink-mute">{eyebrow}</span>
                <h3 className="text-[19px] font-bold tracking-[-0.018em]">{title}</h3>
                <p className="text-[14.5px] leading-[1.65] text-ink-mute">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TRUST + CTA ============ */}
      <section className="pb-24">
        <div className="lp-shell">
          {/* No testimonials — GlowLog has no users yet and inventing them
              would be a lie. All three of these are verifiable. */}
          <ul className="lp-reveal grid md:grid-cols-3 gap-6 mb-10 list-none p-0">
            {[
              ["Costs nothing", "Every feature is free. There's no card field, because there's nothing to charge for."],
              ["Your face stays yours", "Progress photos are stored in your own account and never sent to a third-party image service."],
              ["Drugstore friendly", "Suggestions are ranked on what the ingredients do, not what the bottle costs."],
            ].map(([t, body]) => (
              <li key={t} className="flex flex-col gap-2 pt-4 border-t border-rule">
                <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-ink-mute">{t}</span>
                <p className="text-[14.5px] leading-[1.65] text-ink-mute">{body}</p>
              </li>
            ))}
          </ul>

          <div className="lp-cta-wrap lp-reveal">
            <div className="lp-cta bg-slab text-on-slab rounded-[22px] p-9 sm:p-14 flex flex-col gap-6 items-start">
              <span className="font-mono text-[11px] uppercase tracking-[0.13em] opacity-65">Start tonight</span>
              <h2 className="text-[clamp(30px,4.6vw,46px)] font-extrabold leading-[1.08] tracking-[-0.032em] max-w-[16ch]">
                Start with what&apos;s already in your bathroom.
              </h2>
              <p className="text-[14.5px] leading-[1.65] opacity-70">
                Add three bottles and you&apos;ll have a routine in about two minutes.
              </p>
              <a href="/signup" className="bg-on-slab text-slab font-bold px-7 py-4 rounded-full inline-flex items-center min-h-[44px] hover:brightness-95 transition">
                Build my routine
              </a>
            </div>
          </div>

          <footer className="flex flex-wrap gap-4 items-center pt-12">
            <span className="font-extrabold tracking-[-0.035em]">GlowLog</span>
            <span className="flex-1" />
            <a href="/privacy" className="text-sm text-ink-mute hover:text-ink transition inline-flex items-center min-h-[44px]">Privacy</a>
            <a href="/terms" className="text-sm text-ink-mute hover:text-ink transition inline-flex items-center min-h-[44px]">Terms</a>
            <a href="/about" className="text-sm text-ink-mute hover:text-ink transition inline-flex items-center min-h-[44px]">About</a>
          </footer>
        </div>
      </section>
    </main>
  )
}
