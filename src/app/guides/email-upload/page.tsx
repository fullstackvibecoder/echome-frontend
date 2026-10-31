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
    dateModified: '2026-10-31',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
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
          Your sent emails are one of the best sources for training your voice. Here&apos;s exactly how to export them from Gmail and upload them to EchoMe, in a few minutes.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          3 min read
        </p>

        {/* Why email callout */}
        <div className="mb-10 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="text-sm text-amber-800 dark:text-amber-200"><strong>Included on every plan.</strong> Your sent emails are how you actually talk to clients, so Echo writes posts that sound like you on a good day with a client, not like a marketer.</p>
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
            <Tip>The .mbox file is usually inside a &quot;Mail&quot; folder within the extracted zip. It may be named after your label (e.g. &quot;For Download.mbox&quot;). Apple Mail exports also work. The file may be named just <code>mbox</code> with no extension. EchoMe accepts both. EchoMe keeps up to 100 emails from each upload. It favors longer emails you wrote, newest first, and skips calendar replies and auto-replies. For a very large mailbox, a focused date range makes the export faster.</Tip>
          </Step>

          <Step number={8} title="Upload to EchoMe">
            <p>Open the <strong>Create</strong> page in EchoMe. The Echo bar at the top says <em>&quot;Talk, type, or drop a file.&quot;</em> Click the <strong>paperclip icon</strong> (&quot;Attach a video, PDF, or document&quot;) and pick the <strong>.mbox file</strong> you extracted, or <strong>drag and drop the file onto the bar</strong>.</p>
            <p className="mt-2">Echo will show what it plans to do with the file. Check that it says <strong>Adding to your Voice</strong>, then click <strong>Add to Voice</strong>. If it picked something else, switch it before you confirm.</p>
            <Tip>The Your Voice page no longer has its own upload box. Everything goes in through the Echo bar: .mbox exports, PDFs, Word docs, text files, and audio.</Tip>
          </Step>

          <Step number={9} title="Wait for processing">
            <p>EchoMe reads the file in your browser, then uploads the emails it finds in batches. Stay on the page until you see <strong>Added to your Voice</strong> with the number of emails. It usually takes a minute or two.</p>
            <p className="mt-2">If you see &quot;No emails found,&quot; the file probably isn&apos;t your Sent mail. Re-check your label and export again.</p>
          </Step>

          <Step number={10} title="Confirm your upload">
            <p>Once done, open <strong>Your Voice</strong>. There&apos;s no sidebar link for it, so use the voice profile strip on the Create page, or go straight to <strong>/app/voice</strong>. Click <strong>Sources</strong> near the bottom of the page. Your emails show up under the <strong>Email</strong> category. Your voice strength score is in the header next to the page title, and it may move up with the new content.</p>
          </Step>
        </section>

        {/* Common mistakes */}
        <section className="mb-10 p-5 bg-bg-secondary rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Common mistakes to avoid</h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li><strong className="text-text-primary">Uploading your entire mailbox:</strong> Export only your Sent folder, filtered to the last 6 months. Huge files will time out or include other people&apos;s writing.</li>
            <li><strong className="text-text-primary">Forgetting to filter by label in Takeout:</strong> If you don&apos;t select your specific label, Google exports everything. Use the label filter.</li>
            <li><strong className="text-text-primary">Uploading inbox emails:</strong> Echo learns from <em>your</em> writing. Inbox emails are written by other people. That&apos;s their voice, not yours.</li>
            <li><strong className="text-text-primary">Expecting every email to import:</strong> EchoMe keeps up to 100 emails from each upload. Want more in? Export another date range and upload that as well.</li>
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
