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
  title: 'EchoMe - Unmute Yourself',
  description: 'Your voice has been trapped in one piece of content. Echo sets it free across every platform.',
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
