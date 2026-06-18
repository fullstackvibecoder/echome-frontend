import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EchoMe for Real Estate Agents | Social Media Content That Sounds Like You',
  description:
    'Stop sounding like every other agent. EchoMe learns your voice from your listing videos, emails, and content, then creates social media posts that sound like you wrote them. Not templates. You.',
  keywords: [
    'real estate social media',
    'AI content for realtors',
    'real estate agent content creation',
    'real estate marketing AI',
    'realtor social media posts',
    'real estate content that sounds like me',
    'AI voice matching real estate',
    'real estate video to social media',
    'listing video content repurposing',
    'real estate Instagram posts',
    'real estate LinkedIn content',
  ],
  openGraph: {
    title: 'EchoMe for Real Estate | Content That Sounds Like You',
    description:
      'Stop sounding like every other agent. EchoMe learns your voice and creates social media posts that are unmistakably you.',
    url: 'https://tryechome.com/realtors',
    images: [{ url: '/media/echome-og.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: 'https://tryechome.com/realtors',
  },
};

export default function RealtorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
