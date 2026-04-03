import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EchoMe API — Developer Documentation',
  description:
    'Content generation API for developers. Turn videos, text, and voice notes into social media posts programmatically. REST API with credit-based pricing.',
  keywords: [
    'content generation API',
    'video to social media API',
    'AI content API',
    'social media automation API',
    'EchoMe API',
  ],
  openGraph: {
    title: 'EchoMe API — Developer Documentation',
    description:
      'Turn any video, text, or voice note into social media content. Programmatically.',
    url: 'https://tryechome.com/developers',
  },
  alternates: { canonical: 'https://tryechome.com/developers' },
};

export default function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
