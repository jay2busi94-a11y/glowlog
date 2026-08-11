import AppNavbar from '../components/AppNavbar'

export const metadata = {
  title: 'Terms of Service — GlowLog',
  description: "The rules of using GlowLog.",
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper text-ink px-4 app-page-pad-bottom overflow-hidden">
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <AppNavbar />

      <div className="relative z-10 max-w-3xl mx-auto app-page-pad-top">

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-ink-mute text-sm">Last updated: June 5, 2026</p>
        </div>

        <div className="flex flex-col gap-6 text-ink leading-relaxed">

          <section>
            <p className="text-sm">
              By using GlowLog you agree to these terms. We've kept them as short and readable as we
              could. If you don't agree, please don't use the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">1. What GlowLog is</h2>
            <p className="text-sm">
              GlowLog is a personal skincare tracker. You can build routines, log how your skin feels
              each day, save a catalog of products, view your progress over time, follow other users,
              and ask an AI assistant for general guidance. It is a tool, not a medical service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">2. Not medical advice</h2>
            <p className="text-sm">
              GlowLog's AI features (Fix My Skin, product suggestions, ingredient checks, per-product
              tips) generate general skincare guidance based on patterns and on the information you
              provide. <strong className="text-ink">They are not medical advice and do not replace a
              dermatologist.</strong> If you have a painful, persistent, spreading, or worsening skin
              condition, or if a product irritates you, stop using it and consult a qualified
              healthcare provider.
            </p>
            <p className="text-sm mt-2">
              The AI can be wrong. Always check ingredients on the actual product before trying
              something new, especially if you have allergies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">3. Your account</h2>
            <ul className="flex flex-col gap-2 text-sm pl-5 list-disc marker:text-accent">
              <li>You must be at least 13 years old to use GlowLog.</li>
              <li>Provide a real email so we can recover your account if needed.</li>
              <li>You're responsible for keeping your password safe.</li>
              <li>One person per account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">4. What you can and can't do</h2>
            <p className="text-sm mb-2">Don't use GlowLog to:</p>
            <ul className="flex flex-col gap-2 text-sm pl-5 list-disc marker:text-accent">
              <li>Impersonate anyone else, or claim a username that suggests you're staff or an authority.</li>
              <li>Upload photos of other people without their consent, or any imagery that's illegal, threatening, or violates copyright.</li>
              <li>Harass other users.</li>
              <li>Try to break, abuse, or reverse-engineer the AI features (rate limits exist for a reason).</li>
              <li>Try to access another user's private data.</li>
            </ul>
            <p className="text-sm mt-2">
              We reserve the right to suspend or delete accounts that violate these rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">5. Your content</h2>
            <p className="text-sm">
              You own the routines, products, notes, and photos you put into GlowLog. By uploading
              them you give us a non-exclusive license to store and display them so the app can work.
              When you delete content or your account, that license ends and we delete the data.
            </p>
            <p className="text-sm mt-2">
              If you set your profile to public, other signed-in users can see your routines, product
              shelf, bio, and concerns. You can switch your profile to private at any time on the
              Settings page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">6. Free and Premium tiers</h2>
            <p className="text-sm">
              GlowLog has a free tier and a Premium tier. The free tier limits how many AI features
              you can run per day (currently: 5 Fix My Skin replies, 3 product suggestions, 5 photo
              scans). Premium removes these limits and unlocks longer progress history. Paid Premium
              is not yet enabled — Premium access is currently granted via an unlock code only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">7. Availability</h2>
            <p className="text-sm">
              We try to keep GlowLog running and your data safe, but we can't guarantee perfect
              uptime. The service is provided "as is" without warranties. We're not liable for any
              losses arising from using the app, to the maximum extent allowed by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">8. Termination</h2>
            <p className="text-sm">
              You can delete your account at any time from Settings → Danger zone → Delete account.
              We may suspend or close accounts that abuse the service or violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">9. Changes to these terms</h2>
            <p className="text-sm">
              We may update these terms. If we change something material, we'll let you know in the
              app. Continuing to use GlowLog after a change means you accept the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">10. Contact</h2>
            <p className="text-sm">
              Reach us at <span className="text-accent">jayflare94@gmail.com</span>.
            </p>
          </section>

        </div>

        <div className="mt-10 flex gap-5 text-sm text-ink-mute">
          <a href="/privacy" className="hover:text-ink transition">Privacy Policy</a>
          <a href="/about" className="hover:text-ink transition">About</a>
          <a href="/dashboard" className="hover:text-ink transition ml-auto">Back to dashboard</a>
        </div>

      </div>
    </main>
  )
}
