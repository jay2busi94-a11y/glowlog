import AppNavbar from '../components/AppNavbar'

export const metadata = {
  title: 'Privacy Policy — GlowLog',
  description: "How GlowLog collects, uses, and protects your data.",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper text-ink px-4 app-page-pad-bottom overflow-hidden">
      <AppNavbar />

      <div className="relative z-10 max-w-3xl mx-auto app-page-pad-top">

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-ink-mute text-sm">Last updated: June 5, 2026</p>
        </div>

        <div className="prose-invert flex flex-col gap-6 text-ink leading-relaxed">

          <section>
            <p className="text-sm">
              This Privacy Policy explains what data GlowLog collects, why we collect it,
              who we share it with, and the choices you have. We try to write this in plain
              English. If anything's unclear, contact us at <span className="text-accent">jayflare94@gmail.com</span>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">What we collect</h2>
            <ul className="flex flex-col gap-2 text-sm pl-5 list-disc marker:text-accent">
              <li><strong className="text-ink">Account info</strong> — your email and a hashed password (we never see your raw password). Optionally: display name, username, bio, avatar emoji or photo.</li>
              <li><strong className="text-ink">Skin profile</strong> — skin type, age range, and concerns you choose during onboarding or on /profile. Used to personalize advice.</li>
              <li><strong className="text-ink">Routines</strong> — the morning + night routines you build, the steps in them, and which products you link to each step.</li>
              <li><strong className="text-ink">Products</strong> — the catalog of products you save (brand, name, category, notes, photo if you upload one).</li>
              <li><strong className="text-ink">Daily logs</strong> — the date, skin rating (1–5), note, and step check-offs for each day. Plus a photo if you upload one.</li>
              <li><strong className="text-ink">Photos</strong> — product photos, skin progress photos, and avatar photos you upload are stored in our private storage and served via URLs that can't be guessed.</li>
              <li><strong className="text-ink">Social graph</strong> — who you follow and who follows you.</li>
              <li><strong className="text-ink">AI usage counts</strong> — how many AI features you've used per day, stored in your browser (not on our servers) to enforce the free-tier daily limit.</li>
              <li><strong className="text-ink">Auth session</strong> — a cookie / token so you stay signed in.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">What we DON'T collect</h2>
            <ul className="flex flex-col gap-2 text-sm pl-5 list-disc marker:text-accent">
              <li>Your location.</li>
              <li>Your contacts.</li>
              <li>Analytics / ad-tracking data. There are no third-party trackers in GlowLog.</li>
              <li>Payment info — we don't accept payments yet.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">Who we share it with</h2>
            <p className="text-sm mb-3">We don't sell your data. We share it only with these three vendors, who are required to use it solely to help us run GlowLog:</p>
            <ul className="flex flex-col gap-2 text-sm pl-5 list-disc marker:text-accent">
              <li><strong className="text-ink">Supabase</strong> — our database + authentication + photo storage host.</li>
              <li><strong className="text-ink">Anthropic</strong> — when you use Fix My Skin, AI suggestions, or a scanner, we send the relevant inputs (your concerns, a photo URL, your question) to Anthropic's Claude API so it can respond. Anthropic processes the request and does not train models on your data per their API terms.</li>
              <li><strong className="text-ink">Vercel</strong> — hosts the GlowLog web app and serves the pages to you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">Your photos and visibility</h2>
            <p className="text-sm">
              Photos are stored in private storage buckets, scoped to your user ID. Anyone with the
              direct URL of a photo can view it (URLs use random UUIDs and aren't enumerable), but the
              storage itself can't be listed.
            </p>
            <p className="text-sm mt-2">
              Your profile is <strong className="text-ink">public by default</strong>: your display
              name, username, avatar, follower counts, concerns, bio, routines, and product shelf are
              visible to other signed-in users. You can switch your profile to <strong className="text-ink">private</strong> on the Settings page, which hides your routines, products, bio, and
              concerns from everyone except you. Your name + avatar + follower counts stay visible so
              people can still find and follow you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">Your rights</h2>
            <ul className="flex flex-col gap-2 text-sm pl-5 list-disc marker:text-accent">
              <li><strong className="text-ink">See your data</strong> — everything we store is visible somewhere in the app (your profile, catalog, log history).</li>
              <li><strong className="text-ink">Edit your data</strong> — change or remove anything via the relevant page.</li>
              <li><strong className="text-ink">Delete your account</strong> — Settings → Danger zone → Delete account. Permanently removes your profile, routines, products, skin logs, follows, and all photos.</li>
              <li><strong className="text-ink">Stay signed out</strong> — sign out from the avatar dropdown.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">Data retention</h2>
            <p className="text-sm">
              We keep your data for as long as your account exists. When you delete your account, we
              permanently delete the rows in our database (within seconds) and the photos in storage
              (within minutes). We do not maintain backups beyond what Supabase keeps as part of its
              standard service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">Children</h2>
            <p className="text-sm">
              GlowLog is not directed at children under 13. We do not knowingly collect data from
              users under 13. If you believe we have, contact us and we'll remove it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">Changes</h2>
            <p className="text-sm">
              We'll update this page when we change how data is handled. The date at the top reflects
              the last change. For material changes that affect what we collect or share, we'll notify
              you in the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-2">Contact</h2>
            <p className="text-sm">
              Email <span className="text-accent">jayflare94@gmail.com</span> with privacy questions
              or to request a copy or deletion of your data.
            </p>
          </section>

        </div>

        <div className="mt-10 flex gap-5 text-sm text-ink-mute">
          <a href="/terms" className="hover:text-ink transition">Terms of Service</a>
          <a href="/about" className="hover:text-ink transition">About</a>
          <a href="/dashboard" className="hover:text-ink transition ml-auto">Back to dashboard</a>
        </div>

      </div>
    </main>
  )
}
