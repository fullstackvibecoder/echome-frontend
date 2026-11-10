import type { Metadata } from 'next';
import Link from 'next/link';
import { WorksWithClaudeBadge } from '@/components/marketing/WorksWithClaudeBadge';
import { ClaudeDemoVideo } from '@/components/marketing/ClaudeDemoVideo';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { spaceGrotesk } from '@/lib/fonts';

const SITE_URL = 'https://www.tryechome.com';

export const metadata: Metadata = {
  title: 'Transfer what Claude knows about you into Echo | EchoMe',
  description:
    'Ask Claude to write a profile of you, paste it into EchoMe, and keep the voice rules you agree with. Your posts start closer to how you write.',
  alternates: { canonical: `${SITE_URL}/claude` },
  openGraph: { type: 'website', title: 'Transfer what Claude knows about you into Echo', url: `${SITE_URL}/claude` },
};

const STEPS = [
  {
    title: 'Click Start transfer in Create.',
    body: 'Your AI chat opens with our request already filled in. Send it.',
  },
  {
    title: 'Copy the profile it writes.',
    body: 'It comes back as one block: what you do, your audience, phrases you use, words you never use, and format rules.',
  },
  {
    title: 'Paste it into Echo and tick what to keep.',
    body: 'Echo turns it into voice rules. You keep the ones that are true. Every post after that follows them.',
  },
];

const CONTROL = [
  'Nothing is saved as a rule until you tick it.',
  'It is a copy and paste. Echo never connects to your Claude account.',
  'You can edit or remove any rule later in your voice settings.',
];

export default function ClaudeTransferPage() {
  return (
    <div className={`${spaceGrotesk.variable} min-h-screen bg-home-paper text-home-ink`}>
      <header>
        <nav aria-label="Main" className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link href="/" className="font-grotesk text-2xl font-bold tracking-[-0.03em] text-home-ink">
            EchoMe
          </Link>
          <a href="/auth/signup" className="rounded-full bg-home-ink px-5 py-3 font-semibold text-home-paper transition-opacity hover:opacity-85">
            Start free
          </a>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 pb-6 pt-12 text-center sm:px-6 sm:pt-16">
          <WorksWithClaudeBadge href="/claude" />
          <h1 className="mt-6 font-grotesk text-[clamp(40px,7vw,80px)] font-bold leading-[0.95] tracking-[-0.04em]">
            Bring what Claude knows about you into Echo.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-home-muted">
            Already use Claude? It knows what you do and how you talk. Ask it for a profile, paste it into Echo, and your posts start closer to your voice.
          </p>
        </section>

        <section className="px-4 pb-8 pt-6 sm:px-6">
          <ClaudeDemoVideo />
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="font-grotesk text-3xl font-semibold tracking-[-0.02em] md:text-4xl">How it works</h2>
          <ol className="mt-8 space-y-8">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <p className="text-lg font-semibold">
                  {i + 1}. {s.title}
                </p>
                <p className="mt-2 text-home-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="font-grotesk text-3xl font-semibold tracking-[-0.02em] md:text-4xl">You stay in charge</h2>
          <ul className="mt-8 space-y-4 text-lg text-home-muted">
            {CONTROL.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-grotesk text-4xl font-bold tracking-[-0.03em] md:text-5xl">Posts that sound even more like you.</h2>
          <div className="mt-8 flex flex-col items-center gap-4">
            <a href="/auth/signup" className="rounded-full bg-home-ink px-7 py-4 text-[17px] font-semibold text-home-paper transition-opacity hover:opacity-85">
              Start free
            </a>
            <a href="/app?transfer=claude" className="text-home-muted underline underline-offset-4 hover:text-home-ink">
              Already have an account? Start the transfer
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
