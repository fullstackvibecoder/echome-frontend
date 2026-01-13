import type { Metadata, Viewport } from 'next';
import { satoshi } from '@/lib/fonts';
import { Providers } from './providers';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#00D4FF',
};

export const metadata: Metadata = {
  title: {
    default: 'EchoMe - Unmute Yourself',
    template: '%s | EchoMe',
  },
  description:
    'Your personal content engine that learns your voice, tone, and style. One upload becomes a full content kit. Blog posts, carousels, threads, clips. All in your voice.',
  keywords: [
    'AI content creation',
    'content repurposing',
    'video to text',
    'social media content',
    'AI writing',
    'content automation',
    'personal voice AI',
    'content marketing',
  ],
  authors: [{ name: 'EchoMe' }],
  creator: 'EchoMe',
  publisher: 'EchoMe',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tryechome.com',
    siteName: 'EchoMe',
    title: 'EchoMe - Unmute Yourself',
    description:
      'Your personal content engine that learns your voice, tone, and style. Create content kits from any upload.',
    images: [
      {
        url: '/media/echome-og.png',
        width: 1200,
        height: 630,
        alt: 'EchoMe - Unmute Yourself',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EchoMe - Unmute Yourself',
    description:
      'Your personal content engine that learns your voice, tone, and style.',
    images: ['/media/echome-og.png'],
    creator: '@tryechome',
  },
  alternates: {
    canonical: 'https://tryechome.com',
  },
  category: 'technology',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${satoshi.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
