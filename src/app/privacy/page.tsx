import type { Metadata } from 'next';
import PrivacyContent from './PrivacyContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'EchoMe Privacy Policy. Learn how we collect, use, and protect your data.',
  alternates: {
    canonical: 'https://www.tryechome.com/privacy',
  },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
