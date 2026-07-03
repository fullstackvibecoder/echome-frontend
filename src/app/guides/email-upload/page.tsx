import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'How to Upload Emails to EchoMe | Guide',
  description: 'Step-by-step guide to exporting your sent emails from Gmail and importing them into EchoMe to train your voice profile.',
  alternates: { canonical: 'https://tryechome.com/guides/email-upload' },
};

export default function EmailUploadGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Upload Emails to EchoMe',
    description: 'Step-by-step guide to exporting your sent emails from Gmail and importing them into EchoMe to train your voice profile.',
    url: 'https://tryechome.com/guides/email-upload',
    datePublished: '2026-04-01',
    dateModified: '2026-07-03',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    video: {
      '@type': 'VideoObject',
      name: 'How to Upload Emails to EchoMe - Video Walkthrough',
      description: 'Step-by-step video walkthrough showing how to export sent emails from Gmail via Google Takeout and upload them to EchoMe.',
      thumbnailUrl: 'https://cdn.loom.com/sessions/thumbnails/78b0e064185a440d9edc3fb2015debff-with-play.gif',
      embedUrl: 'https://www.loom.com/embed/78b0e064185a440d9edc3fb2015debff',
      uploadDate: '2026-04-01',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Upload Emails', item: 'https://tryechome.com/guides/email-upload' },
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
          How to Upload Emails to EchoMe
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Your sent emails are one of the best sources for training your voice. Here&apos;s exactly how to export them from Gmail and upload them to EchoMe, in under 3 minutes.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          3 min read &middot; Video walkthrough included
        </p>

        {/* Tier-gate callout */}
        <div className="mb-10 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="text-sm text-amber-800 dark:text-amber-200"><strong>Plan required:</strong> Email import is available on Echo Studio and higher. Free and Echo plans will hit an upgrade prompt when uploading the .mbox file. <a href="/guides/plans" className="underline">Compare plans</a>.</p>
        </div>

        {/* Video embed */}
        <div className="mb-10 rounded-xl overflow-hidden border border-border">
          <div style={{ position: 'relative', paddingBottom: '64.98%', height: 0 }}>
            <iframe
              src="https://www.loom.com/embed/78b0e064185a440d9edc3fb2015debff"
              frameBorder="0"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              title="How to Upload Emails to EchoMe - Video Walkthrough"
            />
          </div>
        </div>

        {/* Why this matters */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Why sent emails?</h2>
          <p className="text-text-secondary mb-3">
            Your sent emails are full of <strong className="text-text-primary">your actual voice</strong>: the way you greet people, explain things, follow up, and close conversations. Unlike blog posts or social media, emails are unfiltered. They&apos;re how you actually communicate.
          </p>
          <p className="text-text-secondary">
            But there&apos;s a catch: <strong className="text-text-primary">don&apos;t just dump your entire inbox</strong>. You want your <em>sent</em> emails from the last 6 months. That&apos;s the sweet spot for capturing your current voice without overwhelming the system.
          </p>
        </section>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <h2 className="text-xl font-semibold text-text-primary">Step-by-step guide (Gmail)</h2>

          <Step number={1} title="Open your Sent folder">
            <p>Go to Gmail and click on the <strong>Sent</strong> folder in the left sidebar. You only want emails <em>you</em> wrote, not ones sent to you.</p>
          </Step>

          <Step number={2} title="Search for your sent emails">
            <p>Use the search bar to filter. Click the search options dropdown and set:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-text-secondary">
              <li><strong>From:</strong> your email address</li>
              <li><strong>Date within:</strong> 6 months</li>
              <li><strong>Search:</strong> Sent Mail</li>
            </ul>
            <Tip>6 months gives Echo enough signal to map your voice without picking up patterns from years ago that no longer represent you.</Tip>
          </Step>

          <Step number={3} title="Create a label for download">
            <p>Select all the emails from your search results, then create a new label (something like <strong>&quot;For Download&quot;</strong>). This label is what Google Takeout will use to export just these emails instead of your entire mailbox.</p>
          </Step>

          <Step number={4} title="Go to Google Takeout">
            <p>Head to <strong>takeout.google.com</strong>. This is Google&apos;s official tool for exporting your data. Click <strong>&quot;Deselect all&quot;</strong> first. You don&apos;t want to download everything.</p>
          </Step>

          <Step number={5} title="Select only your labeled emails">
            <p>Scroll down to <strong>Mail</strong>, check the box, then click <strong>&quot;All Mail data included&quot;</strong> and change it to only include your <strong>&quot;For Download&quot;</strong> label. This keeps the export small and focused.</p>
            <Tip>This is the step most people miss. If you skip filtering by label, you&apos;ll get a massive file with every email you&apos;ve ever received, which is not what Echo needs.</Tip>
          </Step>

          <Step number={6} title="Export and download">
            <p>Click <strong>&quot;Next step&quot;</strong>, choose <strong>&quot;Send download link via email&quot;</strong>, select <strong>.zip</strong> format, and hit <strong>&quot;Create export&quot;</strong>. Google will email you when it&apos;s ready (usually within a few minutes).</p>
          </Step>

          <Step number={7} title="Download and unzip">
            <p>Open the email from Google Takeout and click the download button. Save the <strong>.zip file</strong> to your computer, then <strong>unzip it</strong>. Inside the extracted folder, look for a file ending in <strong>.mbox</strong>. That&apos;s what you&apos;ll upload to EchoMe.</p>
            <Tip>The .mbox file is usually inside a &quot;Mail&quot; folder within the extracted zip. It may be named after your label (e.g. &quot;For Download.mbox&quot;). Apple Mail exports also work. The file may be named just <code>mbox</code> with no extension. EchoMe accepts both. EchoMe imports up to 100 emails per upload, so keep your label filtered to a focused date range rather than exporting everything at once.</Tip>
          </Step>

          <Step number={8} title="Upload to EchoMe">
            <p>Go to <strong>Your Voice</strong> in EchoMe. Near the top of the page there&apos;s a chat-style input where you&apos;d type or paste content. Click the <strong>paperclip icon</strong> at the bottom of that input and pick the <strong>.mbox file</strong> you extracted, or just <strong>drag and drop the file onto the input</strong>. EchoMe will parse your emails and start processing them.</p>
            <Tip>You won&apos;t see a separate &quot;Email&quot; button or an &quot;Import my Writing&quot; card. That older UI was replaced by the single chat input. The paperclip / drag-drop is the way in for everything: PDFs, Word docs, voice recordings, and .mbox exports.</Tip>
          </Step>

          <Step number={9} title="Wait for processing">
            <p>You&apos;ll see a short progress bar while EchoMe reads the file and uploads the emails it finds. The upload takes a minute or two depending on how many emails you have.</p>
          </Step>

          <Step number={10} title="Confirm your upload">
            <p>Once done, your emails appear as a new source in the <strong>Sources</strong> drawer on the Your Voice page. Open it to confirm the batch landed. Check your voice strength score in the header. It should have jumped up with all that new content.</p>
          </Step>
        </section>

        {/* Common mistakes */}
        <section className="mb-10 p-5 bg-bg-secondary rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Common mistakes to avoid</h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li><strong className="text-text-primary">Uploading your entire mailbox:</strong> Export only your Sent folder, filtered to the last 6 months. Huge files will time out or include other people&apos;s writing.</li>
            <li><strong className="text-text-primary">Forgetting to filter by label in Takeout:</strong> If you don&apos;t select your specific label, Google exports everything. Use the label filter.</li>
            <li><strong className="text-text-primary">Uploading inbox emails:</strong> Echo learns from <em>your</em> writing. Inbox emails are written by other people. That&apos;s their voice, not yours.</li>
            <li><strong className="text-text-primary">Expecting every email to import:</strong> EchoMe imports up to 100 emails per upload. If your label has more, narrow the date range in Gmail before you export so the most relevant emails make the cut.</li>
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <a
            href="/app/voice"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors"
          >
            Go to Your Voice &rarr;
          </a>
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
