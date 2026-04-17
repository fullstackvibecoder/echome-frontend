import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EchoMe FAQ — Frequently Asked Questions',
  description:
    'Find answers to common questions about EchoMe\'s AI content creation platform. Learn about pricing, video processing, voice matching, content kits, and more.',
  openGraph: {
    title: 'EchoMe FAQ — Frequently Asked Questions',
    description:
      'Find answers to common questions about EchoMe\'s AI content creation platform.',
    url: 'https://tryechome.com/faq',
  },
  alternates: {
    canonical: 'https://tryechome.com/faq',
  },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return children;
}
