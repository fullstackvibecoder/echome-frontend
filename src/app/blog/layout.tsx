import type { Metadata } from 'next';
import { SiteNav } from '@/components/landing/SiteNav';
import { SiteFooter } from '@/components/landing/SiteFooter';

export const metadata: Metadata = {
  alternates: {
    types: { 'application/rss+xml': [{ url: '/blog/rss.xml', title: 'EchoMe Blog' }] },
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
