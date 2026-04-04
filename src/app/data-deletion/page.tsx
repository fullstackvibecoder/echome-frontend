import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions | EchoMe',
  description:
    'How to delete your EchoMe account data, including Instagram, YouTube, and other imported social media content.',
  alternates: { canonical: 'https://tryechome.com/data-deletion' },
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="mb-8">
          <Link href="/" className="text-sm text-accent hover:underline">&larr; Back to EchoMe</Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Data Deletion Instructions
        </h1>
        <p className="text-lg text-text-secondary mb-10">
          You can delete your EchoMe data at any time. This page explains how.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Disconnect social media accounts</h2>
          <p className="text-text-secondary mb-4">
            To remove imported Instagram, YouTube, or other social media content from your EchoMe knowledge base:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-text-secondary ml-2">
            <li>Sign in to EchoMe at <Link href="/app" className="text-accent hover:underline">tryechome.com/app</Link></li>
            <li>Go to <strong className="text-text-primary">Build Your Voice</strong> in the sidebar</li>
            <li>Click <strong className="text-text-primary">Connect my Socials</strong></li>
            <li>Select the connected account (Instagram, YouTube, etc.)</li>
            <li>Click <strong className="text-text-primary">Disconnect</strong></li>
          </ol>
          <p className="text-text-secondary mt-4">
            Disconnecting removes the access token and stops further syncing. Previously imported content remains in your knowledge base until you delete it individually or delete your account.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Delete individual content items</h2>
          <p className="text-text-secondary mb-4">
            To remove specific imported posts, videos, or other content from your knowledge base:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-text-secondary ml-2">
            <li>Go to <strong className="text-text-primary">Build Your Voice</strong></li>
            <li>Click <strong className="text-text-primary">Sources</strong> to see all imported content</li>
            <li>Find the item you want to remove</li>
            <li>Click the delete icon next to that item</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Delete your entire EchoMe account</h2>
          <p className="text-text-secondary mb-4">
            To permanently delete your account and all associated data (including every imported social media post, video transcript, email, and generated content):
          </p>
          <ol className="list-decimal list-inside space-y-2 text-text-secondary ml-2">
            <li>Sign in to EchoMe</li>
            <li>Go to <strong className="text-text-primary">Settings</strong></li>
            <li>Click <strong className="text-text-primary">Account</strong> tab</li>
            <li>Click <strong className="text-text-primary">Delete Account</strong></li>
            <li>Confirm deletion</li>
          </ol>
          <p className="text-text-secondary mt-4">
            Account deletion is permanent and irreversible. All your data — including every integration, imported post, transcript, and generated content — is permanently removed within 30 days.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Revoke access from Instagram / Facebook directly</h2>
          <p className="text-text-secondary mb-4">
            You can also revoke EchoMe&apos;s access to your Instagram account directly through Meta:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-text-secondary ml-2">
            <li>Go to your Facebook settings at <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">facebook.com/settings/business_tools</a></li>
            <li>Find EchoMe in the list of connected apps</li>
            <li>Click <strong className="text-text-primary">Remove</strong> to revoke access</li>
          </ol>
          <p className="text-text-secondary mt-4">
            This stops EchoMe from accessing your Instagram data but does not delete content already imported to your EchoMe knowledge base. Use the steps above to remove that content.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Request data deletion via email</h2>
          <p className="text-text-secondary mb-2">
            If you cannot access your account or need assistance, email us to request data deletion:
          </p>
          <p className="text-text-secondary">
            <a href="mailto:support@tryechome.com?subject=Data%20Deletion%20Request" className="text-accent hover:underline font-medium">
              support@tryechome.com
            </a>
          </p>
          <p className="text-text-secondary mt-2">
            Include your account email address. We will process your deletion request within 30 days as required by GDPR and comply with applicable data protection laws.
          </p>
        </section>

        <section className="p-5 bg-bg-secondary border border-border rounded-xl mb-10">
          <h2 className="text-base font-semibold text-text-primary mb-2">Data we retain after deletion</h2>
          <p className="text-sm text-text-secondary">
            After account deletion, we may retain limited information required by law (e.g., billing records for tax purposes, fraud prevention logs) for the legally required period. This information is not used for any other purpose.
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-center text-xs text-text-secondary">
          <p>
            See our full <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link> for details on data handling and retention.
          </p>
        </footer>
      </div>
    </div>
  );
}
