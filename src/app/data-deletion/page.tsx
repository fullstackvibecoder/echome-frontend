import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Deletion',
  description: 'How to request deletion of your EchoMe account and associated data.',
  alternates: { canonical: 'https://tryechome.com/data-deletion' },
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="mb-8">
          <Link href="/" className="text-sm text-accent hover:underline">&larr; Back to EchoMe</Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-8">
          Data Deletion Request
        </h1>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">How to delete your EchoMe account</h2>
          <p className="text-text-secondary mb-4">
            You can delete your account and all associated data at any time:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-text-secondary ml-2 mb-4">
            <li>Log in to EchoMe</li>
            <li>Go to <strong className="text-text-primary">Settings &rarr; Account</strong></li>
            <li>Click <strong className="text-text-primary">&quot;Delete Account&quot;</strong></li>
            <li>Confirm deletion</li>
          </ol>
          <p className="text-text-secondary">
            This removes your account, knowledge base, generated content, voice profile, and all uploaded files.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">How to disconnect Instagram/Meta</h2>
          <p className="text-text-secondary mb-4">
            If you connected your Instagram account and want to remove it:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-text-secondary ml-2">
            <li>Go to <strong className="text-text-primary">Instagram Settings &rarr; Apps and Websites &rarr; Active</strong></li>
            <li>Find EchoMe and click <strong className="text-text-primary">Remove</strong></li>
            <li>Your Instagram access tokens are deleted immediately</li>
            <li>Any Instagram posts imported to your knowledge base are removed</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Request data deletion via email</h2>
          <p className="text-text-secondary mb-4">
            If you can&apos;t log in or need to request deletion another way:
          </p>
          <ul className="space-y-2 text-text-secondary ml-2 mb-4">
            <li>
              <strong className="text-text-primary">Email:</strong>{' '}
              <a href="mailto:support@tryechome.com?subject=Data%20Deletion%20Request" className="text-accent hover:underline">
                support@tryechome.com
              </a>
            </li>
            <li><strong className="text-text-primary">Subject:</strong> &quot;Data Deletion Request&quot;</li>
            <li><strong className="text-text-primary">Include:</strong> the email address of your EchoMe account</li>
          </ul>
          <p className="text-text-secondary">
            We will confirm deletion within 30 days.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">What data we delete</h2>
          <ul className="space-y-2 text-text-secondary ml-2">
            <li>&bull; Your account (email, name, profile info)</li>
            <li>&bull; Knowledge base content (uploaded files, imported content, voice training data)</li>
            <li>&bull; Generated content (posts, clips, carousels)</li>
            <li>&bull; Voice profile and embeddings</li>
            <li>&bull; Connected integrations (Instagram, YouTube tokens)</li>
            <li>&bull; Subscription and payment history (kept 7 years for legal compliance, then deleted)</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Third-party data</h2>
          <p className="text-text-secondary">
            Data we&apos;ve sent to third parties (OpenAI, Anthropic, Pinecone, etc.) is handled per each service&apos;s privacy policy. We do not retain copies of your data after sending it for processing.
          </p>
        </section>

        <footer className="border-t border-border pt-6 mt-12 text-center text-xs text-text-secondary">
          <p>
            See our full <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link> for details on data handling and retention.
          </p>
        </footer>
      </div>
    </div>
  );
}
