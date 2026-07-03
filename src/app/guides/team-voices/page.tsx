import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Team Voices: Multiple Voice Profiles | EchoMe Guide',
  description: 'Create separate voice profiles for each team member or client. Each voice builds its own waveform and knowledge base. Available on the Echo Teams plan.',
  keywords: ['echome teams', 'multiple voices', 'agency content', 'team voice profiles', 'echo teams'],
  alternates: { canonical: 'https://tryechome.com/guides/team-voices' },
};

export default function TeamVoicesGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Team Voices: Multiple Voice Profiles',
    description: 'Create separate voice profiles for each team member or client. Each voice builds its own waveform and knowledge base. Available on the Echo Teams plan.',
    url: 'https://tryechome.com/guides/team-voices',
    datePublished: '2026-04-15',
    dateModified: '2026-07-03',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Team Voices', item: 'https://tryechome.com/guides/team-voices' },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <JsonLd data={jsonLd} />
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <a href="/guides" className="text-sm text-accent hover:underline">&larr; All Guides</a>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Team Voices: Multiple Voice Profiles
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Echo Teams lets you create separate voice profiles for every team member, brand, or client. Each voice builds its own unique waveform and knowledge base, so content always sounds like the right person.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          3 min read
        </p>

        {/* Callout box */}
        <div className="mb-10 p-5 bg-accent/5 border border-accent/20 rounded-xl">
          <p className="text-sm text-text-secondary">Team Voices requires the <strong>Echo Teams</strong> plan. $47/voice/month with a 2-voice minimum. Add as many voices as you need, no upper cap.</p>
        </div>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Upgrade to Echo Teams">
            <p>The Echo Teams plan is $47 per voice per month with a 2-voice minimum and no upper cap. Add voices any time as your team grows. Upgrade from your account settings or the pricing page.</p>
          </Step>

          <Step number={2} title="Go to Team Voices in the sidebar">
            <p>Once you&apos;re on Echo Teams, the Team Voices section appears in your sidebar. This is where you manage all voice profiles for your team.</p>
          </Step>

          <Step number={3} title="Create a new voice profile">
            <p>Click to create a new voice profile. Name it, and assign it to a specific team member, brand, or client. Each profile is completely independent.</p>
          </Step>

          <Step number={4} title="Feed each voice separately">
            <p>Upload content specific to each voice: videos, emails, blog posts, social media examples. Each voice profile builds its own knowledge base from the material you provide.</p>
            <Tip>Each voice profile builds its own unique waveform. The more you feed it, the more distinct it becomes.</Tip>
          </Step>

          <Step number={5} title="Select which voice to use when generating">
            <p>When creating content, choose which voice profile to use. The generated content will match that voice&rsquo;s style, tone, and knowledge base, not a generic average of all voices.</p>
          </Step>

          <Step number={6} title="Filter Your Library by voice">
            <p>See what each voice has produced. Filter Your Library by voice profile to review, compare, and manage content across your entire team.</p>
            <Tip>Great for agencies managing multiple clients. Each client gets their own voice without cross-contamination.</Tip>
          </Step>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Manage multiple voices from one account.</p>
          <a href="/auth/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">Start Free: 5 Content Kits</a>
          <p className="text-xs text-text-secondary/70 mt-3">No credit card required.</p>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-6 mt-8 text-center text-xs text-text-secondary">
          <p>Need help? Use the chat widget in the bottom-right corner of any EchoMe page.</p>
        </footer>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-text-primary mb-1">{title}</h3>
        <div className="text-sm text-text-secondary">{children}</div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
      <strong>Tip:</strong> {children}
    </div>
  );
}
