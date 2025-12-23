import type { Metadata } from 'next';
import { Fraunces, Karla } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

// Load Fraunces (display font - sophisticated, editorial)
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

// Load Karla (body font - warm, readable)
const karla = Karla({
  variable: '--font-karla',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EchoMe - Content, in your voice',
  description: 'Stop sounding like ChatGPT. Start sounding like you.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${karla.variable} font-body antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
