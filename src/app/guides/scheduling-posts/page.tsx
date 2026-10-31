import type { Metadata } from 'next';
import Image from 'next/image';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Scheduling & Auto-Posting | EchoMe Guide',
  description:
    'Schedule your posts once, publish everywhere. Connect Instagram, LinkedIn, Facebook, Threads, YouTube, TikTok, and Bluesky, pick platforms per clip or carousel, post now or schedule ahead, and manage everything from the Content Calendar.',
  keywords: [
    'echome scheduling',
    'auto-post to social media',
    'schedule instagram linkedin facebook threads',
    'social media scheduler',
    'content calendar',
  ],
  alternates: { canonical: 'https://tryechome.com/guides/scheduling-posts' },
};

export default function SchedulingPostsGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Scheduling & Auto-Posting',
    description:
      'How to connect your social accounts and schedule posts to Instagram, LinkedIn, Facebook, Threads, YouTube, TikTok, and Bluesky directly from EchoMe. Includes connecting accounts, picking platforms per post, scheduling ahead, and managing scheduled content from the calendar.',
    url: 'https://tryechome.com/guides/scheduling-posts',
    datePublished: '2026-04-24',
    dateModified: '2026-10-31',
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
          Scheduling &amp; Auto-Posting
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Schedule your content once, publish everywhere. Connect your accounts, pick the platforms for
          each post, and let EchoMe auto-publish at the exact time you choose, all from inside your
          Content Kits.
        </p>
        <p className="text-sm text-text-secondary/70 mb-2">4 min read</p>
        <p className="text-xs text-text-secondary/70 mb-8">
          Auto-posting to Instagram, LinkedIn, Facebook, Threads, YouTube, TikTok, and Bluesky is included on <strong>every paid plan</strong> (Echo and up) and during your free kits. Without it, you can still schedule posts and get email reminders at the scheduled time. X, Pinterest, and Google Business stay copy-and-open (we pre-fill the caption and open the native composer). TikTok is video only, so written posts for TikTok are copy-and-open too.
        </p>

        {/* Steps */}
        <section className="space-y-10 mb-10">
          <Step number={1} title="Connect your social accounts first">
            <p>
              Head to <strong>Settings &rarr; Connections</strong>. Click <strong>Connect Account</strong>, pick a
              platform from the list, and authorize EchoMe inside a popup window. If your browser blocks the
              popup, allow popups for the site and try again. Your account stays linked until you disconnect it.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Instagram</strong>: Business or Creator account required (Meta doesn&rsquo;t
                allow API posting to personal profiles).
              </li>
              <li>
                <strong>LinkedIn</strong>: Personal profile <em>or</em> Company Pages both work. If
                you manage multiple pages, you&rsquo;ll get to pick which ones during connect.
              </li>
              <li>
                <strong>Facebook</strong>: Facebook Page (Meta requires business Pages for API posting;
                personal profiles aren&rsquo;t supported by the platform).
              </li>
              <li>
                <strong>Threads</strong>: connect directly. Requires a Threads account linked to an
                Instagram Business or Creator account.
              </li>
              <li>
                <strong>YouTube</strong>: EchoMe publishes your edited clips as YouTube Shorts (vertical
                video, up to 3 minutes). Landscape clips can&rsquo;t be posted.
              </li>
              <li>
                <strong>TikTok</strong>: video clips only. Written posts can&rsquo;t go to TikTok.
              </li>
              <li>
                <strong>Bluesky</strong>: connect through the same popup authorization flow as the platforms above. Short-form posts, up to 300 characters.
              </li>
            </ul>
            <Tip>
              X, Pinterest, and Google Business don&rsquo;t support API auto-post the way the platforms
              above do, so EchoMe handles those via copy-and-open: we pre-fill the caption and open the native
              composer in a new tab. You confirm and post.
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
              move the caption overlay around or restyle it, do that before posting. Your edits get
              burned into the final video.
            </p>
          </Step>

          <Step number={3} title="Pick the platforms you want to post to">
            <p>
              At the bottom of the clip editor you&rsquo;ll see <strong>Post to</strong>. Tap the platforms
              you want this specific piece to go to. Platforms you&rsquo;ve connected can be selected; ones you haven&rsquo;t connected yet stay dimmed.
              Hover a dimmed platform to see why.
            </p>
            <div className="my-4 rounded-lg overflow-hidden border border-border">
              <Image
                src="/guide-screenshots/post-editor.png"
                alt="Platform tabs with Save, Regenerate, Copy, Post now, Schedule"
                width={1458}
                height={482}
                className="w-full h-auto"
              />
            </div>
            <p className="mt-2">
              You can send the same piece to one platform or several at once. Each platform gets
              its own row in the calendar so you can act on them individually later.
            </p>
          </Step>

          <Step number={4} title="Post now, or schedule for later">
            <p>
              Two buttons. Pick one:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>Post now</strong>: publishes immediately on each selected platform. You&rsquo;ll
                get a confirmation toast once it&rsquo;s queued, and the post will show up on your profile
                within a minute or so.
              </li>
              <li>
                <strong>Schedule</strong>: opens a date/time picker. Pick any future time, hit
                <strong> Confirm schedule</strong>, and EchoMe takes it from there.
              </li>
            </ul>
            <div className="my-4 rounded-lg overflow-hidden border border-border">
              <Image
                src="/guide-screenshots/clip-editor.png"
                alt="Post to buttons under a clip"
                width={1284}
                height={1460}
                className="w-full h-auto"
              />
            </div>
            <Tip>
              Posts go out from <em>your</em> account, not a generic third-party &ldquo;via EchoMe&rdquo;
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
              Right after you schedule, the card will show &ldquo;Preparing media&hellip;&rdquo; That&rsquo;s
              EchoMe finalizing your captioned video or composited carousel behind the scenes. Usually takes
              under a minute. Once it&rsquo;s ready, the state flips to <em>Scheduled</em>, and at your
              chosen time it publishes and flips to <em>Posted</em>.
            </p>
            <div className="my-4 rounded-lg overflow-hidden border border-border">
              <Image
                src="/guide-screenshots/scheduling-preparing-media.png"
                alt="Content Calendar week view with Week, Month, and List toggle and scheduled posts by day"
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
                <strong>Retry</strong> a failed post, useful if a platform-side issue (Meta
                verification, rate limit) cleared after your first attempt.
              </li>
              <li>
                <strong>Dismiss</strong> a failed or completed row to hide it from your calendar without
                losing the audit record.
              </li>
              <li>
                <strong>Dismiss event</strong> to remove every platform for that post from the calendar in one click.
              </li>
            </ul>
            <p className="mt-2">
              If the week view header shows a red <strong>N failed</strong> counter, click it.
              You&rsquo;ll get a side panel listing every failed post with <strong>Dismiss</strong> and
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
              For bigger rollouts, use the <strong>AI Schedule</strong> button on a finished Content Kit. EchoMe suggests a
              staggered rollout with best-time defaults. You can edit any time, then click <strong>Use this
              schedule</strong> (or <strong>Create reminders</strong> if auto-post isn&rsquo;t available on your account).
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
            Start Free: 5 Generations
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
