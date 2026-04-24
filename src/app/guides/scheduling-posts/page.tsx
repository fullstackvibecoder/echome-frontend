import type { Metadata } from 'next';
import Image from 'next/image';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Scheduling & Auto-Posting to Instagram, LinkedIn & Facebook | EchoMe Guide',
  description:
    'Schedule your posts once, publish everywhere. Connect Instagram, LinkedIn, and Facebook, pick platforms per clip or carousel, post now or schedule ahead, and manage everything from the Content Calendar.',
  keywords: [
    'echome scheduling',
    'auto-post to social media',
    'schedule instagram linkedin facebook',
    'social media scheduler',
    'content calendar',
  ],
  alternates: { canonical: 'https://tryechome.com/guides/scheduling-posts' },
};

export default function SchedulingPostsGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Scheduling & Auto-Posting to Instagram, LinkedIn & Facebook',
    description:
      'How to connect your social accounts and schedule posts to Instagram, LinkedIn, and Facebook directly from EchoMe. Includes connecting accounts, picking platforms per post, scheduling ahead, and managing scheduled content from the calendar.',
    url: 'https://tryechome.com/guides/scheduling-posts',
    datePublished: '2026-04-24',
    dateModified: '2026-04-24',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Scheduling & Auto-Posting',
          item: 'https://tryechome.com/guides/scheduling-posts',
        },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <JsonLd data={jsonLd} />
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <a href="/guides" className="text-sm text-accent hover:underline">
            &larr; All Guides
          </a>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Scheduling &amp; Auto-Posting to Instagram, LinkedIn &amp; Facebook
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Schedule your content once, publish everywhere. Connect your accounts, pick the platforms for
          each post, and let EchoMe auto-publish at the exact time you choose &mdash; all from inside your
          Content Kits.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">4 min read</p>

        {/* Steps */}
        <section className="space-y-10 mb-10">
          <Step number={1} title="Connect your social accounts first">
            <p>
              Head to <strong>Settings &rarr; Connections</strong>. You&rsquo;ll see a card for each supported
              platform. Click <strong>Connect</strong> and authorize EchoMe inside a popup window. Your account
              stays linked until you disconnect it.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Instagram</strong> &mdash; Business or Creator account required (Meta doesn&rsquo;t
                allow API posting to personal profiles).
              </li>
              <li>
                <strong>LinkedIn</strong> &mdash; Personal profile <em>or</em> Company Pages both work. If
                you manage multiple pages, you&rsquo;ll get to pick which ones during connect.
              </li>
              <li>
                <strong>Facebook</strong> &mdash; Facebook Page (Meta requires business Pages for API posting;
                personal profiles aren&rsquo;t supported by the platform).
              </li>
            </ul>
            <Tip>
              Threads isn&rsquo;t in this list on purpose &mdash; most people have Instagram auto-publish to
              Threads in their Meta account settings, and that&rsquo;s a cleaner path than a separate
              connection.
            </Tip>
          </Step>

          <Step number={2} title="Open a Content Kit and pick a clip or carousel">
            <p>
              From your Content Kit, click into any clip, carousel, or reel. This opens the editor where
              you&rsquo;ll see the video with burned-in captions, the suggested caption copy, and the
              platform picker.
            </p>
            <p className="mt-2">
              Each clip gets its own tailored caption and its own position/style settings. If you want to
              move the caption overlay around or restyle it, do that before posting &mdash; your edits get
              burned into the final video.
            </p>
          </Step>

          <Step number={3} title="Pick the platforms you want to post to">
            <p>
              At the bottom of the clip editor you&rsquo;ll see <strong>Post to</strong>. Tap the platforms
              you want this specific piece to go to. Connected platforms light up white; unsupported or
              unconnected ones stay dimmed with a coming-soon feel.
            </p>
            <div className="my-4 rounded-lg overflow-hidden border border-border">
              <Image
                src="/guide-screenshots/scheduling-post-buttons.png"
                alt="Platform picker with Instagram, LinkedIn, and Facebook selected, plus Post now and Schedule buttons"
                width={1600}
                height={900}
                className="w-full h-auto"
              />
            </div>
            <p className="mt-2">
              You can send the same piece to one platform, two, or all three at once. Each platform gets
              its own row in the calendar so you can act on them individually later.
            </p>
          </Step>

          <Step number={4} title="Post now, or schedule for later">
            <p>
              Two buttons &mdash; pick one:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Post now</strong> &mdash; publishes immediately on each selected platform. You&rsquo;ll
                get a confirmation toast once it&rsquo;s queued, and the post will show up on your profile
                within a minute or so.
              </li>
              <li>
                <strong>Schedule</strong> &mdash; opens a date/time picker. Pick any future time in the next
                30 days, hit <strong>Confirm schedule</strong>, and EchoMe takes it from there.
              </li>
            </ul>
            <div className="my-4 rounded-lg overflow-hidden border border-border">
              <Image
                src="/guide-screenshots/scheduling-clip-post-actions.png"
                alt="Clip editor showing the video on the left with burned-in captions and the post caption, platform picker, and Post now / Schedule buttons on the right"
                width={1600}
                height={1200}
                className="w-full h-auto"
              />
            </div>
            <Tip>
              Posts go out from <em>your</em> account &mdash; not a generic third-party &ldquo;via EchoMe&rdquo;
              footer. It looks like you posted it, because you did.
            </Tip>
          </Step>

          <Step number={5} title="Track everything in the Content Calendar">
            <p>
              Open <strong>Calendar</strong> in the sidebar. Every scheduled piece shows up in the week or
              month view, color-coded by which Content Kit it came from. Each card shows tiny platform
              icons that tell you exactly what&rsquo;s happening per platform.
            </p>
            <p className="mt-2">
              Right after you schedule, the card will show &ldquo;Preparing media&rdquo; &mdash; that&rsquo;s
              EchoMe finalizing your captioned video or composited carousel behind the scenes. Usually takes
              under a minute. Once it&rsquo;s ready, the state flips to <em>Scheduled</em>, and at your
              chosen time it publishes and flips to <em>Posted</em>.
            </p>
            <div className="my-4 rounded-lg overflow-hidden border border-border">
              <Image
                src="/guide-screenshots/scheduling-preparing-media.png"
                alt="Event preview modal showing a reel scheduled for Sat Apr 25 9:12 AM with LinkedIn, Facebook, and Instagram all in Preparing media state"
                width={1600}
                height={1500}
                className="w-full h-auto"
              />
            </div>
          </Step>

          <Step number={6} title="Manage, retry, or dismiss posts from the calendar">
            <p>
              Click any card on the calendar to open its detail view. From there you can:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Cancel</strong> a scheduled or preparing post before it goes out.
              </li>
              <li>
                <strong>Retry</strong> a failed post &mdash; useful if a platform-side issue (Meta
                verification, rate limit) cleared after your first attempt.
              </li>
              <li>
                <strong>Dismiss</strong> a failed or completed row to hide it from your calendar without
                losing the audit record.
              </li>
              <li>
                <strong>Dismiss the whole event</strong> with one click from the modal header.
              </li>
            </ul>
            <p className="mt-2">
              If your calendar header shows a red <strong>N failed</strong> counter, click it &mdash;
              you&rsquo;ll get a side panel listing every failed post with <strong>Dismiss</strong> and
              <strong> Dismiss all</strong> so you can clear stale issues in one click.
            </p>
          </Step>

          <Step number={7} title="Drag to reschedule, or spread content across a week">
            <p>
              On the week view you can <strong>drag a scheduled event</strong> to a different day and EchoMe
              re-times every platform in that fanout together. Great for shuffling a plan after your week
              starts.
            </p>
            <p className="mt-2">
              For bigger rollouts, use the <strong>AI Schedule</strong> button on any Content Kit to
              staggered-post a full week of content from one kit with a single click. (Another layer of
              this is coming soon &mdash; you&rsquo;ll love it.)
            </p>
          </Step>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to never worry about content again?</p>
          <a
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors"
          >
            Start Free &mdash; 2 Generations
          </a>
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
