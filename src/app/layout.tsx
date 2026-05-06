import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Toaster } from 'sonner';
import { CookieConsent } from '@/components/cookie-consent';
import { ReceiptHost } from '@/components/shared/ReceiptHost';
import { satoshi, manrope, montserrat, inter, bebasNeue } from '@/lib/fonts';
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
    default: 'EchoMe - Content That Sounds Like You',
    template: '%s | EchoMe',
  },
  description:
    'Stop sounding like every other AI tool. EchoMe learns your unique voice from your existing content, then creates posts, threads, and articles that are unmistakably you.',
  keywords: [
    'AI voice learning',
    'AI content creation',
    'content repurposing',
    'personal voice AI',
    'AI writing assistant',
    'social media content',
    'content automation',
    'voice matching AI',
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
    title: 'EchoMe - Content That Sounds Like You',
    description:
      'Stop sounding like every other AI tool. EchoMe learns your voice from your existing content and creates posts, threads, and articles that are unmistakably you.',
    images: [
      {
        url: '/media/echome-og.png',
        width: 1200,
        height: 630,
        alt: 'EchoMe - Content That Sounds Like You',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EchoMe - Content That Sounds Like You',
    description:
      'Stop sounding like every other AI tool. EchoMe learns your voice and creates content that is unmistakably you.',
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
      <head>
        {/* iOS Smart App Banner — shows "Open in App" in Safari */}
        <meta name="apple-itunes-app" content="app-id=6761504034" />
        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1355967323198482');
          fbq('track', 'PageView');
        `}</Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img height="1" width="1" style={{ display: 'none' }} src="https://www.facebook.com/tr?id=1355967323198482&ev=PageView&noscript=1" alt="" />
        </noscript>
        {/* Affonso Affiliate Tracking */}
        <Script
          src="https://cdn.affonso.io/js/pixel.min.js"
          data-affonso="cmlay3bhe0044f6rbp5bct1xv"
          data-cookie_duration="30"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${satoshi.variable} ${manrope.variable} ${montserrat.variable} ${inter.variable} ${bebasNeue.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Toaster position="top-right" richColors closeButton />
        <ReceiptHost />
        <CookieConsent />
      </body>
    </html>
  );
}
